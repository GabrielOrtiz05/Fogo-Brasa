import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// SEM valor padrão de propósito: um segredo previsível no código-fonte
// (que fica público no GitHub) permitiria forjar tokens de admin.
// Se JWT_SECRET não estiver definido no .env, o servidor nem deve subir.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET não definido no .env. Defina uma string aleatória e longa " +
    "antes de iniciar o servidor (ex: openssl rand -hex 32)."
  );
}

export interface AuthPayload {
  id: string;
  nome_completo: string;
  role: "cliente" | "garcom" | "admin";
}

// Estende o tipo Request do Express para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// Middleware: exige um token JWT válido no header Authorization
export function autenticar(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

// Middleware: exige que o usuário tenha um dos papéis (roles) permitidos
// Uso: autorizar("garcom", "admin")
export function autorizar(...rolesPermitidas: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !rolesPermitidas.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso negado." });
    }
    next();
  };
}

export function gerarToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: "7d" });
}