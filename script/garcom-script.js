const supabaseUrl = 'https://hzzfgarpeqohezdxidgr.supabase.co';
const supabaseKey = 'sb_publishable_EMnwWRkG9TbuMrYNyNewWQ_w7uN4JQz'; 
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let garcomId = null;

// 1. Verificação de Segurança (Apenas Garçons e Admins entram)
async function verificarAcesso() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "login.html"; return;
    }

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('nome_completo, role')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile || profile.role === 'cliente') {
        alert("Acesso negado. Redirecionando para a área de clientes.");
        window.location.href = "perfil.html";
        return;
    }

    garcomId = user.id;
    document.getElementById('nome-garcom').textContent = `Garçom: ${profile.nome_completo.split(' ')[0]}`;
    
    carregarPedidosMesa();
}

// 2. Carregar todos os pedidos que não estão Entregues (Versão Corrigida)
async function carregarPedidosMesa() {
    const container = document.getElementById('painel-pedidos');
    
    // Busca apenas os pedidos (sem o join complexo que causava o erro 400)
    const { data: pedidos, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .neq('status', 'Entregue')
        .order('criado_em', { ascending: true });

    if (error || !pedidos || pedidos.length === 0) {
        container.innerHTML = '<p class="empty-msg">Nenhum pedido ativo no momento.</p>';
        return;
    }

    let pedidosHTML = '';

    // Passa por cada pedido para buscar o nome do cliente e montar o visual
    for (let pedido of pedidos) {
        // Busca o nome do cliente na tabela profiles usando o user_id do pedido
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('nome_completo')
            .eq('id', pedido.user_id)
            .maybeSingle();

        const nomeCliente = profile?.nome_completo || 'Cliente sem nome';
        const itensNomes = pedido.itens.map(i => i.nome).join('<br> • ');

pedidosHTML += `
            <div class="history-card" style="border-top: 4px solid var(--primary-orange);">
                <div class="history-header">
                    <strong>Pedido #${pedido.id.substring(0, 6).toUpperCase()}</strong>
                </div>
                <p style="margin-bottom: 10px; color: #b3b3b3;">Mesa <span style="color: var(--primary-orange); font-size: 1.2rem; font-weight: bold;">${pedido.mesa || 'Balcão'}</span> - Cliente: <strong>${nomeCliente}</strong></p>
                
                <div style="background: #121212; padding: 10px; border-radius: 5px; margin-bottom: 10px; font-size: 0.9rem;">
                    • ${itensNomes}
                </div>
                
                <p style="font-weight: bold; color: var(--primary-orange); margin-bottom: 15px;">Total: R$ ${pedido.total.toFixed(2)}</p>
                
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
    }

    container.innerHTML = pedidosHTML;
}

// 3. Atualizar o Status e Registrar na Auditoria
async function atualizarStatus(pedidoId) {
    const novoStatus = document.getElementById(`status-${pedidoId}`).value;

    // Atualiza o pedido no banco vinculando quem atendeu
    await supabaseClient.from('pedidos')
        .update({ status: novoStatus, garcom_id: garcomId })
        .eq('id', pedidoId);

    // Registra a ação na tabela de Auditoria
    await supabaseClient.from('auditoria')
        .insert([{ 
            usuario_id: garcomId, 
            acao: 'Atualizou Status', 
            detalhes: `Pedido ${pedidoId.substring(0,6)} alterado para: ${novoStatus}` 
        }]);

    alert("Status atualizado com sucesso!");
    carregarPedidosMesa(); // Recarrega a tela
}

// 4. Remover um item do pedido (Simplificado)
async function removerUltimoItem(pedidoId) {
    // Busca o pedido atual
    const { data: pedido } = await supabaseClient.from('pedidos').select('itens, total').eq('id', pedidoId).single();
    
    if(pedido.itens.length <= 1) {
        alert("Não é possível remover o último item. Se necessário, cancele o pedido.");
        return;
    }

    // Remove o último item do array e recalcula o total
    const itemRemovido = pedido.itens.pop();
    const novoTotal = pedido.total - itemRemovido.preco;

    // Salva no banco de dados
    await supabaseClient.from('pedidos').update({ itens: pedido.itens, total: novoTotal }).eq('id', pedidoId);

    // Registra na Auditoria
    await supabaseClient.from('auditoria').insert([{ 
        usuario_id: garcomId, 
        acao: 'Removeu Item', 
        detalhes: `Removeu ${itemRemovido.nome} do pedido ${pedidoId.substring(0,6)}` 
    }]);

    carregarPedidosMesa();
}

async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

verificarAcesso();