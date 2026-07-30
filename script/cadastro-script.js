// script/cadastro-script.js
// Antes: chamava supabaseClient.auth.signUp(...) + insert manual na tabela profiles
// Agora: uma única chamada pra /api/auth/cadastro já cria o usuário com role 'cliente'

document.getElementById('cadastroForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;
    const btnCadastro = document.querySelector('.btn-login');

    if (senha !== confirmarSenha) {
        alert('As senhas não coincidem. Por favor, verifique.');
        return;
    }

    btnCadastro.textContent = 'Cadastrando...';
    btnCadastro.disabled = true;

    try {
        const resposta = await fetch(`${API_URL}/auth/cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            // Ex: "Já existe uma conta com esse email."
            alert('Erro ao cadastrar: ' + (dados.error || 'tente novamente.'));
            return;
        }

        // A API já devolve token + usuário no cadastro, então logamos direto
        salvarSessao(dados.usuario, dados.token);
        alert('Cadastro realizado com sucesso!');
        redirecionarPorRole(dados.usuario.role);

    } catch (err) {
        console.error("Erro inesperado:", err);
        alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
    } finally {
        btnCadastro.textContent = 'Cadastrar';
        btnCadastro.disabled = false;
    }
});