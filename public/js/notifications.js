'use strict';
(function () {
  const u = Auth.require(); if (!u) return;
  const isAdmin = u.role === 'admin';
  const view = UI.shell(u, 'notifications', 'Notifications'); UI.loading(view);
  let f = 'all', q = '', list = [], sent = [], sel = new Set(), quiet = false, live;
  const dayKey = t => { const d = new Date(t), n = new Date(); const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(n.getFullYear(), n.getMonth(), n.getDate()); const diff = Math.round((b - a) / 864e5); return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier'; };
  const target = fr => fr.role === 'student' ? 'user:' + fr.id : fr.role === 'admin' ? 'admin' : 'office:' + fr.office;
  const sweepEls = els => els.forEach((el, i) => { el.style.animation = 'sweepOut .45s ' + Math.min(i, 10) * 45 + 'ms ease-in forwards'; });
  const sweepTime = n => 450 + Math.min(n, 10) * 45;
  function current() {
    const ql = q.toLowerCase();
    const base = f === 'sent' ? sent : list.filter(n => f === 'all' || (f === 'unread' && !n.read) || (f === 'important' && n.important) || (f === 'messages' && n.from));
    return base.filter(n => !ql || (n.text + (n.from ? n.from.name : '') + (n.to || '')).toLowerCase().includes(ql));
  }
  function items(arr, isSent) {
    let html = '', last = '', i = 0;
    arr.forEach(n => {
      const g = dayKey(n.time); if (g !== last) { html += `<div class="ngroup">${g}</div>`; last = g; }
      const t = isSent ? { ico: '📤', cls: 'blue' } : UI.ntype(n.text, n);
      const head = isSent ? `<div class="nfrom">To: ${esc(n.to)}${n.count > 1 ? ' · ' + n.count + ' recipients' : ''}</div>` : n.from ? `<div class="nfrom">✉️ ${esc(n.from.name)} · ${esc(UI.roleLabel(n.from))}</div>` : '';
      const acts = isSent ? '' : `<div class="acts2">${n.from ? `<button class="nx" data-reply="${esc(n.id)}">↩ Reply</button>` : ''}${n.read ? '' : `<button class="nx" data-read="${esc(n.id)}">✓ Mark read</button>`}</div>`;
      const picked = sel.has(n.id);
      html += `<div class="nitem ${!isSent && !n.read ? 'un' : ''} ${picked ? 'picked' : ''}" style="${quiet ? 'animation:none' : 'animation-delay:' + Math.min(i++, 12) * 45 + 'ms'}"><label class="ck" title="Select"><input type="checkbox" data-sel="${esc(n.id)}" ${picked ? 'checked' : ''}><i>✓</i></label><div class="nb ${t.cls}">${t.ico}</div><div class="tx">${n.important ? '<span class="badge b-rejected" style="margin-bottom:6px">Important</span>' : ''}${head}<b style="font-weight:${isSent || n.read ? 500 : 700}">${esc(n.text)}</b><small title="${fmtDate(n.time)}">${UI.ago(n.time)} · ${fmtDate(n.time)}</small>${acts}</div>${!isSent && !n.read ? '<span class="dotun" title="Unread"></span>' : ''}</div>`;
    });
    return html;
  }
  function render(d) {
    if (d) { list = d.list; sent = d.sent; }
    const known = new Set([...list, ...sent].map(n => n.id)); sel.forEach(id => { if (!known.has(id)) sel.delete(id); });
    const un = list.filter(n => !n.read).length, msgs = list.filter(n => n.from).length, imp = list.filter(n => n.important).length;
    const shown = current(), selN = shown.filter(n => sel.has(n.id)).length, allSel = shown.length > 0 && selN === shown.length;
    const html = items(shown, f === 'sent'); quiet = false;
    view.innerHTML = `<div class="nhero"><span class="bigbell">🔔</span><div><h2>${un ? 'You have ' + un + ' unread notification' + (un > 1 ? 's' : '') : 'You are all caught up!'}</h2><p>${list.length} total · updates appear automatically</p>${isAdmin ? '<p style="font-size:.78rem;opacity:.9;margin-top:4px">🧹 Clear all removes notifications and sent messages of <b>every account</b> (you can undo).</p>' : ''}
    <div class="stats3"><span class="st3">🔵 ${un} unread</span><span class="st3">✉️ ${msgs} messages</span><span class="st3">❗ ${imp} important</span></div></div>
    <div class="acts"><button class="btn light sm" id="new">✉️ New message</button>${window.Notification && Notification.permission === 'default' ? '<button class="btn light sm" id="alerts">🔔 Enable alerts</button>' : ''}<button class="btn light sm" id="mark" ${un ? '' : 'disabled'}>✔ Mark all as read</button>${isAdmin ? '<button class="btn clr sm" id="clear">🧹 Clear all (everyone)</button>' : ''}</div></div>
    <div class="nsearch"><input class="search" id="nq" placeholder="🔍 Search notifications" value="${esc(q)}"></div>
    <div class="chips" style="margin-top:12px">${[['all', 'All (' + list.length + ')'], ['unread', 'Unread (' + un + ')'], ['messages', 'Messages (' + msgs + ')'], ['important', 'Important (' + imp + ')'], ['sent', 'Sent (' + sent.length + ')']].map(c => `<button data-f="${c[0]}" class="${f === c[0] ? 'on' : ''}">${c[1]}</button>`).join('')}</div>
    ${shown.length ? `<div class="seltools"><label class="selall"><span class="ck"><input type="checkbox" id="selall" ${allSel ? 'checked' : ''}><i>✓</i></span> Select all</label><span class="selcount">${selN} selected</span><button class="btn danger sm" id="delsel" ${selN ? '' : 'disabled'}>🗑 Delete selected${selN ? ' (' + selN + ')' : ''}</button></div>` : ''}
    ${html || '<div class="card empty-st"><div class="em">' + (f === 'sent' ? '📤' : '🔕') + '</div><b>' + (f === 'sent' ? 'Nothing sent yet' : q ? 'No results' : 'No notifications') + '</b><br>' + (f === 'sent' ? 'Messages you send will appear here.' : 'New updates will show up here automatically.') + '</div>'}`;
    $('#new', view).onclick = () => UI.compose();
    const nq = $('#nq', view); nq.addEventListener('input', () => { q = nq.value; const pos = nq.selectionStart; quiet = true; render(); const x = $('#nq', view); x.focus(); x.setSelectionRange(pos, pos); });
    const al = $('#alerts', view); if (al) al.onclick = async () => { try { const r = await Notification.requestPermission(); UI.toast(r === 'granted' ? 'Alerts enabled.' : 'Alerts were not allowed.', r === 'granted' ? '' : 'err'); } catch (e) { UI.toast('Alerts are not supported on this browser.', 'err'); } render(); };
    const m = $('#mark', view); if (m) m.onclick = async () => { m.disabled = true; try { await API.call('markread'); await live.refresh(); UI.toast('All notifications marked as read.'); } catch (e) { UI.toast(e.message, 'err'); } };
    const c = $('#clear', view); if (c) c.onclick = () => { c.disabled = true; const els = $$('.nitem', view); sweepEls(els); setTimeout(() => { list = []; sent = []; sel.clear(); render(); UI.clearNotifs(() => live.refresh(), true); }, sweepTime(els.length)); };
    const del = $('#delsel', view); if (del) del.onclick = () => {
      const ids = shown.filter(n => sel.has(n.id)).map(n => n.id); if (!ids.length) return; del.disabled = true; const kind = f === 'sent' ? 'sent' : 'notif';
      sweepEls($$('.nitem.picked', view));
      setTimeout(async () => {
        try {
          const r = await API.call('notifdelete', { ids, kind }); ids.forEach(id => sel.delete(id));
          if (kind === 'sent') sent = sent.filter(x => !ids.includes(x.id)); else list = list.filter(x => !ids.includes(x.id));
          quiet = true; render(); UI.sfx('clear');
          UI.toast('Deleted ' + r.count + ' message' + (r.count > 1 ? 's' : ''), '', { label: 'Undo', fn: async () => { try { await API.call('notifundo', { kind }); UI.toast('Messages restored.'); } catch (e) { UI.toast(e.message, 'err'); } live.refresh(); } });
        } catch (e) { UI.toast(e.message, 'err'); live.refresh(); }
      }, sweepTime(ids.length));
    };
  }
  view.addEventListener('change', e => {
    const one = e.target.closest('[data-sel]'); const all = e.target.closest('#selall');
    if (one) { if (one.checked) sel.add(one.dataset.sel); else sel.delete(one.dataset.sel); quiet = true; render(); }
    else if (all) { current().forEach(n => { if (all.checked) sel.add(n.id); else sel.delete(n.id); }); quiet = true; render(); }
  });
  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-f]'); if (b) { f = b.dataset.f; sel.clear(); render(); return; }
    const r = e.target.closest('[data-reply]'); if (r) { const n = list.find(x => x.id === r.dataset.reply); if (n && n.from) UI.compose({ to: target(n.from) }); return; }
    const rd = e.target.closest('[data-read]'); if (rd) { const n = list.find(x => x.id === rd.dataset.read); if (n) { n.read = true; quiet = true; render(); try { await API.call('notifread', { id: n.id }); } catch (err) { /* ignore */ } } }
  });
  window.addEventListener('wvsu:sent', () => live.refresh());
  live = UI.live(async () => ({ list: (await API.call('notifs')).list, sent: (await API.call('notifsent')).list }), render, 10000);
})();
