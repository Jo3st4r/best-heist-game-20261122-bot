// Serve game/ on http://localhost:8080 while building (Node 22, standard
// library only). A development convenience, not a web server for the internet:
// it serves only files under game/, sends the MIME types a browser game needs,
// and refuses anything outside the folder.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME_ROOT = resolve(fileURLToPath(new URL('./game', import.meta.url)));

function mimeFor(file) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.bin': 'application/octet-stream',
    '.wasm': 'application/wasm',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.txt': 'text/plain; charset=utf-8',
  };
  return types[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

function portFromArgs() {
  const args = process.argv.slice(2);
  const at = args.indexOf('--port');
  const wanted = at === -1 ? 8080 : Number(args[at + 1]);
  return Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;
}

function resolveInsideGame(pathname) {
  const cleaned = normalize(pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  const file = resolve(join(GAME_ROOT, cleaned));
  if (file !== GAME_ROOT && !file.startsWith(GAME_ROOT + sep)) return null;
  return file;
}

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const file = resolveInsideGame(pathname);
  if (file === null) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

const port = portFromArgs();
server.listen(port, '127.0.0.1', () => {
  console.log(`game/ is on http://localhost:${port}`);
});
