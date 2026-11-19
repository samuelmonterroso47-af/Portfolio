/* Registro anónimo de visitas (una por página y sesión). No usa cookies ni guarda la IP. */
(function () {
  try {
    if (localStorage.getItem("escm-admin") === "1") return; // visitas del dueño no cuentan
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    var key = "escm-visit:" + location.pathname;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    var id = localStorage.getItem("escm-vid");
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 36);
      localStorage.setItem("escm-vid", id);
    }
    var ref = new URLSearchParams(location.search).get("ref");
    if (ref) sessionStorage.setItem("escm-ref", ref); else ref = sessionStorage.getItem("escm-ref");
    var body = JSON.stringify({ visitorId: id, path: location.pathname, ref: ref, referrer: document.referrer || null });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }));
    else fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true });
  } catch (e) {}
})();
