# 🔥 Fogo Brasa

**Sistema completo de gestão para churrascaria** — do pedido do cliente ao fechamento do caixa, tudo em um só lugar.

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Node](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)

---

## 📖 Sobre o projeto

O **Fogo Brasa** é um sistema web para gerenciar o funcionamento de uma churrascaria de ponta a ponta — pensado para três tipos de usuário trabalhando em conjunto, em tempo real:

- 🍽️ **Cliente** — monta o pedido pelo cardápio digital e acompanha o status
- 🧑‍🍳 **Garçom** — visualiza os pedidos das mesas, atualiza status e gerencia itens
- 📊 **Admin** — tem visão total: pedidos, pagamentos, caixa do dia e auditoria de ações

Tudo isso rodando sobre uma API própria em **Node + TypeScript**, com banco **PostgreSQL** local via **Docker** — sem depender de serviços externos.

---

## ✨ Funcionalidades

- 🔐 **Autenticação segura** com JWT + senhas criptografadas (bcrypt)
- 🧾 **Pedidos em tempo real**, com itens, total e status (`Pendente`, `Preparando`, `Entregue`, `Finalizado`)
- 💳 **Controle de pagamentos** com fechamento de caixa diário
- 📋 **Auditoria completa** — todo mundo que faz uma ação relevante deixa rastro
- 👥 **Controle de permissões por papel** (`cliente` / `garcom` / `admin`)
- 🐳 **Ambiente 100% containerizado** com Docker Compose (Postgres + pgAdmin)

---

## 🛠️ Stack utilizada

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3, JavaScript |
| Back-end | Node.js, Express 5, TypeScript |
| Banco de dados | PostgreSQL 16 |
| Autenticação | JWT (`jsonwebtoken`) + `bcryptjs` |
| Infraestrutura | Docker & Docker Compose |
| Administração do banco | pgAdmin 4 |

---

## 🚀 Como rodar o projeto localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) e Docker Compose

### 1. Clone o repositório
```bash
git clone https://github.com/GabrielOrtiz05/Fogo-Brasa.git
cd Fogo-Brasa
```

### 2. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=suasenha
DB_NAME=churrascaria

JWT_SECRET=troque-por-uma-string-aleatoria-bem-grande
PORT=3000
```

### 3. Suba o banco de dados
```bash
docker-compose up -d
```

### 4. Crie as tabelas
```bash
docker exec -i churrascaria-db psql -U admin -d churrascaria < schema.sql
```

### 5. Instale as dependências
```bash
npm install
```

### 6. Rode o servidor
```bash
npm run dev
```

O back-end estará disponível em **`http://localhost:3000`** 🎉

---

## 🗂️ Estrutura do projeto

```
Fogo-Brasa/
├── src/
│   ├── server.ts              # Ponto de entrada da API
│   ├── db.ts                  # Conexão com o PostgreSQL
│   ├── middleware/
│   │   └── auth.ts            # Autenticação e permissões (JWT)
│   └── routes/
│       ├── auth.routes.ts     # Login e cadastro
│       ├── pedidos.routes.ts  # Criação e gestão de pedidos
│       ├── pagamentos.routes.ts
│       ├── auditoria.routes.ts
│       └── profiles.routes.ts
├── script/                    # Scripts do front-end
├── css/                       # Estilos
├── *.html                     # Páginas (login, cadastro, garçom, admin, perfil)
├── schema.sql                 # Schema do banco de dados
├── docker-compose.yml         # Postgres + pgAdmin
└── tsconfig.json
```

---

## 🔌 Principais endpoints da API

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/api/auth/cadastro` | Cria uma nova conta | Público |
| `POST` | `/api/auth/login` | Autentica e retorna token JWT | Público |
| `GET` | `/api/profiles/me` | Dados do usuário logado | Autenticado |
| `POST` | `/api/pedidos` | Cria um novo pedido | Cliente |
| `GET` | `/api/pedidos/meus` | Histórico do cliente | Cliente |
| `GET` | `/api/pedidos/ativos` | Pedidos em aberto | Garçom / Admin |
| `PATCH` | `/api/pedidos/:id/status` | Atualiza status do pedido | Garçom / Admin |
| `POST` | `/api/pagamentos` | Registra um pagamento | Admin |
| `GET` | `/api/pagamentos/hoje` | Caixa do dia | Admin |
| `GET` | `/api/auditoria` | Log de ações do sistema | Admin |

---

## 🧑‍💻 Autor

Desenvolvido por **Gabriel Ortiz**
[GitHub](https://github.com/GabrielOrtiz05)

---

## 📄 Licença

Este projeto está sob a licença ISC.
