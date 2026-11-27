'use strict';
(function () {
  const u0 = Auth.require('student'); if (!u0) return;
  const view = UI.shell(u0, 'dashboard', 'Dashboard'); UI.loading(view);
  let live;
  function render(s) {
    const me = s.user, subs = s.subs, o = Data.overall(subs), first = me.name.split(' ')[0];
    const todo = REQS.filter(r => ['none', 'rejected'].includes(Data.st(subs, r.id)));
    const rows = OFFICES.map(of => `<div class="list-item"><div class="ib">${of.icon}</div><div class="tx"><b>${esc(of.name)}</b><small>${REQS.filter(r => r.office === of.id).length} requirement(s)</small></div>${badge(Data.officeStatus(subs, of.id))}</div>`).join('');
    const pend = todo.length ? todo.map(r => `<div class="list-item"><div class="ib">${officeOf(r.office).icon}</div><div class="tx"><b>${esc(r.title)}</b><small>${esc(officeOf(r.office).name)}</small></div>${badge(Data.st(subs, r.id))}</div>`).join('') : '<div class="empty-st"><div class="em">🎉</div>No pending requirements!</div>';
    view.innerHTML = `
    <div class="hello ${o.completed ? 'done' : ''}"><div><h2>${o.completed ? '🎉 Clearance Completed!' : 'Hello, ' + esc(first) + '! 👋'}</h2><p>${o.completed ? 'All offices approved your requirements for ' + esc(Data.cycle(me)) + '.' : 'Here is your clearance progress for ' + esc(Data.cycle(me)) + '.'}</p></div>
    ${o.completed ? '<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn light" href="confirmation.html">View confirmation</a><button class="btn light" id="next">Start next clearance</button></div>' : '<a class="btn light" href="submission.html">Submit documents →</a>'}</div>
    <div class="stats">
      <div class="card stat reveal"><div class="si" style="background:#e3f8ea">✅</div><div><b data-count="${o.approved}">0</b><span>Approved</span></div></div>
      <div class="card stat reveal"><div class="si" style="background:#fff3da">⏳</div><div><b data-count="${o.pending}">0</b><span>Pending review</span></div></div>
      <div class="card stat reveal"><div class="si" style="background:#fde8e9">⚠️</div><div><b data-count="${o.rejected}">0</b><span>Rejected</span></div></div>
      <div class="card stat reveal"><div class="si" style="background:#eceff7">📄</div><div><b data-count="${o.none}">0</b><span>Not submitted</span></div></div></div>
    <div class="two"><div class="card ringwrap reveal"><div><h3>Overall Progress</h3>${UI.ring(o.pct)}<p style="color:var(--muted);font-size:.85rem">${o.offApproved} of ${OFFICES.length} offices approved</p></div></div>
    <div class="card reveal"><h3>Pending Requirements</h3>${pend}</div></div>
    <div class="card reveal"><h3>Office Approval Status</h3>${rows}</div>`;
    UI.observe(view); UI.count(view); UI.animateRing(view);
    const nx = $('#next', view);
    if (nx) nx.onclick = async () => { nx.disabled = true; try { await API.call('reset'); UI.toast('New clearance period started.'); live.refresh(); } catch (e) { UI.toast(e.message, 'err'); nx.disabled = false; } };
    const key = 'wvsu_conf_' + me.id + '_' + (me.cycleIdx || 0);
    if (o.completed && !localStorage.getItem(key)) { localStorage.setItem(key, '1'); setTimeout(UI.confetti, 500); }
  }
  live = UI.live(() => API.call('state'), render);
})();
