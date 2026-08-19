# Portafolio — Esvin Samuel CM

Sitio estático (`index.html` + `js/site.js`) con backend en funciones serverless de Vercel (`/api`). Mismo diseño exportado desde Claude Design, sin depender de su runtime interno — corre solo, listo para producción.

## Qué hace el backend

- `POST /api/contact` — formulario de contacto (sección "Hablemos") → guarda en Supabase y notifica por email con Resend.
- `POST /api/interest` — botones "Avisarme" (cursos Excel/Power BI/Apicultura) y "Pedirla" (guías gratis) → mismo flujo.
- `GET/POST /api/dashboard` — capturas de los 4 dashboards de Power BI. El GET es público (lo consume `js/site.js` para pintar las imágenes). El POST está protegido con `ADMIN_SECRET` y lo usa `/admin.html` para subir screenshots nuevos a Supabase Storage.

Si Supabase o Resend no están configurados todavía, el sitio sigue funcionando (se ve igual), solo los formularios no guardan nada hasta que actives las variables de entorno.

## Poner en marcha el backend

### 1. Supabase (gratis)

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Andá a **SQL Editor** y corré el contenido de `supabase/schema.sql` (crea las 3 tablas y activa RLS).
3. Andá a **Storage → New bucket**, nombralo `dashboards` y marcalo como **público**.
4. Andá a **Project Settings → API** y copiá:
   - `Project URL` → variable `SUPABASE_URL`
   - `service_role` key (no la `anon`) → variable `SUPABASE_SERVICE_ROLE_KEY`

### 2. Resend (opcional, gratis)

1. Creá cuenta en [resend.com](https://resend.com) y generá una API key → `RESEND_API_KEY`.
2. Mientras no verifiques un dominio propio, dejá `RESEND_FROM_EMAIL=onboarding@resend.dev` (Resend lo permite sin verificación).
3. `CONTACT_TO_EMAIL` es a dónde llegan las notificaciones (por defecto tu correo).

### 3. Clave de administrador

Generá una clave random, por ejemplo:

```bash
openssl rand -hex 24
```

Guardala como `ADMIN_SECRET`. Es la clave que vas a escribir en `/admin.html` para subir las capturas de Power BI. No la compartas — cualquiera con esa clave puede reemplazar las imágenes de los dashboards.

### 4. Variables de entorno en Vercel

En el proyecto de Vercel: **Settings → Environment Variables**, agregá las 6 variables de `.env.example` con sus valores reales, y hacé un **Redeploy**.

## Actualizar las capturas de Power BI

Entrá a `tu-dominio.vercel.app/admin.html` (no está enlazada desde el menú), poné tu `ADMIN_SECRET` y subí cada captura. Se guardan en Supabase Storage y quedan visibles para todos los visitantes del sitio.

## Estructura

```
index.html          página completa (mismo diseño del prototipo)
admin.html           subida de capturas de Power BI (no listada en el menú)
js/site.js            escena 3D, tema claro/oscuro, animaciones, formularios
api/contact.js         POST — formulario de contacto
api/interest.js        POST — lista de espera de cursos y guías gratis
api/dashboard.js        GET/POST — capturas de Power BI
lib/                  helpers compartidos (Supabase, Resend, validación)
supabase/schema.sql    esquema SQL para correr en Supabase
```

## Desarrollo local

El sitio es estático, así que cualquier servidor sirve para ver el diseño:

```bash
python3 -m http.server 8000
```

Para probar también las funciones `/api`, usá la CLI de Vercel:

```bash
npm i -g vercel
vercel dev
```
