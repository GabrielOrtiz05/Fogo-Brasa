// script/perfil-script.js
// Antes: falava direto com supabaseClient (auth + tabelas)
// Agora: usa o token salvo pelo login (auth.js) e chama /api/pedidos

let carrinho = [];
let total = 0;
let usuarioAtual = null;

// 1. Verificar Autenticação
// (Antes checava supabaseClient.auth.getUser(); agora o próprio login já
// guardou o usuário no localStorage, então nem precisa de uma chamada extra à API)
function verificarUsuario() {
    usuarioAtual = verificarAcesso(); // sem lista de roles = qualquer usuário logado pode entrar

    if (!usuarioAtual) return; // verificarAcesso() já redireciona pro login se não tiver sessão

    const primeiroNome = usuarioAtual.nome_completo
        ? usuarioAtual.nome_completo.trim().split(' ')[0]
        : 'Amigo';

    document.getElementById('boas-vindas').textContent = `Olá, ${primeiroNome}!`;

    // Carrega o histórico de pedidos deste usuário
    carregarHistorico();
}

// 2. Buscar Histórico de Pedidos
async function carregarHistorico() {
    const container = document.getElementById('lista-historico');

    let pedidos;
    try {
        pedidos = await apiFetch('/pedidos/meus');
    } catch (err) {
        container.innerHTML = '<p class="empty-msg">Erro ao carregar histórico.</p>';
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p class="empty-msg">Você ainda não fez nenhum pedido.</p>';
        return;
    }

    container.innerHTML = pedidos.map(pedido => {
        // Formata a data e hora
        const dataFormatada = new Date(pedido.criado_em).toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Extrai o nome dos itens do array JSON
        const itensNomes = pedido.itens.map(item => item.nome).join(', ');

        // O node-postgres devolve colunas NUMERIC como string, não number,
        // então precisamos converter antes de usar toFixed()
        const totalPedido = Number(pedido.total);

        return `
            <div class="history-card">
                <div class="history-header">
                    <strong>Pedido #${pedido.id.substring(0, 6).toUpperCase()}</strong>
                    <span class="status-badge pendente">${pedido.status}</span>
                </div>
                <p class="history-date">${dataFormatada}</p>
                <p class="history-items">${itensNomes}</p>
                <p class="history-total">Total: R$ ${totalPedido.toFixed(2)}</p>
            </div>
        `;
    }).join('');
}

// 3. Lógica do Pedido atual
function adicionarAoPedido(nome, preco) {
    carrinho.push({ nome, preco });
    total += preco;
    atualizarInterface();
}

function atualizarInterface() {
    const lista = document.getElementById('lista-pedido');
    const totalExibido = document.getElementById('valor-total');
    const btnFinalizar = document.getElementById('btn-finalizar');

    lista.innerHTML = carrinho.map(item => `<li>${item.nome} - R$ ${item.preco.toFixed(2)}</li>`).join('');
    totalExibido.textContent = `R$ ${total.toFixed(2)}`;
    btnFinalizar.disabled = carrinho.length === 0;
}

async function finalizarPedido() {
    const numeroMesa = document.getElementById('numero-mesa').value;

    if (!numeroMesa) {
        alert("Por favor, digite o número da sua mesa para o garçom te encontrar!");
        return;
    }

    const btnFinalizar = document.getElementById('btn-finalizar');
    btnFinalizar.textContent = 'Enviando...';
    btnFinalizar.disabled = true;

    try {
        // A rota POST /api/pedidos já cria o pedido E registra a auditoria
        // no servidor, então não precisamos mais fazer isso manualmente aqui.
        await apiFetch('/pedidos', {
            method: 'POST',
            body: JSON.stringify({ itens: carrinho, total: total, mesa: numeroMesa }),
        });

        alert("Pedido enviado para a brasa com sucesso!");
        carrinho = [];
        total = 0;
        document.getElementById('numero-mesa').value = '';
        atualizarInterface();
        carregarHistorico();
    } catch (err) {
        alert("Erro ao enviar pedido: " + err.message);
    } finally {
        btnFinalizar.textContent = 'Finalizar Pedido';
        btnFinalizar.disabled = carrinho.length === 0;
    }
}

function logout() {
    limparSessao();
    window.location.href = "login.html";
}

verificarUsuario();