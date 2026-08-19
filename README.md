# Fogo & Brasa 🔥

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)

Sistema de gestão para churrascaria, com três perfis de acesso (cliente, garçom e admin). Cliente monta o pedido e acompanha o histórico; garçom gerencia os pedidos em andamento; admin tem visão geral de pedidos, financeiro do dia e auditoria de ações do sistema.

## Sobre o projeto

Comecei o Fogo & Brasa como um protótipo rápido usando Supabase, pra validar o fluxo das três telas (cliente, garçom, admin) sem me preocupar com infraestrutura de backend. Depois de validar o fluxo, migrei para um backend próprio em Node.js/TypeScript com PostgreSQL — decisão tomada de propósito, como exercício de construir e proteger uma API do zero: autenticação com JWT, senhas com hash via bcrypt, controle de acesso por papel (RBAC) em cada rota, transações no banco para operações que precisam ser atômicas (como registrar um pagamento) e auditoria de ações críticas do sistema.

É um projeto pessoal de portfólio — o objetivo não é só "fazer funcionar", mas também exercitar decisões de arquitetura e segurança que apareceriam num sistema real de produção.

## Stack

**Backend:** Node.js, TypeScript, Express, PostgreSQL, JWT (autenticação) + bcrypt (hash de senha)
**Frontend:** HTML, CSS e JavaScript puro (sem framework)
**Infra local:** Docker Compose (PostgreSQL + pgAdmin)

## Prints

*(adicione aqui capturas de tela das três telas — login, painel do cliente, painel do garçom e painel do admin — pra quem visitar o repositório ter uma prévia visual antes de rodar o projeto)*

```md
<p align="center">
  <img src="docs/screenshot-login.png" width="30%" />
  <img src="docs/screenshot-perfil.png" width="30%" />
  <img src="docs/screenshot-admin.png" width="30%" />
</p>
```

## Como rodar localmente

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Node.js 18+

### 1. Clonar e instalar dependências
```bash
git clone https://github.com/GabrielOrtiz05/Fogo-Brasa.git
cd Fogo-Brasa
npm install
```

### 2. Subir o banco de dados
```bash
docker-compose up -d
```
Isso sobe dois containers: PostgreSQL (`churrascaria-db`) e pgAdmin (`churrascaria-pgadmin`, interface web em `http://localhost:5050`).

### 3. Criar as tabelas
```bash
docker exec -i churrascaria-db psql -U admin -d churrascaria < schema.sql
```
*(no PowerShell, use `Get-Content schema.sql | docker exec -i churrascaria-db psql -U admin -d churrascaria` em vez do `<`)*

### 4. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=suasenha
DB_NAME=churrascaria

JWT_SECRET=troque-por-uma-string-aleatoria-longa
PORT=3000
```

> ⚠️ `JWT_SECRET` é obrigatório — o servidor recusa iniciar sem ele. Gere um valor forte com:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 5. Rodar o backend
```bash
npm run dev
```
Servidor sobe em `http://localhost:3000`. Teste com `http://localhost:3000/api/health`.

### 6. Abrir o frontend
Abra `index.html`, `login.html` etc. com uma extensão tipo Live Server (VS Code). As páginas já apontam para a API em `http://localhost:3000/api`.

## Estrutura do projeto

```
├── src/
│   ├── server.ts              # ponto de entrada da API
│   ├── db.ts                  # pool de conexão com o PostgreSQL
│   ├── middleware/
│   │   └── auth.ts            # autenticação (JWT) e autorização por papel (RBAC)
│   └── routes/
│       ├── auth.routes.ts     # cadastro / login
│       ├── pedidos.routes.ts  # criar, listar, atualizar status/itens de pedidos
│       ├── pagamentos.routes.ts # registrar pagamento, ver caixa do dia
│       ├── auditoria.routes.ts  # log de ações do sistema
│       └── profiles.routes.ts   # dados do usuário logado
├── script/                    # JavaScript do frontend (um arquivo por página)
├── css/
├── schema.sql                 # schema do PostgreSQL
├── docker-compose.yml         # PostgreSQL + pgAdmin para desenvolvimento local
└── *.html                     # páginas do frontend
```

## Autenticação e permissões

- Cadastro (`POST /api/auth/cadastro`) sempre cria o usuário com papel `cliente` — não é possível se autopromover a `garcom`/`admin` pela API.
- Login (`POST /api/auth/login`) devolve um token JWT válido por 7 dias, com o papel do usuário embutido e assinado.
- Cada rota sensível é protegida por dois middlewares: `autenticar` (valida o token) e `autorizar(...papéis)` (confere se o papel do token tem permissão).
- Para promover alguém a `garcom` ou `admin` hoje, é feito direto no banco:
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'usuario@exemplo.com';
  ```
  *(é necessário logar novamente após a mudança — o papel fica "travado" no token até um novo login)*

## Principais endpoints da API

| Método | Rota | Quem acessa | Descrição |
|---|---|---|---|
| POST | `/api/auth/cadastro` | público | Cria conta (papel `cliente`) |
| POST | `/api/auth/login` | público | Autentica e retorna token |
| GET | `/api/profiles/me` | logado | Dados do próprio usuário |
| POST | `/api/pedidos` | cliente | Cria um novo pedido |
| GET | `/api/pedidos/meus` | cliente | Histórico do próprio cliente |
| GET | `/api/pedidos/ativos` | garçom/admin | Pedidos não entregues |
| GET | `/api/pedidos` | admin | Todos os pedidos não finalizados |
| PATCH | `/api/pedidos/:id/status` | garçom/admin | Atualiza status do pedido |
| PATCH | `/api/pedidos/:id/remover-item` | garçom/admin | Remove o último item do pedido |
| POST | `/api/pagamentos` | admin | Registra pagamento e finaliza o pedido |
| GET | `/api/pagamentos/hoje` | admin | Total e lista de pagamentos do dia |
| GET | `/api/auditoria` | admin | Últimos 50 logs de ações do sistema |

## Roadmap

- [ ] Remover referências residuais ao Supabase (tags `<script>` não usadas em `login.html`/`cadastro.html`)
- [ ] Testes automatizados para as rotas da API
- [ ] Deploy (backend + banco) em ambiente de produção
