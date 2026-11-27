'use strict';
(function () {
  const me = Auth.require('admin'); if (!me) return;
  const view = UI.shell(me, 'admin', 'Admin Console'); UI.loading(view);
  let tab = 'overview', q = '', data = { students: [], staff: [], activity: [] }, live;
  const icon = { submit: '⬆️', approve: '✅', reject: '⚠️', complete: '🎓', reset: '🔄' };
  const pill = (k, t) => `<span class="badge b-${k}">${t}</span>`;
  const info = s => { const o = Data.overall(s.subs); return { ...o, key: o.completed ? 'approved' : (o.approved || o.pending || o.rejected) ? 'progress' : 'none' }; };
  const label = { approved: 'Completed', progress: 'In Progress', none: 'Not Started' };
  const match = t => t.toLowerCase().includes(q.toLowerCase());
  const act = h => `<div class="list-item"><div class="ib">${icon[h.type] || '•'}</div><div class="tx"><b>${esc(h.student)}</b><small>${esc(h.text)}<br>${fmtDate(h.date)}</small></div></div>`;

  function overview() {
    const st = data.students; let p = 0, a = 0, r = 0, done = 0;
    st.forEach(s => { const o = info(s); p += o.pending; a += o.approved; r += o.rejected; if (o.completed) done++; });
    const card = (ic, bg, n, t) => `<div class="card stat"><div class="si" style="background:${bg}">${ic}</div><div><b>${n}</b><span>${t}</span></div></div>`;
    const rows = OFFICES.map(of => {
      const ids = REQS.filter(x => x.office === of.id).map(x => x.id); let ap = 0, pe = 0, re = 0;
      st.forEach(s => ids.forEach(id => { const k = Data.st(s.subs, id); if (k === 'approved') ap++; else if (k === 'pending') pe++; else if (k === 'rejected') re++; }));
      const tot = st.length * ids.length, pct = tot ? Math.round(ap / tot * 100) : 0;
      const staffN = data.staff.filter(x => x.office === of.id).length;
      return `<tr><td data-label="Office"><b>${of.icon} ${esc(of.name)}</b><br><small style="color:var(--muted)">${staffN} staff</small></td><td data-label="Pending">${pe}</td><td data-label="Approved">${ap}</td><td data-label="Rejected">${re}</td><td data-label="Cleared"><div class="bar mini"><i style="width:${pct}%"></i></div><small>${pct}%</small></td></tr>`;
    }).join('');
    return `<div class="stats">${card('🎓', '#e4eeff', st.length, 'Students')}${card('🏢', '#e3f8ea', data.staff.length, 'Office staff')}${card('⏳', '#fff3da', p, 'Pending reviews')}${card('✅', '#e3f8ea', a, 'Approved')}${card('⚠️', '#fde8e9', r, 'Rejected')}${card('🏅', '#fff3c4', done, 'Clearances completed')}</div>
    <div class="card" style="margin-bottom:22px"><h3>Office Monitoring</h3><table class="tbl"><thead><tr><th>Office</th><th>Pending</th><th>Approved</th><th>Rejected</th><th>Cleared</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="card"><h3>Recent Activity</h3>${data.activity.length ? data.activity.slice(0, 8).map(act).join('') : '<div class="empty-st"><div class="em">🕘</div>No activity yet.</div>'}</div>`;
  }
  function students() {
    const list = data.students.filter(s => match(s.name + s.idNo + s.email + (s.course || '')));
    return `<div class="card"><div class="tools"><h3 style="margin:0">Students (${data.students.length})</h3><input class="search" id="q" placeholder="🔍 Search students" value="${esc(q)}"></div>
    ${list.length ? `<table class="tbl"><thead><tr><th>Student</th><th>Course</th><th>Progress</th><th>Status</th><th></th></tr></thead><tbody>${list.map(s => { const o = info(s);
      return `<tr><td data-label="Student"><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.idNo)} · ${esc(s.email)}</small></td><td data-label="Course">${esc(s.course || '—')}<br><small style="color:var(--muted)">${esc(s.year || '')}</small></td><td data-label="Progress"><div class="bar mini"><i style="width:${o.pct}%"></i></div><small>${o.approved}/${o.total} approved</small></td><td data-label="Status">${pill(o.key, label[o.key])}</td><td data-label=""><div class="pill-row"><button class="btn sm" data-a="view" data-id="${s.id}">View</button><button class="btn sm ghost" data-a="reset" data-id="${s.id}">Reset PW</button><button class="btn sm danger" data-a="del" data-id="${s.id}">Delete</button></div></td></tr>`; }).join('')}</tbody></table>` : '<div class="empty-st"><div class="em">🎓</div>No students found.</div>'}</div>`;
  }
  function staff() {
    const list = data.staff.filter(s => match(s.name + s.idNo + s.email + officeOf(s.office).name));
    return `<div class="card"><div class="tools"><h3 style="margin:0">Office Staff (${data.staff.length})</h3><input class="search" id="q" placeholder="🔍 Search staff" value="${esc(q)}"></div>
    ${list.length ? `<table class="tbl"><thead><tr><th>Staff</th><th>Office</th><th>Registered</th><th></th></tr></thead><tbody>${list.map(s => `<tr><td data-label="Staff"><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.idNo)} · ${esc(s.email)}</small></td><td data-label="Office">${officeOf(s.office).icon} ${esc(officeOf(s.office).name)}</td><td data-label="Registered">${s.createdAt ? fmtDate(s.createdAt) : '—'}</td><td data-label=""><div class="pill-row"><button class="btn sm ghost" data-a="reset" data-id="${s.id}">Reset PW</button><button class="btn sm danger" data-a="del" data-id="${s.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty-st"><div class="em">🏢</div>No office staff found.</div>'}</div>`;
  }
  function activity() {
    return `<div class="card"><h3>System Activity (latest ${data.activity.length})</h3>${data.activity.length ? data.activity.map(act).join('') : '<div class="empty-st"><div class="em">🕘</div>No activity yet.</div>'}</div>`;
  }
  function render(d) {
    if (d) data = d;
    const tabs = [['overview', '📊 Overview'], ['students', '🎓 Students'], ['staff', '🏢 Staff'], ['activity', '🕘 Activity']];
    view.innerHTML = `<div class="hello"><div><h2>🛡️ Administrator Console</h2><p>Monitor students, offices, submissions and system activity.</p></div></div>
    <div class="chips">${tabs.map(t => `<button data-t="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    ${tab === 'overview' ? overview() : tab === 'students' ? students() : tab === 'staff' ? staff() : activity()}`;
    const qi = $('#q', view);
    if (qi) qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; render(); const n = $('#q', view); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function viewStudent(s) {
    const rows = OFFICES.map(of => `<div style="margin-bottom:12px"><b>${of.icon} ${esc(of.name)}</b> ${badge(Data.officeStatus(s.subs, of.id))}<div class="sub">${REQS.filter(r => r.office === of.id).map(r => { const x = s.subs[r.id];
      return `<div><span>${esc(r.title)}${x && x.remarks ? '<br><small style="color:var(--muted)">💬 ' + esc(x.remarks) + '</small>' : ''}</span><span style="display:flex;gap:6px;align-items:center">${badge(Data.st(s.subs, r.id))}${x ? `<button class="btn sm ghost" data-dl="${r.id}">⬇</button>` : ''}</span></div>`; }).join('')}</div></div>`).join('');
    const m = UI.modal(`<h3>${esc(s.name)}</h3><div class="kv"><span>ID No.</span><div>${esc(s.idNo)}</div><span>Email</span><div>${esc(s.email)}</div><span>Course</span><div>${esc(s.course || '—')} ${esc(s.year || '')}</div><span>Period</span><div>${esc(Data.cycle(s))}</div></div>${rows}<div class="mfoot"><button class="btn sm" id="c">Close</button></div>`);
    $('#c', m.el).onclick = m.close;
    m.el.addEventListener('click', async e => { const b = e.target.closest('[data-dl]'); if (!b) return; b.disabled = true; try { await Data.download({ studentId: s.id, reqId: b.dataset.dl }); } catch (err) { UI.toast(err.message, 'err'); } b.disabled = false; });
  }
  function confirmBox(text, label, cls, fn) {
    const m = UI.modal(`<h3>Please confirm</h3><p style="margin-bottom:16px">${text}</p><div class="mfoot"><button class="btn ghost sm" id="n">Cancel</button><button class="btn ${cls} sm" id="y">${label}</button></div>`);
    $('#n', m.el).onclick = m.close;
    $('#y', m.el).onclick = async () => { $('#y', m.el).disabled = true; try { await fn(); m.close(); } catch (e) { UI.toast(e.message, 'err'); $('#y', m.el).disabled = false; } };
  }
  function userById(id) { return data.students.find(x => x.id === id) || data.staff.find(x => x.id === id); }
  view.addEventListener('click', e => {
    const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; q = ''; render(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return; const u = userById(b.dataset.id); if (!u) return;
    if (b.dataset.a === 'view') viewStudent(u);
    if (b.dataset.a === 'del') confirmBox(`Delete <b>${esc(u.name)}</b> and all of their clearance data? This cannot be undone.`, 'Delete', 'danger', async () => { await API.call('admindelete', { id: u.id }); UI.toast('Account deleted.'); live.refresh(); });
    if (b.dataset.a === 'reset') confirmBox(`Generate a temporary password for <b>${esc(u.name)}</b>?`, 'Reset password', '', async () => {
      const d = await API.call('adminreset', { id: u.id });
      const m = UI.modal(`<h3>Temporary password</h3><p>Give this to <b>${esc(u.name)}</b>. It is shown only once.</p><div class="tmp">${esc(d.password)}</div><div class="mfoot"><button class="btn sm" id="c">Done</button></div>`); $('#c', m.el).onclick = m.close;
    });
  });
  live = UI.live(() => API.call('admin'), render, 20000);
})();
