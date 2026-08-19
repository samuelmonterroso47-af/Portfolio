const { getSupabase } = require("../lib/supabase");

const SLOTS = ["dash-financiero", "dash-operativo", "dash-comercial", "dash-seguimiento"];
const BUCKET = "dashboards";

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from("dashboard_images").select("slot,url");
      if (error) throw error;
      const images = {};
      SLOTS.forEach((slot) => { images[slot] = null; });
      (data || []).forEach((row) => { images[row.slot] = row.url; });
      res.status(200).json({ images });
    } catch (err) {
      console.error("dashboard GET error:", err);
      // El sitio debe seguir funcionando con los placeholders aunque Supabase no esté configurado todavía.
      res.status(200).json({ images: {} });
    }
    return;
  }

  if (req.method === "POST") {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      res.status(503).json({ error: "ADMIN_SECRET no configurado en el servidor." });
      return;
    }
    if (req.headers["x-admin-secret"] !== adminSecret) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const { slot, dataUrl } = req.body || {};
    if (!SLOTS.includes(slot)) {
      res.status(400).json({ error: "Slot inválido" });
      return;
    }
    const match = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Imagen inválida (usa PNG, JPEG o WEBP)." });
      return;
    }
    const mime = match[1];
    const ext = match[2] === "jpeg" ? "jpg" : match[2];
    const buffer = Buffer.from(match[3], "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      res.status(400).json({ error: "La imagen pesa demasiado (máx. 4MB)." });
      return;
    }

    try {
      const supabase = getSupabase();
      const path = slot + "." + ext;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: mime, upsert: true });
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl + "?v=" + Date.now();

      const { error: upsertError } = await supabase
        .from("dashboard_images")
        .upsert({ slot, url, updated_at: new Date().toISOString() });
      if (upsertError) throw upsertError;

      res.status(200).json({ ok: true, url });
    } catch (err) {
      console.error("dashboard POST error:", err);
      res.status(500).json({ error: "No se pudo guardar la imagen." });
    }
    return;
  }

  res.status(405).json({ error: "Método no permitido" });
};
