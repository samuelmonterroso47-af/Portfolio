const { getSupabase } = require("../lib/supabase");

// Resumen privado de visitas. Requiere el encabezado x-admin-secret.

function count(rows, key) {
  const m = {};
  rows.forEach((r) => {
    const k = (typeof key === "function" ? key(r) : r[key]) || "Desconocido";
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    res.status(503).json({ error: "ADMIN_SECRET no configurado en el servidor." });
    return;
  }
  if (String(req.headers["x-admin-secret"] || "").trim() !== adminSecret.trim()) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data, error } = await getSupabase()
      .from("visits")
      .select("created_at,updated_at,visitor_id,path,ref_tag,referrer_host,country,region,city,device,browser,os,duration_s,max_scroll,sections,clicks")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;

    const rows = data || [];
    const { count: total } = await getSupabase().from("visits").select("id", { count: "exact", head: true });
    const now = Date.now();
    const within = (d) => rows.filter((r) => now - new Date(r.created_at).getTime() <= d * 86400000);
    const uniq = (rs) => new Set(rs.map((r) => r.visitor_id).filter(Boolean)).size;

    const porDia = {};
    within(30).forEach((r) => {
      const d = r.created_at.slice(0, 10);
      porDia[d] = (porDia[d] || 0) + 1;
    });

    // Tiempo por sección y clics (todas las visitas del periodo)
    const secT = {}, secN = {};
    rows.forEach((r) => Object.entries(r.sections || {}).forEach(([k, v]) => { secT[k] = (secT[k] || 0) + v; secN[k] = (secN[k] || 0) + 1; }));
    const secciones = Object.keys(secT).map((k) => ({ name: k, total: secT[k], visitas: secN[k], prom: Math.round(secT[k] / secN[k]) }))
      .sort((a, b) => b.total - a.total).slice(0, 15);
    const clics = count(rows.flatMap((r) => (r.clicks || []).map((c) => c.l || c.h)), (x) => x).slice(0, 20);

    // Visitantes: cuántas veces volvió cada uno
    const porVisitante = {};
    rows.forEach((r) => {
      if (!r.visitor_id) return;
      const v = porVisitante[r.visitor_id] || (porVisitante[r.visitor_id] = { id: r.visitor_id.slice(0, 8), visitas: 0, tiempo: 0, ultima: r.created_at, lugar: "", ref: "", device: "" });
      v.visitas++; v.tiempo += r.duration_s || 0;
      if (r.created_at > v.ultima) v.ultima = r.created_at;
      v.lugar = v.lugar || [r.city, r.country].filter(Boolean).join(", ");
      v.ref = v.ref || r.ref_tag || ""; v.device = v.device || r.device || "";
    });
    const visitantes = Object.values(porVisitante).sort((a, b) => b.visitas - a.visitas || b.tiempo - a.tiempo).slice(0, 50);
    const conTiempo = rows.filter((r) => r.duration_s > 0);

    res.status(200).json({
      total: total || rows.length,
      hoy: within(1).length,
      dias7: within(7).length,
      dias30: within(30).length,
      unicos30: uniq(within(30)),
      recurrentes: visitantes.filter((v) => v.visitas > 1).length,
      tiempoProm: conTiempo.length ? Math.round(conTiempo.reduce((s, r) => s + r.duration_s, 0) / conTiempo.length) : 0,
      scrollProm: rows.length ? Math.round(rows.reduce((s, r) => s + (r.max_scroll || 0), 0) / rows.length) : 0,
      porDia,
      paises: count(rows, "country").slice(0, 10),
      ciudades: count(rows, (r) => [r.city, r.country].filter(Boolean).join(", ")).slice(0, 15),
      origen: count(rows, (r) => r.ref_tag ? "ref: " + r.ref_tag : r.referrer_host || "Directo").slice(0, 15),
      dispositivos: count(rows, "device"),
      paginas: count(rows, "path").slice(0, 10),
      secciones,
      clics,
      visitantes,
      recientes: rows.slice(0, 100)
    });
  } catch (err) {
    console.error("visits GET error:", err);
    res.status(500).json({ error: "No se pudieron leer las visitas. ¿Creaste la tabla visits en Supabase?" });
  }
};
