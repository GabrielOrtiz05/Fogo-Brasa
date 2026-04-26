// 1. Configuração do Supabase
const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 

// MUDANÇA: Alteramos o nome da variável para 'supabaseClient' para evitar conflito
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Lógica de Cadastro
document.getElementById('cadastroForm').addEventListener('submit', async function(event) {
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
        // MUDANÇA: Usando 'supabaseClient' aqui também
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: senha,
        });

        if (error) {
            alert('Erro ao cadastrar: ' + error.message);
            return;
        }

        if (data.user) {
            // MUDANÇA: E aqui também
            const { error: profileError } = await supabaseClient
                .from('profiles')
                .insert([
                    { 
                        id: data.user.id, 
                        nome_completo: nome 
                    }
                ]);

            if (profileError) {
                console.error("Erro ao salvar o perfil:", profileError);
            }
        }

        alert('Cadastro realizado com sucesso! Redirecionando para o login...');
        window.location.href = "login.html"; 

    } catch (err) {
        console.error("Erro inesperado:", err);
        alert('Ocorreu um erro no servidor. Tente novamente mais tarde.');
    } finally {
        btnCadastro.textContent = 'Cadastrar';
        btnCadastro.disabled = false;
    }
});