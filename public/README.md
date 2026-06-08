# public

Sitio estático que se publica en caobaquintas.com. **Esto es lo único que llega a producción**:
el workflow `.github/workflows/deploy-pages.yml` hace `pages deploy public`.

Contenido:
- `index.html` — landing principal.
- `privacidad.html`, `terminos.html` — páginas legales.
- `images/` — imágenes del sitio (logo y fotos del dron).

Las rutas internas son relativas (`images/...`, `privacidad.html`), así que la carpeta es
auto-contenida y se puede servir tal cual.
