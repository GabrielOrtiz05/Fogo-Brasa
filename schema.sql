-- Extensão necessária para gerar UUIDs (gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de perfis (usuários do sistema: cliente, garçom, admin)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (role IN ('cliente', 'garcom', 'admin')),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de pedidos
-- itens fica em JSONB (lista de {nome, preco}) porque é assim que
-- src/routes/pedidos.routes.ts grava e lê (itens, total, mesa, status)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  garcom_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mesa VARCHAR(20) NOT NULL,
  itens JSONB NOT NULL,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'Pendente', -- Pendente, Preparando, Entregue, Finalizado
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  valor NUMERIC(10, 2) NOT NULL,
  metodo VARCHAR(30) NOT NULL,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de auditoria (log de ações relevantes do sistema)
CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acao VARCHAR(50) NOT NULL,
  detalhes TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices para as consultas mais frequentes da API
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_user ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_criado_em ON pagamentos(criado_em);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);