'use strict';
(function () {
  const u0 = Auth.require('student'); if (!u0) return;
  const view = UI.shell(u0, 'requirements', 'Clearance Requirements'); UI.loading(view);
  const OK = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']; let filter = 'all', subs = {}, live, busy = false;
  function render(s) {
    if (s) subs = s.subs;
    const cards = REQS.filter(r => filter === 'all' || Data.st(subs, r.id) === filter);
    view.innerHTML = `<div class="chips">${[['all', 'All'], ['none', 'To submit'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(c => `<button data-f="${c[0]}" class="${filter === c[0] ? 'on' : ''}">${c[1]}</button>`).join('')}</div>
    <div class="grid g3">${cards.length ? cards.map(r => {
      const s = subs[r.id], st = Data.st(subs, r.id), can = st === 'none' || st === 'rejected';
      return `<div class="card req reveal" data-id="${r.id}"><div class="head"><div><div class="tag">${officeOf(r.office).icon} ${esc(officeOf(r.office).name)}</div><h4>${esc(r.title)}</h4></div>${badge(st)}</div><p>${esc(r.desc)}</p>
      ${s ? `<div class="file">📎 ${esc(s.fileName)} · ${fmtSize(s.fileSize)}</div>` : ''}
      ${st === 'rejected' ? `<div class="note"><b>Rejected:</b> ${esc(s.remarks || 'No remarks provided.')}</div>` : ''}
      ${st === 'approved' ? '<div class="file" style="background:#e3f8ea;color:#13873a">✔ Approved by ' + esc(s.reviewedBy || 'office') + '</div>' : ''}
      ${st === 'pending' ? '<div class="file" style="background:#fff3da;color:#b9770a">⏳ Waiting for office review</div>' : ''}
      ${can ? `<label class="drop"><input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">${s ? '🔁 Resubmit file' : '⬆️ Click or drop a file here'}<br><small>PDF, JPG, PNG, DOC · max 4 MB</small></label>` : ''}</div>`;
    }).join('') : '<div class="empty-st card" style="grid-column:1/-1"><div class="em">📭</div>Nothing here yet.</div>'}</div>`;
    UI.observe(view);
  }
  async function handle(id, file) {
    if (!file || busy) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!OK.includes(ext)) return UI.toast('Unsupported file type. Use PDF, JPG, PNG, DOC or DOCX.', 'err');
    if (file.size > 4 * 1024 * 1024) return UI.toast('File is too large (max 4 MB).', 'err');
    busy = true; UI.toast('Uploading…');
    try { const fileData = await Data.readFile(file); await API.call('submit', { reqId: id, fileName: file.name, fileSize: file.size, fileData }); UI.toast('Submitted! Waiting for office review.'); await live.refresh(); }
    catch (e) { UI.toast(e.message, 'err'); }
    busy = false;
  }
  view.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; render(); } });
  view.addEventListener('change', e => { if (e.target.type === 'file') handle(e.target.closest('.req').dataset.id, e.target.files[0]); });
  view.addEventListener('dragover', e => { const d = e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
  view.addEventListener('dragleave', e => { const d = e.target.closest('.drop'); if (d) d.classList.remove('over'); });
  view.addEventListener('drop', e => { const d = e.target.closest('.drop'); if (d) { e.preventDefault(); d.classList.remove('over'); handle(d.closest('.req').dataset.id, e.dataTransfer.files[0]); } });
  live = UI.live(() => API.call('state'), render);
})();
