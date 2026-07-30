import { Router, Request, Response } from "express";
import { pool } from "../db";
import { autenticar, autorizar } from "../middleware/auth";
import { registrarAuditoria } from "./auditoria.routes";

const router = Router();

// POST /api/pagamentos - admin registra o pagamento de um pedido (processarPagamento())
router.post("/", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  const { pedido_id, valor, metodo } = req.body;

  if (!pedido_id || valor == null || !metodo) {
    return res.status(400).json({ error: "pedido_id, valor e metodo são obrigatórios." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "INSERT INTO pagamentos (pedido_id, valor, metodo) VALUES ($1, $2, $3)",
      [pedido_id, valor, metodo]
    );

    await client.query("UPDATE pedidos SET status = 'Finalizado' WHERE id = $1", [pedido_id]);

    await client.query("COMMIT");

    await registrarAuditoria(
      req.user!.id,
      "Pagamento",
      `Recebeu R$ ${Number(valor).toFixed(2)} via ${metodo}.`
    );

    res.status(201).json({ mensagem: "Pagamento registrado com sucesso." });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao processar pagamento:", err);
    res.status(500).json({ error: "Erro no servidor ao processar pagamento." });
  } finally {
    client.release();
  }
});

// GET /api/pagamentos/hoje - admin vê o caixa do dia (carregarFinanceiro())
router.get("/hoje", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pagamentos WHERE criado_em >= CURRENT_DATE ORDER BY criado_em DESC"
    );

    const total = result.rows.reduce((soma, p) => soma + Number(p.valor), 0);

    res.json({ total, pagamentos: result.rows });
  } catch (err) {
    console.error("Erro ao buscar financeiro:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar financeiro." });
  }
});

export default router;
