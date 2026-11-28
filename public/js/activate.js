'use strict';
(function () {
  const u = Auth.require('office', { inactive: true }); if (!u) return;
  if (u.activated) { location.replace('office.html'); return; }
  UI.effects();
  const mask = e => { const p = String(e).split('@'); return p[0].slice(0, 2) + '•••@' + (p[1] || ''); };
  $('#sub').innerHTML = 'We emailed a one-time access code to <b>' + esc(mask(u.email)) + '</b>. Paste it below to enter the system.';
  const status = $('#status'), alertBox = $('#alert'), resend = $('#resend'), cd = $('#cd'), codeEl = $('#code'), go = $('#go');
  let next = 0, act = null;
  try { act = JSON.parse(sessionStorage.getItem('wvsu_act') || 'null'); } catch (e) { act = null; }
  const info = (m, c) => { status.className = 'info ' + (c || ''); status.innerHTML = m; };
  const fail = m => { alertBox.textContent = m; alertBox.classList.add('show'); const bx = $('.auth-box'); bx.classList.remove('shake'); void bx.offsetWidth; bx.classList.add('shake'); };
  if (act && act.sent) { info('✅ Code sent! Check your inbox (and the spam folder).', 'ok'); next = (act.at || Date.now()) + 60000; }
  else if (act && act.error) { info('⚠️ ' + esc(act.error), 'bad'); }
  else if (act && act.wait) { info('📧 A code was just sent. Check your inbox (and the spam folder).', 'ok'); next = Date.now() + act.wait * 1000; }
  else info('📧 Tap “Resend code” if you did not receive an email.');
  setInterval(() => { const s = Math.ceil((next - Date.now()) / 1000); resend.disabled = s > 0; cd.textContent = s > 0 ? 'You can resend in ' + s + 's' : 'Did not get the email?'; }, 500);
  codeEl.addEventListener('input', () => { let v = codeEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4); codeEl.value = v; alertBox.classList.remove('show'); });
  resend.onclick = async () => {
    resend.disabled = true; alertBox.classList.remove('show');
    try { await API.call('resendcode'); next = Date.now() + 60000; info('✅ A new code was sent to your email. The old code no longer works.', 'ok'); UI.toast('New code sent to your email 📧'); }
    catch (e) { fail(e.message); const m = /(\d+) seconds/.exec(e.message); next = m ? Date.now() + (+m[1]) * 1000 : 0; }
  };
  $('#form').addEventListener('submit', async e => {
    e.preventDefault(); alertBox.classList.remove('show'); UI.unlock();
    const code = codeEl.value.replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) return fail('Please enter the 8-character code from your email.');
    go.disabled = true; go.classList.add('loading'); go.textContent = 'Verifying…';
    try { const d = await API.call('activate', { code }); Auth.update(d.user); sessionStorage.setItem('wvsu_reminded', '1'); UI.welcome(d.user, { count: 0, items: [] }, () => { location.href = 'office.html'; }); }
    catch (err) { fail(err.message); go.disabled = false; go.classList.remove('loading'); go.textContent = 'Verify & enter system'; }
  });
  $('#out').onclick = e => { e.preventDefault(); Auth.logout(); };
})();
