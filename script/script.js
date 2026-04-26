// Interatividade do Menu Mobile
const menuToggle = document.getElementById('mobile-menu');
const navList = document.querySelector('.nav-list');

menuToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
});

// Ação do botão de reserva
function fazerReserva() {
    alert("Obrigado pelo interesse! Nosso sistema de reservas online estará disponível em breve. Por favor, ligue para (11) 99999-9999 para garantir sua mesa.");
}

// Configuração do Supabase
const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

async function atualizarBarraNavegacao() {
    const authArea = document.getElementById('auth-area');
    
    // 1. Verifica se tem um usuário logado
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user) {
        // 2. Se logado, busca o nome no perfil
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('nome_completo')
            .eq('id', user.id)
            .maybeSingle();

        // 3. Extrai o primeiro nome de forma segura
        const nomeCompleto = profile?.nome_completo;
        const primeiroNome = nomeCompleto ? nomeCompleto.trim().split(' ')[0] : 'Amigo';

        // 4. Exibe o nome e link para o Painel/Pedido
        authArea.innerHTML = `
            <span class="user-name">Olá, ${primeiroNome}</span>
            <a href="perfil.html" class="btn-auth">Fazer Pedido</a>
            <button onclick="fazerLogout()" class="btn-logout-small">Sair</button>
        `;
    } else {
        // 5. Se não logado, exibe botão de Login
        authArea.innerHTML = `
            <a href="login.html" class="btn-auth">Entrar / Cadastro</a>
        `;
    }
}

async function fazerLogout() {
    await supabaseClient.auth.signOut();
    window.location.reload(); // Recarrega a página para atualizar a barra
}

// Chama a função assim que a página carrega
document.addEventListener('DOMContentLoaded', atualizarBarraNavegacao);

// Fechar menu mobile ao clicar em um link
const navLinks = document.querySelectorAll('.nav-list a');

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navList.classList.contains('active')) {
            navList.classList.remove('active');
        }
    });
});