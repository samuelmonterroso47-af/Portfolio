/* Analítica anónima del portafolio: una fila por visita con tiempo total, tiempo por sección,
   clics y profundidad de scroll. No usa cookies ni guarda la IP. */
(function () {
  try {
    if (localStorage.getItem("escm-admin") === "1") return; // visitas del dueño no cuentan
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
  } catch (e) { return; }

  var rid = function () { return (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 36); };
  var visitorId, sessionId;
  try {
    visitorId = localStorage.getItem("escm-vid");
    if (!visitorId) { visitorId = rid(); localStorage.setItem("escm-vid", visitorId); }
    var sk = "escm-sid:" + location.pathname;
    sessionId = sessionStorage.getItem(sk);
    if (!sessionId) { sessionId = rid(); sessionStorage.setItem(sk, sessionId); }
  } catch (e) { visitorId = rid(); sessionId = rid(); }

  var ref = null;
  try {
    ref = new URLSearchParams(location.search).get("ref");
    if (ref) sessionStorage.setItem("escm-ref", ref); else ref = sessionStorage.getItem("escm-ref");
  } catch (e) {}

  // ---- tiempo visible (solo cuenta mientras la pestaña está a la vista) ----
  var visibleMs = 0, since = document.visibilityState === "visible" ? Date.now() : 0;
  function tick() { if (since) { visibleMs += Date.now() - since; since = Date.now(); } }

  // ---- tiempo por sección (la sección que ocupa más pantalla) ----
  var secMs = {}, current = null, currentSince = 0, ratios = {};
  var names = {};
  var secs = Array.prototype.slice.call(document.querySelectorAll("section[id], footer[id], main[id]"));
  secs.forEach(function (s) {
    var h = s.querySelector("h1, h2");
    names[s.id] = (h ? h.textContent.trim() : s.id).slice(0, 60);
  });
  function switchSection(id) {
    var now = Date.now();
    if (current && currentSince && document.visibilityState === "visible") secMs[current] = (secMs[current] || 0) + (now - currentSince);
    current = id; currentSince = now;
  }
  if ("IntersectionObserver" in window && secs.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { ratios[e.target.id] = e.intersectionRect.height; });
      var best = null, bestH = 0;
      Object.keys(ratios).forEach(function (k) { if (ratios[k] > bestH) { bestH = ratios[k]; best = k; } });
      if (best !== current) switchSection(best);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    secs.forEach(function (s) { io.observe(s); });
  }

  // ---- profundidad de scroll ----
  var maxScroll = 0;
  function onScroll() {
    var d = document.documentElement, h = d.scrollHeight - d.clientHeight;
    var p = h > 0 ? Math.round((window.scrollY / h) * 100) : 100;
    if (p > maxScroll) maxScroll = Math.min(100, p);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---- clics en enlaces y botones ----
  var clicks = [];
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("a, button");
    if (!el || clicks.length >= 60) return;
    var label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
    var href = el.tagName === "A" ? (el.getAttribute("href") || "").slice(0, 120) : "";
    clicks.push({ l: label || href || el.tagName.toLowerCase(), h: href, t: Math.round((visibleMs + (since ? Date.now() - since : 0)) / 1000) });
    send(false);
  }, true);

  // ---- envío ----
  function payload() {
    tick();
    var now = Date.now(), sec = {};
    Object.keys(secMs).forEach(function (k) { sec[k] = secMs[k]; });
    if (current && currentSince && document.visibilityState === "visible") sec[current] = (sec[current] || 0) + (now - currentSince);
    var out = {};
    Object.keys(sec).forEach(function (k) { var s = Math.round(sec[k] / 1000); if (s > 0) out[names[k] || k] = s; });
    return JSON.stringify({
      sessionId: sessionId, visitorId: visitorId, path: location.pathname, ref: ref,
      referrer: document.referrer || null, duration: Math.round(visibleMs / 1000),
      maxScroll: maxScroll, sections: out, clicks: clicks
    });
  }
  var lastSent = 0;
  function send(force) {
    if (!force && Date.now() - lastSent < 4000) return;
    lastSent = Date.now();
    var body = payload();
    try {
      if (navigator.sendBeacon && navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }))) return;
    } catch (e) {}
    try { fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }); } catch (e) {}
  }

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      tick(); if (current && currentSince) { secMs[current] = (secMs[current] || 0) + (Date.now() - currentSince); currentSince = 0; }
      since = 0; send(true);
    } else {
      // Solo reinicia los relojes si estaban detenidos (evita perder tiempo con avisos repetidos).
      if (!since) since = Date.now();
      if (!currentSince) currentSince = Date.now();
    }
  });
  window.addEventListener("pagehide", function () { send(true); });
  send(true);                       // registra la visita al entrar
  setInterval(function () { if (document.visibilityState === "visible") send(true); }, 30000); // y actualiza cada 30 s
})();
