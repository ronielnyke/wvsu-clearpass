'use strict';
(function () {
  const u0 = Auth.require('student'); if (!u0) return;
  const view = UI.shell(u0, 'history', 'Clearance History'); UI.loading(view);
  const icon = { submit: '⬆️', approve: '✅', reject: '⚠️', complete: '🎓', reset: '🔄' }; let f = 'all', all = [];
  function render(s) {
    if (s) all = s.history;
    const done = all.filter(h => h.type === 'complete'), list = all.filter(h => f === 'all' || h.type === f);
    view.innerHTML = `<h3 style="color:var(--navy);margin-bottom:12px">Completed Clearances</h3>
    <div class="grid g3" style="margin-bottom:28px">${done.length ? done.map(h => `<div class="card reveal"><div class="cert"><div class="seal">🏅</div><div><b>Clearance Completed</b><br><small style="color:var(--muted)">${esc(h.cycle)}</small><br><small style="color:var(--muted)">${fmtDate(h.date)}</small></div></div></div>`).join('') : '<div class="card empty-st" style="grid-column:1/-1"><div class="em">🏅</div>No completed clearance yet. Finish all offices to see it here.</div>'}</div>
    <h3 style="color:var(--navy);margin-bottom:12px">Activity Log</h3>
    <div class="chips">${[['all', 'All'], ['submit', 'Submitted'], ['approve', 'Approved'], ['reject', 'Rejected']].map(c => `<button data-f="${c[0]}" class="${f === c[0] ? 'on' : ''}">${c[1]}</button>`).join('')}</div>
    <div class="card reveal">${list.length ? list.map(h => `<div class="list-item"><div class="ib">${icon[h.type] || '•'}</div><div class="tx"><b>${esc(h.text)}</b><small>${fmtDate(h.date)} · ${esc(h.cycle)}</small></div></div>`).join('') : '<div class="empty-st"><div class="em">🕘</div>No activity yet.</div>'}</div>`;
    UI.observe(view);
  }
  view.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; render(); } });
  UI.live(() => API.call('state'), render, 30000);
})();
