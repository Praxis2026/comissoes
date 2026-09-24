-- ====================================================================
-- MIGRATION 001: EXTENSÕES, CONTROLE DE MIGRATIONS E ENUMS
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Descrição: Configura extensões para geração de UUIDs, tabela de
--            controle de versionamento e tipos enumerados (ENUMs).
-- ====================================================================

-- 1. EXTENSÕES DO POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE CONTROLE DE MIGRATIONS EXECUTADAS
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INT
);

COMMENT ON TABLE schema_migrations IS 'Registro e histórico de migrations aplicadas no banco PostgreSQL.';

-- 3. TIPOS ENUMERADOS (ENUMS) DO DOMÍNIO
DO $$ 
BEGIN
    -- Perfis de Acesso
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_tipo_enum') THEN
        CREATE TYPE perfil_tipo_enum AS ENUM (
            'ADMINISTRADOR',
            'VENDEDOR',
            'GERENTE',
            'AUDITOR'
        );
    END IF;

    -- Tipos de Regra de Comissionamento
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_comissao_enum') THEN
        CREATE TYPE tipo_comissao_enum AS ENUM (
            'ESCALONADO_ENTRADA',
            'VALOR_FIXO'
        );
    END IF;

    -- Ciclo de Vida e Estados da Comissão (RBAC)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_lancamento_enum') THEN
        CREATE TYPE status_lancamento_enum AS ENUM (
            'RASCUNHO',
            'PENDENTE_APROVACAO',
            'APROVADO',
            'REJEITADO',
            'CONFERIDO',
            'LIQUIDADO',
            'ESTORNADO'
        );
    END IF;

    -- Meios de Pagamento de Entrada
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pagamento_entrada_enum') THEN
        CREATE TYPE tipo_pagamento_entrada_enum AS ENUM (
            'PIX',
            'DINHEIRO',
            'DEBITO',
            'CREDITO_AVISTA',
            'BOLETO',
            'CREDITO_PARCELADO',
            'SEM_ENTRADA',
            'OUTRO'
        );
    END IF;
END $$;
