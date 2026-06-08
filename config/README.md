# config

Configuración de los dos Cloudflare Workers del proyecto. Viven aquí (no en la raíz) para
mantenerla limpia; por eso **todo comando de wrangler debe pasar `--config`**.

- `wrangler.toml` — Worker **caoba-leads** (API en `caobaquintas.com/api/*`, entrada `../worker/index.js`, D1).
  Deploy: `npx wrangler deploy --config config/wrangler.toml`
- `wrangler.bot.toml` — Worker **caoba-bot** (webhook de WhatsApp `caobaquintas.com/webhook/wa*`, entrada `../worker/bot.js`).
  Deploy: `npx wrangler deploy --config config/wrangler.bot.toml`

Nota: `main` apunta a `../worker/...` porque wrangler resuelve esa ruta **relativa a este archivo**.
El sitio estático (`public/`) NO usa wrangler.toml; lo despliega el workflow de GitHub con `pages deploy public`.
