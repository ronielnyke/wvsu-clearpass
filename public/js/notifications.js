'use strict';
(function () {
  const u = Auth.require(); if (!u) return;
  if (u.role === 'admin') { location.replace(Auth.home(u)); return; }
  const view = UI.shell(u, 'notifications', 'Notifications'); UI.loading(view);
  let f = 'all', list = [], live;
  const ico = t => /completed/i.test(t) ? '🎉' : /approved/i.test(t) ? '✅' : /rejected/i.test(t) ? '⚠️' : /submitted/i.test(t) ? '📥' : '🔔';
  function render(d) {
    if (d) list = d.list;
    const un = list.filter(n => !n.read).length, shown = list.filter(n => f === 'all' || !n.read);
    view.innerHTML = `<div class="tools"><div class="chips" style="margin:0"><button data-f="all" class="${f === 'all' ? 'on' : ''}">All (${list.length})</button><button data-f="unread" class="${f === 'unread' ? 'on' : ''}">Unread (${un})</button></div><button class="btn sm ghost" id="mark" ${un ? '' : 'disabled'}>✔ Mark all as read</button></div>
    <div class="card">${shown.length ? shown.map(n => `<div class="list-item"><div class="ib">${ico(n.text)}</div><div class="tx"><b style="font-weight:${n.read ? 500 : 700}">${esc(n.text)}</b><small>${fmtDate(n.time)}</small></div>${n.read ? '' : '<span class="badge b-progress">New</span>'}</div>`).join('') : '<div class="empty-st"><div class="em">🔕</div>No notifications to show.</div>'}</div>`;
    const m = $('#mark', view); if (m) m.onclick = async () => { m.disabled = true; try { await API.call('markread'); await live.refresh(); } catch (e) { UI.toast(e.message, 'err'); } };
  }
  view.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; render(); } });
  live = UI.live(() => API.call('notifs'), render, 15000);
})();
