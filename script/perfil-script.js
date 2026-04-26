const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let carrinho = [];
let total = 0;

// 1. Verificar Autenticação ao carregar
async function verificarUsuario() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "login.html"; // Redireciona se não estiver logado
        return;
    }

    // Busca o nome na tabela profiles
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('nome_completo')
        .eq('id', user.id)
        .maybeSingle();

    // Lógica alinhada: pega o primeiro nome ou usa 'Amigo'
    const nomeCompleto = profile?.nome_completo;
    const primeiroNome = nomeCompleto ? nomeCompleto.trim().split(' ')[0] : 'Amigo';

    document.getElementById('boas-vindas').textContent = `Olá, ${primeiroNome}!`;
}

// 2. Lógica do Pedido
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
    const { data: { user } } = await supabaseClient.auth.getUser();

    const { error } = await supabaseClient
        .from('pedidos')
        .insert([{ user_id: user.id, itens: carrinho, total: total }]);

    if (error) {
        alert("Erro ao enviar pedido: " + error.message);
    } else {
        alert("Pedido enviado para a brasa com sucesso!");
        carrinho = [];
        total = 0;
        atualizarInterface();
    }
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

verificarUsuario();