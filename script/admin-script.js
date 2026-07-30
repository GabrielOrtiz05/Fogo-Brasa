// script/admin-script.js
// Antes: falava direto com supabaseClient e montava um mapa de nomes de usuário
// na mão (carregarNomesUsuarios) só pra exibir quem fez cada ação na auditoria.
// Agora: usa a sessão salva pelo login e chama /api/*, que já devolve os nomes
// prontos (via JOIN) e já cuida de auditoria/transação no servidor.

let usuarioAtual = null;
let todosPedidos = [];
let todosLogs = [];

// --- CONTROLE DE MODAIS ---
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

// --- INICIALIZAÇÃO ---
function verificarAcessoAdmin() {
    usuarioAtual = verificarAcesso(["admin"]); // helper do auth.js, já redireciona se não for admin

    if (!usuarioAtual) return;

    document.getElementById('nome-admin').textContent = `Admin: ${usuarioAtual.nome_completo.split(' ')[0]}`;

    carregarPedidosMaster();
    carregarFinanceiro();
    carregarAuditoria();
}

// --- GESTÃO DE PEDIDOS & PESQUISA ---
async function carregarPedidosMaster() {
    try {
        todosPedidos = await apiFetch('/pedidos');
    } catch (err) {
        todosPedidos = [];
    }
    renderizarPedidos(todosPedidos);
}

function filtrarPedidos() {
    const termo = document.getElementById('pesquisa-pedidos').value.toLowerCase();
    const filtrados = todosPedidos.filter(p =>
        (p.mesa && p.mesa.toLowerCase().includes(termo)) ||
        p.status.toLowerCase().includes(termo) ||
        p.id.toLowerCase().includes(termo)
    );
    renderizarPedidos(filtrados);
}

function renderizarPedidos(lista) {
    const container = document.getElementById('painel-admin-pedidos');
    if (lista.length === 0) { container.innerHTML = '<p class="empty-msg">Nenhum pedido encontrado.</p>'; return; }

    container.innerHTML = lista.map(p => {
        const itensNomes = p.itens.map(i => i.nome).join('<br> • ');
        // node-postgres devolve NUMERIC como string, então convertemos antes do toFixed
        const totalPedido = Number(p.total);

        return `
        <div class="history-card">
            <strong>Mesa ${p.mesa || 'Balcão'}</strong>
            <div style="background: #121212; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 0.85rem;">• ${itensNomes}</div>
            <p style="font-weight: bold; color: var(--primary-orange); margin-bottom: 10px;">Total: R$ ${totalPedido.toFixed(2)}</p>

            <select onchange="atualizarStatusAdmin('${p.id}', this.value)" style="width: 100%; margin-bottom: 10px; padding: 8px; background: #333; color: white; border: none;">
                <option value="Pendente" ${p.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Preparando" ${p.status === 'Preparando' ? 'selected' : ''}>Preparando</option>
                <option value="Entregue" ${p.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            </select>

            <button onclick="abrirModalPagamentoAdmin('${p.id}', ${totalPedido})" class="btn-primary" style="height: 35px; font-size: 0.85rem;">Receber Pagamento</button>
        </div>`;
    }).join('');
}

async function atualizarStatusAdmin(id, status) {
    try {
        // A rota já vincula o admin como responsável e registra a auditoria sozinha
        await apiFetch(`/pedidos/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        carregarPedidosMaster();
        carregarAuditoria(); // mantém o log em tempo real, como no comportamento original
    } catch (err) {
        alert("Erro ao atualizar status: " + err.message);
    }
}

// --- PAGAMENTOS ---
let pedidoPendenteId = null, pedidoPendenteValor = 0;

function abrirModalPagamentoAdmin(id, valor) {
    pedidoPendenteId = id; pedidoPendenteValor = valor;
    abrirModal('modal-pagamento');
}

async function processarPagamento(metodo) {
    fecharModal('modal-pagamento');

    try {
        // A rota faz insert do pagamento + status='Finalizado' + auditoria,
        // tudo dentro de uma transação no servidor.
        await apiFetch('/pagamentos', {
            method: 'POST',
            body: JSON.stringify({ pedido_id: pedidoPendenteId, valor: pedidoPendenteValor, metodo }),
        });

        alert("Pagamento registrado com sucesso!");
        carregarPedidosMaster();
        carregarFinanceiro();
        carregarAuditoria();
    } catch (err) {
        alert("Erro ao processar pagamento: " + err.message);
    }
}

async function carregarFinanceiro() {
    let resultado;
    try {
        resultado = await apiFetch('/pagamentos/hoje');
    } catch (err) {
        resultado = { total: 0, pagamentos: [] };
    }

    const html = resultado.pagamentos.map(p =>
        `<div class="history-card" style="padding: 10px; margin-bottom: 5px;">${p.metodo} | <strong>R$ ${Number(p.valor).toFixed(2)}</strong></div>`
    ).join('');

    document.getElementById('valor-caixa').textContent = `R$ ${Number(resultado.total).toFixed(2)}`;
    document.getElementById('lista-pagamentos').innerHTML = html || '<p>Sem vendas hoje.</p>';
}

// --- AUDITORIA & PESQUISA ---
async function carregarAuditoria() {
    try {
        // /api/auditoria já devolve nome_responsavel pronto (via JOIN no servidor),
        // então não precisamos mais montar um mapa de nomes na mão.
        todosLogs = await apiFetch('/auditoria');
    } catch (err) {
        todosLogs = [];
    }
    renderizarAuditoria(todosLogs);
}

function filtrarAuditoria() {
    const termo = document.getElementById('pesquisa-auditoria').value.toLowerCase();
    const filtrados = todosLogs.filter(l => {
        const nomeResp = l.nome_responsavel || 'Desconhecido';
        return l.acao.toLowerCase().includes(termo) || nomeResp.toLowerCase().includes(termo) || l.detalhes.toLowerCase().includes(termo);
    });
    renderizarAuditoria(filtrados);
}

function renderizarAuditoria(lista) {
    const container = document.getElementById('painel-auditoria');
    if (lista.length === 0) { container.innerHTML = '<p class="empty-msg">Nenhum log encontrado.</p>'; return; }

    container.innerHTML = lista.map(l => {
        const nomeResponsavel = l.nome_responsavel || 'Usuário Deletado';
        const data = new Date(l.criado_em).toLocaleString('pt-BR');

        return `
        <div style="background: #1a1a1a; padding: 15px; border-radius: 5px; border-left: 4px solid var(--primary-orange);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong style="color: var(--primary-orange);">${l.acao}</strong>
                <span style="font-size: 0.8rem; color: #888;">${data}</span>
            </div>
            <p style="font-size: 0.9rem; color: #fff;">Feito por: <strong>${nomeResponsavel}</strong></p>
            <p style="font-size: 0.85rem; color: #ccc; margin-top: 5px;">${l.detalhes}</p>
        </div>`;
    }).join('');
}

function logout() {
    limparSessao();
    window.location.href = "login.html";
}

verificarAcessoAdmin();