require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql2/promise');
const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json({limit:'1mb'}));
app.use(express.static(__dirname, { extensions:['html'] }));
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{
  const ok = ['image/jpeg','image/png','application/pdf'].includes(file.mimetype);
  cb(ok ? null : new Error('Formato de anexo não permitido.'), ok);
}});
let pool;
function getPool(){
  if(!process.env.DB_HOST || !process.env.DB_NAME) throw new Error('Banco de dados não configurado.');
  if(!pool) pool=mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,waitForConnections:true,connectionLimit:5,charset:'utf8mb4'});
  return pool;
}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Pegasus Computadores'}));
app.post('/api/asu',async(req,res)=>{
  try{
    if(!process.env.GROQ_API_KEY) return res.status(503).json({error:'GROQ_API_KEY não configurada no servidor.'});
    const messages=Array.isArray(req.body.messages)?req.body.messages:[];
    if(!messages.length) return res.status(400).json({error:'Mensagens ausentes.'});
    const upstream=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.GROQ_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.GROQ_MODEL||'openai/gpt-oss-120b',messages,temperature:.5,max_tokens:700,tools:req.body.tools,tool_choice:req.body.tool_choice})});
    const payload=await upstream.json();
    res.status(upstream.status).json(payload);
  }catch(error){console.error('[ASU]',error);res.status(502).json({error:'Falha ao conectar à API da ASU.'});}
});
app.post('/api/orcamentos',upload.single('anexo'),async(req,res)=>{
  const b=req.body;
  const required=['nome','telefone','servico','mensagem','equipamento'];
  for(const field of required) if(!String(b[field]||'').trim()) return res.status(400).json({error:`Campo obrigatório ausente: ${field}.`});
  if(!/^\(?[0-9]{2}\)? ?[0-9]{4,5}-?[0-9]{4}$/.test(String(b.telefone))) return res.status(400).json({error:'Telefone inválido. Informe DDD e número.'});
  try{
    const db=getPool();
    const [result]=await db.execute(`INSERT INTO solicitacoes (nome,telefone,servico,data_desejada,mensagem,equipamento,preferencias,anexo_nome,anexo_mime,anexo_dados,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[
      String(b.nome).trim(),String(b.telefone).trim(),String(b.servico),b.data||null,String(b.mensagem).trim(),String(b.equipamento),JSON.stringify([].concat(b.preferencias||[])),req.file?.originalname||null,req.file?.mimetype||null,req.file?.buffer||null,'recebida']);
    res.status(201).json({ok:true,id:result.insertId,message:'Solicitação registrada com sucesso! Nossa equipe poderá avaliar os dados.'});
  }catch(error){
    console.error('[ORÇAMENTO]',error);
    res.status(503).json({error:'Não foi possível gravar a solicitação. Verifique a configuração e disponibilidade do banco de dados.'});
  }
});
app.use((error,req,res,next)=>{console.error(error);res.status(400).json({error:error.message||'Requisição inválida.'});});
app.listen(PORT,()=>console.log(`Pegasus disponível em http://localhost:${PORT}`));
