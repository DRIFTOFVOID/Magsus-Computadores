// Servidor da Pegasus ASU: serve os arquivos do site e mantém a chave Groq no servidor.
// Não coloque código que use document/localStorage neste arquivo: isso pertence ao navegador.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const ROOT = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const requestHits = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestHits.get(ip) || []).filter(t => now - t < 60_000);
  recent.push(now);
  requestHits.set(ip, recent);
  return recent.length > 30;
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Proxy da ASU para a API da Groq. Mantém a chave fora do navegador.
  if (req.method === 'POST' && req.url.split('?')[0] === '/api/asu') {
    if (!KEY) return sendJson(res, 500, { error: 'GROQ_API_KEY ausente no arquivo .env' });
    if (isRateLimited(req.socket.remoteAddress || 'unknown')) {
      return sendJson(res, 429, { error: 'Limite de solicitações atingido. Tente novamente em um minuto.' });
    }

    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 200_000) return sendJson(res, 413, { error: 'Solicitação muito grande.' });
      }

      const payload = JSON.parse(raw || '{}');
      if (!Array.isArray(payload.messages)) {
        return sendJson(res, 400, { error: 'O campo messages deve ser uma lista.' });
      }

      const body = {
        model: MODEL,
        messages: payload.messages,
        max_tokens: Math.min(Number(payload.max_tokens) || 700, 1000)
      };
      for (const key of ['tools', 'tool_choice', 'temperature']) {
        if (payload[key] !== undefined) body[key] = payload[key];
      }

      const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${KEY}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000)
      });

      res.writeHead(upstream.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(await upstream.text());
    } catch (error) {
      console.error('[ASU API] Erro no proxy:', error);
      if (!res.headersSent) sendJson(res, 502, { error: 'Falha ao comunicar com a API da Groq.', detail: error.message });
      else res.end();
    }
    return;
  }

  // Serve HTML/CSS/JS/imagens do site para o navegador.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD, POST' });
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  if (pathname.includes('\0')) {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  // Não expor arquivos ocultos, a chave .env, nem arquivos internos do servidor.
  const relative = path.relative(ROOT, filePath);
  if (relative.split(path.sep).some(part => part.startsWith('.')) || ['server.js', 'package.json'].includes(relative)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (statError, stat) => {
    let target = filePath;
    if (!statError && stat.isDirectory()) target = path.join(filePath, 'index.html');
    fs.readFile(target, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(error.code === 'ENOENT' ? '404 - Arquivo não encontrado' : 'Erro interno do servidor');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

server.listen(PORT, () => console.log(`ASU no ar: http://localhost:${PORT}`));
