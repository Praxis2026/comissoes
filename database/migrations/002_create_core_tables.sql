-- ====================================================================
-- MIGRATION 002: TABELAS CENTRAIS, RELACIONAMENTOS E ÍNDICES
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Descrição: Cria as tabelas do modelo relacional comercial, RBAC,
--            versionamento de vigências, regras de comissão e auditoria.
-- ====================================================================

-- 1. TABELA DE PERFIS DE ACESSO (RBAC)
CREATE TABLE IF NOT EXISTS perfis (
    id SERIAL PRIMARY KEY,
    codigo perfil_tipo_enum UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    perfil_id INT NOT NULL REFERENCES perfis(id) ON DELETE RESTRICT,
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    senha_atualizada_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PERMISSÕES GRANULARES POR MÓDULO (RBAC)
CREATE TABLE IF NOT EXISTS usuario_permissoes (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo VARCHAR(50) NOT NULL,
    acesso BOOLEAN NOT NULL DEFAULT FALSE,
    inserir BOOLEAN NOT NULL DEFAULT FALSE,
    alterar BOOLEAN NOT NULL DEFAULT FALSE,
    excluir BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_usuario_modulo UNIQUE (usuario_id, modulo)
);

-- 4. CATÁLOGO DE MEIOS DE PAGAMENTO E ENTRADAS VÁLIDAS
CREATE TABLE IF NOT EXISTS meios_pagamento (
    id VARCHAR(50) PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    descricao TEXT,
    is_entrada_valida BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    sistema_padrao BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INT NOT NULL DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONFIGURAÇÕES GLOBAIS E IDENTIDADE VISUAL
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'GLOBAL_CONFIG',
    nome_empresa VARCHAR(150) NOT NULL DEFAULT 'Comissões Pro',
    logo_url TEXT,
    percentual_comissao_padrao_residual NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    exigir_aprovacao_gestor BOOLEAN NOT NULL DEFAULT TRUE,
    exigir_conferencia_vendedor BOOLEAN NOT NULL DEFAULT TRUE,
    trava_estorno_apenas_admin BOOLEAN NOT NULL DEFAULT TRUE,
    dias_alerta_expiracao_vigencia INT NOT NULL DEFAULT 30,
    procedimentos_catalogo JSONB DEFAULT '[]'::jsonb,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. REGRAS DE COMISSIONAMENTO DO VENDEDOR (COM VIGÊNCIA HISTÓRICA)
CREATE TABLE IF NOT EXISTS regras_comissao_vendedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_comissao tipo_comissao_enum NOT NULL,
    valor_fixo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE, -- NULL indica vigência atual aberta
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_vigencia_datas CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);

-- 7. FAIXAS ESCALONADAS DE ENTRADA
CREATE TABLE IF NOT EXISTS faixas_entrada_comissao (
    id SERIAL PRIMARY KEY,
    regra_id UUID NOT NULL REFERENCES regras_comissao_vendedor(id) ON DELETE CASCADE,
    percentual_entrada_min NUMERIC(5,2) NOT NULL, -- Ex: 30.00
    percentual_entrada_max NUMERIC(5,2),          -- Ex: NULL (sem teto) ou 29.99
    percentual_comissao NUMERIC(5,2) NOT NULL,    -- Ex: 1.00 (% aplicado sobre a venda)
    CONSTRAINT ck_faixas_percentuais CHECK (percentual_entrada_min >= 0 AND (percentual_entrada_max IS NULL OR percentual_entrada_max >= percentual_entrada_min))
);

-- 8. SEQUÊNCIA E TABELA DE VENDAS / CONTRATOS
CREATE SEQUENCE IF NOT EXISTS vendas_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_sequencial INT NOT NULL DEFAULT nextval('vendas_seq'),
    codigo_venda VARCHAR(30) UNIQUE,
    numero_documento VARCHAR(100) NOT NULL,
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    cliente_nome VARCHAR(200) NOT NULL,
    procedimentos TEXT,
    data_venda DATE NOT NULL,
    valor_total_venda NUMERIC(12,2) NOT NULL CHECK (valor_total_venda > 0),
    valor_entrada_valida NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (valor_entrada_valida >= 0),
    tipo_pagamento_entrada tipo_pagamento_entrada_enum NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. LOTES DE REPASSE FINANCEIRO
CREATE TABLE IF NOT EXISTS repasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_sequencial SERIAL,
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    data_repasse DATE NOT NULL,
    valor_total_repassado NUMERIC(12,2) NOT NULL CHECK (valor_total_repassado >= 0),
    comprovante_transacao VARCHAR(255),
    registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. LANÇAMENTOS DE COMISSÃO (CICLO DE VIDA RBAC)
CREATE TABLE IF NOT EXISTS lancamentos_comissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL UNIQUE REFERENCES vendas(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    regra_aplicada_id UUID REFERENCES regras_comissao_vendedor(id) ON DELETE SET NULL,
    valor_base_venda NUMERIC(12,2) NOT NULL,
    percentual_entrada_calculado NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    entrada_valida_considerada NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    aliquota_ou_fixo_aplicado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    valor_comissao_calculado NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status status_lancamento_enum NOT NULL DEFAULT 'RASCUNHO',
    justificativa_rejeicao TEXT,
    aprovado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    aprovado_em TIMESTAMP WITH TIME ZONE,
    conferido_em TIMESTAMP WITH TIME ZONE,
    repasse_id UUID REFERENCES repasses(id) ON DELETE SET NULL,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. AUDITORIA IMUTÁVEL DE TRANSIÇÕES DE STATUS
CREATE TABLE IF NOT EXISTS historico_status_lancamento (
    id BIGSERIAL PRIMARY KEY,
    lancamento_id UUID NOT NULL REFERENCES lancamentos_comissao(id) ON DELETE CASCADE,
    status_anterior status_lancamento_enum,
    novo_status status_lancamento_enum NOT NULL,
    alterado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    justificativa TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. ÍNDICES DE PERFORMANCE E OTIMIZAÇÃO DE QUERIES
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_data ON vendas (vendedor_id, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_numero_doc ON vendas (numero_documento);
CREATE INDEX IF NOT EXISTS idx_vendas_codigo ON vendas (codigo_venda);
CREATE INDEX IF NOT EXISTS idx_regras_vendedor_vigencia ON regras_comissao_vendedor (vendedor_id, vigencia_inicio, vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos_comissao (status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vendedor_status ON lancamentos_comissao (vendedor_id, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_repasse ON lancamentos_comissao (repasse_id);
CREATE INDEX IF NOT EXISTS idx_historico_lancamento ON historico_status_lancamento (lancamento_id, criado_em DESC);
