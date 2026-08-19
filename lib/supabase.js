const { createClient } = require("@supabase/supabase-js");

let client = null;

function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase no configurado: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

module.exports = { getSupabase };
