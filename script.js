"use strict";
const config = {apiKey:"AIzaSyBHKVUXzOKZtMGxaC02ZaWBZJVimFu01qY",authDomain:"emporio-grao-dourado.firebaseapp.com",projectId:"emporio-grao-dourado",storageBucket:"emporio-grao-dourado.firebasestorage.app",messagingSenderId:"216251981585",appId:"1:216251981585:web:a9fecb19dc70f10f1276b0"};
const app = window.firebase?.initializeApp(config);
const auth = app ? firebase.auth() : null;
const db = app ? firebase.firestore() : null;
if(auth) auth.languageCode='pt-BR';
const estoqueRef = uid => db.collection('usuarios').doc(uid).collection('estoque').doc('principal');
let financeiro=[], clientes=[], lixeira=[];
let fornecedores=[], precosHistorico=[], produtos=[], movimentos=[], reposicoes=[];
let usuario=null, salvo=null, revisao=null, ocupado=false;
const dadosAtuais=()=>({financeiro,clientes,lixeira,fornecedores,precosHistorico,produtos,movimentos,reposicoes});
function carregarEstado(d){for(const k of ['fornecedores','precosHistorico','produtos','movimentos','reposicoes'])if(!Array.isArray(d[k]))throw Error('Dados inválidos'); ({fornecedores,precosHistorico,produtos,movimentos,reposicoes}=structuredClone(d)); financeiro=structuredClone(d.financeiro||[]); clientes=structuredClone(d.clientes||[]); lixeira=structuredClone(d.lixeira||[]); }
const $ = (seletor) => document.querySelector(seletor);
const dinheiro = (valor) => Number(valor).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const numero = (valor) => Number(valor).toLocaleString("pt-BR", {maximumFractionDigits:2});
const idNovo = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
async function persistir(){
 if(!usuario||ocupado)return false;
 ocupado=true; const layout=$('.layout'), modal=$('#modal-produto'); layout.inert=true; modal.inert=true;
 try{const dados=structuredClone(dadosAtuais()); const ref=estoqueRef(usuario.uid); const anterior=revisao; await db.runTransaction(async tx=>{const snap=await tx.get(ref); if(!snap.exists||snap.data().revisao!==anterior)throw Error('Conflito'); tx.update(ref,{dados,revisao:anterior+1});}); revisao=anterior+1; salvo=dados; return true;}
 catch{carregarEstado(salvo); atualizarTela(); alert('Não foi possível salvar. Recarregue a página antes de tentar novamente.'); return false;}
 finally{ocupado=false; layout.inert=!modal.hidden; modal.inert=false;}
}
function mensagem(texto) { const el = $("#mensagem"); el.textContent = texto; el.hidden = false; clearTimeout(mensagem.timer); mensagem.timer = setTimeout(() => el.hidden = true, 3500); }
function celula(linha, texto) { const td = document.createElement("td"); td.textContent = String(texto); linha.append(td); return td; }
function vazio(tbody, colunas, texto) { const tr = document.createElement("tr"); const td = celula(tr, texto); td.colSpan = colunas; td.className = "empty"; tbody.append(tr); }
function estado(produto) { const q = Number(produto.quantidade); return q <= 0 ? "Sem estoque" : q <= Number(produto.minimo) ? "Estoque baixo" : "Disponível"; }
function etiqueta(td, texto) { const span = document.createElement("span"); span.className = `badge${texto === "Sem estoque" ? " danger" : texto === "Estoque baixo" ? " warning" : ""}`; span.textContent = texto; td.append(span); }
function botao(legenda, acao, id, perigo = false) { const el = document.createElement("button"); el.type = "button"; el.className = `small-button${perigo ? " danger" : ""}`; el.textContent = legenda; el.dataset.action = acao; el.dataset.id = id; return el; }
const paginas = {
  comercial:["Vendas e finanças","Controle comercial"],conta:["Conta e lixeira","Dados e segurança"],dashboard:["Dashboard","Visão geral do estoque do empório"],
  produtos:["Produtos","Cadastro e consulta de produtos"],
  movimentacoes:["Movimentações","Controle de entradas, saídas e ajustes"],
  reposicao:["Reposição","Produtos que precisam de reposição"],
  fornecedores:["Fornecedores","Cadastro de parceiros"],relatorios:["Relatórios e assistente","Indicadores e recomendações"],historico:["Histórico","Registro das movimentações do estoque"]
};
function navegar(pagina) {
  if (!paginas[pagina]) return;
  document.querySelectorAll(".page").forEach(el => el.hidden = el.id !== `page-${pagina}`);
  document.querySelectorAll(".nav-link").forEach(el => { const ativo = el.dataset.page === pagina; el.classList.toggle("active", ativo); if (ativo) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current"); });
  $("#page-title").textContent = paginas[pagina][0]; $("#page-description").textContent = paginas[pagina][1];
  atualizarTela(); window.scrollTo({top:0,behavior:"smooth"});
}
function abrirProduto(id = null) {
  $("#form-produto").reset(); $("#produto-id").value = "";
  $("#modal-titulo").textContent = id === null ? "Novo produto" : "Editar produto";
  if (id !== null) {
    const p = produtos.find(p => String(p.id) === String(id)); if (!p) return;
    $("#produto-id").value = p.id; $("#nome").value = p.nome; $("#categoria").value = p.categoria;
    $("#quantidade").value = p.quantidade; $("#minimo").value = p.minimo; $("#preco").value = p.preco;
  }
  const sel=$("#fornecedor");sel.replaceChildren(new Option("Sem fornecedor",""));fornecedores.forEach(f=>sel.add(new Option(f.nome,f.id)));const atual=produtos.find(p=>String(p.id)===String(id));$("#codigo").value=atual?.codigo||"";$("#validade").value=atual?.validade||"";sel.value=atual?.fornecedor||"";
  $("#preco-venda").value=atual?.precoVenda??""; $("#modal-produto").hidden = false; $("#nome").focus();
}
function fecharProduto() { $("#modal-produto").hidden = true; }
function registrarMovimento(produto, tipo, quantidade, observacao) {
  movimentos.unshift({id:idNovo(),produtoId:produto.id,produtoNome:produto.nome,tipo,quantidade,data:new Date().toISOString(),observacao});
}
async function salvarProduto(evento) {
  evento.preventDefault();
  const id = $("#produto-id").value;
  const dados = {nome:$("#nome").value.trim(),categoria:$("#categoria").value,quantidade:Number($("#quantidade").value),minimo:Number($("#minimo").value),preco:Number($("#preco").value)};
  Object.assign(dados,{precoVenda:Number($("#preco-venda").value),codigo:$("#codigo").value.trim(),validade:$("#validade").value,fornecedor:$("#fornecedor").value});
  if(dados.codigo && produtos.some(p=>p.codigo===dados.codigo && String(p.id)!==id))return alert("Código já cadastrado.");
  if (!dados.nome || !dados.categoria || Object.values(dados).filter(v => typeof v === "number").some(v => !Number.isFinite(v) || v < 0)) return alert("Confira os dados do produto.");
  if (id) {
    const p = produtos.find(p => String(p.id) === id); if (!p) return;
    const anterior = Number(p.quantidade); if(Number(p.preco)!==dados.preco)precosHistorico.unshift({nome:p.nome,anterior:p.preco,novo:dados.preco,data:new Date().toISOString()}); Object.assign(p,dados);
    if (anterior !== dados.quantidade) registrarMovimento(p,"ajuste",dados.quantidade,`Cadastro editado (anterior: ${numero(anterior)})`);
  } else { produtos.push({id:idNovo(),...dados}); }
  if (!await persistir()) return;
  fecharProduto(); atualizarTela(); mensagem(id ? "Produto atualizado." : "Produto cadastrado.");
}
async function excluirProduto(id) {
  const p = produtos.find(p => String(p.id) === String(id)); if (!p) return;
  if (!confirm(`Excluir o produto "${p.nome}"? O histórico será preservado.`)) return;
  lixeira.push({...p,excluidoEm:new Date().toISOString()}); produtos = produtos.filter(item => String(item.id) !== String(id)); reposicoes = reposicoes.filter(item => String(item) !== String(id));
  if (!await persistir()) return; atualizarTela(); mensagem("Produto excluído.");
}
function preencherTabela(tbody, lista, modo) {
  tbody.replaceChildren();
  if (!lista.length) { vazio(tbody,modo === "produtos" ? 7 : 4, "Nenhum produto encontrado."); return; }
  lista.forEach(p => {
    const tr = document.createElement("tr"); celula(tr,p.nome); celula(tr,p.categoria); celula(tr,numero(p.quantidade));
    if (modo === "produtos") { celula(tr,numero(p.minimo)); celula(tr,dinheiro(p.preco)); }
    etiqueta(celula(tr,""),estado(p));
    if (modo === "produtos") { const td = celula(tr,""); const a = document.createElement("div"); a.className = "actions"; a.append(botao("Editar","editar",p.id),botao("Excluir","excluir",p.id,true)); td.append(a); }
    tbody.append(tr);
  });
}
function atualizarTela() {
  atualizarComercial();
  atualizarExtras();
  atualizarResumo();
  const baixos = produtos.filter(p => Number(p.quantidade) <= Number(p.minimo));
  $("#stat-produtos").textContent = produtos.length;
  $("#stat-baixo").textContent = baixos.length;
  $("#stat-movimentacoes").textContent = movimentos.length;
  $("#stat-reposicao").textContent = baixos.filter(p => !reposicoes.some(id => String(id) === String(p.id))).length;
  preencherTabela($("#tabela-recentes"),produtos.slice(-5).reverse(),"recentes");
  const busca = $("#busca-produtos").value.trim().toLocaleLowerCase("pt-BR");
  preencherTabela($("#tabela-produtos"),produtos.filter(p => `${p.nome} ${p.categoria}`.toLocaleLowerCase("pt-BR").includes(busca) && (!$("#filtro-categoria").value || p.categoria === $("#filtro-categoria").value)),"produtos");
  const seletor = $("#mov-produto"); const selecionado = seletor.value; seletor.replaceChildren();
  const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Selecione um produto"; seletor.append(placeholder);
  produtos.forEach(p => { const opt = document.createElement("option"); opt.value = p.id; opt.textContent = `${p.nome} (atual: ${numero(p.quantidade)})`; seletor.append(opt); });
  if (produtos.some(p => String(p.id) === selecionado)) seletor.value = selecionado;
  const rep = $("#tabela-reposicao"); rep.replaceChildren();
  if (!baixos.length) vazio(rep,6,"Nenhum produto precisa de reposição.");
  baixos.forEach(p => {
    const tr = document.createElement("tr"); const marcado = reposicoes.some(id => String(id) === String(p.id));
    celula(tr,p.nome); celula(tr,numero(p.quantidade)); celula(tr,numero(p.minimo)); celula(tr,numero(Math.max(0,Number(p.minimo)-Number(p.quantidade))));
    celula(tr,marcado ? "Incluído na lista de compras" : estado(p));
    const td = celula(tr,""); td.append(botao(marcado ? "Desmarcar" : "Marcar para compra","repor",p.id)); rep.append(tr);
  });
  const hist = $("#tabela-historico"); hist.replaceChildren();
  if (!movimentos.length) vazio(hist,5,"Nenhuma movimentação registrada.");
  movimentos.forEach(m => { const tr = document.createElement("tr"); const data = new Date(m.data); celula(tr,Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR")); celula(tr,m.produtoNome || "Produto removido"); celula(tr,({entrada:"Entrada",saida:"Saída",ajuste:"Ajuste"})[m.tipo] || m.tipo); celula(tr,numero(m.quantidade)); celula(tr,m.observacao || "—"); hist.append(tr); });
}
async function salvarMovimentacao(evento) {
  evento.preventDefault(); const p = produtos.find(p => String(p.id) === $("#mov-produto").value); if (!p) return alert("Selecione um produto.");
  const tipo = $("#mov-tipo").value; const qtd = Number($("#mov-quantidade").value);
  if (!Number.isFinite(qtd) || qtd < 0 || (tipo !== "ajuste" && qtd <= 0)) return alert("Informe uma quantidade válida.");
  if (tipo === "saida" && qtd > Number(p.quantidade)) return alert("Saída maior que o estoque disponível.");
  const anterior = Number(p.quantidade);
  p.quantidade = tipo === "entrada" ? anterior + qtd : tipo === "saida" ? anterior - qtd : qtd;
  const obs = $("#mov-obs").value.trim();
  registrarMovimento(p,tipo,qtd,tipo === "ajuste" ? `${obs ? obs + " | " : ""}Anterior: ${numero(anterior)}` : obs);
  // Uma reposição marcada deixa de estar pendente após a entrada de mercadoria.
  if (tipo === "entrada") reposicoes = reposicoes.filter(id => String(id) !== String(p.id));
  if (!await persistir()) return; $("#form-movimentacao").reset(); atualizarTela(); mensagem("Movimentação registrada.");
}
async function alternarReposicao(id) {
  if (reposicoes.some(item => String(item) === String(id))) reposicoes = reposicoes.filter(item => String(item) !== String(id));
  else reposicoes.push(id);
  if (!await persistir()) return; atualizarTela();
}
document.querySelectorAll(".nav-link").forEach(el => el.addEventListener("click",() => navegar(el.dataset.page)));
document.addEventListener("click",event => {
  const alvo = event.target.closest("[data-action]"); if (!alvo) return;
  const {action,id} = alvo.dataset;
  if (action === "novo-produto") abrirProduto();
  if (action === "editar") abrirProduto(id);
  if (action === "excluir") excluirProduto(id);
  if (action === "repor") alternarReposicao(id);
});
$("#fechar-modal").addEventListener("click",fecharProduto);
$("#modal-produto").addEventListener("click",e => { if (e.target.id === "modal-produto") fecharProduto(); });
document.addEventListener("keydown",e => { if (e.key === "Escape") fecharProduto(); });
$("#form-produto").addEventListener("submit",salvarProduto);
$("#form-movimentacao").addEventListener("submit",salvarMovimentacao);
$("#busca-produtos").addEventListener("input",atualizarTela);

function atualizarResumo() {
  const grupos = new Map();
  let total = 0;
  for (const p of produtos) {
    const valor = Number(p.quantidade) * Number(p.preco);
    if (!Number.isFinite(valor)) continue;
    total += valor;
    grupos.set(p.categoria, (grupos.get(p.categoria) || 0) + valor);
  }
  $("#stat-valor").textContent = dinheiro(total);
  const grafico = $("#grafico-categorias"); grafico.replaceChildren();
  if (!grupos.size) { grafico.textContent = "Cadastre produtos para visualizar o gráfico."; return; }
  for (const [categoria, valor] of grupos) {
    const linha = document.createElement("div"); linha.className = "chart-row";
    const legenda = document.createElement("div"); legenda.textContent = `${categoria} — ${dinheiro(valor)}`;
    const trilho = document.createElement("div"); trilho.className = "chart-track";
    const barra = document.createElement("div"); barra.className = "chart-bar"; barra.style.width = `${total > 0 ? Math.max(0, valor / total * 100) : 0}%`;
    trilho.append(barra); linha.append(legenda,trilho); grafico.append(linha);
  }
}
function baixar(conteudo, nome, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], {type:tipo}));
  const a = document.createElement("a"); a.href=url; a.download=nome; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function csvCampo(v) {
  let t=String(v ?? ""); if (/^[\s]*[=+@-]/.test(t)) t="'"+t;
  return '"'+t.replace(/"/g,'""')+'"';
}
$("#exportar-csv").addEventListener("click",()=>{
  const linhas=[["Produto","Categoria","Quantidade","Mínimo","Preço de compra (R$)","Valor total (R$)","Status"], ...produtos.map(p=>[p.nome,p.categoria,numero(p.quantidade),numero(p.minimo),Number(p.preco).toFixed(2).replace(".",","),(Number(p.quantidade)*Number(p.preco)).toFixed(2).replace(".",","),estado(p)])];
  baixar("\uFEFF"+linhas.map(l=>l.map(csvCampo).join(";")).join("\r\n"),"estoque-grao-dourado.csv","text/csv;charset=utf-8");
});
$("#backup").addEventListener("click",()=>baixar(JSON.stringify({versao:1,...dadosAtuais()},null,2),"backup-grao-dourado.json","application/json"));
$("#restaurar").addEventListener("click",()=>$("#arquivo-backup").click());
$("#arquivo-backup").addEventListener("change",async e=>{
  const arquivo=e.target.files[0]; e.target.value=""; if(!arquivo)return;
  try {
    if(arquivo.size>5000000) throw Error("Arquivo muito grande");
    const b=JSON.parse(await arquivo.text());
    const idValido=x=>typeof x==="string" && x.length>0 || typeof x==="number" && Number.isFinite(x);
    const num=x=>typeof x==="number" && Number.isFinite(x) && x>=0;
    if(b.versao!==1 || !Array.isArray(b.produtos) || !Array.isArray(b.movimentos) || !Array.isArray(b.reposicoes) || !b.produtos.every(p=>p && idValido(p.id) && typeof p.nome==="string" && p.nome.trim() && typeof p.categoria==="string" && [p.quantidade,p.minimo,p.preco].every(num)) || new Set(b.produtos.map(p=>String(p.id))).size!==b.produtos.length || !b.movimentos.every(m=>m && idValido(m.id) && idValido(m.produtoId) && typeof m.produtoNome==="string" && ["entrada","saida","ajuste"].includes(m.tipo) && num(m.quantidade) && typeof m.data==="string" && Number.isFinite(Date.parse(m.data)) && typeof m.observacao==="string") || !b.reposicoes.every(id=>idValido(id)&&b.produtos.some(p=>String(p.id)===String(id)))) throw Error("Backup inválido");
    if(!confirm("Restaurar este backup? Os dados atuais serão substituídos. Faça um backup antes, se necessário."))return;
    const anterior=[produtos,movimentos,reposicoes];
    [produtos,movimentos,reposicoes]=[b.produtos,b.movimentos,b.reposicoes];
    fornecedores=Array.isArray(b.fornecedores)?b.fornecedores.filter(f=>f && typeof f.nome==="string" && typeof f.id==="string"):[]; precosHistorico=Array.isArray(b.precosHistorico)?b.precosHistorico.filter(p=>p && typeof p.nome==="string" && Number.isFinite(p.anterior) && Number.isFinite(p.novo)):[];
    financeiro=Array.isArray(b.financeiro)?b.financeiro.filter(x=>x&&["venda","perda","despesa"].includes(x.tipo)&&num(x.receita)&&num(x.custo)&&typeof x.nome==="string"&&Number.isFinite(Date.parse(x.data))):[]; clientes=Array.isArray(b.clientes)?b.clientes.filter(x=>x&&typeof x.nome==="string"&&idValido(x.id)):[]; lixeira=Array.isArray(b.lixeira)?b.lixeira.filter(x=>x&&idValido(x.id)&&typeof x.nome==="string"&&[x.quantidade,x.minimo,x.preco].every(num)):[];
    if(!await persistir())return;
    atualizarTela(); mensagem("Backup restaurado.");
  } catch { alert("Não foi possível restaurar: arquivo inválido ou incompatível."); }
});
$("#filtro-categoria").addEventListener("change",atualizarTela);

// Preferências de acessibilidade independentes dos dados de estoque.
let preferencias = {fonte:100, contraste:false};
try { const p=JSON.parse(localStorage.getItem('gd_acessibilidade')||'null'); if(p){preferencias.fonte=Math.min(175,Math.max(100,Number(p.fonte)||100));preferencias.contraste=p.contraste===true;} } catch {}
function aplicarAcessibilidade(){
 document.documentElement.style.fontSize=preferencias.fonte+'%';
 document.documentElement.classList.toggle('high-contrast',preferencias.contraste);
 $('#contraste').setAttribute('aria-pressed',String(preferencias.contraste));
 $('#fonte-menor').disabled=preferencias.fonte<=100; $('#fonte-maior').disabled=preferencias.fonte>=175;
 $('#estado-acessibilidade').textContent=`Texto: ${preferencias.fonte}%. Alto contraste ${preferencias.contraste?'ativado':'desativado'}.`;
 try{localStorage.setItem('gd_acessibilidade',JSON.stringify(preferencias));}catch{}
}
$('#acessibilidade').addEventListener('click',()=>{const p=$('#painel-acessibilidade');p.hidden=!p.hidden;$('#acessibilidade').setAttribute('aria-expanded',String(!p.hidden));});
$('#fonte-maior').addEventListener('click',()=>{preferencias.fonte=Math.min(175,preferencias.fonte+25);aplicarAcessibilidade();});
$('#fonte-menor').addEventListener('click',()=>{preferencias.fonte=Math.max(100,preferencias.fonte-25);aplicarAcessibilidade();});
$('#contraste').addEventListener('click',()=>{preferencias.contraste=!preferencias.contraste;aplicarAcessibilidade();});
const falaDisponivel='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
function pararLeitura(){if(falaDisponivel)window.speechSynthesis.cancel();}
$('#ler-pagina').addEventListener('click',()=>{if(!falaDisponivel){mensagem('Leitura em voz alta indisponível neste navegador.');return;}pararLeitura();const pagina=document.querySelector('.page:not([hidden])');const fala=new SpeechSynthesisUtterance($('#page-title').textContent+'. '+pagina.innerText);fala.lang='pt-BR';fala.onerror=()=>mensagem('Não foi possível reproduzir a leitura.');window.speechSynthesis.speak(fala);});
$('#parar-leitura').addEventListener('click',pararLeitura);
$('#reset-acessibilidade').addEventListener('click',()=>{pararLeitura();preferencias={fonte:100,contraste:false};aplicarAcessibilidade();});
document.querySelectorAll('.nav-link').forEach(el=>el.addEventListener('click',()=>{pararLeitura();$('#page-title').focus();}));
let focoAnterior=null;
const modalAcessivel=$('#modal-produto');
const observarModal=new MutationObserver(()=>{if(!modalAcessivel.hidden){if(!focoAnterior)focoAnterior=document.activeElement=== $('#nome') ? document.querySelector('.page:not([hidden]) [data-action="novo-produto"]') : document.activeElement;$('.layout').inert=true;}else{$('.layout').inert=false;if(focoAnterior){if(focoAnterior.isConnected)focoAnterior.focus();else $('#page-title').focus();focoAnterior=null;}}});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="novo-produto"],[data-action="editar"]');if(b)focoAnterior=b;},true);
observarModal.observe(modalAcessivel,{attributes:true,attributeFilter:['hidden']});
modalAcessivel.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const itens=[...modalAcessivel.querySelectorAll('button,input:not([type="hidden"]),select')].filter(x=>!x.disabled);const primeiro=itens[0],ultimo=itens.at(-1);if(e.shiftKey&&document.activeElement===primeiro){e.preventDefault();ultimo.focus();}else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primeiro.focus();}});
aplicarAcessibilidade();

function indicadores(){return produtos.map(p=>{const saidas=movimentos.filter(m=>String(m.produtoId)===String(p.id)&&m.tipo==='saida'&&Date.parse(m.data)>=Date.now()-30*86400000).reduce((a,m)=>a+Number(m.quantidade),0);const dias=saidas>0?Number(p.quantidade)/(saidas/30):null;const validade=p.validade?Math.ceil((Date.parse(p.validade+'T00:00:00')-new Date().setHours(0,0,0,0))/86400000):null;return {p,dias,validade,sugestao:Math.max(0,Math.ceil(Math.max(Number(p.minimo),saidas/30*14)-Number(p.quantidade)))};});}
function atualizarExtras(){const lista=$('#lista-fornecedores');lista.replaceChildren();fornecedores.forEach(f=>{const el=document.createElement('p');el.textContent=f.nome+' — '+(f.contato||'Sem contato');lista.append(el);});if(!fornecedores.length)lista.textContent='Nenhum fornecedor cadastrado.';const r=$('#relatorio');r.replaceChildren();for(const x of indicadores()){const el=document.createElement('p');el.textContent=`${x.p.nome} | Validade: ${x.validade===null?'Não informada':x.validade<0?'Vencido':x.validade+' dias'} | Cobertura: ${x.dias===null?'Sem dados de saída':numero(x.dias)+' dias'} | Compra sugerida: ${x.sugestao}`;r.append(el);}if(!produtos.length)r.textContent='Cadastre produtos para gerar indicadores.';const h=$('#precos-historico');h.replaceChildren();precosHistorico.forEach(p=>{const el=document.createElement('p');el.textContent=`${p.nome}: ${dinheiro(p.anterior)} → ${dinheiro(p.novo)} (${new Date(p.data).toLocaleString('pt-BR')})`;h.append(el);});if(!precosHistorico.length)h.textContent='Nenhuma alteração de preço.';}
$('#form-fornecedor').addEventListener('submit',async e=>{e.preventDefault();const nome=$('#fn').value.trim();if(!nome)return;fornecedores.push({id:idNovo(),nome,contato:$('#fc').value.trim()});if(await persistir()){e.target.reset();atualizarExtras();mensagem('Fornecedor cadastrado.');}});
$('#form-codigo').addEventListener('submit',e=>{e.preventDefault();const p=produtos.find(p=>p.codigo&&p.codigo===$('#consulta-codigo').value.trim());$('#resultado-codigo').textContent=p?`${p.nome} — Estoque: ${numero(p.quantidade)} — ${dinheiro(p.preco)}`:'Produto não encontrado.';});
$('#csv-relatorio').addEventListener('click',()=>baixar('\uFEFF'+[['Produto','Validade','Cobertura em dias','Compra sugerida'],...indicadores().map(x=>[x.p.nome,x.p.validade||'',x.dias===null?'Sem dados':numero(x.dias),x.sugestao])].map(r=>r.map(csvCampo).join(';')).join('\r\n'),'relatorio.csv','text/csv;charset=utf-8'));
$('#responder').addEventListener('click',()=>{const q=$('#pergunta').value;const a=indicadores();$('#resposta').textContent=q==='valor'?dinheiro(produtos.reduce((t,p)=>t+Number(p.preco)*Number(p.quantidade),0)):q==='repor'?(a.filter(x=>x.sugestao>0).map(x=>x.p.nome+': '+x.sugestao).join('; ')||'Nenhuma compra sugerida.'):(a.filter(x=>x.validade!==null&&x.validade<=30).map(x=>x.p.nome+': '+(x.validade<0?'vencido':x.validade+' dias')).join('; ')||'Nenhum vencimento informado nos próximos 30 dias.');});

function erroAuth(e){return ({'auth/unauthorized-domain':'Autorize o domínio nas configurações do Firebase.','auth/popup-blocked':'Permita a janela de login no navegador.','auth/email-already-in-use':'Este e-mail já possui uma conta.','auth/weak-password':'Escolha uma senha mais forte.','auth/network-request-failed':'Confira sua conexão.'})[e.code]||'Não foi possível autenticar. Confira os dados e tente novamente.';}
async function iniciarConta(user){
 $('.layout').hidden=true; $('#auth').hidden=false; usuario=null;
 if(!user){$('#auth-msg').textContent='Entre ou crie uma conta.';return;}
 $('#auth-msg').textContent='Carregando estoque...';
 try{const ref=estoqueRef(user.uid);const data=await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.exists)return snap.data();const inicial={dados:{financeiro:[],clientes:[],lixeira:[],fornecedores:[],precosHistorico:[],produtos:[],movimentos:[],reposicoes:[]},revisao:0};tx.set(ref,inicial);return inicial;});if(auth.currentUser?.uid!==user.uid)return;usuario=user;carregarEstado(data.dados);salvo=structuredClone(data.dados);revisao=data.revisao;atualizarTela();$('#auth').hidden=true;$('.layout').hidden=false;$('#page-title').focus();}
 catch(e){console.error(e);$('#auth-msg').textContent='Não foi possível abrir o estoque. Confira as regras do Firestore e recarregue.';}
}
async function autenticar(cadastro){const form=$('#auth-form');if(!form.reportValidity()||!auth)return;const botoes=[...form.querySelectorAll('button')];botoes.forEach(b=>b.disabled=true);$('#auth-msg').textContent='Aguarde...';try{const email=$('#email').value.trim(),senha=$('#senha').value;if(cadastro)await auth.createUserWithEmailAndPassword(email,senha);else await auth.signInWithEmailAndPassword(email,senha);$('#senha').value='';}catch(e){$('#auth-msg').textContent=erroAuth(e);}finally{botoes.forEach(b=>b.disabled=false);}}
$('#auth-form').addEventListener('submit',e=>{e.preventDefault();autenticar(false);});$('#criar-conta').addEventListener('click',()=>autenticar(true));$('#google-login').addEventListener('click',async()=>{if(!auth)return;try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}catch(e){$('#auth-msg').textContent=erroAuth(e);}});$('#sair').addEventListener('click',async()=>{try{await auth.signOut();location.reload();}catch(e){mensagem('Não foi possível sair.');}});
const mesAtual=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
$('#mes-fin').value=mesAtual();
const registrosMes=()=>financeiro.filter(x=>{const d=new Date(x.data);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===$('#mes-fin').value;});
function atualizarComercial(){const sel=$('#v-produto'),old=sel.value;sel.replaceChildren(new Option('Selecione',''));produtos.forEach(p=>sel.add(new Option(p.nome,p.id)));sel.value=old;const rows=registrosMes();const receita=rows.reduce((a,x)=>a+x.receita,0),custo=rows.reduce((a,x)=>a+x.custo,0);$('#resumo-fin').textContent=`Receitas: ${dinheiro(receita)} | Custos e despesas: ${dinheiro(custo)} | Resultado estimado: ${dinheiro(receita-custo)} (não inclui impostos não registrados).`;const tb=$('#tabela-fin');tb.replaceChildren();rows.forEach(x=>{const tr=document.createElement('tr');[new Date(x.data).toLocaleString('pt-BR'),x.tipo,x.nome,dinheiro(x.receita),dinheiro(x.custo)].forEach(v=>celula(tr,v));tb.append(tr);});if(!rows.length)vazio(tb,5,'Nenhum registro no mês.');for(const [id,items,acao] of [['lista-clientes',clientes,'remover-cliente'],['lista-lixeira',lixeira,'restaurar-produto']]){const el=$('#'+id);el.replaceChildren();items.forEach(x=>{const p=document.createElement('p');p.textContent=x.nome+' ';p.append(botao(acao==='remover-cliente'?'Remover':'Restaurar',acao,x.id));el.append(p);});if(!items.length)el.textContent='Nenhum registro.';}$('#conta-email').textContent=usuario?.email||'';}
$('#v-produto').addEventListener('change',()=>{$('#v-preco').value=produtos.find(p=>String(p.id)===$('#v-produto').value)?.precoVenda??0;});
$('#v-tipo').addEventListener('change',()=>{$('#v-preco').disabled=$('#v-tipo').value==='perda';});
$('#form-venda').addEventListener('submit',async e=>{e.preventDefault();if(ocupado)return;const p=produtos.find(p=>String(p.id)===$('#v-produto').value),q=Number($('#v-qtd').value),v=Number($('#v-preco').value),tipo=$('#v-tipo').value;if(!p||!Number.isFinite(q)||q<=0||q>p.quantidade||!Number.isFinite(v)||v<0)return mensagem('Confira quantidade e preço.');if(tipo==='venda'&&p.validade&&p.validade<new Date().toLocaleDateString('sv-SE'))return mensagem('Produto vencido: registre uma perda.');p.quantidade=Math.round((p.quantidade-q)*100)/100;financeiro.unshift({id:idNovo(),tipo,nome:p.nome,receita:tipo==='venda'?Math.round(q*v*100)/100:0,custo:Math.round(q*p.preco*100)/100,data:new Date().toISOString()});registrarMovimento(p,'saida',q,tipo+': '+$('#v-obs').value);if(await persistir()){e.target.reset();$('#v-preco').disabled=false;atualizarTela();mensagem('Operação registrada.');}});
$('#form-despesa').addEventListener('submit',async e=>{e.preventDefault();if(ocupado)return;const nome=$('#d-nome').value.trim(),custo=Number($('#d-valor').value);if(!nome||!Number.isFinite(custo)||custo<=0)return;financeiro.unshift({id:idNovo(),tipo:'despesa',nome,custo,receita:0,data:new Date().toISOString()});if(await persistir()){e.target.reset();atualizarTela();mensagem('Despesa registrada.');}});
$('#form-cliente').addEventListener('submit',async e=>{e.preventDefault();if(ocupado)return;const nome=$('#c-nome').value.trim();if(!nome)return;clientes.push({id:idNovo(),nome});if(await persistir()){e.target.reset();atualizarTela();mensagem('Cliente cadastrado.');}});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b||ocupado)return;const {action,id}=b.dataset;if(action==='remover-cliente'){if(!confirm('Remover cliente?'))return;clientes=clientes.filter(x=>String(x.id)!==id);}else if(action==='restaurar-produto'){const p=lixeira.find(x=>String(x.id)===id);if(!p||produtos.some(x=>String(x.id)===id||(p.codigo&&x.codigo===p.codigo)))return mensagem('Já existe um produto com este identificador ou código.');produtos.push(p);lixeira=lixeira.filter(x=>String(x.id)!==id);}else return;if(await persistir()){atualizarTela();mensagem('Alteração salva.');}});
$('#mes-fin').addEventListener('change',atualizarComercial);$('#csv-fin').addEventListener('click',()=>baixar('\uFEFF'+[['Data','Tipo','Descrição','Receita','Custo'],...registrosMes().map(x=>[x.data,x.tipo,x.nome,x.receita,x.custo])].map(r=>r.map(csvCampo).join(';')).join('\r\n'),'financeiro.csv','text/csv;charset=utf-8'));
$('#atualizar-nuvem').addEventListener('click',()=>location.reload());
async function recuperar(email){if(!auth||!email)return;try{await auth.sendPasswordResetEmail(email);$('#auth-msg').textContent='Confira seu e-mail.';mensagem('Confira seu e-mail.');}catch(e){$('#auth-msg').textContent='Não foi possível enviar o link.';mensagem('Não foi possível enviar o link.');}}
$('#recuperar').addEventListener('click',()=>{if($('#email').reportValidity())recuperar($('#email').value.trim());});$('#trocar-senha').addEventListener('click',()=>recuperar(usuario?.email));
for(const [id,classe] of [['modo-escuro','dark-mode'],['modo-simples','simple-mode']]){const b=$('#'+id);let ativo=false;try{ativo=localStorage.getItem('gd_'+classe)==='true';}catch{}const aplicar=()=>{document.documentElement.classList.toggle(classe,ativo);b.setAttribute('aria-pressed',String(ativo));};aplicar();b.addEventListener('click',()=>{ativo=!ativo;aplicar();try{localStorage.setItem('gd_'+classe,String(ativo));}catch{}});$('#reset-acessibilidade').addEventListener('click',()=>{ativo=false;aplicar();try{localStorage.removeItem('gd_'+classe);}catch{}});}
if(auth)auth.onAuthStateChanged(iniciarConta);else $('#auth-msg').textContent='Não foi possível carregar o Firebase. Confira a conexão.';
