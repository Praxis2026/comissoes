-- ====================================================================
-- SCRIPT DE IMPLANTAÇÃO COMPLETO EM LOTE ÚNICO (ALL-IN-ONE)
-- Sistema de Comissionamento Comercial RBAC com Stored Procedures
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Uso: psql -U postgres -d <nome_do_banco> -f deploy_full_database.sql
-- ====================================================================

BEGIN;

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CONTROLE DE MIGRATIONS
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INT
);

-- 3. ENUMS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_tipo_enum') THEN
        CREATE TYPE perfil_tipo_enum AS ENUM ('ADMINISTRADOR', 'VENDEDOR', 'GERENTE', 'AUDITOR');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_comissao_enum') THEN
        CREATE TYPE tipo_comissao_enum AS ENUM ('ESCALONADO_ENTRADA', 'VALOR_FIXO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_lancamento_enum') THEN
        CREATE TYPE status_lancamento_enum AS ENUM (
            'RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'REJEITADO', 'CONFERIDO', 'LIQUIDADO', 'ESTORNADO'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pagamento_entrada_enum') THEN
        CREATE TYPE tipo_pagamento_entrada_enum AS ENUM (
            'PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA', 'BOLETO', 'CREDITO_PARCELADO', 'SEM_ENTRADA', 'OUTRO'
        );
    END IF;
END $$;

-- 4. TABELAS
CREATE TABLE IF NOT EXISTS perfis (
    id SERIAL PRIMARY KEY,
    codigo perfil_tipo_enum UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS regras_comissao_vendedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    tipo_comissao tipo_comissao_enum NOT NULL,
    valor_fixo NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    vigencia_inicio DATE NOT NULL,
    vigencia_fim DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_vigencia_datas CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);

CREATE TABLE IF NOT EXISTS faixas_entrada_comissao (
    id SERIAL PRIMARY KEY,
    regra_id UUID NOT NULL REFERENCES regras_comissao_vendedor(id) ON DELETE CASCADE,
    percentual_entrada_min NUMERIC(5,2) NOT NULL,
    percentual_entrada_max NUMERIC(5,2),
    percentual_comissao NUMERIC(5,2) NOT NULL,
    CONSTRAINT ck_faixas_percentuais CHECK (percentual_entrada_min >= 0 AND (percentual_entrada_max IS NULL OR percentual_entrada_max >= percentual_entrada_min))
);

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

CREATE TABLE IF NOT EXISTS historico_status_lancamento (
    id BIGSERIAL PRIMARY KEY,
    lancamento_id UUID NOT NULL REFERENCES lancamentos_comissao(id) ON DELETE CASCADE,
    status_anterior status_lancamento_enum,
    novo_status status_lancamento_enum NOT NULL,
    alterado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    justificativa TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_data ON vendas (vendedor_id, data_venda DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_numero_doc ON vendas (numero_documento);
CREATE INDEX IF NOT EXISTS idx_vendas_codigo ON vendas (codigo_venda);
CREATE INDEX IF NOT EXISTS idx_regras_vendedor_vigencia ON regras_comissao_vendedor (vendedor_id, vigencia_inicio, vigencia_fim);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON lancamentos_comissao (status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vendedor_status ON lancamentos_comissao (vendedor_id, status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_repasse ON lancamentos_comissao (repasse_id);
CREATE INDEX IF NOT EXISTS idx_historico_lancamento ON historico_status_lancamento (lancamento_id, criado_em DESC);

-- 6. TRIGGERS
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_usuarios ON usuarios;
CREATE TRIGGER trg_atualizar_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_atualizar_vendas ON vendas;
CREATE TRIGGER trg_atualizar_vendas BEFORE UPDATE ON vendas FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_atualizar_lancamentos ON lancamentos_comissao;
CREATE TRIGGER trg_atualizar_lancamentos BEFORE UPDATE ON lancamentos_comissao FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE OR REPLACE FUNCTION fn_gerar_codigo_venda()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_venda IS NULL OR TRIM(NEW.codigo_venda) = '' THEN
        NEW.codigo_venda := 'VEN-' || LPAD(NEW.numero_sequencial::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_codigo_venda ON vendas;
CREATE TRIGGER trg_gerar_codigo_venda BEFORE INSERT ON vendas FOR EACH ROW EXECUTE FUNCTION fn_gerar_codigo_venda();

CREATE OR REPLACE FUNCTION fn_auditar_transicao_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO historico_status_lancamento (
            lancamento_id, status_anterior, novo_status, alterado_por, justificativa
        ) VALUES (
            NEW.id, OLD.status, NEW.status, NEW.aprovado_por, NEW.justificativa_rejeicao
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditar_transicao_status ON lancamentos_comissao;
CREATE TRIGGER trg_auditar_transicao_status AFTER UPDATE ON lancamentos_comissao FOR EACH ROW EXECUTE FUNCTION fn_auditar_transicao_status();

-- 7. STORED PROCEDURES
CREATE OR REPLACE FUNCTION sp_calcular_comissao_venda(p_venda_id UUID)
RETURNS TABLE (
    lancamento_id UUID,
    status_calculo VARCHAR(50),
    valor_entrada_considerada NUMERIC(12,2),
    percentual_entrada_calculado NUMERIC(5,2),
    aliquota_ou_fixo NUMERIC(12,2),
    valor_comissao NUMERIC(12,2),
    mensagem TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_venda RECORD;
    v_regra RECORD;
    v_faixa RECORD;
    v_meio RECORD;
    v_entrada_considerada NUMERIC(12,2) := 0.00;
    v_perc_entrada NUMERIC(5,2) := 0.00;
    v_aliquota NUMERIC(12,2) := 0.00;
    v_comissao_calculada NUMERIC(12,2) := 0.00;
    v_lancamento_existente UUID;
    v_status_atual status_lancamento_enum;
BEGIN
    SELECT * INTO v_venda FROM vendas WHERE id = p_venda_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não localizada para o ID: %', p_venda_id;
    END IF;

    SELECT id, status INTO v_lancamento_existente, v_status_atual
    FROM lancamentos_comissao WHERE venda_id = p_venda_id;

    IF v_status_atual IN ('APROVADO', 'CONFERIDO', 'LIQUIDADO') THEN
        RAISE EXCEPTION 'Não é permitido recalcular comissão de venda com status %', v_status_atual;
    END IF;

    SELECT * INTO v_meio FROM meios_pagamento WHERE codigo = v_venda.tipo_pagamento_entrada::TEXT;
    IF FOUND AND v_meio.is_entrada_valida = TRUE THEN
        v_entrada_considerada := COALESCE(v_venda.valor_entrada_valida, 0.00);
    ELSIF v_venda.tipo_pagamento_entrada IN ('PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA') THEN
        v_entrada_considerada := COALESCE(v_venda.valor_entrada_valida, 0.00);
    ELSE
        v_entrada_considerada := 0.00;
    END IF;

    IF v_venda.valor_total_venda > 0 THEN
        v_perc_entrada := ROUND(((v_entrada_considerada / v_venda.valor_total_venda) * 100.0), 2);
    ELSE
        v_perc_entrada := 0.00;
    END IF;

    SELECT * INTO v_regra
    FROM regras_comissao_vendedor
    WHERE vendedor_id = v_venda.vendedor_id
      AND vigencia_inicio <= v_venda.data_venda
      AND (vigencia_fim IS NULL OR vigencia_fim >= v_venda.data_venda)
    ORDER BY vigencia_inicio DESC LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma regra de comissão ativa para o vendedor % na data %', v_venda.vendedor_id, v_venda.data_venda;
    END IF;

    IF v_regra.tipo_comissao = 'VALOR_FIXO' THEN
        v_aliquota := v_regra.valor_fixo;
        v_comissao_calculada := v_regra.valor_fixo;
    ELSIF v_regra.tipo_comissao = 'ESCALONADO_ENTRADA' THEN
        SELECT * INTO v_faixa
        FROM faixas_entrada_comissao
        WHERE regra_id = v_regra.id
          AND v_perc_entrada >= percentual_entrada_min
          AND (percentual_entrada_max IS NULL OR v_perc_entrada <= percentual_entrada_max)
        ORDER BY percentual_entrada_min DESC LIMIT 1;

        IF FOUND THEN
            v_aliquota := v_faixa.percentual_comissao;
            v_comissao_calculada := ROUND((v_venda.valor_total_venda * (v_aliquota / 100.0)), 2);
        ELSE
            v_aliquota := 0.00;
            v_comissao_calculada := 0.00;
        END IF;
    END IF;

    IF v_lancamento_existente IS NOT NULL THEN
        UPDATE lancamentos_comissao
        SET regra_aplicada_id = v_regra.id,
            valor_base_venda = v_venda.valor_total_venda,
            percentual_entrada_calculado = v_perc_entrada,
            entrada_valida_considerada = v_entrada_considerada,
            aliquota_ou_fixo_aplicado = v_aliquota,
            valor_comissao_calculado = v_comissao_calculada,
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = v_lancamento_existente
        RETURNING id INTO lancamento_id;
    ELSE
        INSERT INTO lancamentos_comissao (
            venda_id, vendedor_id, regra_aplicada_id, valor_base_venda,
            percentual_entrada_calculado, entrada_valida_considerada,
            aliquota_ou_fixo_aplicado, valor_comissao_calculado, status
        ) VALUES (
            v_venda.id, v_venda.vendedor_id, v_regra.id, v_venda.valor_total_venda,
            v_perc_entrada, v_entrada_considerada, v_aliquota, v_comissao_calculada, 'RASCUNHO'
        )
        RETURNING id INTO lancamento_id;
    END IF;

    status_calculo := 'SUCESSO';
    valor_entrada_considerada := v_entrada_considerada;
    percentual_entrada_calculado := v_perc_entrada;
    aliquota_ou_fixo := v_aliquota;
    valor_comissao := v_comissao_calculada;
    mensagem := 'Comissão calculada com sucesso.';
    RETURN NEXT;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_submeter_aprovacao(p_lancamento_id UUID, p_vendedor_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'PENDENTE_APROVACAO', justificativa_rejeicao = NULL, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id AND vendedor_id = p_vendedor_id AND status IN ('RASCUNHO', 'REJEITADO');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não encontrado ou não elegível para submissão.';
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_aprovar_comissao(p_lancamento_id UUID, p_admin_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'APROVADO', aprovado_por = p_admin_id, aprovado_em = CURRENT_TIMESTAMP, justificativa_rejeicao = NULL, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id AND status = 'PENDENTE_APROVACAO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apenas lançamentos PENDENTE_APROVACAO podem ser aprovados.';
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_rejeitar_comissao(p_lancamento_id UUID, p_admin_id UUID, p_justificativa TEXT)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_justificativa IS NULL OR TRIM(p_justificativa) = '' THEN
        RAISE EXCEPTION 'A justificativa de rejeição é obrigatória.';
    END IF;
    UPDATE lancamentos_comissao
    SET status = 'REJEITADO', justificativa_rejeicao = p_justificativa, aprovado_por = p_admin_id, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id AND status = 'PENDENTE_APROVACAO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não está em estado PENDENTE_APROVACAO.';
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_conferir_comissao(p_lancamento_id UUID, p_vendedor_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'CONFERIDO', conferido_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id AND vendedor_id = p_vendedor_id AND status = 'APROVADO';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não está em estado APROVADO para aceite do vendedor.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION sp_liquidar_repasse_lote(
    p_vendedor_id UUID, p_lancamentos_ids UUID[], p_data_repasse DATE,
    p_comprovante VARCHAR(255), p_admin_id UUID, p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
    v_total_repassado NUMERIC(12,2) := 0.00;
    v_repasse_id UUID;
    v_contagem_invalidos INT;
BEGIN
    SELECT COUNT(*) INTO v_contagem_invalidos
    FROM lancamentos_comissao
    WHERE id = ANY(p_lancamentos_ids) AND (status != 'CONFERIDO' OR vendedor_id != p_vendedor_id);

    IF v_contagem_invalidos > 0 THEN
        RAISE EXCEPTION 'Lançamentos inválidos ou sem conferência prévia.';
    END IF;

    SELECT COALESCE(SUM(valor_comissao_calculado), 0.00) INTO v_total_repassado
    FROM lancamentos_comissao WHERE id = ANY(p_lancamentos_ids);

    INSERT INTO repasses (
        vendedor_id, data_repasse, valor_total_repassado, comprovante_transacao, registrado_por, observacoes
    ) VALUES (
        p_vendedor_id, p_data_repasse, v_total_repassado, p_comprovante, p_admin_id, p_observacoes
    )
    RETURNING id INTO v_repasse_id;

    UPDATE lancamentos_comissao
    SET status = 'LIQUIDADO', repasse_id = v_repasse_id, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ANY(p_lancamentos_ids);

    RETURN v_repasse_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_estornar_comissao(p_lancamento_id UUID, p_motivo TEXT, p_admin_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    IF p_motivo IS NULL OR TRIM(p_motivo) = '' THEN
        RAISE EXCEPTION 'Motivo do estorno é obrigatório.';
    END IF;
    UPDATE lancamentos_comissao
    SET status = 'ESTORNADO', justificativa_rejeicao = CONCAT('ESTORNO: ', p_motivo, ' (Auditado em ', CURRENT_TIMESTAMP, ')'),
        aprovado_por = p_admin_id, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id AND status IN ('APROVADO', 'CONFERIDO');
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apenas comissões aprovadas ou conferidas podem ser estornadas.';
    END IF;
END;
$$;

-- 8. VIEWS
CREATE OR REPLACE VIEW vw_extrato_vendedor_conferencia AS
SELECT 
    l.id AS lancamento_id, v.id AS venda_id, v.codigo_venda, v.numero_documento,
    v.data_venda, v.cliente_nome, v.procedimentos, v.valor_total_venda,
    v.valor_entrada_valida, v.tipo_pagamento_entrada, l.percentual_entrada_calculado,
    l.aliquota_ou_fixo_aplicado, l.valor_comissao_calculado, l.status AS status_lancamento,
    l.justificativa_rejeicao, l.aprovado_em, l.conferido_em, u_vend.id AS vendedor_id,
    u_vend.nome AS vendedor_nome, u_vend.email AS vendedor_email, u_adm.nome AS aprovador_nome,
    r.comprovante_transacao, r.data_repasse
FROM lancamentos_comissao l
INNER JOIN vendas v ON v.id = l.venda_id
INNER JOIN usuarios u_vend ON u_vend.id = l.vendedor_id
LEFT JOIN usuarios u_adm ON u_adm.id = l.aprovado_por
LEFT JOIN repasses r ON r.id = l.repasse_id;

-- 9. REGISTRO DE MIGRATIONS NO CONTROLE
INSERT INTO schema_migrations (version, name, execution_time_ms) VALUES
('001', '001_create_extensions_and_enums.sql', 10),
('002', '002_create_core_tables.sql', 25),
('003', '003_create_stored_procedures_and_triggers.sql', 30),
('004', '004_create_views.sql', 15),
('005', '005_seed_initial_data.sql', 40)
ON CONFLICT (version) DO NOTHING;

COMMIT;
