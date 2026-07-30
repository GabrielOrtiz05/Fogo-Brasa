import { Router, Request, Response } from "express";
import { pool } from "../db";
import { autenticar, autorizar } from "../middleware/auth";
import { registrarAuditoria } from "./auditoria.routes";

const router = Router();

interface ItemPedido {
  nome: string;
  preco: number;
}

// POST /api/pedidos - cliente cria um novo pedido (equivale ao finalizarPedido() do perfil-script.js)
router.post("/", autenticar, async (req: Request, res: Response) => {
  const { itens, total, mesa } = req.body as { itens: ItemPedido[]; total: number; mesa: string };
  const userId = req.user!.id;

  if (!itens || !Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "O pedido precisa ter pelo menos um item." });
  }
  if (!mesa) {
    return res.status(400).json({ error: "Informe o número da mesa." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO pedidos (user_id, mesa, itens, total, status)
       VALUES ($1, $2, $3::jsonb, $4, 'Pendente')
       RETURNING *`,
      [userId, mesa, JSON.stringify(itens), total]
    );

    const pedido = result.rows[0];

    await registrarAuditoria(
      userId,
      "Novo Pedido",
      `Cliente abriu o pedido #${pedido.id.substring(0, 6)} na Mesa ${mesa} (R$ ${Number(total).toFixed(2)}).`
    );

    res.status(201).json(pedido);
  } catch (err) {
    console.error("Erro ao criar pedido:", err);
    res.status(500).json({ error: "Erro no servidor ao criar pedido." });
  }
});

// GET /api/pedidos/meus - histórico do próprio cliente (perfil-script.js -> carregarHistorico)
router.get("/meus", autenticar, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pedidos WHERE user_id = $1 ORDER BY criado_em DESC",
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar histórico." });
  }
});

// GET /api/pedidos/ativos - garçom vê pedidos não entregues (garcom-script.js -> carregarPedidosMesa)
router.get("/ativos", autenticar, autorizar("garcom", "admin"), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pr.nome_completo AS nome_cliente
       FROM pedidos p
       LEFT JOIN profiles pr ON pr.id = p.user_id
       WHERE p.status <> 'Entregue' AND p.status <> 'Finalizado'
       ORDER BY p.criado_em ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar pedidos ativos:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar pedidos ativos." });
  }
});

// GET /api/pedidos - admin vê todos os pedidos não finalizados (admin-script.js -> carregarPedidosMaster)
router.get("/", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pedidos WHERE status <> 'Finalizado' ORDER BY criado_em DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar todos os pedidos:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar pedidos." });
  }
});

// PATCH /api/pedidos/:id/status - garçom/admin atualiza o status
router.patch("/:id/status", autenticar, autorizar("garcom", "admin"), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Informe o novo status." });
  }

  try {
    const result = await pool.query(
      "UPDATE pedidos SET status = $1, garcom_id = $2 WHERE id = $3 RETURNING *",
      [status, req.user!.id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    await registrarAuditoria(
      req.user!.id,
      "Status",
      `Mudou pedido ${id.substring(0, 6)} para ${status}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
    res.status(500).json({ error: "Erro no servidor ao atualizar status." });
  }
});

// PATCH /api/pedidos/:id/remover-item - remove o último item do pedido
router.patch("/:id/remover-item", autenticar, autorizar("garcom", "admin"), async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const busca = await pool.query("SELECT itens, total FROM pedidos WHERE id = $1", [id]);
    if (busca.rowCount === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    const itens: ItemPedido[] = busca.rows[0].itens;
    if (itens.length <= 1) {
      return res.status(400).json({ error: "Não é possível remover o último item. Cancele o pedido." });
    }

    const itemRemovido = itens.pop()!;
    const novoTotal = Number(busca.rows[0].total) - Number(itemRemovido.preco);

    const result = await pool.query(
      "UPDATE pedidos SET itens = $1::jsonb, total = $2 WHERE id = $3 RETURNING *",
      [JSON.stringify(itens), novoTotal, id]
    );

    await registrarAuditoria(
      req.user!.id,
      "Removeu Item",
      `Removeu ${itemRemovido.nome} do pedido ${id.substring(0, 6)}`
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao remover item:", err);
    res.status(500).json({ error: "Erro no servidor ao remover item." });
  }
});

export default router;
