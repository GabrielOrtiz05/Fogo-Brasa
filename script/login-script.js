// 1. Configuração do Supabase
const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 

// MUDANÇA 1: Alteramos de 'supabase' para 'supabaseClient'
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Lógica de Login
document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Evita recarregar a página
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const btnLogin = document.querySelector('.btn-login');

    // Altera o texto do botão para mostrar que está carregando
    btnLogin.textContent = 'Entrando...';
    btnLogin.disabled = true;

    try {
        // MUDANÇA 2: Usamos 'supabaseClient' para chamar a autenticação
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha,
        });

        if (error) {
            // Se errar a senha ou o e-mail não existir
            alert('Erro ao fazer login: ' + error.message);
        } else {
            // Sucesso!
            alert('Login efetuado com sucesso!');
            // Redireciona o usuário para a página inicial da churrascaria
            window.location.href = "index.html"; 
        }
    } catch (err) {
        console.error("Erro inesperado:", err);
        alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
    } finally {
        // Restaura o botão
        btnLogin.textContent = 'Entrar';
        btnLogin.disabled = false;
    }
});