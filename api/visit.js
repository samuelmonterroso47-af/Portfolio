const { getSupabase } = require("../lib/supabase");

// Registra una visita anónima. No guarda la IP.
// País/ciudad salen de los encabezados que agrega Vercel (aproximados).

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|linkedinbot|embedly|headless|lighthouse|pingdom|uptime|curl|wget|python-requests/i;

function clip(v, n) {
  return typeof v === "string" ? v.slice(0, n) : null;
}

function header(req, name) {
  const v = req.headers[name];
  if (!v) return null;
  try { return decodeURIComponent(Array.isArray(v) ? v[0] : v); } catch (e) { return String(v); }
}

function parseUA(ua) {
  const device = /ipad|tablet/i.test(ua) ? "Tablet" : /mobi|android|iphone/i.test(ua) ? "Celular" : "Computadora";
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\//i.test(ua) ? "Opera" : /chrome|crios/i.test(ua) ? "Chrome"
    : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Otro";
  const os = /windows/i.test(ua) ? "Windows" : /android/i.test(ua) ? "Android" : /iphone|ipad|ios/i.test(ua) ? "iOS"
    : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "Otro";
  return { device, browser, os };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const ua = String(req.headers["user-agent"] || "");
  if (!ua || BOT.test(ua)) {
    res.status(204).end();
    return;
  }

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  let referrerHost = null;
  try {
    if (body.referrer) {
      const h = new URL(body.referrer).hostname.replace(/^www\./, "");
      if (!/escm-portafolio\.vercel\.app$|localhost$/.test(h)) referrerHost = h;
    }
  } catch (e) {}

  const sections = {};
  if (body.sections && typeof body.sections === "object") {
    Object.keys(body.sections).slice(0, 30).forEach((k) => {
      const v = Math.round(Number(body.sections[k]));
      if (v > 0) sections[clip(k, 60)] = Math.min(v, 86400);
    });
  }
  const clicks = Array.isArray(body.clicks) ? body.clicks.slice(0, 60).map((c) => ({
    l: clip(c && c.l, 60) || "", h: clip(c && c.h, 120) || "", t: Math.min(86400, Math.max(0, Math.round(Number(c && c.t) || 0)))
  })) : [];

  const row = {
    session_id: clip(body.sessionId, 40),
    visitor_id: clip(body.visitorId, 40),
    path: clip(body.path, 200) || "/",
    ref_tag: clip(body.ref, 80),
    referrer_host: clip(referrerHost, 120),
    country: clip(header(req, "x-vercel-ip-country"), 8),
    region: clip(header(req, "x-vercel-ip-country-region"), 40),
    city: clip(header(req, "x-vercel-ip-city"), 80),
    duration_s: Math.min(86400, Math.max(0, Math.round(Number(body.duration) || 0))),
    max_scroll: Math.min(100, Math.max(0, Math.round(Number(body.maxScroll) || 0))),
    sections,
    clicks,
    updated_at: new Date().toISOString(),
    ...parseUA(ua)
  };
  if (!row.session_id) {
    res.status(204).end();
    return;
  }

  try {
    // Una fila por visita: la primera llamada la crea y las siguientes la actualizan.
    const { error } = await getSupabase().from("visits").upsert(row, { onConflict: "session_id" });
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    console.error("visit error:", err);
    res.status(204).end(); // nunca romper la página del visitante
  }
};
