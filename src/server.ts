// Carrega o .env ANTES de qualquer outro import.
// Isso é essencial: os módulos abaixo (auth.routes -> middleware/auth) leem
// process.env.JWT_SECRET assim que são importados. Se o dotenv.config() rodar
// depois desses imports, JWT_SECRET chega undefined nesse momento e o sistema
// usa o valor padrão inseguro por engano — mesmo com o .env configurado certo.
import "dotenv/config";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import pedidosRoutes from "./routes/pedidos.routes";
import auditoriaRoutes from "./routes/auditoria.routes";
import pagamentosRoutes from "./routes/pagamentos.routes";
import profilesRoutes from "./routes/profiles.routes";

const app = express();
app.use(cors({ origin: "https://fogo-brasa.vercel.app" }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/api/auth", authRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/auditoria", auditoriaRoutes);
app.use("/api/pagamentos", pagamentosRoutes);
app.use("/api/profiles", profilesRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});