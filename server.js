
const http = require("http");
const fs = require("fs");
const path = require("path");

// ==========================================
// CONFIGURAÇÕES DO SERVIDOR
// ==========================================

const PORT = process.env.PORT || 3000;
const KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const ALLOWED_ORIGINS = [
  "https://driftofvoid.github.io"
];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

// ==========================================
// CONTROLE DE REQUISIÇÕES
// ==========================================

const hits = new Map();

function limited(ip) {
  const now = Date.now();

  const recent = (hits.get(ip) || []).filter(
    timestamp => now - timestamp < 60000
  );

  recent.push(now);
  hits.set(ip, recent);

  return recent.length > 30;
}

// ==========================================
// CONFIGURAÇÃO CORS
// ==========================================

function setCors(req, res) {
  const origin = req.headers.origin;

  // Permite requisições sem origem informada.
  if (!origin) return true;

  // Verifica se a origem está autorizada.
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn("[CORS] Origem bloqueada:", origin);
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader("Access-Control-Max-Age", "86400");

  return true;
}

// ==========================================
// RESPOSTAS JSON
// ==========================================

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });

  res.end(JSON.stringify(data));
}

// ==========================================
// SERVIDOR PRINCIPAL
// ==========================================

const server = http.createServer(async (req, res) => {
  const pathname = new URL(
    req.url,
    "http://localhost"
  ).pathname;

  // ========================================
  // API: CORS E PREFLIGHT
  // ========================================

  if (pathname === "/api/asu") {

    if (!setCors(req, res)) {
      return json(res, 403, {
        error: "Origem não autorizada."
      });
    }

    // Responde às verificações CORS do navegador.
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method !== "POST") {
      return json(res, 405, {
        error: "Método não permitido."
      });
    }

    // Verifica a chave da Groq.
    if (!KEY) {
      return json(res, 500, {
        error: "GROQ_API_KEY não configurada no servidor."
      });
    }

    // Controle de requisições.
    if (limited(req.socket.remoteAddress)) {
      return json(res, 429, {
        error: "Limite de solicitações atingido."
      });
    }

    try {
      let raw = "";

      for await (const chunk of req) {
        raw += chunk.toString();

        if (Buffer.byteLength(raw, "utf8") > 200000) {
          return json(res, 413, {
            error: "Requisição muito grande."
          });
        }
      }

      const body = JSON.parse(raw);

      const {
        messages,
        tools,
        tool_choice,
        temperature,
        max_tokens
      } = body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return json(res, 400, {
          error: "Mensagens inválidas."
        });
      }

      // ====================================
      // CONEXÃO COM A GROQ
      // ====================================

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

            ...(tools
              ? {
                  tools,
                  tool_choice: tool_choice || "auto"
                }
              : {}),

            temperature: temperature ?? 0.5,
            max_tokens: Math.min(max_tokens || 700, 1000)
          })
        }
      );

      const responseText = await groqResponse.text();

      // Preserva o status e a resposta original da Groq.
      res.writeHead(groqResponse.status, {
        "Content-Type": "application/json; charset=utf-8"
      });

      return res.end(responseText);

    } catch (error) {
      console.error("[ASU] Erro na comunicação:", error);

      return json(res, 502, {
        error: "Falha ao comunicar com a Groq."
      });
    }
  }

  // ========================================
  // API: VERIFICAÇÃO DE SAÚDE
  // ========================================

  if (pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, {
      status: "online",
      service: "Pegasus ASU API",
      modelConfigured: Boolean(MODEL),
      keyConfigured: Boolean(KEY)
    });
  }

  // ========================================
  // ARQUIVOS ESTÁTICOS
  // ========================================

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json(res, 405, {
      error: "Método não permitido."
    });
  }

  let filePath;

  try {
    const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");

    filePath = path.resolve(
      __dirname,
      relativePath || "index.html"
    );

    if (
      !filePath.startsWith(__dirname + path.sep) ||
      /(^|[\\/])\.|server\.js|package/.test(relativePath)
    ) {
      return json(res, 403, {
        error: "Acesso negado."
      });
    }

  } catch (error) {
    return json(res, 400, {
      error: "Caminho inválido."
    });
  }

  if (
    fs.existsSync(filePath) &&
    fs.statSync(filePath).isDirectory()
  ) {
    filePath = path.join(filePath, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("404");
    }

    res.writeHead(200, {
      "Content-Type":
        MIME[path.extname(filePath)] ||
        "application/octet-stream"
    });

    if (req.method === "HEAD") {
      return res.end();
    }

    res.end(data);
  });
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================

server.listen(PORT, "0.0.0.0", () => {
  console.log("----------------------------------");
  console.log("PEGASUS ASU API");
  console.log("----------------------------------");
  console.log(`Servidor ativo na porta ${PORT}`);
  console.log(`Modelo: ${MODEL}`);
  console.log(`Chave configurada: ${Boolean(KEY)}`);
  console.log("----------------------------------");
});
