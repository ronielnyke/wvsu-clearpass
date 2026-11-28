'use strict';
(function () {
  const u = Auth.require('office'); if (!u) return;
  const of = officeOf(u.office), view = UI.shell(u, 'office', of.name + ' Dashboard'); UI.loading(view);
  let filter = 'pending', q = '', all = [], live;
  const title = id => (REQS.find(r => r.id === id) || {}).title || id;
  function render(d) {
    if (d) all = d.list.sort((a, b) => b.submittedAt - a.submittedAt);
    const c = k => all.filter(s => s.status === k).length;
    const list = all.filter(s => filter === 'all' || s.status === filter).filter(s => (s.name + s.idNo + title(s.reqId)).toLowerCase().includes(q.toLowerCase()));
    view.innerHTML = `<div class="hello"><div><h2>${of.icon} ${esc(of.name)}</h2><p>Review submitted requirements, then approve or reject them.</p></div></div>
    <div class="stats"><div class="card stat"><div class="si" style="background:#fff3da">⏳</div><div><b>${c('pending')}</b><span>Pending</span></div></div>
    <div class="card stat"><div class="si" style="background:#e3f8ea">✅</div><div><b>${c('approved')}</b><span>Approved</span></div></div>
    <div class="card stat"><div class="si" style="background:#fde8e9">⚠️</div><div><b>${c('rejected')}</b><span>Rejected</span></div></div>
    <div class="card stat"><div class="si" style="background:#e4eeff">📥</div><div><b>${all.length}</b><span>Total submissions</span></div></div></div>
    <div class="card"><div class="tools"><div class="chips" style="margin:0">${[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']].map(x => `<button data-f="${x[0]}" class="${filter === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div><input class="search" id="q" placeholder="🔍 Search student or requirement" value="${esc(q)}"></div>
    ${list.length ? `<table class="tbl"><thead><tr><th>Student</th><th>Requirement</th><th>File</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>${list.map(s =>
      `<tr><td data-label="Student"><b>${esc(s.name)}</b><br><small style="color:var(--muted)">${esc(s.idNo)}</small></td><td data-label="Requirement">${esc(title(s.reqId))}</td><td data-label="File">📎 ${esc(s.fileName)}</td><td data-label="Submitted">${fmtDate(s.submittedAt)}</td><td data-label="Status">${badge(s.status)}</td><td data-label=""><div class="pill-row"><button class="btn sm" data-r="${s.studentId}|${s.reqId}">${s.status === 'pending' ? 'Review' : 'View'}</button><button class="btn sm ghost" data-m="${s.studentId}" title="Message student">💬</button></div></td></tr>`).join('')}</tbody></table>` : '<div class="empty-st"><div class="em">📭</div>No submissions found.</div>'}</div>`;
    const qi = $('#q', view); qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; render(); const n = $('#q', view); n.focus(); n.setSelectionRange(pos, pos); });
  }
  function review(sid, rid) {
    const s = all.find(x => x.studentId === sid && x.reqId === rid); if (!s) return;
    const m = UI.modal(`<h3>Review Submission</h3><div class="kv"><span>Student</span><b>${esc(s.name)} (${esc(s.idNo)})</b><span>Course</span><div>${esc(s.course || '—')} ${esc(s.year || '')}</div><span>Requirement</span><div>${esc(title(rid))}</div><span>File</span><div>📎 ${esc(s.fileName)} · ${fmtSize(s.fileSize)}<br><button class="btn sm ghost" id="dl" style="margin-top:6px">⬇ Download file</button></div><span>Status</span><div>${badge(s.status)}</div></div>
    ${s.status === 'pending' ? '<div class="field"><label for="rm">Remarks (required when rejecting)</label><textarea id="rm" placeholder="Write a short note for the student…"></textarea></div><div class="mfoot"><button class="btn ghost sm" id="c">Cancel</button><button class="btn danger sm" id="rj">Reject</button><button class="btn ok sm" id="ap">Approve</button></div>' : `<p style="margin-bottom:12px"><b>Remarks:</b> ${esc(s.remarks || '—')}<br><small style="color:var(--muted)">By ${esc(s.reviewedBy || '—')} · ${s.reviewedAt ? fmtDate(s.reviewedAt) : ''}</small></p><div class="mfoot"><button class="btn sm" id="c">Close</button></div>`}`);
    $('#c', m.el).onclick = m.close;
    $('#dl', m.el).onclick = async e => { const b = e.currentTarget; b.disabled = true; try { await Data.download({ studentId: sid, reqId: rid }); } catch (err) { UI.toast(err.message, 'err'); } b.disabled = false; };
    if (s.status !== 'pending') return;
    const act = async decision => {
      const rm = $('#rm', m.el).value.trim();
      if (decision === 'rejected' && !rm) { UI.toast('Please add remarks before rejecting.', 'err'); $('#rm', m.el).focus(); return; }
      $$('button', m.el).forEach(b => { b.disabled = true; });
      try { await API.call('review', { studentId: sid, reqId: rid, decision, remarks: rm }); m.close(); UI.toast(decision === 'approved' ? 'Requirement approved.' : 'Requirement rejected.'); live.refresh(); }
      catch (err) { UI.toast(err.message, 'err'); $$('button', m.el).forEach(b => { b.disabled = false; }); }
    };
    $('#ap', m.el).onclick = () => act('approved'); $('#rj', m.el).onclick = () => act('rejected');
  }
  view.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f) { filter = f.dataset.f; render(); return; } const mm = e.target.closest('[data-m]'); if (mm) { UI.compose({ to: 'user:' + mm.dataset.m }); return; } const b = e.target.closest('[data-r]'); if (b) { const p = b.dataset.r.split('|'); review(p[0], p[1]); } });
  live = UI.live(() => API.call('office'), render, 15000);
})();
