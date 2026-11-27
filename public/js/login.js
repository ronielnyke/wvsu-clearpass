'use strict';
(function () {
  const cur = Auth.current(); if (cur) { location.replace(Auth.home(cur)); return; }
  UI.initEyes(); UI.effects();
  const alertBox = $('#alert'), btn = $('#go');
  const fail = m => { alertBox.textContent = m; alertBox.classList.add('show'); };
  $('#form').addEventListener('submit', async e => {
    e.preventDefault(); alertBox.classList.remove('show');
    const ident = $('#ident').value, pw = $('#pw').value;
    if (!ident.trim() || !pw) return fail('Please enter your email/ID and password.');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const u = await Auth.login(ident, pw, $('#remember').checked);
      UI.toast('Welcome, ' + u.name + '!'); setTimeout(() => { location.href = Auth.home(u); }, 600);
    } catch (err) { fail(err.message); btn.disabled = false; btn.textContent = 'Log in'; }
  });
})();
