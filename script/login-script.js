// script/login-script.js
// Antes: chamava supabaseClient.auth.signInWithPassword(...)
// Agora: chama a API própria em /api/auth/login

document.getElementById('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); // Evita recarregar a página

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const btnLogin = document.querySelector('.btn-login');

    // Altera o texto do botão para mostrar que está carregando
    btnLogin.textContent = 'Entrando...';
    btnLogin.disabled = true;

    try {
        const resposta = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            // Ex: "Email ou senha inválidos."
            alert('Erro ao fazer login: ' + (dados.error || 'tente novamente.'));
            return;
        }

        // Sucesso! Guarda o token e o usuário, depois manda pra tela certa do papel dele
        salvarSessao(dados.usuario, dados.token);
        alert('Login efetuado com sucesso!');
        redirecionarPorRole(dados.usuario.role);

    } catch (err) {
        console.error("Erro inesperado:", err);
        alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
    } finally {
        // Restaura o botão
        btnLogin.textContent = 'Entrar';
        btnLogin.disabled = false;
    }
});