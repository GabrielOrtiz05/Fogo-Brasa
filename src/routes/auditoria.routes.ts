import { Router, Request, Response } from "express";
import { pool } from "../db";
import { autenticar, autorizar } from "../middleware/auth";

const router = Router();

// Helper reutilizado por outras rotas (pedidos, pagamentos) para registrar logs
export async function registrarAuditoria(usuarioId: string, acao: string, detalhes: string) {
  try {
    await pool.query(
      "INSERT INTO auditoria (usuario_id, acao, detalhes) VALUES ($1, $2, $3)",
      [usuarioId, acao, detalhes]
    );
  } catch (err) {
    console.error("Erro ao registrar auditoria:", err);
  }
}

// GET /api/auditoria - admin vê os últimos 50 logs, já com o nome do responsável
router.get("/", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.nome_completo AS nome_responsavel
       FROM auditoria a
       LEFT JOIN profiles p ON p.id = a.usuario_id
       ORDER BY a.criado_em DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar auditoria:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar auditoria." });
  }
});

export default router;
