const { getSupabase } = require("../lib/supabase");
const { sendNotification } = require("../lib/email");
const { isValidEmail, isNonEmptyString } = require("../lib/validate");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const body = req.body || {};
  const { name, email, message, company } = body;

  // Honeypot: los bots suelen rellenar todos los campos, incluido este que un humano nunca ve.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Ingresá un email válido." });
    return;
  }
  if (!isNonEmptyString(message, 4000)) {
    res.status(400).json({ error: "Escribí un mensaje." });
    return;
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("contact_messages").insert({
      name: typeof name === "string" ? name.slice(0, 200) : null,
      email,
      message: message.trim()
    });
    if (error) throw error;

    await sendNotification({
      subject: "Nuevo contacto en el portafolio: " + (name || email),
      text: "Nombre: " + (name || "-") + "\nEmail: " + email + "\n\n" + message
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact error:", err);
    res.status(500).json({ error: "No se pudo enviar. Intenta de nuevo o escribime directo por correo." });
  }
};
