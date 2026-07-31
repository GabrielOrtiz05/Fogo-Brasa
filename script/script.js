// Interatividade do Menu Mobile (COM PROTEÇÃO)
const menuToggle = document.getElementById('mobile-menu');
const navList = document.querySelector('.nav-list');

// O 'if' verifica se o menu existe nesta página antes de tentar adicionar o evento
if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
        navList.classList.toggle('active');
    });
}

// Ação do botão de reserva
function fazerReserva() {
    alert("Obrigado pelo interesse! Nosso sistema de reservas online estará disponível em breve. Por favor, ligue para (11) 99999-9999 para garantir sua mesa.");
}

// Antes: consultava o Supabase (auth.getUser() + tabela profiles) pra montar a barra.
// Agora: o próprio login já guardou o usuário no localStorage (auth.js), então
// não precisamos de nenhuma chamada de rede só pra desenhar a barra de navegação.
function atualizarBarraNavegacao() {
    const authArea = document.getElementById('auth-area');

    // TRAVA DE SEGURANÇA: Se não existir a área de login nesta página, cancela a função silenciosamente
    if (!authArea) return;

    const usuario = getUsuarioLogado(); // helper do auth.js

    if (usuario) {
        const primeiroNome = usuario.nome_completo ? usuario.nome_completo.trim().split(' ')[0] : 'Amigo';

        authArea.innerHTML = `
            <span class="user-name">Olá, ${primeiroNome}</span>
            <a href="perfil.html" class="btn-auth">Fazer Pedido</a>
            <button onclick="fazerLogout()" class="btn-logout-small">Sair</button>
        `;
    } else {
        authArea.innerHTML = `
            <a href="login.html" class="btn-auth">Entrar / Cadastro</a>
        `;
    }
}

function fazerLogout() {
    limparSessao(); // helper do auth.js
    window.location.reload();
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