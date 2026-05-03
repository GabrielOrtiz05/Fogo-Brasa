const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let carrinho = [];
let total = 0;
let usuarioAtualId = null; // Guarda o ID do usuário para usar no histórico

// 1. Verificar Autenticação
async function verificarUsuario() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "login.html"; 
        return;
    }
    
    usuarioAtualId = user.id;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('nome_completo')
        .eq('id', user.id)
        .maybeSingle();

    const nomeCompleto = profile?.nome_completo;
    const primeiroNome = nomeCompleto ? nomeCompleto.trim().split(' ')[0] : 'Amigo';

    document.getElementById('boas-vindas').textContent = `Olá, ${primeiroNome}!`;
    
    // Carrega o histórico de pedidos deste usuário
    carregarHistorico();
}

// 2. Buscar Histórico de Pedidos
async function carregarHistorico() {
    const container = document.getElementById('lista-historico');
    
    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .eq('user_id', usuarioAtualId)
        .order('criado_em', { ascending: false }); // Traz os mais recentes primeiro

    if (error) {
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

        return `
            <div class="history-card">
                <div class="history-header">
                    <strong>Pedido #${pedido.id.substring(0, 6).toUpperCase()}</strong>
                    <span class="status-badge pendente">${pedido.status}</span>
                </div>
                <p class="history-date">${dataFormatada}</p>
                <p class="history-items">${itensNomes}</p>
                <p class="history-total">Total: R$ ${pedido.total.toFixed(2)}</p>
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

    // Envia o pedido e usa o .select() para o banco devolver os dados recém-criados
    const { data: novoPedido, error } = await supabaseClient
        .from('pedidos')
        .insert([{ user_id: usuarioAtualId, itens: carrinho, total: total, mesa: numeroMesa }])
        .select();

    if (error) {
        alert("Erro ao enviar pedido: " + error.message);
        btnFinalizar.textContent = 'Finalizar Pedido';
        btnFinalizar.disabled = false;
    } else {
        // REGISTRO DE AUDITORIA: Cliente criou o pedido
        await supabaseClient.from('auditoria').insert([{ 
            usuario_id: usuarioAtualId, 
            acao: 'Novo Pedido', 
            detalhes: `Cliente abriu o pedido #${novoPedido[0].id.substring(0,6)} na Mesa ${numeroMesa} (R$ ${total.toFixed(2)}).` 
        }]);

        alert("Pedido enviado para a brasa com sucesso!");
        carrinho = [];
        total = 0;
        document.getElementById('numero-mesa').value = '';
        atualizarInterface();
        btnFinalizar.textContent = 'Finalizar Pedido';
        carregarHistorico();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

verificarUsuario();