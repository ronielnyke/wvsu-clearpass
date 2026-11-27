"use strict";
(function () {
  const cur = Auth.current();
  if (cur) {
    location.replace(Auth.home(cur));
    return;
  }
  UI.initEyes();
  UI.effects();
  let role = "student";
  $("#office").innerHTML = OFFICES.map(
    (o) => `<option value="${o.id}">${esc(o.name)}</option>`,
  ).join("");
  const alertBox = $("#alert");
  $$(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      role = b.dataset.role;
      $$(".seg button").forEach((x) => x.classList.toggle("on", x === b));
      $("#stuFields").style.display = role === "student" ? "" : "none";
      $("#offField").style.display = role === "office" ? "" : "none";
      $("#codeField").style.display = role === "office" ? "" : "none";
      $("#idLabel").textContent =
        role === "student" ? "Student ID Number" : "Employee ID Number";
      $("#idNo").placeholder = role === "student" ? "2023-0001" : "EMP-0001";
    }),
  );
  const score = (p) =>
    (p.length >= 8) +
    (/[a-z]/.test(p) && /[A-Z]/.test(p)) +
    /\d/.test(p) +
    /[^A-Za-z0-9]/.test(p);
  const colors = ["#e5484d", "#f59e0b", "#3a8bf5", "#1fae4b"],
    labels = ["Weak", "Fair", "Good", "Strong"];
  function checkStrength() {
    const p = $("#pw").value,
      s = score(p),
      bars = $$("#meter i"),
      h = $("#strength");
    bars.forEach((b, i) => {
      b.style.background = p && i < s ? colors[Math.max(s - 1, 0)] : "";
    });
    if (!p) {
      h.textContent = "Use 8+ characters with letters and numbers.";
      h.className = "hint";
      return;
    }
    h.textContent = "Password strength: " + labels[Math.max(s - 1, 0)];
    h.className = "hint " + (s >= 3 ? "ok" : "bad");
  }
  function checkMatch() {
    const a = $("#pw").value,
      b = $("#pw2").value,
      w = $("#pw2wrap"),
      h = $("#match");
    if (!b) {
      w.className = "input has-eye";
      h.textContent = "";
      h.className = "hint";
      return false;
    }
    const ok = a === b;
    w.className = "input has-eye " + (ok ? "ok" : "bad");
    h.textContent = ok ? "✔ Passwords match" : "✖ Passwords do not match";
    h.className = "hint " + (ok ? "ok" : "bad");
    return ok;
  }
  $("#pw").addEventListener("input", () => {
    checkStrength();
    checkMatch();
  });
  $("#pw2").addEventListener("input", checkMatch);
  const fail = (m) => {
    alertBox.textContent = m;
    alertBox.classList.add("show");
    const bx = $(".auth-box");
    bx.classList.remove("shake");
    void bx.offsetWidth;
    bx.classList.add("shake");
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  $("#form").addEventListener("submit", (e) => {
    e.preventDefault();
    alertBox.classList.remove("show");
    const d = {
      role,
      name: $("#name").value.trim(),
      idNo: $("#idNo").value.trim(),
      email: $("#email").value.trim(),
      password: $("#pw").value,
      course: $("#course").value,
      year: $("#year").value,
      office: $("#office").value,
      code: $("#code").value,
    };
    if (d.name.length < 3) return fail("Please enter your full name.");
    if (!d.idNo) return fail("Please enter your ID number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      return fail("Please enter a valid email address.");
    if (
      d.password.length < 8 ||
      !/[A-Za-z]/.test(d.password) ||
      !/\d/.test(d.password)
    )
      return fail(
        "Password must be at least 8 characters with letters and numbers.",
      );
    if (d.password !== $("#pw2").value) {
      checkMatch();
      return fail("Passwords do not match.");
    }
    if (role === "office" && !d.code.trim())
      return fail("Please enter the office access code.");
    const btn = $("#form button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Creating account…";
    Auth.register(d)
      .then(() => {
        UI.toast("Account created! Redirecting to login…");
        setTimeout(() => {
          location.href = "login.html";
        }, 1100);
      })
      .catch((err) => {
        fail(err.message);
        btn.disabled = false;
        btn.textContent = "Create Account";
      });
  });
})();
