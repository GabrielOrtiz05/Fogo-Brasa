# EventFlow API

API REST para gerenciamento de eventos e venda de ingressos — com autenticação
por papéis, controle de estoque sem overselling (mesmo sob concorrência) e
check-in por código único.

Projeto pessoal de portfólio, construído para praticar arquitetura em camadas
(controller → service → repository) e resolver problemas reais de concorrência
em sistemas de venda com estoque limitado.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Status do projeto

🚧 Em desenvolvimento

- [x] Estrutura do banco de dados (Prisma + PostgreSQL)
- [x] Autenticação (registro, login, JWT)
- [ ] CRUD de eventos
- [ ] Tipos de ingresso
- [ ] Compra de ingressos (com controle de concorrência)
- [ ] Check-in
- [ ] Dashboard do organizador
- [ ] Testes automatizados

## Stack técnica

- **Linguagem:** TypeScript
- **Runtime:** Node.js
- **Framework web:** Express
- **Banco de dados:** PostgreSQL
- **ORM:** Prisma
- **Autenticação:** JWT + bcrypt
- **Validação:** Zod
- **Containerização:** Docker + Docker Compose

## Funcionalidades

### Usuários
- Cadastro e login com JWT
- Papéis: `ORGANIZADOR` e `PARTICIPANTE`

### Eventos *(em desenvolvimento)*
- Criação e edição de eventos (somente organizador dono)
- Listagem pública com filtros (categoria, cidade, data)
- Cada evento pode ter múltiplos tipos de ingresso

### Ingressos *(em desenvolvimento)*
- Compra com controle seguro de estoque (sem overselling, mesmo com requisições simultâneas)
- Código único gerado por ingresso
- Check-in que impede validação duplicada

## Estrutura de pastas

```
src/
├── controllers/   # recebem a requisição HTTP e chamam os services
├── services/      # regras de negócio
├── repositories/  # acesso ao banco de dados via Prisma
├── middlewares/    # autenticação, validação, tratamento de erros
├── routes/         # definição das rotas
├── schemas/        # validação de entrada (Zod)
├── utils/           # funções auxiliares (ex: cliente Prisma)
├── app.ts            # monta o Express (middlewares + rotas)
└── server.ts          # ponto de entrada, sobe o servidor
```

## Como rodar o projeto

### Pré-requisitos
- Node.js 20+
- Docker Desktop (rodando)

### Passo a passo

```bash
# Clonar o repositório
git clone <url-do-repo>
cd eventflow-api

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Subir o banco de dados PostgreSQL via Docker
docker-compose up -d

# Aplicar as migrations no banco
npx prisma migrate dev

# Iniciar o servidor em modo desenvolvimento
npm run dev
```

O servidor sobe por padrão em `http://localhost:3000`.

### Variáveis de ambiente (`.env`)

```
DATABASE_URL="postgresql://postgres:<sua_senha_aqui>@localhost:5432/eventflow?schema=public"
JWT_SECRET="<sua_chave_secreta>"
JWT_REFRESH_SECRET="<outra_chave_secreta>"
PORT=3000
```

> ⚠️ Nunca use os valores de exemplo acima em produção. Gere chaves fortes e
> únicas para `JWT_SECRET` e `JWT_REFRESH_SECRET`.

## Endpoints disponíveis

> Novos endpoints serão documentados aqui conforme forem implementados.

### Autenticação

| Método | Rota | Descrição | Autenticação |
|---|---|---|---|
| POST | `/auth/register` | Cria uma conta | Não |
| POST | `/auth/login` | Autentica e retorna tokens | Não |

**Exemplo de registro:**

```json
POST /auth/register
{
  "nome": "Gabriel",
  "email": "gabriel@teste.com",
  "senha": "SuaSenhaForte123!"
}
```

### Health check

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verifica se a API está no ar |

## Visualizar o banco de dados

```bash
npx prisma studio
```

Abre uma interface visual (geralmente em `http://localhost:5555`) para consultar e editar os dados das tabelas diretamente.

## Modelagem de dados

- **User** (1) ──< (N) **Event** — um organizador cria vários eventos
- **Event** (1) ──< (N) **TicketType** — um evento tem vários tipos de ingresso
- **TicketType** (1) ──< (N) **Ticket** — cada tipo gera vários ingressos vendidos
- **User** (1) ──< (N) **Ticket** — um participante compra vários ingressos

## Outros projetos

Confira também o [Fogo-Brasa](https://github.com/GabrielOrtiz05) — sistema de
gestão para churrascarias com backend em Node.js/TypeScript, PostgreSQL e
deploy em produção.

## Licença

Este projeto está sob a licença MIT — sinta-se livre para estudar e usar como
referência.

## Autor

Gabriel — [GabrielOrtiz05](https://github.com/GabrielOrtiz05)