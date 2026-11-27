"use strict";
(function () {
  const u = Auth.require();
  if (!u) return;
  const view = UI.shell(u, "notifications", "Notifications");
  UI.loading(view);
  let f = "all",
    list = [],
    sent = [],
    live;
  const dayKey = (t) => {
    const d = new Date(t),
      n = new Date();
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    const diff = Math.round((b - a) / 864e5);
    return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
  };
  const target = (fr) =>
    fr.role === "student"
      ? "user:" + fr.id
      : fr.role === "admin"
        ? "admin"
        : "office:" + fr.office;
  function items(arr, isSent) {
    let html = "",
      last = "",
      i = 0;
    arr.forEach((n) => {
      const g = dayKey(n.time);
      if (g !== last) {
        html += `<div class="ngroup">${g}</div>`;
        last = g;
      }
      const t = isSent ? { ico: "📤", cls: "blue" } : UI.ntype(n.text, n);
      const head = isSent
        ? `<div class="nfrom">To: ${esc(n.to)}${n.count > 1 ? " · " + n.count + " recipients" : ""}</div>`
        : n.from
          ? `<div class="nfrom">✉️ ${esc(n.from.name)} · ${esc(UI.roleLabel(n.from))}</div>`
          : "";
      html += `<div class="nitem ${!isSent && !n.read ? "un" : ""}" data-id="${esc(n.id)}" style="animation-delay:${Math.min(i++, 12) * 45}ms"><div class="nb ${t.cls}">${t.ico}</div><div class="tx">${n.important ? '<span class="badge b-rejected" style="margin-bottom:6px">Important</span>' : ""}${head}<b style="font-weight:${isSent || n.read ? 500 : 700}">${esc(n.text)}</b><small title="${fmtDate(n.time)}">${UI.ago(n.time)} · ${fmtDate(n.time)}</small>${!isSent && n.from ? `<div style="margin-top:8px"><button class="btn sm ghost" data-reply="${esc(n.id)}">↩ Reply</button></div>` : ""}</div>${!isSent && !n.read ? '<span class="dotun" title="Unread"></span>' : ""}</div>`;
    });
    return html;
  }
  function render(d) {
    if (d) {
      list = d.list;
      sent = d.sent;
    }
    const un = list.filter((n) => !n.read).length,
      msgs = list.filter((n) => n.from).length;
    const shown =
      f === "sent"
        ? sent
        : list.filter(
            (n) =>
              f === "all" ||
              (f === "unread" && !n.read) ||
              (f === "important" && n.important) ||
              (f === "messages" && n.from),
          );
    const html = items(shown, f === "sent");
    view.innerHTML = `<div class="nhero"><span class="bigbell">🔔</span><div><h2>${un ? "You have " + un + " unread notification" + (un > 1 ? "s" : "") : "You are all caught up!"}</h2><p>${list.length} total · updates appear automatically</p></div>
    <div class="acts"><button class="btn light sm" id="new">✉️ New message</button>${window.Notification && Notification.permission === "default" ? '<button class="btn light sm" id="alerts">🔔 Enable alerts</button>' : ""}<button class="btn light sm" id="mark" ${un ? "" : "disabled"}>✔ Mark all as read</button><button class="btn light sm" id="clear" ${list.length ? "" : "disabled"}>🗑 Clear all</button></div></div>
    <div class="chips">${[
      ["all", "All (" + list.length + ")"],
      ["unread", "Unread (" + un + ")"],
      ["messages", "Messages (" + msgs + ")"],
      ["important", "Important"],
      ["sent", "Sent (" + sent.length + ")"],
    ]
      .map(
        (c) =>
          `<button data-f="${c[0]}" class="${f === c[0] ? "on" : ""}">${c[1]}</button>`,
      )
      .join("")}</div>
    ${html || '<div class="card empty-st"><div class="em">' + (f === "sent" ? "📤" : "🔕") + "</div>" + (f === "sent" ? "You have not sent any message yet." : "No notifications to show.") + "</div>"}`;
    $("#new", view).onclick = () => UI.compose();
    const al = $("#alerts", view);
    if (al)
      al.onclick = async () => {
        try {
          const r = await Notification.requestPermission();
          UI.toast(
            r === "granted" ? "Alerts enabled." : "Alerts were not allowed.",
            r === "granted" ? "" : "err",
          );
        } catch (e) {
          UI.toast("Alerts are not supported on this browser.", "err");
        }
        render();
      };
    const m = $("#mark", view);
    if (m)
      m.onclick = async () => {
        m.disabled = true;
        try {
          await API.call("markread");
          await live.refresh();
          UI.toast("All notifications marked as read.");
        } catch (e) {
          UI.toast(e.message, "err");
        }
      };
    const c = $("#clear", view);
    if (c)
      c.onclick = () => {
        const md = UI.modal(
          '<h3>Clear all notifications?</h3><p style="margin-bottom:16px">This removes every notification from your list.</p><div class="mfoot"><button class="btn ghost sm" id="n">Cancel</button><button class="btn danger sm" id="y">Clear all</button></div>',
        );
        $("#n", md.el).onclick = md.close;
        $("#y", md.el).onclick = async () => {
          try {
            await API.call("notifclear");
            md.close();
            await live.refresh();
            UI.toast("Notifications cleared.");
          } catch (e) {
            UI.toast(e.message, "err");
          }
        };
      };
  }
  view.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-f]");
    if (b) {
      f = b.dataset.f;
      render();
      return;
    }
    const r = e.target.closest("[data-reply]");
    if (r) {
      const n = list.find((x) => x.id === r.dataset.reply);
      if (n && n.from) UI.compose({ to: target(n.from) });
      return;
    }
    const it = e.target.closest(".nitem.un");
    if (!it) return;
    const n = list.find((x) => x.id === it.dataset.id);
    if (!n) return;
    n.read = true;
    render();
    try {
      await API.call("notifread", { id: n.id });
    } catch (err) {
      /* ignore */
    }
  });
  window.addEventListener("wvsu:sent", () => live.refresh());
  live = UI.live(
    async () => ({
      list: (await API.call("notifs")).list,
      sent: (await API.call("notifsent")).list,
    }),
    render,
    10000,
  );
})();
