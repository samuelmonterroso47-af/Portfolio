const { getSupabase } = require("../lib/supabase");
const { sendNotification } = require("../lib/email");
const { isValidEmail } = require("../lib/validate");

const VALID_ITEMS = {
  curso: new Set(["Excel", "Power BI", "Apicultura"]),
  guia: new Set(["Empezar a usar IA", "Estrategias comerciales, lo básico"])
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = req.body || {};
  const { type, item, email, company } = body;

  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (type !== "curso" && type !== "guia") {
    res.status(400).json({ error: "Tipo inválido" });
    return;
  }
  if (!VALID_ITEMS[type].has(item)) {
    res.status(400).json({ error: "Curso o guía inválido" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Ingresá un email válido." });
    return;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("interest_signups").insert({ type, item, email });
    if (error) throw error;

    await sendNotification({
      subject: (type === "curso" ? "Lista de espera: " : "Pedido de guía: ") + item,
      text: "Email: " + email + "\n" + (type === "curso" ? "Curso" : "Guía") + ": " + item
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("interest error:", err);
    res.status(500).json({ error: "No se pudo registrar. Intenta de nuevo." });
  }
};
