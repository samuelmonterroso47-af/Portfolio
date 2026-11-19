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
  if (req.headers["x-admin-secret"] !== adminSecret) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data, error } = await getSupabase()
      .from("visits")
      .select("created_at,visitor_id,path,ref_tag,referrer_host,country,region,city,device,browser,os")
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

    res.status(200).json({
      total: total || rows.length,
      hoy: within(1).length,
      dias7: within(7).length,
      dias30: within(30).length,
      unicos30: uniq(within(30)),
      porDia,
      paises: count(rows, "country").slice(0, 10),
      ciudades: count(rows, (r) => [r.city, r.country].filter(Boolean).join(", ")).slice(0, 15),
      origen: count(rows, (r) => r.ref_tag ? "ref: " + r.ref_tag : r.referrer_host || "Directo").slice(0, 15),
      dispositivos: count(rows, "device"),
      paginas: count(rows, "path").slice(0, 10),
      recientes: rows.slice(0, 100)
    });
  } catch (err) {
    console.error("visits GET error:", err);
    res.status(500).json({ error: "No se pudieron leer las visitas. ¿Creaste la tabla visits en Supabase?" });
  }
};
