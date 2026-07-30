// script/auth.js
// Funções compartilhadas de autenticação/API, usadas por login-script.js,
// cadastro-script.js e (nos próximos passos) pelas páginas de perfil, garçom e admin.
// Substitui o supabaseClient: agora falamos direto com a API própria em /api/*.

const API_URL = "http://localhost:3000/api";

// --- Sessão (guardada no localStorage no lugar da sessão do Supabase) ---

function salvarSessao(usuario, token) {
    localStorage.setItem("fb_token", token);
    localStorage.setItem("fb_usuario", JSON.stringify(usuario));
}

function limparSessao() {
    localStorage.removeItem("fb_token");
    localStorage.removeItem("fb_usuario");
}

function getToken() {
    return localStorage.getItem("fb_token");
}

function getUsuarioLogado() {
    const raw = localStorage.getItem("fb_usuario");
    return raw ? JSON.parse(raw) : null;
}

// Redireciona cada papel para a tela correta depois do login/cadastro
function redirecionarPorRole(role) {
    if (role === "admin") {
        window.location.href = "admin.html";
    } else if (role === "garcom") {
        window.location.href = "garcom.html";
    } else {
        window.location.href = "perfil.html";
    }
}

// Garante que só usuário logado (e, opcionalmente, com o papel certo) acesse a página.
// Uso: verificarAcesso() ou verificarAcesso(["garcom", "admin"])
function verificarAcesso(rolesPermitidas) {
    const usuario = getUsuarioLogado();
    const token = getToken();

    if (!usuario || !token) {
        window.location.href = "login.html";
        return null;
    }

    if (rolesPermitidas && !rolesPermitidas.includes(usuario.role)) {
        redirecionarPorRole(usuario.role);
        return null;
    }

    return usuario;
}

// Wrapper de fetch que já inclui o token JWT e trata erro/expiração de sessão
async function apiFetch(path, options = {}) {
    const token = getToken();

    const resposta = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    if (resposta.status === 401) {
        // Token inválido ou expirado: desloga e manda pro login
        limparSessao();
        window.location.href = "login.html";
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        throw new Error(dados?.error || "Erro ao comunicar com o servidor.");
    }

    return dados;
}