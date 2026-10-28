/* ==========================================================
   ASU — assistente virtual neon da Pegasus Computadores
   IA via Groq (function calling) + ações reais na página
   ========================================================== */
(async () => {
  // ⚠️ Para produção, use um proxy no seu servidor (proxyUrl) para não expor a chave.
  const C = {
    model: "openai/gpt-oss-120b",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    proxyUrl: "", apiKey: "", ...window.ASU_CONFIG
  };
  // Configuração em JSON (asu.config.json) — sobrescreve os padrões acima
  try { const r = await fetch("asu.config.json", { cache: "no-store" }); if (r.ok) Object.assign(C, await r.json(), window.ASU_CONFIG) } catch { }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  const store = {
    get: k => { try { return localStorage.getItem(k) } catch { return null } },
    set: (k, v) => { try { localStorage.setItem(k, v) } catch { } }
  };

  /* ---------- UI ---------- */
  const root = document.createElement("div");
  root.className = "asu";
  root.innerHTML = `
  <div class="asu-avatar" aria-label="Avatar tecnológico da ASU"><img src="assets/asu-avatar.png" alt="" draggable="false"></div>
  <button class="asu-orb" aria-label="Conversar com o Asu"><span class="asu-body"><span class="asu-core"></span><span class="asu-ring"></span></span></button>
  <div class="asu-bubble" role="status"></div>
  <section class="asu-panel" aria-label="Chat com o Asu">
    <header><span class="asu-dot"></span><div><strong>Asu</strong><small>assistente da Pegasus • online</small></div>
      <button data-a="cfg" title="Configurar chave">⚙</button><button data-a="x" title="Fechar">✕</button></header>
    <div class="asu-cfg"><p>Cole sua chave da API Groq (grátis em console.groq.com). Ela fica salva só neste navegador.</p>
      <input type="password" placeholder="gsk_..." autocomplete="off"><button data-a="save">Salvar chave</button></div>
    <div class="asu-msgs"></div><div class="asu-chips"></div>
    <form><input placeholder="Pergunte ou peça algo…" autocomplete="off"><button aria-label="Enviar">➤</button></form>
  </section>`;
  document.body.append(root);
  if (C.theme?.primary) root.style.setProperty("--c", C.theme.primary);
  if (C.theme?.secondary) root.style.setProperty("--p", C.theme.secondary);
  const orbEl = $(".asu-orb", root), body = $(".asu-body", root), av = $(".asu-avatar", root),
    bubble = $(".asu-bubble", root), msgs = $(".asu-msgs", root), cfgIn = $(".asu-cfg input", root),
    form = $("form", root), input = $("form input", root);

  /* ---------- Física: orb + avatar que o segue ---------- */
  const o = { x: 0, y: 0, vx: 0, vy: 0 }, a = { x: 0, y: 0, vx: 0, vy: 0 };
  let home, target = null, rel, mx = innerWidth / 2, my = innerHeight / 2;
  const setHome = () => home = { x: innerWidth - 50, y: innerHeight - 50 };
  setHome(); o.x = home.x; o.y = innerHeight + 80; a.x = o.x - 58; a.y = o.y;
  addEventListener("resize", setHome);
  addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY }, { passive: true });
  const spring = (p, tx, ty, k, d) => { p.vx = (p.vx + (tx - p.x) * k) * d; p.vy = (p.vy + (ty - p.y) * k) * d; p.x += p.vx; p.y += p.vy };

  (function loop(t) {
    const tg = target || { x: home.x + Math.sin(t / 900) * 7, y: home.y + Math.cos(t / 700) * 9 };
    spring(o, tg.x, tg.y, .06, .84);
    const side = o.x > 190 ? -58 : 58;
    spring(a, o.x + side, o.y + 4 + Math.sin(t / 600) * 3, .045, .8);
    const sp = Math.hypot(o.vx, o.vy), s = Math.min(sp / 45, .35);
    orbEl.style.translate = `${o.x - 32}px ${o.y - 32}px`;
    body.style.transform = `rotate(${Math.atan2(o.vy, o.vx)}rad) scale(${1 + s},${1 - s * .35})`;
    av.style.translate = `${a.x - 26}px ${a.y - 26}px`;
    av.style.transform = `rotate(${clamp(a.vx * 1.6, -14, 14)}deg)`;
    const dx = mx - a.x, dy = my - a.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 180) * 3;
    av.style.setProperty("--px", dx / d * k + "px"); av.style.setProperty("--py", dy / d * k + "px");
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const bx = clamp(o.x - w + 34, 8, innerWidth - w - 8), by = o.y - h - 46;
    bubble.style.translate = `${bx}px ${by < 8 ? o.y + 46 : by}px`;
    requestAnimationFrame(loop);
  })(0);

  let bt;
  const say = (t, ms = 4800) => { bubble.innerHTML = md(t); bubble.classList.add("show"); clearTimeout(bt); bt = setTimeout(() => bubble.classList.remove("show"), ms) };
  const state = s => root.dataset.state = s || "";
  async function goTo(x, y, hold = 5000) {
    const tg = target = { x: clamp(x, 40, innerWidth - 40), y: clamp(y, 40, innerHeight - 40) };
    clearTimeout(rel); rel = setTimeout(() => { if (target === tg) target = null }, hold);
    for (let i = 0; i < 40 && Math.hypot(o.x - tg.x, o.y - tg.y) > 14; i++) await sleep(50);
  }
  async function pointAt(el, hold = 5000) {
    if (!el) return false;
    if (innerWidth < 700) root.classList.remove("open");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(750);
    const r = el.getBoundingClientRect();
    await goTo(r.left > 90 ? r.left - 34 : r.right + 34, r.top + Math.min(r.height / 2, 40), hold);
    el.classList.add("asu-hl"); setTimeout(() => el.classList.remove("asu-hl"), hold);
    return true;
  }

  /* ---------- Ferramentas (ações na página) ---------- */
  function find(q) {
    q = norm(q); if (!q) return null;
    const sec = /^[a-z]+$/.test(q) && $("#" + q);
    if (sec) return $("h1,h2", sec) || sec;
    let best = null, bl = 1e9;
    $$("h1,h2,h3,h4,a,button,label,.flip-card,.gallery-card,.gallery-filter,p,li").forEach(e => {
      if (e.closest(".asu") || !e.getClientRects().length) return;
      const t = norm(e.textContent);
      if (t.includes(q) && t.length < bl) { best = e; bl = t.length }
    });
    return best;
  }
  async function type(el, v) {
    el.focus({ preventScroll: true }); el.classList.add("asu-hl"); el.value = "";
    for (const c of v) { el.value += c; el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(16) }
    el.classList.remove("asu-hl");
  }
  const T = {
    async go_to_section({ section }) {
      const s = $("#" + norm(section)); if (!s) return "seção inexistente";
      await pointAt($("h1,h2", s) || s); return "ok";
    },
    async point_at({ text }) { return (await pointAt(find(text))) ? "apontei" : "não encontrei" },
    async click_element({ text }) {
      const e = find(text); if (!e) return "não encontrado";
      await pointAt(e, 2500); e.click(); return "clicado";
    },
    async filter_gallery({ category }) {
      const q = norm(category), f = $$(".gallery-filter").find(b => norm(b.textContent).includes(q) || norm(b.dataset.filter) === q);
      if (!f) return "categoria inexistente";
      await pointAt(f, 2500); f.click(); return "filtrado";
    },
    async open_image({ index = 1 }) {
      const im = $$(".gallery-card:not(.hidden) img")[index - 1]; if (!im) return "imagem inexistente";
      await pointAt(im, 2000); im.click(); return "aberta";
    },
    async close_image() { $(".lightbox-close")?.click(); return "fechada" },
    async slider({ action = "next" }) {
      await pointAt($(".hero")); $(action === "prev" ? ".slider-prev" : ".slider-next")?.click(); return "ok";
    },
    async fill_form(v) {
      const f = $("#contact-form"); if (!f) return "sem formulário";
      for (const [k, val] of Object.entries(v)) {
        const el = f.elements[k]; if (!el || !val) continue;
        await pointAt(el, 1800);
        if (el.tagName === "SELECT") {
          const op = [...el.options].find(x => norm(x.textContent).includes(norm(val)) || norm(val).includes(norm(x.textContent)));
          if (op) { el.value = op.value || op.textContent.trim(); el.dispatchEvent(new Event("change", { bubbles: true })) }
        } else if (k === "data") { if (val >= el.min) el.value = val }
        else await type(el, String(val));
      }
      say("Pronto! Confira os dados e me diga se posso **enviar** 😉"); return "preenchido";
    },
    async submit_form() {
      const f = $("#contact-form"); if (!f) return "sem formulário";
      await pointAt($("button[type=submit]", f) || f, 2000);
      if (!f.checkValidity()) { f.reportValidity(); return "faltam campos obrigatórios" }
      f.requestSubmit(); return "enviado";
    },
    async tour() {
      const S = [["inicio", "Aqui ficam nossos destaques: PCs gamer e manutenção 🚀"], ["sobre", "Um pouco da nossa história e jeito de trabalhar."],
        ["servicos", "Nossos serviços. Clique nos cards para virá-los!"], ["galeria", "Trabalhos reais. Dá pra filtrar e ampliar."],
        ["contato", "E aqui você pede orçamento. Eu preencho pra você! ✨"]];
      for (const [id, m] of (C.tour?.map(t => [t.id, t.text]) || S)) { const s = $("#" + id); say(m, 4200); await pointAt($("h1,h2", s) || s, 4200); await sleep(3500) }
      return "tour concluído";
    }
  };
  const fn = (name, description, properties = {}, required = []) =>
    ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } });
  const S = d => ({ type: "string", description: d });
  const TOOLS = [
    fn("go_to_section", "Leva o usuário a uma seção do site", { section: { type: "string", enum: ["inicio", "sobre", "servicos", "galeria", "contato"] } }, ["section"]),
    fn("point_at", "Aponta e destaca um elemento pelo texto visível (título, botão, card)", { text: S("texto do elemento") }, ["text"]),
    fn("click_element", "Clica em link, botão ou card pelo texto visível", { text: S("texto do elemento") }, ["text"]),
    fn("filter_gallery", "Filtra a galeria por categoria", { category: S("categoria") }, ["category"]),
    fn("open_image", "Abre uma imagem da galeria no visualizador", { index: { type: "integer", description: "posição começando em 1" } }),
    fn("close_image", "Fecha o visualizador de imagens"),
    fn("slider", "Controla o carrossel do topo", { action: { type: "string", enum: ["next", "prev"] } }, ["action"]),
    fn("fill_form", "Preenche o formulário de orçamento (não envia). Use só dados que o usuário informou.", {
      nome: S("nome"), telefone: S("telefone"), servico: S("serviço desejado"), data: S("YYYY-MM-DD"), mensagem: S("descrição do problema")
    }),
    fn("submit_form", "Envia o formulário. SOMENTE se o usuário pedir explicitamente."),
    fn("tour", "Faz um tour guiado por todo o site")
  ];
  const LABEL = { go_to_section: "🧭 Guiando você", point_at: "👆 Mostrando", click_element: "🖱️ Clicando", filter_gallery: "🎛️ Filtrando galeria", open_image: "🖼️ Abrindo imagem", close_image: "🖼️ Fechando imagem", slider: "🎞️ Carrossel", fill_form: "✍️ Preenchendo formulário", submit_form: "📨 Enviando", tour: "🚀 Tour guiado" };

  /* ---------- IA (Groq) ---------- */
  const hist = [];
  function system() {
    const ctx = $$("main section").map(s => `[${s.id || "cta"}] ` + s.innerText.replace(/\s+/g, " ").slice(0, 800)).join("\n");
    const filt = $$(".gallery-filter").map(b => `${b.dataset.filter}=${b.textContent.trim()}`).join(", ");
    const sv = $$("#contact-form select option").map(o => o.textContent.trim()).filter(Boolean).join(" | ");
    return { role: "system", content: `Você é o Asu, assistente virtual em forma de orb neon do site da Pegasus Computadores (assistência técnica e montagem de PCs). Fale em português do Brasil, simpático, direto e com no máximo 3 frases (emojis com moderação). Você PODE agir no site com as ferramentas: guie, aponte, filtre, clique, preencha o formulário. Prefira agir a apenas explicar. Nunca invente preços, prazos ou telefones: se não estiver no conteúdo abaixo, sugira o formulário de contato. Antes de enviar o formulário, peça confirmação. Peça dados que faltarem antes de preencher.\nHoje: ${new Date().toISOString().slice(0, 10)}.\nServiços do formulário: ${sv}.\nFiltros da galeria: ${filt}.\n${C.rules ? "Regras extras: " + C.rules.join(" ") + "\n" : ""}${C.business ? "Dados da empresa: " + JSON.stringify(C.business) + "\n" : ""}${C.faq ? "FAQ:\n" + C.faq.map(f => `P: ${f.q}\nR: ${f.a}`).join("\n") + "\n" : ""}Conteúdo do site:\n${ctx}` };
  }
  async function llm(m, tools = true) {
    const k = store.get("asu_key") || C.apiKey, h = { "Content-Type": "application/json" };
    if (!C.proxyUrl) { if (!k) throw { code: "nokey" }; h.Authorization = "Bearer " + k }
    const b = { model: C.model, messages: m, temperature: .5, max_tokens: 700 };
    if (tools) { b.tools = TOOLS; b.tool_choice = "auto" }
    const r = await fetch(C.proxyUrl || C.endpoint, { method: "POST", headers: h, body: JSON.stringify(b) });
    if (!r.ok) throw { code: r.status };
    return (await r.json()).choices[0].message;
  }
  const add = (k, t) => { const d = document.createElement("div"); d.className = "m " + k; d.innerHTML = k === "u" || k === "a" ? esc(t) : md(t); msgs.append(d); msgs.scrollTop = 1e9; return d };
  const trimmed = () => { const h = hist.slice(-20); while (h.length && h[0].role !== "user") h.shift(); return [system(), ...h] };

  async function send(text) {
    text = text.trim(); if (!text) return;
    $(".asu-chips", root).innerHTML = ""; add("u", text); hist.push({ role: "user", content: text });
    const typing = document.createElement("div"); typing.className = "m b t"; typing.innerHTML = "<i></i><i></i><i></i>"; msgs.append(typing); msgs.scrollTop = 1e9;
    state("thinking");
    try {
      for (let i = 0; i < 5; i++) {
        let m;
        try { m = await llm(trimmed()) } catch (e) { if (e.code === 400) m = await llm(trimmed(), false); else throw e }
        if (m.tool_calls?.length) {
          hist.push({ role: "assistant", content: m.content || "", tool_calls: m.tool_calls });
          for (const c of m.tool_calls) {
            let res;
            try {
              const args = JSON.parse(c.function.arguments || "{}");
              add("a", LABEL[c.function.name] || c.function.name); state("moving");
              res = await (T[c.function.name]?.(args) ?? "ferramenta desconhecida");
            } catch (e) { res = "erro: " + e.message }
            hist.push({ role: "tool", tool_call_id: c.id, content: String(res) });
          }
          state("thinking"); continue;
        }
        typing.remove(); hist.push({ role: "assistant", content: m.content }); add("b", m.content);
        state("talking"); say(m.content.length > 140 ? m.content.slice(0, 137) + "…" : m.content, 5000);
        setTimeout(() => state(""), Math.min(1200 + m.content.length * 25, 6000)); return;
      }
    } catch (e) {
      typing.remove();
      if (e.code === "nokey" || e.code === 401) { add("b", "Preciso de uma chave da Groq para pensar 🧠 Cole abaixo."); root.classList.add("cfg") }
      else if (e.code === 429) add("b", "Estou com muitas solicitações agora 😅 Tente de novo em alguns segundos.");
      else add("b", "Ops, não consegui falar com minha IA. Verifique a conexão e tente novamente.");
    }
    typing.remove(); state("");
  }

  /* ---------- Eventos ---------- */
  const chips = C.chips || ["Quais serviços vocês fazem?", "Faça um tour pelo site", "Quero pedir um orçamento", "Mostre a galeria"];
  const showChips = () => $(".asu-chips", root).innerHTML = chips.map(c => `<button type="button">${c}</button>`).join("");
  function toggle(force) {
    const open = force ?? !root.classList.contains("open");
    root.classList.toggle("open", open); bubble.classList.remove("show");
    if (!open) return;
    if (!msgs.children.length) {
      add("b", C.greeting || "Oi! Eu sou o **Asu** 👋 Posso responder dúvidas, te guiar pelo site e até preencher o formulário de orçamento. O que você precisa?");
      showChips();
      if (!store.get("asu_key") && !C.apiKey && !C.proxyUrl) root.classList.add("cfg");
    }
    setTimeout(() => input.focus(), 350);
  }
  orbEl.addEventListener("click", () => { orbEl.classList.remove("pulse"); void orbEl.offsetWidth; orbEl.classList.add("pulse"); toggle() });
  root.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.a === "x") toggle(false);
    if (b.dataset.a === "cfg") root.classList.toggle("cfg");
    if (b.dataset.a === "save" && cfgIn.value.trim()) { store.set("asu_key", cfgIn.value.trim()); cfgIn.value = ""; root.classList.remove("cfg"); add("b", "Chave salva! Agora sim, pode perguntar 🚀") }
    if (b.closest(".asu-chips")) send(b.textContent);
  });
  form.addEventListener("submit", e => { e.preventDefault(); const v = input.value; input.value = ""; send(v) });
  addEventListener("keydown", e => { if (e.key === "Escape" && root.classList.contains("open")) toggle(false) });

  setTimeout(async () => {
    await goTo(innerWidth / 2, innerHeight / 2, 2500);
    if (!root.classList.contains("open")) say(C.intro || "Oi! Eu sou o **Asu** ✨ Clique em mim se precisar de ajuda!", 6000);
  }, 1800);
})();
