import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// GitHub Pages sirve el sitio en https://<usuario>.github.io/<repo>/. En el workflow se define BASE_PATH=/<repo>/.
// En local (npm run dev) y para un dominio propio queda './' (rutas relativas, funciona en cualquier carpeta).
const base = process.env.BASE_PATH || './';

/** Dirección pública del juego (para canonical, Open Graph, sitemap…). Se cambia al publicar: SITE_URL=https://mi-dominio.com npm run build */
const SITE_URL = (process.env.SITE_URL || 'https://dawnslide.com').replace(/\/$/, '');
const seo = () => ({
  name: 'seo',
  transformIndexHtml: { order: 'pre', handler: (html) => html.replaceAll('%SITE_URL%', SITE_URL) },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /melodies.html\n\nSitemap: ${SITE_URL}/sitemap.xml\n` });
    this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n` });
  },
});

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(pkg.version.split('.')[0]) },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 600,
    rollupOptions: { input: { main: 'index.html', melodies: 'melodies.html' } }, // melodies.html: visor de las melodías
  },
  plugins: [
    seo(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifestFilename: 'manifest.webmanifest',
      injectManifest: { globPatterns: ['**/*.{js,css,html,webp,png,gif,webmanifest}'], globIgnores: ['**/jefes/**'] },   // las ilustraciones de jefe se guardan al verlas (sw.js)
      manifest: {
        name: 'DAWNSLIDE',
        short_name: 'DAWNSLIDE',
        description: 'Open the road between the ten cities of Tri. A block puzzle, three heroes and one hundred levels.',
        lang: 'en',
        start_url: './',
        scope: './',
        id: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#111e29',
        theme_color: '#111e29',
        categories: ['games', 'puzzle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['tests/**/*.test.js'] },
});
