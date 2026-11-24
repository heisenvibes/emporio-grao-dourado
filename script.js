
"use strict";

// Empório Grão Dourado — dados compartilhados pelo Supabase.
const SUPABASE_URL = "https://vgvomojsosfwokszbvvu.supabase.co";
const SUPABASE_KEY = "sb_publishable_HxCWJALEhctv0nm5BS-fvQ_HbjMzUJn";
const banco = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = seletor => document.querySelector(seletor);
const dinheiro = valor => Number(valor).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const numero = valor => Number(valor).toLocaleString("pt-BR", {maximumFractionDigits:2});
let produtos = [], movimentos = [], reposicoes = [];
let autenticado = false;
let ocupado = false;

function mensagem(texto) {
  const el = $("#mensagem"); el.textContent = texto; el.hidden = false;
  clearTimeout(mensagem.timer); mensagem.timer = setTimeout(() => el.hidden = true, 4500);
}
function celula(linha, texto) { const td = document.createElement("td"); td.textContent = String(texto); linha.append(td); return td; }
function vazio(tbody, colunas, texto) { const tr = document.createElement("tr"); const td = celula(tr, texto); td.colSpan = colunas; td.className = "empty"; tbody.append(tr); }
function estado(p) { const q = Number(p.quantidade); return q <= 0 ? "Sem estoque" : q <= Number(p.minimo) ? "Estoque baixo" : "Disponível"; }
function etiqueta(td, texto) { const span = document.createElement("span"); span.className = `badge${texto === "Sem estoque" ? " danger" : texto === "Estoque baixo" ? " warning" : ""}`; span.textContent = texto; td.append(span); }
function botao(legenda, acao, id, perigo = false) { const el = document.createElement("button"); el.type = "button"; el.className = `small-button${perigo ? " danger" : ""}`; el.textContent = legenda; el.dataset.action = acao; el.dataset.id = id; return el; }
function erroOperacao(erro) { console.error(erro); mensagem("Não foi possível concluir. Confira a conexão e as permissões no Supabase."); }
const paginas = {
  dashboard:["Dashboard","Visão geral do estoque do empório"],
  produtos:["Produtos","Cadastro e consulta de produtos"],
  movimentacoes:["Movimentações","Controle de entradas, saídas e ajustes"],
  reposicao:["Reposição","Produtos que precisam de reposição"],
  historico:["Histórico","Registro das movimentações do estoque"]
};
function navegar(pagina) {
  if (!autenticado || !paginas[pagina]) return;
  document.querySelectorAll(".page").forEach(el => el.hidden = el.id !== `page-${pagina}`);
  document.querySelectorAll(".nav-link").forEach(el => {
    const ativo = el.dataset.page === pagina;
    el.classList.toggle("active", ativo);
    if (ativo) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
  });
  $("#page-title").textContent = paginas[pagina][0];
  $("#page-description").textContent = paginas[pagina][1];
  atualizarTela(); window.scrollTo({top:0,behavior:"smooth"});
}
function abrirProduto(id = null) {
  if (!autenticado || ocupado) return;
  $("#form-produto").reset(); $("#produto-id").value = "";
  $("#modal-titulo").textContent = id === null ? "Novo produto" : "Editar produto";
  if (id !== null) {
    const p = produtos.find(p => String(p.id) === String(id)); if (!p) return;
    $("#produto-id").value = p.id; $("#nome").value = p.nome; $("#categoria").value = p.categoria;
    $("#quantidade").value = p.quantidade; $("#minimo").value = p.minimo; $("#preco").value = p.preco;
  }
  $("#modal-produto").hidden = false; $("#nome").focus();
}
function fecharProduto() { $("#modal-produto").hidden = true; }
function preencherTabela(tbody, lista, modo) {
  tbody.replaceChildren();
  if (!lista.length) { vazio(tbody, modo === "produtos" ? 7 : 4, "Nenhum produto encontrado."); return; }
  lista.forEach(p => {
    const tr = document.createElement("tr"); celula(tr,p.nome); celula(tr,p.categoria); celula(tr,numero(p.quantidade));
    if (modo === "produtos") { celula(tr,numero(p.minimo)); celula(tr,dinheiro(p.preco)); }
    etiqueta(celula(tr,""),estado(p));
    if (modo === "produtos") {
      const td = celula(tr,""); const a = document.createElement("div"); a.className = "actions";
      a.append(botao("Editar","editar",p.id),botao("Excluir","excluir",p.id,true)); td.append(a);
    }
    tbody.append(tr);
  });
}
function atualizarTela() {
  const baixos = produtos.filter(p => Number(p.quantidade) <= Number(p.minimo));
  $("#stat-produtos").textContent = produtos.length;
  $("#stat-baixo").textContent = baixos.length;
  $("#stat-movimentacoes").textContent = movimentos.length;
  $("#stat-reposicao").textContent = baixos.filter(p => !reposicoes.some(r => String(r.produto_id) === String(p.id))).length;
  preencherTabela($("#tabela-recentes"),produtos.slice(0,5),"recentes");
  const busca = $("#busca-produtos").value.trim().toLocaleLowerCase("pt-BR");
  preencherTabela($("#tabela-produtos"),produtos.filter(p => `${p.nome} ${p.categoria}`.toLocaleLowerCase("pt-BR").includes(busca)),"produtos");
  const seletor = $("#mov-produto"), selecionado = seletor.value; seletor.replaceChildren();
  const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Selecione um produto"; seletor.append(placeholder);
  produtos.forEach(p => { const opt = document.createElement("option"); opt.value = p.id; opt.textContent = `${p.nome} (atual: ${numero(p.quantidade)})`; seletor.append(opt); });
  if (produtos.some(p => String(p.id) === selecionado)) seletor.value = selecionado;
  const rep = $("#tabela-reposicao"); rep.replaceChildren();
  if (!baixos.length) vazio(rep,6,"Nenhum produto precisa de reposição.");
  baixos.forEach(p => {
    const tr = document.createElement("tr"); const marcado = reposicoes.some(r => String(r.produto_id) === String(p.id));
    celula(tr,p.nome); celula(tr,numero(p.quantidade)); celula(tr,numero(p.minimo));
    celula(tr,numero(Math.max(0,Number(p.minimo)-Number(p.quantidade))));
    celula(tr,marcado ? "Incluído na lista de compras" : estado(p));
    celula(tr,"").append(botao(marcado ? "Desmarcar" : "Marcar para compra","repor",p.id)); rep.append(tr);
  });
  const hist = $("#tabela-historico"); hist.replaceChildren();
  if (!movimentos.length) vazio(hist,5,"Nenhuma movimentação registrada.");
  movimentos.forEach(m => {
    const tr = document.createElement("tr"), data = new Date(m.created_at);
    celula(tr,Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR"));
    celula(tr,m.produto_nome || "Produto removido");
    celula(tr,({entrada:"Entrada",saida:"Saída",ajuste:"Ajuste"})[m.tipo] || m.tipo);
    celula(tr,numero(m.quantidade)); celula(tr,m.observacao || "—"); hist.append(tr);
  });
}
async function carregarDados() {
  if (!autenticado) return;
  const [p,m,r] = await Promise.all([
    banco.from("produtos").select("*").order("id",{ascending:false}),
    banco.from("movimentacoes").select("*").order("created_at",{ascending:false}),
    banco.from("reposicoes").select("*")
  ]);
  if (p.error || m.error || r.error) { erroOperacao(p.error || m.error || r.error); return; }
  produtos = p.data || []; movimentos = m.data || []; reposicoes = r.data || [];
  atualizarTela();
}
async function executar(acao) {
  if (!autenticado || ocupado) return;
  ocupado = true;
  try { await acao(); } catch (e) { erroOperacao(e); }
  finally { ocupado = false; }
}
async function salvarProduto(evento) {
  evento.preventDefault();
  await executar(async () => {
    const id = $("#produto-id").value;
    const dados = {nome:$("#nome").value.trim(),categoria:$("#categoria").value,
      quantidade:Number($("#quantidade").value),minimo:Number($("#minimo").value),preco:Number($("#preco").value)};
    if (!dados.nome || !dados.categoria || [dados.quantidade,dados.minimo,dados.preco].some(v => !Number.isFinite(v) || v < 0)) {
      alert("Confira os dados do produto."); return;
    }
    // RPC mantém alteração de quantidade e histórico na mesma transação.
    const {error} = await banco.rpc("salvar_produto", {p_id:id ? Number(id) : null,
      p_nome:dados.nome,p_categoria:dados.categoria,p_quantidade:dados.quantidade,p_minimo:dados.minimo,p_preco:dados.preco});
    if (error) { erroOperacao(error); return; }
    fecharProduto(); await carregarDados(); mensagem(id ? "Produto atualizado na nuvem." : "Produto cadastrado na nuvem.");
  });
}
async function excluirProduto(id) {
  const p = produtos.find(p => String(p.id) === String(id)); if (!p) return;
  if (!confirm(`Excluir o produto "${p.nome}"? O histórico será preservado.`)) return;
  await executar(async () => {
    const {error} = await banco.from("produtos").delete().eq("id",id);
    if (error) { erroOperacao(error); return; }
    await carregarDados(); mensagem("Produto excluído da nuvem.");
  });
}
async function salvarMovimentacao(evento) {
  evento.preventDefault();
  await executar(async () => {
    const id = Number($("#mov-produto").value), tipo = $("#mov-tipo").value;
    const qtd = Number($("#mov-quantidade").value), obs = $("#mov-obs").value.trim();
    if (!id || !["entrada","saida","ajuste"].includes(tipo) || !Number.isFinite(qtd) || qtd < 0 || (tipo !== "ajuste" && qtd <= 0)) {
      alert("Confira o produto e a quantidade."); return;
    }
    const {error} = await banco.rpc("registrar_movimentacao", {p_produto_id:id,p_tipo:tipo,p_quantidade:qtd,p_observacao:obs});
    if (error) { erroOperacao(error); return; }
    $("#form-movimentacao").reset(); await carregarDados(); mensagem("Movimentação salva na nuvem.");
  });
}
async function alternarReposicao(id) {
  await executar(async () => {
    const {error} = await banco.rpc("alternar_reposicao",{p_produto_id:Number(id)});
    if (error) { erroOperacao(error); return; }
    await carregarDados();
  });
}
const telaLogin = $("#tela-login"), formularioLogin = $("#form-login"), erroLogin = $("#erro-login");
async function verificarLogin() {
  const {data,error} = await banco.auth.getUser();
  autenticado = !error && !!data?.user;
  telaLogin.hidden = autenticado;
  if (autenticado) {
    $(".status").textContent = "Sistema online";
    await carregarDados();
  } else {
    $(".status").textContent = "Acesso restrito";
    produtos = []; movimentos = []; reposicoes = []; atualizarTela();
  }
}
formularioLogin.addEventListener("submit",async evento => {
  evento.preventDefault();
  const botaoEntrar = formularioLogin.querySelector('button[type="submit"]');
  botaoEntrar.disabled = true; erroLogin.hidden = true;
  try {
    const {error} = await banco.auth.signInWithPassword({
      email:$("#login-email").value.trim(),password:$("#login-senha").value
    });
    if (error) { erroLogin.textContent = "E-mail ou senha inválidos."; erroLogin.hidden = false; return; }
    formularioLogin.reset(); await verificarLogin();
  } catch (e) { console.error(e); erroLogin.textContent = "Erro de conexão. Tente novamente."; erroLogin.hidden = false; }
  finally { botaoEntrar.disabled = false; }
});
document.querySelectorAll(".nav-link").forEach(el => el.addEventListener("click",() => navegar(el.dataset.page)));
document.addEventListener("click",event => {
  const alvo = event.target.closest("[data-action]"); if (!alvo || !autenticado) return;
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
// O login fica visível até a sessão ser validada.
telaLogin.hidden = false;
verificarLogin();
