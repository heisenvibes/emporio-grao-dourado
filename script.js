"use strict";
// Protótipo local: os dados pertencem a este navegador e não são compartilhados entre dispositivos.
const CHAVE_PRODUTOS = "produtos"; // compatível com o cadastro anterior
const CHAVE_MOVIMENTOS = "grao_dourado_movimentacoes_v1";
const CHAVE_REPOSICOES = "grao_dourado_reposicoes_v1";
function lerLista(chave) {
  try { const valor = JSON.parse(localStorage.getItem(chave) || "[]"); return Array.isArray(valor) ? valor : []; }
  catch { return []; }
}
let produtos = lerLista(CHAVE_PRODUTOS);
let movimentos = lerLista(CHAVE_MOVIMENTOS);
let reposicoes = lerLista(CHAVE_REPOSICOES);
const $ = (seletor) => document.querySelector(seletor);
const dinheiro = (valor) => Number(valor).toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const numero = (valor) => Number(valor).toLocaleString("pt-BR", {maximumFractionDigits:2});
const idNovo = () => (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function persistir() {
  try {
    localStorage.setItem(CHAVE_PRODUTOS, JSON.stringify(produtos));
    localStorage.setItem(CHAVE_MOVIMENTOS, JSON.stringify(movimentos));
    localStorage.setItem(CHAVE_REPOSICOES, JSON.stringify(reposicoes));
    return true;
  } catch { alert("Não foi possível salvar. Verifique o armazenamento do navegador."); return false; }
}
function mensagem(texto) { const el = $("#mensagem"); el.textContent = texto; el.hidden = false; clearTimeout(mensagem.timer); mensagem.timer = setTimeout(() => el.hidden = true, 3500); }
function celula(linha, texto) { const td = document.createElement("td"); td.textContent = String(texto); linha.append(td); return td; }
function vazio(tbody, colunas, texto) { const tr = document.createElement("tr"); const td = celula(tr, texto); td.colSpan = colunas; td.className = "empty"; tbody.append(tr); }
function estado(produto) { const q = Number(produto.quantidade); return q <= 0 ? "Sem estoque" : q <= Number(produto.minimo) ? "Estoque baixo" : "Disponível"; }
function etiqueta(td, texto) { const span = document.createElement("span"); span.className = `badge${texto === "Sem estoque" ? " danger" : texto === "Estoque baixo" ? " warning" : ""}`; span.textContent = texto; td.append(span); }
function botao(legenda, acao, id, perigo = false) { const el = document.createElement("button"); el.type = "button"; el.className = `small-button${perigo ? " danger" : ""}`; el.textContent = legenda; el.dataset.action = acao; el.dataset.id = id; return el; }
const paginas = {
  dashboard:["Dashboard","Visão geral do estoque do empório"],
  produtos:["Produtos","Cadastro e consulta de produtos"],
  movimentacoes:["Movimentações","Controle de entradas, saídas e ajustes"],
  reposicao:["Reposição","Produtos que precisam de reposição"],
  historico:["Histórico","Registro das movimentações do estoque"]
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
  $("#modal-produto").hidden = false; $("#nome").focus();
}
function fecharProduto() { $("#modal-produto").hidden = true; }
function registrarMovimento(produto, tipo, quantidade, observacao) {
  movimentos.unshift({id:idNovo(),produtoId:produto.id,produtoNome:produto.nome,tipo,quantidade,data:new Date().toISOString(),observacao});
}
function salvarProduto(evento) {
  evento.preventDefault();
  const id = $("#produto-id").value;
  const dados = {nome:$("#nome").value.trim(),categoria:$("#categoria").value,quantidade:Number($("#quantidade").value),minimo:Number($("#minimo").value),preco:Number($("#preco").value)};
  if (!dados.nome || !dados.categoria || Object.values(dados).filter(v => typeof v === "number").some(v => !Number.isFinite(v) || v < 0)) return alert("Confira os dados do produto.");
  if (id) {
    const p = produtos.find(p => String(p.id) === id); if (!p) return;
    const anterior = Number(p.quantidade); Object.assign(p,dados);
    if (anterior !== dados.quantidade) registrarMovimento(p,"ajuste",dados.quantidade,`Cadastro editado (anterior: ${numero(anterior)})`);
  } else { produtos.push({id:idNovo(),...dados}); }
  if (!persistir()) return;
  fecharProduto(); atualizarTela(); mensagem(id ? "Produto atualizado." : "Produto cadastrado.");
}
function excluirProduto(id) {
  const p = produtos.find(p => String(p.id) === String(id)); if (!p) return;
  if (!confirm(`Excluir o produto "${p.nome}"? O histórico será preservado.`)) return;
  produtos = produtos.filter(item => String(item.id) !== String(id)); reposicoes = reposicoes.filter(item => String(item) !== String(id));
  if (!persistir()) return; atualizarTela(); mensagem("Produto excluído.");
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
  const baixos = produtos.filter(p => Number(p.quantidade) <= Number(p.minimo));
  $("#stat-produtos").textContent = produtos.length;
  $("#stat-baixo").textContent = baixos.length;
  $("#stat-movimentacoes").textContent = movimentos.length;
  $("#stat-reposicao").textContent = baixos.filter(p => !reposicoes.some(id => String(id) === String(p.id))).length;
  preencherTabela($("#tabela-recentes"),produtos.slice(-5).reverse(),"recentes");
  const busca = $("#busca-produtos").value.trim().toLocaleLowerCase("pt-BR");
  preencherTabela($("#tabela-produtos"),produtos.filter(p => `${p.nome} ${p.categoria}`.toLocaleLowerCase("pt-BR").includes(busca)),"produtos");
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
function salvarMovimentacao(evento) {
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
  if (!persistir()) return; $("#form-movimentacao").reset(); atualizarTela(); mensagem("Movimentação registrada.");
}
function alternarReposicao(id) {
  if (reposicoes.some(item => String(item) === String(id))) reposicoes = reposicoes.filter(item => String(item) !== String(id));
  else reposicoes.push(id);
  if (!persistir()) return; atualizarTela();
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
atualizarTela();
