import { Router, Request, Response } from "express";
import { pool } from "../db";
import { autenticar, autorizar } from "../middleware/auth";
import { registrarAuditoria } from "./auditoria.routes";

const router = Router();

// Helper: existe um fechamento de caixa para hoje?
async function caixaFechadoHoje(): Promise<boolean> {
  const result = await pool.query(
    "SELECT id FROM fechamentos_caixa WHERE data = CURRENT_DATE"
  );
  return (result.rowCount ?? 0) > 0;
}

// POST /api/pagamentos - admin registra o pagamento de um pedido (processarPagamento())
router.post("/", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  const { pedido_id, valor, metodo } = req.body;

  if (!pedido_id || valor == null || !metodo) {
    return res.status(400).json({ error: "pedido_id, valor e metodo são obrigatórios." });
  }

  if (await caixaFechadoHoje()) {
    return res.status(403).json({ error: "O caixa de hoje já foi fechado. Não é possível registrar novos pagamentos." });
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
    const pagamentos = await pool.query(
      "SELECT * FROM pagamentos WHERE criado_em >= CURRENT_DATE ORDER BY criado_em DESC"
    );
    const totalVendas = pagamentos.rows.reduce((soma, p) => soma + Number(p.valor), 0);

    const sangrias = await pool.query(
      "SELECT * FROM sangrias WHERE criado_em >= CURRENT_DATE ORDER BY criado_em DESC"
    );
    const totalSangria = sangrias.rows.reduce((soma, s) => soma + Number(s.valor), 0);

    const fechamento = await pool.query(
      "SELECT * FROM fechamentos_caixa WHERE data = CURRENT_DATE"
    );

    res.json({
      total: totalVendas,
      pagamentos: pagamentos.rows,
      sangrias: sangrias.rows,
      totalSangria,
      saldoAtual: totalVendas - totalSangria,
      caixaFechado: (fechamento.rowCount ?? 0) > 0,
      fechamento: fechamento.rows[0] || null,
    });
  } catch (err) {
    console.error("Erro ao buscar financeiro:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar financeiro." });
  }
});

// POST /api/pagamentos/sangria - retira dinheiro do caixa SEM fechar o dia
router.post("/sangria", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  const { valor, motivo } = req.body as { valor: number; motivo?: string };

  if (valor == null || Number(valor) <= 0) {
    return res.status(400).json({ error: "Informe um valor de sangria válido." });
  }

  if (await caixaFechadoHoje()) {
    return res.status(409).json({ error: "O caixa de hoje já está fechado. Não é possível registrar sangria." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO sangrias (valor, motivo, usuario_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [valor, motivo || null, req.user!.id]
    );

    await registrarAuditoria(
      req.user!.id,
      "Sangria",
      `Retirou R$ ${Number(valor).toFixed(2)} do caixa${motivo ? ` (${motivo})` : ""}.`
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao registrar sangria:", err);
    res.status(500).json({ error: "Erro no servidor ao registrar sangria." });
  }
});

// POST /api/pagamentos/fechar-caixa - fecha o dia (uma vez só por dia)
// Body opcional: { valor_sangria, motivo_sangria } - sangria final feita no ato do fechamento
router.post("/fechar-caixa", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  const { valor_sangria, motivo_sangria } = req.body as { valor_sangria?: number; motivo_sangria?: string };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const jaFechado = await client.query(
      "SELECT id FROM fechamentos_caixa WHERE data = CURRENT_DATE FOR UPDATE"
    );
    if ((jaFechado.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "O caixa de hoje já foi fechado." });
    }

    const vendas = await client.query(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos WHERE criado_em >= CURRENT_DATE"
    );
    const totalVendas = Number(vendas.rows[0].total);

    const fechamento = await client.query(
      `INSERT INTO fechamentos_caixa (data, total_vendas, total_sangria, saldo_final, usuario_id)
       VALUES (CURRENT_DATE, $1, 0, 0, $2)
       RETURNING id`,
      [totalVendas, req.user!.id]
    );
    const fechamentoId = fechamento.rows[0].id;

    // Vincula sangrias avulsas feitas hoje (antes deste fechamento) a este fechamento
    await client.query(
      `UPDATE sangrias SET fechamento_id = $1
       WHERE fechamento_id IS NULL AND criado_em >= CURRENT_DATE`,
      [fechamentoId]
    );

    // Sangria final, se foi informada junto com o pedido de fechamento
    if (valor_sangria != null && Number(valor_sangria) > 0) {
      await client.query(
        `INSERT INTO sangrias (valor, motivo, usuario_id, fechamento_id)
         VALUES ($1, $2, $3, $4)`,
        [valor_sangria, motivo_sangria || "Sangria no fechamento", req.user!.id, fechamentoId]
      );
    }

    const sangriasTotal = await client.query(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM sangrias WHERE fechamento_id = $1",
      [fechamentoId]
    );
    const totalSangria = Number(sangriasTotal.rows[0].total);
    const saldoFinal = totalVendas - totalSangria;

    const resultadoFinal = await client.query(
      `UPDATE fechamentos_caixa SET total_sangria = $1, saldo_final = $2
       WHERE id = $3 RETURNING *`,
      [totalSangria, saldoFinal, fechamentoId]
    );

    await client.query("COMMIT");

    await registrarAuditoria(
      req.user!.id,
      "Fechamento de Caixa",
      `Fechou o caixa do dia: vendas R$ ${totalVendas.toFixed(2)}, sangria R$ ${totalSangria.toFixed(2)}, saldo R$ ${saldoFinal.toFixed(2)}.`
    );

    res.status(201).json(resultadoFinal.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro ao fechar caixa:", err);
    res.status(500).json({ error: "Erro no servidor ao fechar caixa." });
  } finally {
    client.release();
  }
});

export default router;