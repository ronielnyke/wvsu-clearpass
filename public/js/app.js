"use strict";
/* ===== Helpers ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate = (t) =>
  new Date(t).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
const fmtSize = (b) =>
  b < 1024
    ? b + " B"
    : b < 1048576
      ? (b / 1024).toFixed(1) + " KB"
      : (b / 1048576).toFixed(2) + " MB";

/* ===== Constants ===== */
const OFFICES = [
  { id: "library", name: "Library", icon: "📚" },
  { id: "registrar", name: "Registrar's Office", icon: "🗂️" },
  { id: "accounting", name: "Accounting Office", icon: "💰" },
  { id: "guidance", name: "Guidance Office", icon: "🧭" },
  { id: "dean", name: "Dean's Office", icon: "🎓" },
  { id: "property", name: "Property Custodian", icon: "🔧" },
];
const REQS = [
  {
    id: "lib1",
    office: "library",
    title: "Library Clearance Slip",
    desc: "Proof that all borrowed books and materials were returned.",
  },
  {
    id: "reg1",
    office: "registrar",
    title: "Enrollment / Registration Form",
    desc: "Copy of your latest signed registration form.",
  },
  {
    id: "reg2",
    office: "registrar",
    title: "Grade Slip",
    desc: "Copy of your grade slip for the current semester.",
  },
  {
    id: "acc1",
    office: "accounting",
    title: "Official Receipt of Payment",
    desc: "Official receipt showing fees were fully paid.",
  },
  {
    id: "acc2",
    office: "accounting",
    title: "Statement of Account",
    desc: "Statement showing zero balance.",
  },
  {
    id: "gui1",
    office: "guidance",
    title: "Exit Interview Form",
    desc: "Accomplished and signed exit interview form.",
  },
  {
    id: "dea1",
    office: "dean",
    title: "Department Clearance Form",
    desc: "Signed clearance form from your department.",
  },
  {
    id: "pro1",
    office: "property",
    title: "Property Return Slip",
    desc: "Proof of returned laboratory tools or school property.",
  },
];
const CYCLES = [
  "1st Semester, AY 2026–2027",
  "2nd Semester, AY 2026–2027",
  "1st Semester, AY 2027–2028",
  "2nd Semester, AY 2027–2028",
];
const STATUS = {
  none: "Not Submitted",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  progress: "In Progress",
};
const badge = (s) => `<span class="badge b-${s}">${STATUS[s] || s}</span>`;
const officeOf = (id) =>
  OFFICES.find((o) => o.id === id) || { name: id, icon: "🏢" };

/* ===== API ===== */
const API = {
  async call(action, body) {
    const h = { "Content-Type": "application/json" };
    const t = Auth.token();
    if (t) h.Authorization = "Bearer " + t;
    let r;
    try {
      r = await fetch("/api/" + action, {
        method: "POST",
        headers: h,
        body: JSON.stringify(body || {}),
      });
    } catch (e) {
      throw new Error(
        "Cannot reach the server. Please check your internet connection.",
      );
    }
    let d = {};
    try {
      d = await r.json();
    } catch (e) {
      /* ignore */
    }
    if (r.status === 401 && action !== "login") {
      Auth.clear();
      location.replace("login.html");
      throw new Error("Please log in again.");
    }
    if (!r.ok) throw new Error(d.error || "Request failed (" + r.status + ")");
    return d;
  },
};

/* ===== Auth ===== */
const Auth = {
  token: () =>
    sessionStorage.getItem("wvsu_token") || localStorage.getItem("wvsu_token"),
  current() {
    try {
      const raw =
        sessionStorage.getItem("wvsu_user") ||
        localStorage.getItem("wvsu_user");
      return Auth.token() && raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  clear() {
    ["wvsu_token", "wvsu_user", "wvsu_seen", "wvsu_reminded"].forEach((k) => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  },
  async login(ident, pw, remember) {
    const d = await API.call("login", { ident, password: pw });
    Auth.clear();
    Auth.pending = d.unread || { count: 0, items: [] };
    const s = remember ? localStorage : sessionStorage;
    s.setItem("wvsu_token", d.token);
    s.setItem("wvsu_user", JSON.stringify(d.user));
    return d.user;
  },
  register: (d) => API.call("register", d),
  logout() {
    Auth.clear();
    location.href = "login.html";
  },
  home: (u) =>
    u.role === "admin"
      ? "admin.html"
      : u.role === "office"
        ? "office.html"
        : "dashboard.html",
  require(role) {
    const u = Auth.current();
    if (!u) {
      location.replace("login.html");
      return null;
    }
    if (role && u.role !== role) {
      location.replace(Auth.home(u));
      return null;
    }
    return u;
  },
};

/* ===== Workflow helpers (data lives on the server) ===== */
const Data = {
  cycle: (u) => CYCLES[Math.min(u.cycleIdx || 0, CYCLES.length - 1)],
  st: (subs, rid) => (subs[rid] || { status: "none" }).status,
  officeStatus(subs, oid) {
    const st = REQS.filter((r) => r.office === oid).map((r) =>
      Data.st(subs, r.id),
    );
    if (st.every((s) => s === "approved")) return "approved";
    if (st.includes("rejected")) return "rejected";
    if (st.includes("pending")) return "pending";
    if (st.includes("approved")) return "progress";
    return "none";
  },
  overall(subs) {
    const c = { approved: 0, pending: 0, rejected: 0, none: 0 };
    REQS.forEach((r) => {
      c[Data.st(subs, r.id)]++;
    });
    const offApproved = OFFICES.filter(
      (o) => Data.officeStatus(subs, o.id) === "approved",
    ).length;
    return {
      ...c,
      total: REQS.length,
      pct: Math.round((c.approved / REQS.length) * 100),
      offApproved,
      completed: offApproved === OFFICES.length,
    };
  },
  readFile: (f) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(new Error("Could not read the file."));
      fr.readAsDataURL(f);
    }),
  async download(body) {
    const d = await API.call("file", body);
    const a = document.createElement("a");
    a.href = d.fileData;
    a.download = d.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
};

/* ===== UI ===== */
const ICONS = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
};
const UI = {
  footer: () =>
    '<footer class="footer"><div class="g6">Group 6</div><div class="line"></div><div>CIT 206 – Platform Technology · WVSU–Lambunao Campus</div><div>© ' +
    new Date().getFullYear() +
    " Student Clearance Tracking and Management System</div></footer>",
  toast(msg, type, action) {
    let box = $(".toasts");
    if (!box) {
      box = document.createElement("div");
      box.className = "toasts";
      document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = "toast " + (type === "err" ? "err" : "");
    const sp = document.createElement("span");
    sp.textContent = msg;
    t.appendChild(sp);
    const kill = () => {
      t.style.transition = ".4s";
      t.style.opacity = "0";
      t.style.transform = "translateX(40px)";
      setTimeout(() => t.remove(), 400);
    };
    if (action) {
      const b = document.createElement("button");
      b.className = "tbtn";
      b.textContent = action.label;
      b.onclick = () => {
        kill();
        action.fn();
      };
      t.appendChild(b);
    }
    box.appendChild(t);
    setTimeout(kill, action ? 7000 : 3400);
  },
  sfx(kind) {
    try {
      const c = UI._ctx;
      if (!c || c.state !== "running") return;
      const seq =
        kind === "bye"
          ? [
              [784, 0],
              [659, 0.14],
              [523, 0.28],
            ]
          : [
              [523, 0],
              [659, 0.12],
              [784, 0.24],
              [1047, 0.36],
            ];
      const t0 = c.currentTime + 0.02;
      seq.forEach((n) => {
        const o = c.createOscillator(),
          g = c.createGain();
        o.type = "triangle";
        o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0 + n[1]);
        g.gain.exponentialRampToValueAtTime(0.25, t0 + n[1] + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + n[1] + 0.4);
        o.connect(g);
        g.connect(c.destination);
        o.start(t0 + n[1]);
        o.stop(t0 + n[1] + 0.45);
      });
    } catch (e) {
      /* ignore */
    }
  },
  async clearNotifs(after) {
    try {
      await API.call("notifclear");
      UI.toast("All notifications cleared.", "", {
        label: "Undo",
        fn: async () => {
          try {
            await API.call("notifrestore");
            UI.toast("Notifications restored.");
          } catch (e) {
            UI.toast(e.message, "err");
          }
          if (after) after();
        },
      });
    } catch (e) {
      UI.toast(e.message, "err");
    }
    if (after) after();
  },
  modal(html, cls) {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = '<div class="modal ' + (cls || "") + '">' + html + "</div>";
    document.body.appendChild(bg);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const close = () => {
      document.removeEventListener("keydown", onKey);
      bg.remove();
    };
    document.addEventListener("keydown", onKey);
    bg.addEventListener("click", (e) => {
      if (e.target === bg) close();
    });
    return { el: bg, close };
  },
  initEyes() {
    $$(".eye").forEach((b) => {
      b.innerHTML = ICONS.eye;
      b.setAttribute("aria-label", "Show password");
      b.addEventListener("click", () => {
        const inp = $("#" + b.dataset.for);
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        b.innerHTML = show ? ICONS.eyeOff : ICONS.eye;
        b.setAttribute("aria-label", show ? "Hide password" : "Show password");
        inp.focus();
      });
    });
  },
  effects() {
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".btn");
      if (!b) return;
      const r = b.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.left = e.clientX - r.left + "px";
      s.style.top = e.clientY - r.top + "px";
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    });
    ["touchstart", "pointerdown", "click", "keydown"].forEach((ev) =>
      document.addEventListener(ev, UI.unlock, { passive: true }),
    );
    UI.observe();
    UI.tilt();
  },
  observe(root) {
    const els = $$(".reveal:not(.in)", root || document);
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach((e, i) => {
      e.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(e);
    });
  },
  tilt() {
    if (window.matchMedia("(hover:none)").matches) return;
    document.addEventListener("mousemove", (e) => {
      const c = e.target.closest(".tilt");
      $$(".tilt").forEach((x) => {
        if (x !== c) x.style.transform = "";
      });
      if (!c) return;
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
  },
  count(root) {
    $$("[data-count]", root || document).forEach((el) => {
      const to = +el.dataset.count;
      const suf = el.dataset.suffix || "";
      let t0 = null;
      const step = (t) => {
        if (!t0) t0 = t;
        const p = Math.min((t - t0) / 900, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
  ring(pct) {
    return `<div class="ring"><svg viewBox="0 0 150 150"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b56c9"/><stop offset="1" stop-color="#7ed321"/></linearGradient></defs><circle class="bg" cx="75" cy="75" r="65"/><circle class="fg" cx="75" cy="75" r="65" data-pct="${pct}"/></svg><div class="pct"><span data-count="${pct}" data-suffix="%">0%</span><small>Completed</small></div></div>`;
  },
  animateRing(root) {
    const c = $(".ring .fg", root || document);
    if (!c) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        c.style.strokeDashoffset = 408 * (1 - +c.dataset.pct / 100);
      }),
    );
  },
  confetti() {
    let cv = $("#confetti");
    if (!cv) {
      cv = document.createElement("canvas");
      cv.id = "confetti";
      document.body.appendChild(cv);
    }
    const ctx = cv.getContext("2d");
    cv.width = innerWidth;
    cv.height = innerHeight;
    const cols = [
      "#1b56c9",
      "#1fae4b",
      "#7ed321",
      "#f7b500",
      "#3a8bf5",
      "#ffffff",
    ];
    const ps = Array.from({ length: 160 }, () => ({
      x: Math.random() * cv.width,
      y: -20 - Math.random() * cv.height * 0.5,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 8,
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      r: Math.random() * 6,
      vr: -0.2 + Math.random() * 0.4,
      c: cols[Math.floor(Math.random() * cols.length)],
    }));
    let frames = 0;
    (function draw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (++frames < 260) requestAnimationFrame(draw);
      else cv.remove();
    })();
  },
  ago(t) {
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 45) return "Just now";
    const m = Math.floor(s / 60);
    if (m < 60) return m + " min ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + " hr ago";
    const d = Math.floor(h / 24);
    if (d === 1) return "Yesterday";
    if (d < 7) return d + " days ago";
    return new Date(t).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  },
  ntype(t, n) {
    t = String(t || "");
    if (n && n.from) return { ico: "✉️", cls: "blue" };
    if (/password/i.test(t)) return { ico: "🔑", cls: "gold" };
    if (/new clearance period/i.test(t)) return { ico: "🔄", cls: "blue" };
    if (/resubmitted/i.test(t)) return { ico: "🔁", cls: "blue" };
    if (/completed/i.test(t)) return { ico: "🎉", cls: "gold" };
    if (/approved/i.test(t)) return { ico: "✅", cls: "green" };
    if (/rejected/i.test(t)) return { ico: "⚠️", cls: "red" };
    if (/submitted/i.test(t)) return { ico: "📥", cls: "blue" };
    if (/registered/i.test(t)) return { ico: "👤", cls: "blue" };
    if (/welcome/i.test(t)) return { ico: "👋", cls: "gold" };
    return { ico: "🔔", cls: "blue" };
  },
  /* ---- automatic notification sound (all devices) ---- */
  soundOn: () => true,
  unlock() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!UI._ctx) UI._ctx = new AC();
      if (UI._ctx.state !== "running")
        UI._ctx
          .resume()
          .then(() => {
            if (UI._pending) {
              UI._pending = false;
              setTimeout(() => UI.ping(UI._pendingImp), 120);
            }
          })
          .catch(() => {});
    } catch (e) {
      /* ignore */
    }
  },
  ping(important) {
    try {
      const c = UI._ctx;
      if (!c || c.state !== "running") return false;
      const t0 = c.currentTime + 0.02;
      const bell = (f, at, vol) =>
        [
          [1, 1],
          [2, 0.35],
          [3, 0.12],
        ].forEach((p) => {
          const o = c.createOscillator(),
            g = c.createGain();
          o.type = "sine";
          o.frequency.value = f * p[0];
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(vol * p[1], t0 + at + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45);
          o.connect(g);
          g.connect(c.destination);
          o.start(t0 + at);
          o.stop(t0 + at + 0.5);
        });
      const seq = [
        [1047, 0],
        [1319, 0.11],
        [1568, 0.22],
      ];
      seq.forEach((n) => bell(n[0], n[1], 0.3));
      if (important) seq.forEach((n) => bell(n[0], n[1] + 0.7, 0.3));
      return true;
    } catch (e) {
      return false;
    }
  },
  alertSound(fresh) {
    const imp = fresh.some((n) => n.important);
    try {
      if (navigator.vibrate)
        navigator.vibrate(imp ? [120, 60, 120, 60, 220] : [120, 60, 120]);
    } catch (e) {
      /* ignore */
    }
    if (!UI.ping(imp)) {
      UI._pending = true;
      UI._pendingImp = imp;
      UI.unlock();
    }
  },
  remind(items, count) {
    const box = document.createElement("div");
    box.className = "remind";
    box.innerHTML = `<div class="rb">🔔</div><div class="rt"><b>You have ${count} new notification${count > 1 ? "s" : ""}</b>${items
      .slice(0, 2)
      .map(
        (n) =>
          `<small>${n.from ? "✉️ " + esc(n.from) + ": " : ""}${esc(String(n.text).slice(0, 90))}</small>`,
      )
      .join(
        "",
      )}</div><a class="btn sm light" href="notifications.html">View</a><button class="rx" aria-label="Close">×</button>`;
    document.body.appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    const close = () => {
      box.classList.remove("show");
      setTimeout(() => box.remove(), 500);
    };
    $(".rx", box).onclick = close;
    setTimeout(close, 9000);
  },
  welcome(u, un, go) {
    const role =
      u.role === "admin"
        ? "Administrator"
        : u.role === "office"
          ? officeOf(u.office).name + " staff"
          : "Student";
    const o = document.createElement("div");
    o.className = "bye hi";
    o.innerHTML = `<div class="orbs"><span></span><span></span><span></span></div><div class="bye-in"><div class="orbit" style="--s:130px"><i class="r1"></i><i class="r2"></i><i class="sp"></i><img class="logo" src="assets/logo.png" alt="Logo"></div>
    <div class="okmark"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 15-17"/></svg></div>
    <h2>Welcome back, ${esc(String(u.name).split(" ")[0])}!</h2><span class="rolechip">${esc(role)}</span>
    ${un.count ? `<div class="hi-bell">🔔</div><p><b>You have ${un.count} new notification${un.count > 1 ? "s" : ""}</b> while you were away</p><div class="hi-list">${un.items.map((n, i) => `<div class="hi-item" style="animation-delay:${0.9 + i * 0.15}s">${n.important ? "❗ " : n.from ? "✉️ " : "🔔 "}${n.from ? "<b>" + esc(n.from) + ":</b> " : ""}${esc(String(n.text).slice(0, 80))}</div>`).join("")}</div>` : "<p>Preparing your dashboard…</p>"}
    <div class="bar"><i></i></div></div>`;
    document.body.appendChild(o);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        o.classList.add("show");
        $(".bar i", o).style.width = "100%";
      }),
    );
    UI.sfx("hello");
    setTimeout(UI.confetti, 350);
    if (un.count)
      setTimeout(() => UI.alertSound(un.items.length ? un.items : [{}]), 900);
    setTimeout(() => o.classList.add("out"), un.count ? 3000 : 2000);
    setTimeout(go, un.count ? 3400 : 2400);
  },
  desktop(n) {
    try {
      if (
        window.Notification &&
        Notification.permission === "granted" &&
        document.hidden
      )
        new Notification(
          n.important ? "Important · Student Clearance" : "Student Clearance",
          {
            body: (n.from ? n.from.name + ": " : "") + n.text,
            icon: "assets/logo.png",
          },
        );
    } catch (e) {
      /* ignore */
    }
  },
  roleLabel(f) {
    return f.role === "student"
      ? "Student"
      : f.role === "admin"
        ? "Administrator"
        : officeOf(f.office).name + " staff";
  },
  async compose(preset) {
    const u = Auth.current();
    if (!u) return;
    preset = preset || {};
    let dir;
    try {
      dir = await API.call("directory");
    } catch (e) {
      UI.toast(e.message, "err");
      return;
    }
    const fixed = [];
    if (u.role !== "admin")
      fixed.push(["Administrator", [["admin", "🛡️ System Administrator"]]]);
    fixed.push([
      "Offices",
      OFFICES.filter((o) => !(u.role === "office" && o.id === u.office)).map(
        (o) => ["office:" + o.id, o.icon + " " + o.name],
      ),
    ]);
    if (u.role === "admin")
      fixed.push([
        "Groups",
        [
          ["group:students", "🎓 All students"],
          ["group:staff", "🏢 All office staff"],
          ["group:everyone", "📣 Everyone"],
        ],
      ]);
    const opts = (q) =>
      fixed
        .map(
          (g) =>
            `<optgroup label="${g[0]}">${g[1].map((o) => `<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</optgroup>`,
        )
        .join("") +
      '<optgroup label="Students">' +
      dir.students
        .filter((s) =>
          (s.name + s.course).toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 150)
        .map(
          (s) =>
            `<option value="user:${esc(s.id)}">🎓 ${esc(s.name)}${s.course ? " · " + esc(s.course) : ""}</option>`,
        )
        .join("") +
      "</optgroup>";
    const tpl =
      u.role === "student"
        ? [
            "Please review my submission.",
            "I need help with my requirement.",
            "Please update my clearance status.",
            "What documents are still missing?",
          ]
        : u.role === "office"
          ? [
              "Please resubmit a clearer copy.",
              "Your requirement needs correction.",
              "Please visit our office for verification.",
              "Your requirement is approved. Thank you!",
            ]
          : [
              "Reminder: please complete your clearance requirements.",
              "Please check your pending requirements.",
              "System maintenance tonight.",
              "Please respond to your office requests.",
            ];
    const m = UI.modal(`<h3>✉️ New message</h3>
    <div class="field"><label for="ts">To</label><div class="input"><input id="ts" type="text" placeholder="Search students…" style="padding-left:14px;margin-bottom:8px"></div><div class="input"><select id="to" style="padding-left:14px"></select></div></div>
    <div class="chips tpl">${tpl.map((t) => `<button type="button" data-t="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <div class="field"><label for="msg">Message</label><textarea id="msg" maxlength="300" placeholder="Write your message or request…"></textarea><div class="hint" id="cnt">0 / 300</div></div>
    <label class="check" style="margin-bottom:16px"><input type="checkbox" id="imp"> ❗ Mark as important</label>
    <div class="mfoot"><button class="btn ghost sm" id="cx">Cancel</button><button class="btn sm" id="sd">Send ✉️</button></div>`);
    const sel = $("#to", m.el),
      ts = $("#ts", m.el),
      msg = $("#msg", m.el);
    const fill = (keep) => {
      sel.innerHTML = opts(ts.value);
      if (keep && [...sel.options].some((o) => o.value === keep))
        sel.value = keep;
    };
    fill(preset.to);
    ts.addEventListener("input", () => fill(sel.value));
    if (preset.text) msg.value = preset.text;
    $("#cnt", m.el).textContent = msg.value.length + " / 300";
    msg.addEventListener("input", () => {
      $("#cnt", m.el).textContent = msg.value.length + " / 300";
    });
    $$(".tpl button", m.el).forEach((b) =>
      b.addEventListener("click", () => {
        msg.value = b.dataset.t;
        msg.dispatchEvent(new Event("input"));
        msg.focus();
      }),
    );
    $("#cx", m.el).onclick = m.close;
    $("#sd", m.el).onclick = async () => {
      const text = msg.value.trim();
      if (text.length < 2) {
        UI.toast("Please write a message.", "err");
        msg.focus();
        return;
      }
      const btn = $("#sd", m.el);
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const r = await API.call("send", {
          to: sel.value,
          text,
          important: $("#imp", m.el).checked,
        });
        m.close();
        UI.toast(
          "Message sent" +
            (r.count > 1 ? " to " + r.count + " recipients" : "") +
            " ✔",
        );
        window.dispatchEvent(new Event("wvsu:sent"));
      } catch (e) {
        UI.toast(e.message, "err");
        btn.disabled = false;
        btn.textContent = "Send ✉️";
      }
    };
    setTimeout(() => msg.focus(), 80);
  },
  logout(u) {
    const m = UI.modal(
      '<div class="confirm"><div class="cicon"><span>🚪</span></div><h3>Log out?</h3><p>Are you sure you want to log out of your account?</p><div class="cbtns"><button class="btn ghost" id="n">Cancel</button><button class="btn" id="y">OK</button></div></div>',
      "small",
    );
    setTimeout(() => {
      const y = $("#y", m.el);
      if (y) y.focus();
    }, 50);
    $("#n", m.el).onclick = m.close;
    $("#y", m.el).onclick = () => {
      m.close();
      const o = document.createElement("div");
      o.className = "bye";
      o.innerHTML = `<div class="orbs"><span></span><span></span><span></span></div><div class="bye-in"><div class="orbit" style="--s:130px"><i class="r1"></i><i class="r2"></i><i class="sp"></i><img class="logo" src="assets/logo.png" alt="Logo"></div><div class="wave">👋</div><h2>See you soon, ${esc(String(u.name).split(" ")[0])}!</h2><p>Logging you out securely…</p><div class="bar"><i></i></div></div>`;
      document.body.appendChild(o);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          o.classList.add("show");
          $(".bar i", o).style.width = "100%";
        }),
      );
      UI.sfx("bye");
      setTimeout(() => o.classList.add("out"), 1500);
      setTimeout(() => Auth.logout(), 2000);
    };
  },
  loading(v) {
    v.innerHTML =
      '<div class="empty-st"><div class="spinner"></div><p>Loading…</p></div>';
  },
  live(fn, render, ms) {
    const view = UI._view;
    let last = null,
      first = true;
    const run = async () => {
      try {
        const d = await fn();
        const j = JSON.stringify(d);
        if (j !== last) {
          last = j;
          render(d);
        }
      } catch (e) {
        if (first)
          view.innerHTML =
            '<div class="card empty-st"><div class="em">⚠️</div><p>' +
            esc(e.message) +
            '</p><br><button class="btn sm" onclick="location.reload()">Try again</button></div>';
      }
      first = false;
    };
    run();
    setInterval(() => {
      if (!document.hidden) run();
    }, ms || 20000);
    return {
      refresh() {
        last = null;
        return run();
      },
    };
  },
  shell(u, active, title) {
    const nav =
      u.role === "admin"
        ? [
            ["admin.html", "🛡️", "Admin Console", "admin"],
            ["notifications.html", "🔔", "Notifications", "notifications"],
          ]
        : u.role === "office"
          ? [
              ["office.html", "🏢", "Office Dashboard", "office"],
              ["notifications.html", "🔔", "Notifications", "notifications"],
            ]
          : [
              ["dashboard.html", "🏠", "Dashboard", "dashboard"],
              [
                "requirements.html",
                "📋",
                "Requirements Checklist",
                "requirements",
              ],
              ["tracking.html", "🧭", "Clearance Tracking", "tracking"],
              ["submission.html", "📤", "Document Submission", "submission"],
              ["notifications.html", "🔔", "Notifications", "notifications"],
              [
                "confirmation.html",
                "🏅",
                "Clearance Confirmation",
                "confirmation",
              ],
              ["history.html", "🕘", "Clearance History", "history"],
            ];
    const sub =
      u.role === "admin"
        ? "System Administrator"
        : u.role === "office"
          ? officeOf(u.office).name
          : (u.course || "") + " · " + (u.year || "");
    const root = $("#shell");
    root.innerHTML = `<div class="orbs"><span></span><span></span><span></span></div>
    <div class="overlay" id="overlay"></div>
    <aside class="side" id="side"><div class="brand"><img class="logo" src="assets/logo.png" alt="WVSU Student Clearance logo"><div>Student Clearance<small>WVSU–Lambunao</small></div></div>
    <nav>${nav.map((n) => `<a href="${n[0]}" class="${n[3] === active ? "on" : ""}"><span>${n[1]}</span>${n[2]}</a>`).join("")}</nav>
    <div class="who"><b>${esc(u.name)}</b><br>${esc(sub)}</div><button class="btn light block sm" id="logout"><span>⎋</span> Log out</button></aside>
    <div class="main"><header class="top"><button class="menu" id="menu" aria-label="Menu">☰</button><h1>${esc(title)}</h1>
    <div class="bellwrap"><button class="icon-btn" id="bell" aria-label="Notifications">🔔<span class="dot" id="dot" style="display:none">0</span></button><div class="pop" id="pop"></div></div>
    <div class="avatar" title="${esc(u.name)}">${esc(u.name.trim().charAt(0).toUpperCase())}</div></header>
    <main class="view" id="view"></main>${UI.footer()}</div>`;
    const side = $("#side"),
      ov = $("#overlay");
    const toggle = (o) => {
      side.classList.toggle("open", o);
      ov.classList.toggle("show", o);
    };
    $("#menu").onclick = () => toggle(true);
    ov.onclick = () => toggle(false);
    $("#logout").onclick = () => UI.logout(u);
    const pop = $("#pop"),
      dot = $("#dot"),
      bell = $("#bell"),
      baseTitle = document.title;
    let notifs = [],
      seen = null;
    const paint = () => {
      const un = notifs.filter((n) => !n.read).length;
      dot.style.display = un ? "grid" : "none";
      dot.textContent = un > 99 ? "99+" : un;
      document.title = (un ? "(" + un + ") " : "") + baseTitle;
      pop.innerHTML =
        "<h4><span>Notifications" +
        (un ? ' <span class="badge b-progress">' + un + " new</span>" : "") +
        "</span>" +
        (u.role === "admin" && notifs.length
          ? '<button class="btn sm danger" id="popclear">🧹 Clear all</button>'
          : "") +
        "</h4>" +
        (notifs.length
          ? notifs
              .slice(0, 20)
              .map((n) => {
                const t = UI.ntype(n.text, n);
                return `<div class="n ${n.read ? "" : "un"}"><span class="nb ${t.cls}">${t.ico}</span><div>${n.from ? "<b>" + esc(n.from.name) + "</b><br>" : ""}${n.important ? '<span class="badge b-rejected" style="margin-bottom:4px">Important</span><br>' : ""}${esc(n.text)}<small>${UI.ago(n.time)}</small></div></div>`;
              })
              .join("")
          : '<div class="empty">🔕<br>No notifications yet</div>') +
        '<a class="n more" href="notifications.html">View all notifications →</a>';
    };
    const fetchN = async () => {
      try {
        const d = await API.call("notifs");
        if (!seen) {
          try {
            const r = JSON.parse(sessionStorage.getItem("wvsu_seen") || "null");
            if (Array.isArray(r)) seen = new Set(r);
          } catch (e) {
            /* ignore */
          }
        }
        const firstLoad = !seen;
        if (seen) {
          const fresh = d.list.filter((n) => !seen.has(n.id) && !n.read);
          if (fresh.length) {
            UI.toast(
              (fresh[0].important ? "❗ " : fresh[0].from ? "✉️ " : "🔔 ") +
                (fresh[0].from ? fresh[0].from.name + ": " : "") +
                fresh[0].text,
            );
            UI.desktop(fresh[0]);
            UI.alertSound(fresh);
            bell.classList.remove("ring");
            void bell.offsetWidth;
            bell.classList.add("ring");
          }
        }
        seen = new Set(d.list.map((n) => n.id));
        if (firstLoad && !sessionStorage.getItem("wvsu_reminded")) {
          const un = d.list.filter((n) => !n.read);
          if (un.length) {
            sessionStorage.setItem("wvsu_reminded", "1");
            UI.remind(
              un
                .slice(0, 3)
                .map((n) => ({
                  text: n.text,
                  from: n.from ? n.from.name : null,
                })),
              un.length,
            );
            UI.alertSound(un);
            bell.classList.add("ring");
          }
        }
        try {
          sessionStorage.setItem(
            "wvsu_seen",
            JSON.stringify([...seen].slice(0, 150)),
          );
        } catch (e) {
          /* ignore */
        }
        if (!pop.classList.contains("show")) {
          notifs = d.list;
          paint();
        }
      } catch (e) {
        /* ignore */
      }
    };
    paint();
    fetchN();
    setInterval(() => {
      if (!document.hidden) fetchN();
    }, 8000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) fetchN();
    });
    pop.addEventListener("click", (e) => {
      if (e.target.closest("#popclear")) {
        e.stopPropagation();
        notifs = [];
        paint();
        pop.classList.remove("show");
        UI.clearNotifs(() => {
          fetchN();
          window.dispatchEvent(new Event("wvsu:sent"));
        });
      }
    });
    $("#bell").onclick = (e) => {
      e.stopPropagation();
      pop.classList.toggle("show");
      if (pop.classList.contains("show") && notifs.some((n) => !n.read)) {
        dot.style.display = "none";
        API.call("markread").catch(() => {});
      }
    };
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".bellwrap") && pop.classList.contains("show")) {
        pop.classList.remove("show");
        notifs.forEach((n) => {
          n.read = true;
        });
        paint();
      }
    });
    UI.effects();
    UI.unlock();
    UI._view = $("#view");
    return UI._view;
  },
};

if ("serviceWorker" in navigator)
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
