
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

function setCors(req, res) {
  const origin = req.headers.origin;

  // Requisições sem Origin (ex.: verificações do servidor) são permitidas.
  if (!origin) return true;

  if (!FRONTEND_ORIGIN || origin !== FRONTEND_ORIGIN) {
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", FRONTEND_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, {
      status: "online",
      service: "Pegasus ASU API",
      modelConfigured: Boolean(MODEL),
      keyConfigured: Boolean(KEY)
    });
  }

  if (pathname === "/api/asu") {
    if (!setCors(req, res)) {
      return json(res, 403, { error: "Origem não autorizada." });
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method !== "POST") {
      return json(res, 405, { error: "Método não permitido." });
    }

    if (!KEY) {
      return json(res, 500, { error: "GROQ_API_KEY não configurada no servidor." });
    }

    if (limited(req.socket.remoteAddress)) {
      return json(res, 429, { error: "Limite de solicitações atingido." });
    }

    try {
      let raw = "";

      for await (const chunk of req) {
        raw += chunk.toString();

        if (Buffer.byteLength(raw, "utf8") > 200000) {
          return json(res, 413, { error: "Requisição muito grande." });
        }
      }

      const body = JSON.parse(raw);
      const { messages, tools, tool_choice, temperature, max_tokens } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return json(res, 400, { error: "Mensagens inválidas." });
      }

      const groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${KEY}`
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
            ...(tools ? { tools, tool_choice: tool_choice || "auto" } : {}),
            temperature: temperature ?? 0.5,
            max_tokens: Math.min(max_tokens || 700, 1000)
          })
        }
      );

      const responseText = await groqResponse.text();

      res.writeHead(groqResponse.status, {
        "Content-Type": "application/json; charset=utf-8"
      });
      return res.end(responseText);

    } catch (error) {
      console.error("Erro na API da ASU:", error);
      return json(res, 502, { error: "Falha ao comunicar com a Groq." });
    }
  }

  // Mantém o servidor capaz de servir arquivos estáticos, se necessário.
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, { error: "Método não permitido." });
  }

  let filePath;

  try {
    const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
    filePath = path.resolve(__dirname, relativePath || "index.html");

    if (
      !filePath.startsWith(__dirname + path.sep) ||
      /(^|[\\/])\.|server\.js|package/.test(relativePath)
    ) {
      return json(res, 403, { error: "Acesso negado." });
    }
  } catch {
    return json(res, 400, { error: "Caminho inválido." });
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("404");
    }

    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream"
    });

    if (req.method === "HEAD") return res.end();
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ASU API ativa na porta ${PORT}`);
});
