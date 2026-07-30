import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db";
import { gerarToken } from "../middleware/auth";

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/cadastro
router.post("/cadastro", async (req: Request, res: Response) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
  }

  try {
    const existente = await pool.query("SELECT id FROM profiles WHERE email = $1", [email]);
    if ((existente.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: "Já existe uma conta com esse email." });
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO profiles (nome_completo, email, senha_hash, role)
       VALUES ($1, $2, $3, 'cliente')
       RETURNING id, nome_completo, email, role`,
      [nome, email, senhaHash]
    );

    const usuario = result.rows[0];
    const token = gerarToken({
      id: usuario.id,
      nome_completo: usuario.nome_completo,
      role: usuario.role,
    });

    res.status(201).json({ usuario, token });
  } catch (err) {
    console.error("Erro ao cadastrar:", err);
    res.status(500).json({ error: "Erro no servidor ao cadastrar." });
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  try {
    const result = await pool.query(
      "SELECT id, nome_completo, email, senha_hash, role FROM profiles WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const token = gerarToken({
      id: usuario.id,
      nome_completo: usuario.nome_completo,
      role: usuario.role,
    });

    res.json({
      usuario: {
        id: usuario.id,
        nome_completo: usuario.nome_completo,
        email: usuario.email,
        role: usuario.role,
      },
      token,
    });
  } catch (err) {
    console.error("Erro ao logar:", err);
    res.status(500).json({ error: "Erro no servidor ao fazer login." });
  }
});

export default router;
