'use strict';
(function () {
  const me = Auth.require('admin'); if (!me) return;
  const view = UI.shell(me, 'admin', 'Admin Console'); UI.loading(view);
  let tab = 'overview', q = '', pf = 'all', testTo = '', testMsg = null, mailForm = null, data = { now: Date.now(), emailReady: false, students: [], staff: [], activity: [] }, live;
  const icon = { submit: '⬆️', approve: '✅', reject: '⚠️', complete: '🎓', reset: '🔄' };
  const pill = (k, t) => `<span class="badge b-${k}">${t}</span>`;
  const isOn = x => x.lastSeen > 0 && data.now - x.lastSeen < 45000;
  const pres = x => isOn(x) ? '<span class="pres on"><i></i><b>Online</b></span>' : `<span class="pres"><i></i><span>Offline<small>${x.lastSeen ? 'Last seen ' + UI.ago(x.lastSeen) : 'Never logged in'}</small></span></span>`;
  const info = s => { const o = Data.overall(s.subs); return { ...o, key: o.completed ? 'approved' : (o.approved || o.pending || o.rejected) ? 'progress' : 'none' }; };
  const label = { approved: 'Completed', progress: 'In Progress', none: 'Not Started' };
  const match = t => t.toLowerCase().includes(q.toLowerCase());
  const pfOk = x => pf === 'all' || (pf === 'online' ? isOn(x) : !isOn(x));
  const act = h => `<div class="list-item"><div class="ib">${icon[h.type] || '•'}</div><div class="tx"><b>${esc(h.student)}</b><small>${esc(h.text)}<br>${fmtDate(h.date)}</small></div></div>`;
  const filters = () => `<div class="chips" style="margin:0">${[['all', 'All'], ['online', '🟢 Online'], ['offline', '⚫ Offline']].map(c => `<button data-pf="${c[0]}" class="${pf === c[0] ? 'on' : ''}">${c[1]}</button>`).join('')}</div>`;

  function overview() {
    const st = data.students; let p = 0, a = 0, r = 0, done = 0;
    st.forEach(s => { const o = info(s); p += o.pending; a += o.approved; r += o.rejected; if (o.completed) done++; });
    const onl = st.filter(isOn).length + data.staff.filter(isOn).length;
    const card = (ic, bg, n, t) => `<div class="card stat"><div class="si" style="background:${bg}">${ic}</div><div><b>${n}</b><span>${t}</span></div></div>`;
    const rows = OFFICES.map(of => {
      const ids = REQS.filter(x => x.office === of.id).map(x => x.id); let ap = 0, pe = 0, re = 0;
      st.forEach(s => ids.forEach(id => { const k = Data.st(s.subs, id); if (k === 'approved') ap++; else if (k === 'pending') pe++; else if (k === 'rejected') re++; }));
      const tot = st.length * ids.length, pct = tot ? Math.round(ap / tot * 100) : 0;
      const staff = data.staff.filter(x => x.office === of.id);
      return `<tr><td data-label="Office"><b>${of.icon} ${esc(of.name)}</b><br><small style="color:var(--muted)">${staff.length} staff · ${staff.filter(isOn).length} online</small></td><td data-label="Pending">${pe}</td><td data-label="Approved">${ap}</td><td data-label="Rejected">${re}</td><td data-label="Cleared"><div class="bar mini"><i style="width:${pct}%"></i></div><small>${pct}%</small></td></tr>`;
    }).join('');
    return `<div class="stats">${card('🟢', '#e3f8ea', onl, 'Online now')}${card('🎓', '#e4eeff', st.length, 'Students')}${card('🏢', '#e3f8ea', data.staff.length, 'Office staff')}${card('⏳', '#fff3da', p, 'Pending reviews')}${card('✅', '#e3f8ea', a, 'Approved')}${card('⚠️', '#fde8e9', r, 'Rejected')}${card('🏅', '#fff3c4', done, 'Clearances completed')}</div>
    <div class="card" style="margin-bottom:22px"><h3>Office Monitoring</h3><table class="tbl"><thead><tr><th>Office</th><th>Pending</th><th>Approved</th><th>Rejected</th><th>Cleared</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="card"><h3>Recent Activity</h3>${data.activity.length ? data.activity.slice(0, 8).map(act).join('') : '<div class="empty-st"><div class="em">🕘</div>No activity yet.</div>'}</div>`;
  }
  function students() {
    const list = data.students.filter(s => pfOk(s) && match(s.name + s.idNo + s.email + (s.course || '')));
    const onl = data.students.filter(isOn).length;
    return `<div class="card"><div class="tools"><h3 style="margin:0">Students (${data.students.length}) · 🟢 ${onl} online</h3><input class="search" id="q" placeholder="🔍 Search students" value="${esc(q)}"></div>${filters()}<div style="height:12px"></div>
    ${list.length ? `<table class="tbl"><thead><tr><th>Student</th><th>Status</th><th>Course</th><th>Progress</th><th>Clearance</th><th></th></tr></thead><tbody>${list.map(s => { const o = info(s);
      return `<tr><td data-label="Student"><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.idNo)} · ${esc(s.email)}</small></td><td data-label="Status">${pres(s)}</td><td data-label="Course">${esc(s.course || '—')}<br><small style="color:var(--muted)">${esc(s.year || '')}</small></td><td data-label="Progress"><div class="bar mini"><i style="width:${o.pct}%"></i></div><small>${o.approved}/${o.total} approved</small></td><td data-label="Clearance">${pill(o.key, label[o.key])}</td><td data-label=""><div class="pill-row"><button class="btn sm" data-a="view" data-id="${s.id}">View</button><button class="btn sm ghost" data-a="msg" data-id="${s.id}" title="Send message">✉️</button><button class="btn sm ghost" data-a="reset" data-id="${s.id}">Reset PW</button><button class="btn sm danger" data-a="del" data-id="${s.id}">Delete</button></div></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty-st"><div class="em">🎓</div>No students found.</div>'}</div>`;
  }
  function staff() {
    const list = data.staff.filter(s => pfOk(s) && match(s.name + s.idNo + s.email + officeOf(s.office).name));
    const onl = data.staff.filter(isOn).length;
    return `<div class="card"><div class="tools"><h3 style="margin:0">Office Staff (${data.staff.length}) · 🟢 ${onl} online</h3><input class="search" id="q" placeholder="🔍 Search staff" value="${esc(q)}"></div>${filters()}<div style="height:12px"></div>
    ${list.length ? `<table class="tbl"><thead><tr><th>Staff</th><th>Status</th><th>Office</th><th>Activation</th><th></th></tr></thead><tbody>${list.map(s => `<tr><td data-label="Staff"><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.idNo)} · ${esc(s.email)}</small></td><td data-label="Status">${pres(s)}</td><td data-label="Office">${officeOf(s.office).icon} ${esc(officeOf(s.office).name)}</td><td data-label="Activation">${s.activated ? pill('approved', 'Activated') : pill('pending', 'Waiting for code')}</td><td data-label=""><div class="pill-row">${s.activated ? '' : `<button class="btn sm ok" data-a="activate" data-id="${s.id}" title="Activate without the email code">Activate</button>`}<button class="btn sm ghost" data-a="msg" data-id="${s.id}" title="Send message to this office">✉️</button><button class="btn sm ghost" data-a="reset" data-id="${s.id}">Reset PW</button><button class="btn sm danger" data-a="del" data-id="${s.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty-st"><div class="em">🏢</div>No office staff found.</div>'}</div>`;
  }
  function activity() { return `<div class="card"><h3>System Activity (latest ${data.activity.length})</h3>${data.activity.length ? data.activity.map(act).join('') : '<div class="empty-st"><div class="em">🕘</div>No activity yet.</div>'}</div>`; }
  function system() {
    const m = data.mail || {}, ok = x => x ? '✅' : '❌', mv = mailForm || data.mailVals || {};
    const src = m.source === 'saved' ? 'Saved settings (below)' : m.source === 'netlify' ? 'Netlify variables' : 'Built-in settings (your EmailJS IDs are preloaded — add the Private Key below)';
    const f = (k, label, ph, type) => `<div class="field" style="margin-bottom:10px"><label for="mf-${k}">${label}</label><div class="input"><input id="mf-${k}" data-mf="${k}" type="${type || 'text'}" autocomplete="off" placeholder="${ph}" value="${esc(k === 'priv' ? (mailForm || {}).priv || '' : mv[k] || '')}" style="padding-left:14px"></div></div>`;
    return `<div class="card" style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><h3 style="margin:0">📧 Email service (EmailJS)</h3>${data.emailReady ? pill(m.priv ? 'approved' : 'pending', m.priv ? 'Ready' : 'Needs Private Key') : pill('rejected', 'Not configured')}</div>
    <p style="color:var(--muted);font-size:.9rem;margin:10px 0">Office staff receive their one-time activation code at their real email. Using: <b>${src}</b><br>${ok(m.service)} Service ID · ${ok(m.template)} Template ID · ${ok(m.pub)} Public Key · ${ok(m.priv)} Private Key</p>
    ${f('service', 'Service ID', 'service_xxxxxxx')}${f('template', 'Template ID', 'template_xxxxxxx')}${f('pub', 'Public Key', 'Your EmailJS public key')}${f('priv', 'Private Key ' + (m.priv ? '(saved ✅ — leave blank to keep)' : '(required)'), 'Your EmailJS private key', 'password')}
    <div class="pill-row" style="margin-bottom:6px"><button class="btn sm" id="mfsave">💾 Save settings</button>${m.source === 'saved' ? '<button class="btn sm ghost" id="mfclear">Remove saved</button>' : ''}</div>
    <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
    <div class="field" style="margin-bottom:10px"><label for="tm">Send a test email</label><div class="input"><input id="tm" type="email" placeholder="your-real-email@gmail.com" value="${esc(testTo)}" style="padding-left:14px"></div></div>
    <button class="btn sm" id="testmail">📨 Send test email</button>
    ${testMsg ? `<div class="info ${testMsg.ok ? 'ok' : 'bad'}" style="margin-top:12px">${esc(testMsg.text)}</div>` : ''}
    <p style="color:var(--muted);font-size:.8rem;margin-top:12px">Needed in EmailJS: (1) Account &gt; Security &gt; turn ON <b>Allow EmailJS API for non-browser applications</b>; (2) template <b>To Email</b> = <code>{{to_email}}</code> and the body contains <code>{{code}}</code>; (3) Service ID / Template ID / Public Key / Private Key copied exactly; (4) check the spam folder.</p></div>
    <div class="card danger-zone"><h3 style="color:var(--red)">⚠️ Danger zone</h3><p style="color:var(--muted);font-size:.9rem;margin-bottom:14px">Delete <b>all</b> registered students and staff, submissions, files, messages and history. Only the administrator account is kept. This cannot be undone.</p><button class="btn danger" id="wipe">🗑 Delete all data</button></div>`;
  }
  function render(d) {
    if (d && tab === 'system' && document.activeElement && view.contains(document.activeElement) && /^(tm|mf-)/.test(document.activeElement.id)) { data = d; return; }
    if (d) data = d;
    const ae = document.activeElement, keep = ae && view.contains(ae) && (ae.id === 'q' || ae.id === 'tm' || /^mf-/.test(ae.id)) ? { id: ae.id, pos: ae.selectionStart } : null;
    const tabs = [['overview', '📊 Overview'], ['students', '🎓 Students'], ['staff', '🏢 Staff'], ['activity', '🕘 Activity'], ['system', '⚙️ System']];
    view.innerHTML = `<div class="hello"><div><h2>🛡️ Administrator Console</h2><p>Monitor students, offices, who is online, submissions and system activity. Updates automatically.</p></div><button class="btn light" id="bc">📣 Send announcement</button></div>
    <div class="chips">${tabs.map(t => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    ${tab === 'overview' ? overview() : tab === 'students' ? students() : tab === 'staff' ? staff() : tab === 'activity' ? activity() : system()}`;
    $('#bc', view).onclick = () => UI.compose({ to: 'group:everyone' });
    const w = $('#wipe', view); if (w) w.onclick = wipeDialog;
    const tm = $('#tm', view); if (tm) tm.addEventListener('input', () => { testTo = tm.value; });
    $$('[data-mf]', view).forEach(inp => inp.addEventListener('input', () => { mailForm = mailForm || { ...(data.mailVals || {}), priv: '' }; mailForm[inp.dataset.mf] = inp.value; }));
    const ms = $('#mfsave', view); if (ms) ms.onclick = async () => {
      const g = k => ($('#mf-' + k, view).value || '').trim(); ms.disabled = true; ms.textContent = 'Saving…';
      try { await API.call('adminmailsave', { service: g('service'), template: g('template'), pub: g('pub'), priv: g('priv') }); mailForm = null; testMsg = null; UI.toast('EmailJS settings saved ✔ — now send a test email.'); await live.refresh(); }
      catch (e) { UI.toast(e.message, 'err'); ms.disabled = false; ms.textContent = '💾 Save settings'; }
    };
    const mc = $('#mfclear', view); if (mc) mc.onclick = async () => { try { await API.call('adminmailsave', { clear: true }); mailForm = null; UI.toast('Saved settings removed.'); live.refresh(); } catch (e) { UI.toast(e.message, 'err'); } };
    const tb = $('#testmail', view); if (tb) tb.onclick = async () => {
      const to = ($('#tm', view).value || '').trim(); testTo = to; tb.disabled = true; tb.textContent = 'Sending…';
      try { await API.call('adminemailtest', { to }); testMsg = { ok: true, text: 'Test email sent to ' + to + '. Check the inbox (and spam folder).' }; }
      catch (e) { testMsg = { ok: false, text: e.message }; }
      render();
    };
    if (keep) { const el = $('#' + keep.id, view); if (el) { el.focus(); try { el.setSelectionRange(keep.pos, keep.pos); } catch (e) { /* ignore */ } } }
    const qi = $('#q', view);
    if (qi) qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; render(); const n = $('#q', view); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function wipeDialog() {
    const m = UI.modal('<h3 style="color:var(--red)">Delete all data?</h3><p style="margin-bottom:12px">Every student, staff account, submission, file, message and history record will be permanently deleted. Only the administrator account stays.</p><div class="field"><label for="cf">Type <b>DELETE</b> to confirm</label><div class="input"><input id="cf" type="text" autocomplete="off" style="padding-left:14px" placeholder="DELETE"></div></div><div class="mfoot"><button class="btn ghost sm" id="n">Cancel</button><button class="btn danger sm" id="y" disabled>Delete everything</button></div>');
    const cf = $('#cf', m.el), y = $('#y', m.el); cf.addEventListener('input', () => { y.disabled = cf.value.trim() !== 'DELETE'; });
    $('#n', m.el).onclick = m.close;
    y.onclick = async () => { y.disabled = true; try { await API.call('adminwipe', { confirm: 'DELETE' }); m.close(); UI.toast('All data deleted. The administrator account was kept.'); live.refresh(); } catch (e) { UI.toast(e.message, 'err'); y.disabled = false; } };
  }
  function viewStudent(s) {
    const rows = OFFICES.map(of => `<div style="margin-bottom:12px"><b>${of.icon} ${esc(of.name)}</b> ${badge(Data.officeStatus(s.subs, of.id))}<div class="sub">${REQS.filter(r => r.office === of.id).map(r => { const x = s.subs[r.id];
      return `<div><span>${esc(r.title)}${x && x.remarks ? '<br><small style="color:var(--muted)">💬 ' + esc(x.remarks) + '</small>' : ''}</span><span style="display:flex;gap:6px;align-items:center">${badge(Data.st(s.subs, r.id))}${x ? `<button class="btn sm ghost" data-dl="${r.id}">⬇</button>` : ''}</span></div>`; }).join('')}</div></div>`).join('');
    const m = UI.modal(`<h3>${esc(s.name)}</h3><div class="kv"><span>Status</span><div>${pres(s)}</div><span>ID No.</span><div>${esc(s.idNo)}</div><span>Email</span><div>${esc(s.email)}</div><span>Course</span><div>${esc(s.course || '—')} ${esc(s.year || '')}</div><span>Period</span><div>${esc(Data.cycle(s))}</div></div>${rows}<div class="mfoot"><button class="btn sm" id="c">Close</button></div>`);
    $('#c', m.el).onclick = m.close;
    m.el.addEventListener('click', async e => { const b = e.target.closest('[data-dl]'); if (!b) return; b.disabled = true; try { await Data.download({ studentId: s.id, reqId: b.dataset.dl }); } catch (err) { UI.toast(err.message, 'err'); } b.disabled = false; });
  }
  function confirmBox(text, label, cls, fn) {
    const m = UI.modal(`<h3>Please confirm</h3><p style="margin-bottom:16px">${text}</p><div class="mfoot"><button class="btn ghost sm" id="n">Cancel</button><button class="btn ${cls} sm" id="y">${label}</button></div>`);
    $('#n', m.el).onclick = m.close;
    $('#y', m.el).onclick = async () => { $('#y', m.el).disabled = true; try { await fn(); m.close(); } catch (e) { UI.toast(e.message, 'err'); $('#y', m.el).disabled = false; } };
  }
  const userById = id => data.students.find(x => x.id === id) || data.staff.find(x => x.id === id);
  view.addEventListener('click', e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; q = ''; pf = 'all'; render(); return; }
    const p = e.target.closest('[data-pf]'); if (p) { pf = p.dataset.pf; render(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return; const u = userById(b.dataset.id); if (!u) return;
    if (b.dataset.a === 'view') viewStudent(u);
    if (b.dataset.a === 'msg') UI.compose({ to: u.office ? 'office:' + u.office : 'user:' + u.id });
    if (b.dataset.a === 'activate') confirmBox(`Activate <b>${esc(u.name)}</b> without the email code?`, 'Activate', 'ok', async () => { await API.call('adminactivate', { id: u.id }); UI.toast('Staff account activated.'); live.refresh(); });
    if (b.dataset.a === 'del') confirmBox(`Delete <b>${esc(u.name)}</b> and all of their clearance data? This cannot be undone.`, 'Delete', 'danger', async () => { await API.call('admindelete', { id: u.id }); UI.toast('Account deleted.'); live.refresh(); });
    if (b.dataset.a === 'reset') confirmBox(`Generate a temporary password for <b>${esc(u.name)}</b>?`, 'Reset password', '', async () => {
      const d = await API.call('adminreset', { id: u.id });
      const m = UI.modal(`<h3>Temporary password</h3><p>Give this to <b>${esc(u.name)}</b>. It is shown only once.</p><div class="tmp">${esc(d.password)}</div><div class="mfoot"><button class="btn sm" id="c">Done</button></div>`); $('#c', m.el).onclick = m.close;
    });
  });
  live = UI.live(() => API.call('admin'), render, 8000);
})();
