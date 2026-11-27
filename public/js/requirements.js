'use strict';
(function () {
  const u0 = Auth.require('student'); if (!u0) return;
  const view = UI.shell(u0, 'requirements', 'Requirements Checklist'); UI.loading(view);
  const mark = { approved: '✓', pending: '…', rejected: '✕', none: '' };
  UI.live(() => API.call('state'), s => {
    const subs = s.subs, o = Data.overall(subs);
    view.innerHTML = `<div class="card reveal" style="margin-bottom:22px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px"><h3 style="margin:0">${esc(Data.cycle(s.user))}</h3><span class="badge b-${o.completed ? 'approved' : 'progress'}">${o.approved} of ${o.total} completed</span></div><div class="bar"><i></i></div>
    <p style="color:var(--muted);font-size:.85rem;margin-top:8px">A requirement is checked once the office approves it. ${o.none + o.rejected ? '<b>' + (o.none + o.rejected) + '</b> still need your submission.' : 'All requirements are submitted.'}</p>
    ${o.none + o.rejected ? '<a class="btn sm" href="submission.html" style="margin-top:12px">Submit documents →</a>' : ''}</div>
    <div class="grid g3">${OFFICES.map(of => {
      const reqs = REQS.filter(r => r.office === of.id);
      return `<div class="card reveal"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><h3 style="margin:0">${of.icon} ${esc(of.name)}</h3>${badge(Data.officeStatus(subs, of.id))}</div>
      ${reqs.map(r => { const st = Data.st(subs, r.id), x = subs[r.id];
        return `<div class="list-item"><div class="chk ${st}" aria-label="${STATUS[st]}">${mark[st]}</div><div class="tx"><b>${esc(r.title)}</b><small>${esc(r.desc)}</small>${st === 'rejected' ? '<br><small style="color:var(--red)">💬 ' + esc(x.remarks || 'Rejected') + '</small>' : ''}</div>${st === 'none' || st === 'rejected' ? '<a class="btn sm" href="submission.html">Submit</a>' : ''}</div>`; }).join('')}</div>`;
    }).join('')}</div>`;
    UI.observe(view); setTimeout(() => { const b = $('.bar i', view); if (b) b.style.width = o.pct + '%'; }, 150);
  });
})();
