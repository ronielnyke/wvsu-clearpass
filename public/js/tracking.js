'use strict';
(function () {
  const u0 = Auth.require('student'); if (!u0) return;
  const view = UI.shell(u0, 'tracking', 'Clearance Tracking'); UI.loading(view);
  UI.live(() => API.call('state'), s => {
    const u = s.user, subs = s.subs, o = Data.overall(subs);
    view.innerHTML = `<div class="card reveal" style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px"><h3 style="margin:0">${esc(Data.cycle(u))}</h3>${o.completed ? '<span class="badge b-approved">Clearance Completed</span>' : badge(o.pending || o.approved ? 'progress' : 'none')}</div><div class="bar"><i></i></div><p style="color:var(--muted);font-size:.85rem;margin-top:8px">${o.approved} of ${o.total} requirements approved · ${o.offApproved} of ${OFFICES.length} offices cleared</p></div>
    <div class="tl">${OFFICES.map(of => {
      const st = Data.officeStatus(subs, of.id);
      const items = REQS.filter(r => r.office === of.id).map(r => { const x = subs[r.id];
        return `<div><span>${esc(r.title)}${x && x.remarks ? '<br><small style="color:var(--muted)">💬 ' + esc(x.remarks) + '</small>' : ''}${x && x.reviewedAt ? '<br><small style="color:var(--muted)">' + fmtDate(x.reviewedAt) + '</small>' : ''}</span>${badge(Data.st(subs, r.id))}</div>`; }).join('');
      return `<div class="it ${st}"><div class="card reveal"><div class="head"><b style="font-size:1.05rem">${of.icon} ${esc(of.name)}</b>${badge(st)}</div><div class="sub">${items}</div></div></div>`;
    }).join('')}</div>`;
    UI.observe(view); setTimeout(() => { const b = $('.bar i', view); if (b) b.style.width = o.pct + '%'; }, 150);
  });
})();
