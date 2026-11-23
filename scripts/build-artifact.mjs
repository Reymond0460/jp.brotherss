// Genera la carpeta "artifact/" a partir de public/, para probar el sitio dentro de Claude.
//
// El artefacto es EL MISMO código del sitio (una sola fuente), pero empaquetado así:
//   - cada página queda en un solo archivo, con el CSS y el JS dentro;
//   - las tipografías y el logo van incrustados (el artefacto no permite archivos externos);
//   - corre en modo demo (datos de ejemplo en el navegador), sin Firebase.
//
// Uso:  npm run artifact
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC = resolve(ROOT, 'public');
const OUT = resolve(ROOT, 'artifact');

// La primera página es la "principal" del artefacto: va como fragmento (sin <html>/<head>).
const PAGES = ['index', 'admin', 'privacidad', 'cookies'];

/** Reemplaza el backend de Firebase por un stub: en el artefacto solo existe el modo demo. */
const stubFirebase = {
  name: 'stub-firebase',
  setup(b) {
    b.onResolve({ filter: /firebase-backend\.js$/ }, () => ({ path: 'firebase-backend-stub', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
      contents: "export function createFirebaseBackend() { throw new Error('Firebase no está disponible en el artefacto'); }",
      loader: 'js',
    }));
  },
};

const LOGO = 'assets/logo-jp-192.webp';
const logoDataUri = `data:image/webp;base64,${(await readFile(resolve(PUBLIC, LOGO))).toString('base64')}`;

async function bundleJs(entry) {
  const result = await build({
    entryPoints: [resolve(PUBLIC, entry)],
    bundle: true,
    write: false,
    format: 'iife',
    minify: true,
    target: 'es2022',
    charset: 'ascii', // escapa tildes y ñ: el código funciona aunque el archivo se lea con otra codificación
    plugins: [stubFirebase],
  });
  // El logo se referencia por texto en el JS; se sustituye por la imagen incrustada.
  // Se escapa "</script" para que el navegador no cierre la etiqueta antes de tiempo.
  return result.outputFiles[0].text.replaceAll(LOGO, logoDataUri).replaceAll('</script', '<\\/script');
}

async function bundleCss(entry) {
  const result = await build({
    entryPoints: [resolve(PUBLIC, entry)],
    bundle: true,
    write: false,
    minify: true,
    loader: { '.woff2': 'dataurl' },
    charset: 'ascii',
  });
  return result.outputFiles[0].text;
}

const pick = (html, regex, label) => {
  const match = html.match(regex);
  if (!match) throw new Error(`No se encontró ${label}`);
  return match[1];
};

await mkdir(OUT, { recursive: true });

for (const [index, name] of PAGES.entries()) {
  const html = await readFile(resolve(PUBLIC, `${name}.html`), 'utf8');
  // El nombre de la pestaña/galería del artefacto debe ser corto: solo el nombre del negocio.
  const title = index === 0 ? 'JP Brothers Barbería' : pick(html, /<title>([\s\S]*?)<\/title>/, 'title');
  const cssEntry = pick(html, /<link rel="stylesheet" href="([^"]+)"/, 'hoja de estilos');
  const jsEntry = pick(html, /<script type="module" src="([^"]+)"/, 'script');
  let body = pick(html, /<body[^>]*>([\s\S]*)<\/body>/, 'body').replaceAll(LOGO, logoDataUri);

  const css = await bundleCss(cssEntry);
  const js = await bundleJs(jsEntry);
  const style = `<style>${css}</style>`;
  const script = `<script>${js}</script>`;
  const favicon = `<link rel="icon" href="${logoDataUri}" />`;

  const output =
    index === 0
      ? // Página principal del artefacto: fragmento (la plataforma agrega <html>, <head> y <body>).
        `<title>${title}</title>\n${favicon}\n${style}\n${body}\n${script}\n`
      : // Resto de páginas: documentos completos.
        `<!doctype html>\n<html lang="es-CL">\n<head>\n<meta charset="utf-8" />\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />\n<title>${title}</title>\n${favicon}\n${style}\n</head>\n<body>\n${body}\n${script}\n</body>\n</html>\n`;

  await mkdir(dirname(resolve(OUT, `${name}.html`)), { recursive: true });
  await writeFile(resolve(OUT, `${name}.html`), output);
  console.log(`artifact/${name}.html  ${(output.length / 1024).toFixed(0)} KB`);
}
