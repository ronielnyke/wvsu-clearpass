"use strict";
(function () {
  const u0 = Auth.require("student");
  if (!u0) return;
  const view = UI.shell(u0, "confirmation", "Clearance Confirmation");
  UI.loading(view);
  let live;
  function render(s) {
    const me = s.user,
      subs = s.subs,
      o = Data.overall(subs),
      period = Data.cycle(me);
    if (!o.completed) {
      const left = OFFICES.filter(
        (of) => Data.officeStatus(subs, of.id) !== "approved",
      );
      view.innerHTML = `<div class="card lock"><div class="em">🔒</div><h2 style="color:var(--navy);margin:8px 0">Clearance not yet completed</h2><p style="color:var(--muted);max-width:520px;margin:0 auto 16px">“Clearance Completed” will appear here once all ${OFFICES.length} offices approve your requirements.</p><div class="bar" style="max-width:420px;margin:0 auto 6px"><i></i></div><small style="color:var(--muted)">${o.offApproved} of ${OFFICES.length} offices cleared · ${o.pct}%</small></div>
      <div class="card" style="margin-top:22px"><h3>Offices still needed</h3>${left.map((of) => `<div class="list-item"><div class="ib">${of.icon}</div><div class="tx"><b>${esc(of.name)}</b></div>${badge(Data.officeStatus(subs, of.id))}</div>`).join("")}<a class="btn" href="submission.html" style="margin-top:14px">Go to Document Submission →</a></div>`;
      setTimeout(() => {
        const b = $(".bar i", view);
        if (b) b.style.width = o.pct + "%";
      }, 150);
      return;
    }
    const ev = s.history.find(
      (h) => h.type === "complete" && h.cycle === period,
    );
    const issued = ev ? ev.date : Date.now();
    const rows = OFFICES.map((of) => {
      const xs = REQS.filter((r) => r.office === of.id)
        .map((r) => subs[r.id])
        .filter(Boolean)
        .sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0));
      const x = xs[0] || {};
      return `<tr><td data-label="Office">${of.icon} ${esc(of.name)}</td><td data-label="Approved by">${esc(x.reviewedBy || "—")}</td><td data-label="Date">${x.reviewedAt ? fmtDate(x.reviewedAt) : "—"}</td><td data-label="Status">${badge("approved")}</td></tr>`;
    }).join("");
    view.innerHTML = `<div class="certbig"><div class="seal">🏅</div><h1 class="grad-text">CLEARANCE COMPLETED</h1><p style="color:var(--muted)">This confirms that</p><h2>${esc(me.name)}</h2><p style="color:var(--muted)">${esc(me.idNo)} · ${esc(me.course || "")} ${esc(me.year || "")}</p>
    <p style="margin-top:10px">has been cleared by <b>all ${OFFICES.length} offices</b> for <b>${esc(period)}</b>.</p>
    <table class="tbl"><thead><tr><th>Office</th><th>Approved by</th><th>Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="color:var(--muted);font-size:.82rem;margin-top:20px">Reference No. CLR-${esc(me.id.slice(0, 6).toUpperCase())}-${(me.cycleIdx || 0) + 1} · Issued ${fmtDate(issued)}<br>WVSU–Lambunao Campus · Student Clearance Tracking and Management System</p></div>
    <div class="mfoot noprint" style="justify-content:center;margin-top:20px"><button class="btn" id="print">🖨️ Print / Save as PDF</button><button class="btn ghost" id="next">Start next clearance</button></div>`;
    $("#print", view).onclick = () => window.print();
    $("#next", view).onclick = () => {
      const m = UI.modal(
        '<h3>Start next clearance?</h3><p style="margin-bottom:16px">Your current requirements will be cleared and a new clearance period will begin. This completed record stays in your history.</p><div class="mfoot"><button class="btn ghost sm" id="n">Cancel</button><button class="btn sm" id="y">Start new</button></div>',
      );
      $("#n", m.el).onclick = m.close;
      $("#y", m.el).onclick = async () => {
        $("#y", m.el).disabled = true;
        try {
          await API.call("reset");
          m.close();
          UI.toast("New clearance period started.");
          live.refresh();
        } catch (e) {
          UI.toast(e.message, "err");
          $("#y", m.el).disabled = false;
        }
      };
    };
    const key = "wvsu_conf2_" + me.id + "_" + (me.cycleIdx || 0);
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      setTimeout(UI.confetti, 400);
    }
  }
  live = UI.live(() => API.call("state"), render);
})();
