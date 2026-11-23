// Servidor estático mínimo para desarrollo local (sin dependencias).
// Uso:  npm run dev   →  http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(process.env.ROOT_DIR ?? resolve(import.meta.dirname, '..', 'public'));
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = normalize(join(ROOT, pathname));
    if (!file.startsWith(ROOT)) throw new Error('fuera de la raíz'); // evita ../ hacia otras carpetas
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');

    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    // Igual que Firebase Hosting: si existe 404.html, se usa como página de error.
    const notFound = await readFile(join(ROOT, '404.html')).catch(() => null);
    res.writeHead(404, { 'Content-Type': notFound ? TYPES['.html'] : 'text/plain; charset=utf-8' });
    res.end(notFound ?? 'No encontrado');
  }
}).listen(PORT, () => console.log(`JP Brothers → http://localhost:${PORT}  (admin: /admin.html)`));
