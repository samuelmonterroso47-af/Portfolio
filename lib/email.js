const { Resend } = require("resend");

// El correo de notificación es best-effort: si Resend no está configurado
// o falla, no debe tumbar la petición del visitante (ya quedó guardada en Supabase).
async function sendNotification({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const to = process.env.CONTACT_TO_EMAIL || "samuelmonterroso47@gmail.com";
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, text });
  } catch (err) {
    console.error("Resend error:", err);
  }
}

module.exports = { sendNotification };
