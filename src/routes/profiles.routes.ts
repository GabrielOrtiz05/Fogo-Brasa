import { Router, Request, Response } from "express";
import { pool } from "../db";
import { autenticar, autorizar } from "../middleware/auth";

const router = Router();

// GET /api/profiles/me - dados do usuário logado (substitui supabaseClient.auth.getUser() + .from('profiles'))
router.get("/me", autenticar, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, nome_completo, email, role FROM profiles WHERE id = $1",
      [req.user!.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    res.status(500).json({ error: "Erro no servidor ao buscar perfil." });
  }
});

// GET /api/profiles - admin lista id + nome de todos (carregarNomesUsuarios())
router.get("/", autenticar, autorizar("admin"), async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT id, nome_completo FROM profiles");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar perfis:", err);
    res.status(500).json({ error: "Erro no servidor ao listar perfis." });
  }
});

export default router;
