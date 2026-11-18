# Pegasus Computadores — Fases 2, 3 e 4

## O que foi incluído
- CSS principal + complementos responsivos, paleta, estados de foco/hover/active, menu com submenu, box model, grid/flex e camadas.
- Ícones vetoriais locais para a marca e avatar da ASU (`assets/`).
- HTML com listas ul/ol/dl, tabela thead/tbody com rowspan/colspan, vídeo incorporado, arquivo para download e links externos seguros.
- Formulário multipart com text, tel, select, textarea, radio, checkbox e file; validação HTML + validação no servidor.
- Servidor Node/Express, proxy Groq e endpoint para registrar solicitações em MySQL.
- `database/schema.sql`, DER Mermaid e dicionário de dados.

## Instalação (Windows / VS Code)
1. Instale Node.js 20+ e MySQL 8+.
2. No terminal, execute `npm install`.
3. Copie `.env.example` para `.env` e preencha a chave Groq e os dados do MySQL. Não compartilhe o `.env`.
4. Execute o script `database/schema.sql` no MySQL Workbench.
5. Execute `npm start` e abra `http://localhost:3000`.

## Evidências para a rubrica
- Fase 2: tabela, vídeo, download e formulário estão em `index.html` (seções `#estrutura`, `#midia` e `#contato`).
- Fase 3: seletores, paleta e posicionamento em `style.css` e `fase3.css`; breakpoints em 980px, 760px e 480px. Testar em 1440px (desktop), 768px (tablet) e 390px (smartphone).
- Fase 4: diagrama em `docs/DER.md`, dicionário em `docs/dicionario-de-dados.md`, SQL em `database/schema.sql`.

## Validação W3C
Depois de iniciar o site, envie `index.html` ao https://validator.w3.org/ e o CSS ao https://jigsaw.w3.org/css-validator/. A validação final deve ser feita após substituir/adicionar imagens reais e confirmar a URL do vídeo. Não declarar aprovação sem executar esses validadores.

## Observações importantes
- A chave Groq fica somente no servidor via `.env`; o navegador chama `/api/asu`.
- Formulário depende de MySQL configurado. Sem banco disponível, o servidor retorna mensagem de erro em vez de fingir que salvou.
- `anexo_dados` guarda o binário no banco para manter o protótipo simples; em produção, prefira armazenamento de objetos e política de retenção.
- O projeto recebido não incluía `style.css` nem `server.js`; ambos foram criados porque eram referenciados/necessários para execução.
- Mantenha `asu.js` e `asu.css` separados das interações gerais (`script.js`, `cookies.js`).
