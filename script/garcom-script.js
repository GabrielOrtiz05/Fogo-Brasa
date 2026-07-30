// script/garcom-script.js
// Antes: falava direto com supabaseClient (auth + tabelas + N buscas de perfil por pedido)
// Agora: usa a sessão salva pelo login e chama /api/pedidos, que já devolve o nome do
// cliente via JOIN e já cuida de auditoria no servidor.

let usuarioAtual = null;

// 1. Verificação de Segurança (Apenas Garçons e Admins entram)
function verificarAcessoGarcom() {
    usuarioAtual = verificarAcesso(["garcom", "admin"]); // helper do auth.js

    if (!usuarioAtual) return; // já redireciona sozinho se não tiver permissão

    document.getElementById('nome-garcom').textContent = `Garçom: ${usuarioAtual.nome_completo.split(' ')[0]}`;

    carregarPedidosMesa();
}

// 2. Carregar todos os pedidos que não estão Entregues/Finalizados
async function carregarPedidosMesa() {
    const container = document.getElementById('painel-pedidos');

    let pedidos;
    try {
        // A rota /pedidos/ativos já devolve nome_cliente via JOIN,
        // então não precisamos mais buscar o perfil um por um em loop.
        pedidos = await apiFetch('/pedidos/ativos');
    } catch (err) {
        container.innerHTML = '<p class="empty-msg">Nenhum pedido ativo no momento.</p>';
        return;
    }

    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nenhum pedido ativo no momento.</p>';
        return;
    }

    container.innerHTML = pedidos.map(pedido => {
        const nomeCliente = pedido.nome_cliente || 'Cliente sem nome';
        const itensNomes = pedido.itens.map(i => i.nome).join('<br> • ');
        // node-postgres devolve NUMERIC como string, então convertemos antes do toFixed
        const totalPedido = Number(pedido.total);

        return `
            <div class="history-card" style="border-top: 4px solid var(--primary-orange);">
                <div class="history-header">
                    <strong>Pedido #${pedido.id.substring(0, 6).toUpperCase()}</strong>
                </div>
                <p style="margin-bottom: 10px; color: #b3b3b3;">Mesa <span style="color: var(--primary-orange); font-size: 1.2rem; font-weight: bold;">${pedido.mesa || 'Balcão'}</span> - Cliente: <strong>${nomeCliente}</strong></p>

                <div style="background: #121212; padding: 10px; border-radius: 5px; margin-bottom: 10px; font-size: 0.9rem;">
                    • ${itensNomes}
                </div>

                <p style="font-weight: bold; color: var(--primary-orange); margin-bottom: 15px;">Total: R$ ${totalPedido.toFixed(2)}</p>

                <div style="display: flex; gap: 10px;">
                    <select id="status-${pedido.id}" style="padding: 8px; background: #333; color: white; border: none; border-radius: 4px; flex: 1;">
                        <option value="Pendente" ${pedido.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="Enviado a cozinha" ${pedido.status === 'Enviado a cozinha' ? 'selected' : ''}>Enviado a cozinha</option>
                        <option value="Preparando" ${pedido.status === 'Preparando' ? 'selected' : ''}>Preparando</option>
                        <option value="Entregue" ${pedido.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                    </select>

                    <button onclick="atualizarStatus('${pedido.id}')" style="background: var(--primary-orange); color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Salvar</button>
                </div>

                <button onclick="removerUltimoItem('${pedido.id}')" style="background: transparent; border: 1px solid #ff4444; color: #ff4444; width: 100%; margin-top: 10px; padding: 5px; border-radius: 4px; cursor: pointer;">Remover último item</button>
            </div>
        `;
    }).join('');
}

// 3. Atualizar o Status (auditoria já é registrada no servidor)
async function atualizarStatus(pedidoId) {
    const novoStatus = document.getElementById(`status-${pedidoId}`).value;

    try {
        await apiFetch(`/pedidos/${pedidoId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: novoStatus }),
        });

        alert("Status atualizado com sucesso!");
        carregarPedidosMesa(); // Recarrega a tela
    } catch (err) {
        alert("Erro ao atualizar status: " + err.message);
    }
}

// 4. Remover um item do pedido
// O cálculo do novo total e o log de auditoria agora ficam no servidor,
// então o frontend só precisa chamar a rota e recarregar a tela.
async function removerUltimoItem(pedidoId) {
    try {
        await apiFetch(`/pedidos/${pedidoId}/remover-item`, {
            method: 'PATCH',
        });
        carregarPedidosMesa();
    } catch (err) {
        // Ex: "Não é possível remover o último item. Cancele o pedido."
        alert(err.message);
    }
}

function logout() {
    limparSessao();
    window.location.href = "login.html";
}

verificarAcessoGarcom();