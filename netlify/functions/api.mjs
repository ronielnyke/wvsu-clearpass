import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const OFFICES = ["library", "registrar", "accounting", "guidance", "dean", "property"];
const OFFICE_NAMES = { library: "Library", registrar: "Registrar's Office", accounting: "Accounting Office", guidance: "Guidance Office", dean: "Dean's Office", property: "Property Custodian" };
const REQS = [
  { id: "lib1", office: "library", title: "Library Clearance Slip" },
  { id: "reg1", office: "registrar", title: "Enrollment / Registration Form" },
  { id: "reg2", office: "registrar", title: "Grade Slip" },
  { id: "acc1", office: "accounting", title: "Official Receipt of Payment" },
  { id: "acc2", office: "accounting", title: "Statement of Account" },
  { id: "gui1", office: "guidance", title: "Exit Interview Form" },
  { id: "dea1", office: "dean", title: "Department Clearance Form" },
  { id: "pro1", office: "property", title: "Property Return Slip" }
];
const CYCLES = ["1st Semester, AY 2026–2027", "2nd Semester, AY 2026–2027", "1st Semester, AY 2027–2028", "2nd Semester, AY 2027–2028"];
const EXT = ["pdf", "jpg", "jpeg", "png", "doc", "docx"];
const MAX_DATAURL = 5.6 * 1024 * 1024;

const db = () => getStore({ name: "clearpass", consistency: "strong" });
const rd = k => db().get(k, { type: "json" });
const wr = (k, v) => db().setJSON(k, v);
const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const fail = (msg, status = 400) => { const e = new Error(msg); e.status = status; throw e; };
const cycleOf = u => CYCLES[Math.min(u.cycleIdx || 0, CYCLES.length - 1)];
const pub = u => ({ id: u.id, name: u.name, idNo: u.idNo, email: u.email, role: u.role, course: u.course, year: u.year, office: u.office, cycleIdx: u.cycleIdx || 0 });
const str = (v, max = 120) => String(v == null ? "" : v).trim().slice(0, max);

/* ---------- security helpers ---------- */
const hashPw = (pw, salt = crypto.randomBytes(16).toString("hex")) => salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
const checkPw = (pw, stored) => { const [salt, h] = String(stored).split(":"); const a = Buffer.from(h || "", "hex"); const b = crypto.scryptSync(pw, salt || "", 64); return a.length === b.length && crypto.timingSafeEqual(a, b); };
let secretCache;
async function secret() {
  if (secretCache) return secretCache;
  let s = await rd("config:secret");
  if (!s) { s = { v: crypto.randomBytes(32).toString("hex") }; await wr("config:secret", s); }
  return (secretCache = s.v);
}
async function makeToken(id) {
  const p = Buffer.from(JSON.stringify({ id, exp: Date.now() + 30 * 864e5 })).toString("base64url");
  const sig = crypto.createHmac("sha256", await secret()).update(p).digest("base64url");
  return p + "." + sig;
}
async function authUser(req, role) {
  const h = req.headers.get("authorization") || ""; const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [p, sig] = t.split(".");
  if (!p || !sig) fail("Please log in.", 401);
  const good = crypto.createHmac("sha256", await secret()).update(p).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) fail("Please log in.", 401);
  let data; try { data = JSON.parse(Buffer.from(p, "base64url").toString()); } catch (e) { fail("Please log in.", 401); }
  if (!data.exp || data.exp < Date.now()) fail("Session expired. Please log in again.", 401);
  const u = await rd("user:" + data.id);
  if (!u) fail("Account not found.", 401);
  if (role && u.role !== role) fail("You are not allowed to do this.", 403);
  return u;
}

/* ---------- data helpers ---------- */
async function addHist(sid, type, text) {
  const u = await rd("user:" + sid); const h = (await rd("hist:" + sid)) || [];
  h.unshift({ id: crypto.randomUUID(), type, text, date: Date.now(), cycle: u ? cycleOf(u) : "" });
  await wr("hist:" + sid, h.slice(0, 300));
}
async function notify(key, text, imp = false, extra = null) {
  const n = (await rd("notif:" + key)) || [];
  n.unshift({ id: crypto.randomUUID(), text, time: Date.now(), read: false, important: !!imp, ...(extra || {}) });
  await wr("notif:" + key, n.slice(0, 60));
}
const notifKey = u => (u.role === "office" ? "office:" + u.office : u.id);
const allApproved = subs => REQS.every(r => subs[r.id] && subs[r.id].status === "approved");

/* ---------- permanent administrator account ---------- */
const adminEmail = () => String(process.env.ADMIN_EMAIL || "admin@wvsu.edu.ph").trim().toLowerCase();
const adminPw = () => process.env.ADMIN_PASSWORD || "Admin@Group6";
async function ensureAdmin() {
  let u = await rd("user:admin");
  if (!u) {
    u = { id: "admin", name: "System Administrator", idNo: "ADMIN", email: adminEmail(), role: "admin", pass: hashPw(adminPw()), createdAt: Date.now() };
    await wr("user:admin", u); await wr("email:" + u.email, { id: "admin" }); await wr("idno:admin", { id: "admin" });
    return u;
  }
  let dirty = false;
  if (process.env.ADMIN_PASSWORD && !checkPw(adminPw(), u.pass)) { u.pass = hashPw(adminPw()); dirty = true; }
  if (u.email !== adminEmail()) { u.email = adminEmail(); await wr("email:" + u.email, { id: "admin" }); dirty = true; }
  if (dirty) await wr("user:admin", u);
  return u;
}

/* ---------- office access code (managed by the administrator) ---------- */
const newCode = () => "WVSU-" + crypto.randomBytes(3).toString("hex").toUpperCase();
async function getStaffCode() {
  const c = await rd("config:staffcode");
  if (c && c.v) return c.v;
  const v = String(process.env.STAFF_CODE || "").trim() || newCode();
  await wr("config:staffcode", { v }); return v;
}

/* ---------- handlers ---------- */
const handlers = {
  async register(b) {
    await ensureAdmin();
    const role = b.role === "office" ? "office" : "student";
    const name = str(b.name, 80), idNo = str(b.idNo, 40), email = str(b.email, 120).toLowerCase(), pw = String(b.password || "");
    if (name.length < 3) fail("Please enter your full name.");
    if (!idNo) fail("Please enter your ID number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Please enter a valid email address.");
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) fail("Password must be at least 8 characters with letters and numbers.");
    const user = { id: crypto.randomUUID(), name, idNo, email, role, pass: hashPw(pw), createdAt: Date.now() };
    if (role === "office") {
      if (!OFFICES.includes(b.office)) fail("Please choose your office.");
      const code = await getStaffCode();
      if (String(b.code || "").trim().toLowerCase() !== code.toLowerCase()) fail("Invalid office access code. Ask your administrator.", 403);
      user.office = b.office;
    } else { user.course = str(b.course, 80); user.year = str(b.year, 20); user.cycleIdx = 0; }
    if (await rd("email:" + email)) fail("This email is already registered.", 409);
    if (await rd("idno:" + idNo.toLowerCase())) fail("This ID number is already registered.", 409);
    await wr("user:" + user.id, user); await wr("email:" + email, { id: user.id }); await wr("idno:" + idNo.toLowerCase(), { id: user.id });
    if (role === "student") await wr("stu:" + user.id, { subs: {} });
    await notify(user.id, `Welcome to the Student Clearance System, ${name}! Your account is ready.`);
    await notify("admin", `New ${role === "office" ? "office staff (" + OFFICE_NAMES[user.office] + ")" : "student"} registered: ${name} (${idNo}).`, role === "office");
    return { ok: true };
  },
  async login(b) {
    await ensureAdmin();
    const ident = str(b.ident, 120).toLowerCase(); const pw = String(b.password || "");
    const ref = (await rd("email:" + ident)) || (await rd("idno:" + ident));
    const u = ref && (await rd("user:" + ref.id));
    if (!u || !checkPw(pw, u.pass)) fail("Incorrect email/ID or password.", 401);
    return { token: await makeToken(u.id), user: pub(u) };
  },
  async state(b, req) {
    const u = await authUser(req, "student");
    const stu = (await rd("stu:" + u.id)) || { subs: {} };
    return { user: pub(u), subs: stu.subs, history: (await rd("hist:" + u.id)) || [] };
  },
  async notifs(b, req) { const u = await authUser(req); return { list: (await rd("notif:" + notifKey(u))) || [] }; },
  async markread(b, req) {
    const u = await authUser(req); const k = "notif:" + notifKey(u); const n = (await rd(k)) || [];
    n.forEach(x => (x.read = true)); await wr(k, n); return { ok: true };
  },
  async notifread(b, req) {
    const u = await authUser(req); const k = "notif:" + notifKey(u); const id = str(b.id, 80);
    const n = (await rd(k)) || []; const x = n.find(y => y.id === id); if (x) { x.read = true; await wr(k, n); } return { ok: true };
  },
  async notifclear(b, req) { const u = await authUser(req); await wr("notif:" + notifKey(u), []); return { ok: true }; },
  async directory(b, req) {
    const me = await authUser(req);
    const { blobs } = await db().list({ prefix: "user:" });
    const us = (await Promise.all(blobs.map(x => rd(x.key)))).filter(Boolean);
    return { students: us.filter(t => t.role === "student" && t.id !== me.id).map(t => ({ id: t.id, name: t.name, course: t.course || "", year: t.year || "" })).sort((a, c) => a.name.localeCompare(c.name)) };
  },
  async notifsent(b, req) { const u = await authUser(req); return { list: (await rd("sent:" + u.id)) || [] }; },
  async send(b, req) {
    const u = await authUser(req); const text = str(b.text, 300); if (text.length < 2) fail("Please write a message.");
    const to = str(b.to, 80), me = notifKey(u), keys = new Set(); let label = "";
    if (to === "admin") { keys.add("admin"); label = "System Administrator"; }
    else if (to.startsWith("office:")) { const id = to.slice(7); if (!OFFICES.includes(id)) fail("Unknown office."); keys.add(to); label = OFFICE_NAMES[id]; }
    else if (to.startsWith("user:")) { const t = await rd("user:" + to.slice(5)); if (!t) fail("Recipient not found.", 404); keys.add(notifKey(t)); label = t.name; }
    else if (to.startsWith("group:")) {
      if (u.role !== "admin") fail("Only the administrator can send to groups.", 403);
      const g = to.slice(6); if (!["students", "staff", "everyone"].includes(g)) fail("Unknown group.");
      const { blobs } = await db().list({ prefix: "user:" }); const us = (await Promise.all(blobs.map(x => rd(x.key)))).filter(Boolean);
      us.forEach(t => { if ((g === "students" || g === "everyone") && t.role === "student") keys.add(t.id); if ((g === "staff" || g === "everyone") && t.role === "office") keys.add("office:" + t.office); });
      label = g === "students" ? "All students" : g === "staff" ? "All office staff" : "Everyone";
    } else fail("Please choose a recipient.");
    keys.delete(me); if (!keys.size) fail("There is nobody to send this message to.");
    const sent = (await rd("sent:" + u.id)) || [];
    if (sent.filter(x => Date.now() - x.time < 600000).length >= 15) fail("You are sending too many messages. Please wait a few minutes.", 429);
    const from = { id: u.id, name: u.name, role: u.role, office: u.office || null };
    await Promise.all([...keys].map(k => notify(k, text, !!b.important, { from })));
    sent.unshift({ id: crypto.randomUUID(), to: label, count: keys.size, text, time: Date.now(), important: !!b.important });
    await wr("sent:" + u.id, sent.slice(0, 50));
    return { ok: true, count: keys.size };
  },
  async submit(b, req) {
    const u = await authUser(req, "student"); const r = REQS.find(x => x.id === b.reqId);
    if (!r) fail("Unknown requirement.");
    const fileName = str(b.fileName, 150).replace(/[^\w.\- ()]/g, "_"); const ext = fileName.split(".").pop().toLowerCase();
    if (!EXT.includes(ext)) fail("Unsupported file type. Use PDF, JPG, PNG, DOC or DOCX.");
    const data = String(b.fileData || "");
    if (!data.startsWith("data:") || data.length > MAX_DATAURL) fail("File is missing or too large (max 4 MB).");
    const stu = (await rd("stu:" + u.id)) || { subs: {} }; const cur = stu.subs[r.id];
    if (cur && cur.status !== "rejected") fail("This requirement is already submitted.", 409);
    await wr("file:" + u.id + ":" + r.id, { fileData: data });
    stu.subs[r.id] = { status: "pending", fileName, fileSize: Number(b.fileSize) || 0, submittedAt: Date.now(), remarks: "" };
    await wr("stu:" + u.id, stu);
    const again = !!cur;
    await addHist(u.id, "submit", `${again ? "Resubmitted" : "Submitted"} "${r.title}" to ${OFFICE_NAMES[r.office]}`);
    await notify("office:" + r.office, `${u.name} ${again ? "resubmitted" : "submitted"} "${r.title}" for review.`, true);
    await notify(u.id, `Your "${r.title}" was ${again ? "resubmitted" : "submitted"} to ${OFFICE_NAMES[r.office]} and is waiting for review.`);
    return { ok: true };
  },
  async file(b, req) {
    const u = await authUser(req); const r = REQS.find(x => x.id === b.reqId); if (!r) fail("Unknown requirement.");
    const sid = u.role === "student" ? u.id : String(b.studentId || "");
    if (u.role === "office" && u.office !== r.office) fail("Not allowed.", 403);
    const f = await rd("file:" + sid + ":" + r.id); const stu = await rd("stu:" + sid);
    if (!f || !stu || !stu.subs[r.id]) fail("File not found.", 404);
    return { fileData: f.fileData, fileName: stu.subs[r.id].fileName };
  },
  async office(b, req) {
    const u = await authUser(req, "office"); const mine = REQS.filter(r => r.office === u.office); const out = [];
    const { blobs } = await db().list({ prefix: "stu:" });
    await Promise.all(blobs.map(async x => {
      const sid = x.key.slice(4); const stu = await rd(x.key); const su = await rd("user:" + sid);
      if (!stu || !su) return;
      mine.forEach(r => { const s = stu.subs[r.id]; if (s) out.push({ studentId: sid, name: su.name, idNo: su.idNo, course: su.course, year: su.year, reqId: r.id, ...s }); });
    }));
    return { office: u.office, list: out };
  },
  async review(b, req) {
    const u = await authUser(req, "office"); const r = REQS.find(x => x.id === b.reqId);
    if (!r || r.office !== u.office) fail("Not allowed.", 403);
    if (!["approved", "rejected"].includes(b.decision)) fail("Invalid decision.");
    const remarks = str(b.remarks, 300); if (b.decision === "rejected" && !remarks) fail("Remarks are required when rejecting.");
    const sid = String(b.studentId || ""); const stu = await rd("stu:" + sid); const s = stu && stu.subs[r.id];
    if (!s) fail("Submission not found.", 404); if (s.status !== "pending") fail("This submission was already reviewed.", 409);
    Object.assign(s, { status: b.decision, remarks, reviewedAt: Date.now(), reviewedBy: u.name }); await wr("stu:" + sid, stu);
    const word = b.decision === "approved" ? "approved" : "rejected";
    await addHist(sid, b.decision === "approved" ? "approve" : "reject", `${OFFICE_NAMES[r.office]} ${word} "${r.title}"${remarks ? " — " + remarks : ""}`);
    const su0 = await rd("user:" + sid);
    await notify(sid, `${OFFICE_NAMES[r.office]} ${word} your "${r.title}".${remarks ? " Remarks: " + remarks : ""}`, b.decision === "rejected");
    await notify("office:" + r.office, `You ${word} "${r.title}" of ${su0 ? su0.name : "a student"}.`);
    if (b.decision === "approved" && allApproved(stu.subs)) {
      const su = await rd("user:" + sid);
      await addHist(sid, "complete", `Clearance Completed for ${cycleOf(su)}`);
      await notify(sid, "🎉 Clearance Completed! All offices approved your requirements.", true);
      await notify("admin", `${su.name} (${su.idNo}) completed clearance for ${cycleOf(su)}.`, true);
    }
    return { ok: true };
  },
  async admin(b, req) {
    await authUser(req, "admin");
    const { blobs } = await db().list({ prefix: "user:" });
    const users = (await Promise.all(blobs.map(x => rd(x.key)))).filter(Boolean);
    const students = [], staff = [];
    await Promise.all(users.map(async u => {
      if (u.role === "student") { const stu = (await rd("stu:" + u.id)) || { subs: {} }; students.push({ ...pub(u), createdAt: u.createdAt, subs: stu.subs }); }
      else if (u.role === "office") staff.push({ ...pub(u), createdAt: u.createdAt });
    }));
    const names = Object.fromEntries(students.map(x => [x.id, x.name]));
    const hb = await db().list({ prefix: "hist:" }); let activity = [];
    await Promise.all(hb.blobs.map(async x => { const sid = x.key.slice(5); const h = (await rd(x.key)) || []; h.slice(0, 40).forEach(e => activity.push({ ...e, student: names[sid] || "Unknown" })); }));
    activity.sort((a, c) => c.date - a.date);
    return { staffCode: await getStaffCode(), students: students.sort((a, c) => a.name.localeCompare(c.name)), staff: staff.sort((a, c) => a.name.localeCompare(c.name)), activity: activity.slice(0, 150) };
  },
  async adminsetcode(b, req) {
    await authUser(req, "admin");
    const v = String(b.code || "").trim() || newCode();
    if (v.length < 6 || v.length > 40 || /\s/.test(v)) fail("Access code must be 6–40 characters with no spaces.");
    await wr("config:staffcode", { v }); return { code: v };
  },
  async admindelete(b, req) {
    await authUser(req, "admin"); const id = str(b.id, 80);
    if (id === "admin") fail("The administrator account cannot be deleted.", 403);
    const u = await rd("user:" + id); if (!u) fail("User not found.", 404);
    const d = db();
    await Promise.all([d.delete("user:" + id), d.delete("email:" + u.email), d.delete("idno:" + String(u.idNo).toLowerCase()), d.delete("stu:" + id), d.delete("hist:" + id), d.delete("notif:" + id), d.delete("sent:" + id), ...REQS.map(r => d.delete("file:" + id + ":" + r.id))]);
    return { ok: true };
  },
  async adminreset(b, req) {
    await authUser(req, "admin"); const id = str(b.id, 80);
    if (id === "admin") fail("The administrator password is set in the Netlify environment variables.", 403);
    const u = await rd("user:" + id); if (!u) fail("User not found.", 404);
    const temp = "Tmp" + crypto.randomBytes(4).toString("hex") + "A";
    u.pass = hashPw(temp); await wr("user:" + id, u);
    await notify(id, "An administrator reset your password. Log in with the temporary password you were given.", true);
    return { password: temp };
  },
  async reset(b, req) {
    const u = await authUser(req, "student"); const stu = await rd("stu:" + u.id);
    if (!stu || !allApproved(stu.subs)) fail("Clearance is not completed yet.");
    await Promise.all(REQS.map(r => db().delete("file:" + u.id + ":" + r.id)));
    await wr("stu:" + u.id, { subs: {} }); u.cycleIdx = (u.cycleIdx || 0) + 1; await wr("user:" + u.id, u);
    await addHist(u.id, "reset", "Started a new clearance period");
    await notify(u.id, `A new clearance period has started: ${cycleOf(u)}. You can submit your requirements again.`);
    return { ok: true };
  }
};

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const action = new URL(req.url).pathname.replace(/^\/api\//, "").replace(/\/$/, "");
  const h = Object.prototype.hasOwnProperty.call(handlers, action) ? handlers[action] : null;
  if (!h) return json({ error: "Not found" }, 404);
  let body = {}; try { body = await req.json(); } catch (e) { /* empty body */ }
  try { return json(await h(body || {}, req)); }
  catch (e) { if (e.status) return json({ error: e.message }, e.status); console.error(e); return json({ error: "Server error. Please try again." }, 500); }
};
export const config = { path: "/api/*" };
