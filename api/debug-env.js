// TEMPORAL — diagnóstico de variables de entorno. Borrar apenas se resuelva.
// No expone valores: solo nombres presentes y longitud, para detectar
// typos en los nombres o valores vacíos.
module.exports = (req, res) => {
  const expected = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_SECRET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "CONTACT_TO_EMAIL"
  ];

  const status = {};
  expected.forEach((name) => {
    const v = process.env[name];
    status[name] = v === undefined ? "AUSENTE" : v === "" ? "VACIA" : "ok (" + v.length + " chars)";
  });

  // Cualquier nombre parecido que sí exista — así se ve el typo si lo hay.
  const parecidas = Object.keys(process.env)
    .filter((k) => /SUPA|RESEND|CONTACT|ADMIN|SERVICE_ROLE/i.test(k))
    .sort();

  res.status(200).json({ status, parecidas });
};
