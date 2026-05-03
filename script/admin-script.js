const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let adminId = null;
let todosPedidos = [];
let todosLogs = [];
let mapUsuarios = {}; // Guarda os nomes dos usuários para a auditoria

// --- CONTROLE DE MODAIS ---
function abrirModal(id) { document.getElementById(id).style.display = 'flex'; }
function fecharModal(id) { document.getElementById(id).style.display = 'none'; }

// --- INICIALIZAÇÃO ---
async function verificarAcessoAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'admin') { window.location.href = "perfil.html"; return; }

    adminId = user.id;
    document.getElementById('nome-admin').textContent = `Admin: ${profile.nome_completo.split(' ')[0]}`;
    
    await carregarNomesUsuarios();
    carregarPedidosMaster();
    carregarFinanceiro();
    carregarAuditoria();
}

// Busca todos os nomes do banco para associar na auditoria
async function carregarNomesUsuarios() {
    const { data: profiles } = await supabaseClient.from('profiles').select('id, nome_completo');
    if (profiles) {
        profiles.forEach(p => mapUsuarios[p.id] = p.nome_completo.split(' ')[0]);
    }
}

// --- GESTÃO DE PEDIDOS & PESQUISA ---
async function carregarPedidosMaster() {
    const { data: pedidos } = await supabaseClient.from('pedidos').select('*').neq('status', 'Finalizado').order('criado_em', { ascending: false });
    todosPedidos = pedidos || [];
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
        return `
        <div class="history-card">
            <strong>Mesa ${p.mesa || 'Balcão'}</strong>
            <div style="background: #121212; padding: 10px; border-radius: 5px; margin: 10px 0; font-size: 0.85rem;">• ${itensNomes}</div>
            <p style="font-weight: bold; color: var(--primary-orange); margin-bottom: 10px;">Total: R$ ${p.total.toFixed(2)}</p>
            
            <select onchange="atualizarStatusAdmin('${p.id}', this.value)" style="width: 100%; margin-bottom: 10px; padding: 8px; background: #333; color: white; border: none;">
                <option value="Pendente" ${p.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                <option value="Preparando" ${p.status === 'Preparando' ? 'selected' : ''}>Preparando</option>
                <option value="Entregue" ${p.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            </select>
            
            <button onclick="abrirModalPagamentoAdmin('${p.id}', ${p.total})" class="btn-primary" style="height: 35px; font-size: 0.85rem;">Receber Pagamento</button>
        </div>`;
    }).join('');
}

async function atualizarStatusAdmin(id, status) {
    await supabaseClient.from('pedidos').update({ status: status, garcom_id: adminId }).eq('id', id);
    registrarAuditoria('Status', `Mudou pedido ${id.substring(0,6)} para ${status}`);
    carregarPedidosMaster();
}

// --- PAGAMENTOS ---
let pedidoPendenteId = null, pedidoPendenteValor = 0;

function abrirModalPagamentoAdmin(id, valor) {
    pedidoPendenteId = id; pedidoPendenteValor = valor;
    abrirModal('modal-pagamento');
}

async function processarPagamento(metodo) {
    fecharModal('modal-pagamento');
    await supabaseClient.from('pagamentos').insert([{ pedido_id: pedidoPendenteId, valor: pedidoPendenteValor, metodo: metodo }]);
    await supabaseClient.from('pedidos').update({ status: 'Finalizado' }).eq('id', pedidoPendenteId);
    
    registrarAuditoria('Pagamento', `Recebeu R$ ${pedidoPendenteValor} via ${metodo}.`);
    alert("Pagamento registrado com sucesso!");
    carregarPedidosMaster(); carregarFinanceiro();
}

async function carregarFinanceiro() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data: pags } = await supabaseClient.from('pagamentos').select('*').gte('criado_em', hoje);
    let total = 0, html = '';
    
    (pags || []).forEach(p => {
        total += p.valor;
        html += `<div class="history-card" style="padding: 10px; margin-bottom: 5px;">${p.metodo} | <strong>R$ ${p.valor.toFixed(2)}</strong></div>`;
    });

    document.getElementById('valor-caixa').textContent = `R$ ${total.toFixed(2)}`;
    document.getElementById('lista-pagamentos').innerHTML = html || '<p>Sem vendas hoje.</p>';
}

// --- AUDITORIA & PESQUISA COM NOME ---
async function carregarAuditoria() {
    const { data: logs } = await supabaseClient.from('auditoria').select('*').order('criado_em', { ascending: false }).limit(50);
    todosLogs = logs || [];
    renderizarAuditoria(todosLogs);
}

function filtrarAuditoria() {
    const termo = document.getElementById('pesquisa-auditoria').value.toLowerCase();
    const filtrados = todosLogs.filter(l => {
        const nomeResp = mapUsuarios[l.usuario_id] || 'Desconhecido';
        return l.acao.toLowerCase().includes(termo) || nomeResp.toLowerCase().includes(termo) || l.detalhes.toLowerCase().includes(termo);
    });
    renderizarAuditoria(filtrados);
}

function renderizarAuditoria(lista) {
    const container = document.getElementById('painel-auditoria');
    if (lista.length === 0) { container.innerHTML = '<p class="empty-msg">Nenhum log encontrado.</p>'; return; }

    container.innerHTML = lista.map(l => {
        // Usa o mapa para transformar o ID criptografado no Nome real da pessoa
        const nomeResponsavel = mapUsuarios[l.usuario_id] || 'Usuário Deletado';
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

async function registrarAuditoria(acao, detalhes) {
    await supabaseClient.from('auditoria').insert([{ usuario_id: adminId, acao, detalhes }]);
    carregarAuditoria(); // Atualiza a lista em tempo real
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

verificarAcessoAdmin();