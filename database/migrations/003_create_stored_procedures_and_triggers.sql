-- ====================================================================
-- MIGRATION 003: TRIGGERS AUTOMÁTICOS E STORED PROCEDURES (PL/pgSQL)
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Descrição: Implementa a inteligência e as regras de negócio em
--            banco: cálculo automático, versionamento de vigência,
--            numeração de venda, histórico e fluxo transacional RBAC.
-- ====================================================================

-- 1. FUNÇÃO E TRIGGER PARA ATUALIZAÇÃO DO CAMPO atualizado_em
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_atualizar_usuarios ON usuarios;
CREATE TRIGGER trg_atualizar_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_atualizar_vendas ON vendas;
CREATE TRIGGER trg_atualizar_vendas
    BEFORE UPDATE ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

DROP TRIGGER IF EXISTS trg_atualizar_lancamentos ON lancamentos_comissao;
CREATE TRIGGER trg_atualizar_lancamentos
    BEFORE UPDATE ON lancamentos_comissao
    FOR EACH ROW
    EXECUTE FUNCTION fn_atualizar_timestamp();

-- 2. TRIGGER PARA GERAÇÃO AUTOMÁTICA DO CÓDIGO DA VENDA (VEN-0001)
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
CREATE TRIGGER trg_gerar_codigo_venda
    BEFORE INSERT ON vendas
    FOR EACH ROW
    EXECUTE FUNCTION fn_gerar_codigo_venda();

-- 3. TRIGGER PARA LOG AUTOMÁTICO DE AUDITORIA DE STATUS
CREATE OR REPLACE FUNCTION fn_auditar_transicao_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO historico_status_lancamento (
            lancamento_id,
            status_anterior,
            novo_status,
            alterado_por,
            justificativa
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.aprovado_por,
            NEW.justificativa_rejeicao
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auditar_transicao_status ON lancamentos_comissao;
CREATE TRIGGER trg_auditar_transicao_status
    AFTER UPDATE ON lancamentos_comissao
    FOR EACH ROW
    EXECUTE FUNCTION fn_auditar_transicao_status();

-- 4. STORED PROCEDURE PRINCIPAL: sp_calcular_comissao_venda
CREATE OR REPLACE FUNCTION sp_calcular_comissao_venda(
    p_venda_id UUID
)
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
    -- 1. Recuperar dados da venda
    SELECT * INTO v_venda FROM vendas WHERE id = p_venda_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda não localizada para o ID: %', p_venda_id;
    END IF;

    -- Verificar se já existe lançamento e se está travado por aprovação/repasse
    SELECT id, status INTO v_lancamento_existente, v_status_atual
    FROM lancamentos_comissao
    WHERE venda_id = p_venda_id;

    IF v_status_atual IN ('APROVADO', 'CONFERIDO', 'LIQUIDADO') THEN
        RAISE EXCEPTION 'Não é permitido recalcular comissão de venda com status %', v_status_atual;
    END IF;

    -- 2. Avaliação de elegibilidade do Meio de Pagamento da Entrada
    -- Consulta tabela configurável de meios_pagamento ou fallback seguro
    SELECT * INTO v_meio FROM meios_pagamento WHERE codigo = v_venda.tipo_pagamento_entrada::TEXT;
    IF FOUND AND v_meio.is_entrada_valida = TRUE THEN
        v_entrada_considerada := COALESCE(v_venda.valor_entrada_valida, 0.00);
    ELSIF v_venda.tipo_pagamento_entrada IN ('PIX', 'DINHEIRO', 'DEBITO', 'CREDITO_AVISTA') THEN
        v_entrada_considerada := COALESCE(v_venda.valor_entrada_valida, 0.00);
    ELSE
        -- Formas não aceitas (ex: boleto, parcelado ou sem entrada)
        v_entrada_considerada := 0.00;
    END IF;

    -- Cálculo do Percentual de Entrada: (Valor Entrada / Valor Total da Venda) * 100
    IF v_venda.valor_total_venda > 0 THEN
        v_perc_entrada := ROUND(((v_entrada_considerada / v_venda.valor_total_venda) * 100.0), 2);
    ELSE
        v_perc_entrada := 0.00;
    END IF;

    -- 3. Buscar Regra do Vendedor vigente na data da venda (Versionamento Contratual)
    SELECT * INTO v_regra
    FROM regras_comissao_vendedor
    WHERE vendedor_id = v_venda.vendedor_id
      AND vigencia_inicio <= v_venda.data_venda
      AND (vigencia_fim IS NULL OR vigencia_fim >= v_venda.data_venda)
    ORDER BY vigencia_inicio DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Nenhuma regra de comissão ativa para o vendedor % na data da venda %', 
            v_venda.vendedor_id, v_venda.data_venda;
    END IF;

    -- 4. Cálculo baseado no modelo contratual da regra vigente
    IF v_regra.tipo_comissao = 'VALOR_FIXO' THEN
        v_aliquota := v_regra.valor_fixo;
        v_comissao_calculada := v_regra.valor_fixo;
    ELSIF v_regra.tipo_comissao = 'ESCALONADO_ENTRADA' THEN
        -- Localizar a faixa correspondente ao percentual de entrada
        SELECT * INTO v_faixa
        FROM faixas_entrada_comissao
        WHERE regra_id = v_regra.id
          AND v_perc_entrada >= percentual_entrada_min
          AND (percentual_entrada_max IS NULL OR v_perc_entrada <= percentual_entrada_max)
        ORDER BY percentual_entrada_min DESC
        LIMIT 1;

        IF FOUND THEN
            v_aliquota := v_faixa.percentual_comissao;
            -- O percentual é aplicado sobre o valor total da venda
            v_comissao_calculada := ROUND((v_venda.valor_total_venda * (v_aliquota / 100.0)), 2);
        ELSE
            -- Faixa residual padrão (ex: entrada abaixo do piso de 10%)
            v_aliquota := 0.00;
            v_comissao_calculada := 0.00;
        END IF;
    END IF;

    -- 5. Upsert no lançamento de comissão
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
            venda_id,
            vendedor_id,
            regra_aplicada_id,
            valor_base_venda,
            percentual_entrada_calculado,
            entrada_valida_considerada,
            aliquota_ou_fixo_aplicado,
            valor_comissao_calculado,
            status
        ) VALUES (
            v_venda.id,
            v_venda.vendedor_id,
            v_regra.id,
            v_venda.valor_total_venda,
            v_perc_entrada,
            v_entrada_considerada,
            v_aliquota,
            v_comissao_calculada,
            'RASCUNHO'
        )
        RETURNING id INTO lancamento_id;
    END IF;

    -- Retorno tabular com detalhes de auditoria
    status_calculo := 'SUCESSO';
    valor_entrada_considerada := v_entrada_considerada;
    percentual_entrada_calculado := v_perc_entrada;
    aliquota_ou_fixo := v_aliquota;
    valor_comissao := v_comissao_calculada;
    mensagem := 'Comissão calculada com sucesso de acordo com a vigência e faixas contratuais.';
    RETURN NEXT;
END;
$$;

-- 5. PROCEDURES DE WORKFLOW E TRANSIÇÃO DE ESTADOS RBAC

-- 5.1 Submeter para Aprovação (Ação do Vendedor)
CREATE OR REPLACE PROCEDURE sp_submeter_aprovacao(
    p_lancamento_id UUID,
    p_vendedor_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'PENDENTE_APROVACAO',
        justificativa_rejeicao = NULL,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id
      AND vendedor_id = p_vendedor_id
      AND status IN ('RASCUNHO', 'REJEITADO');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não encontrado ou não está em estado elegível para submissão (deve ser RASCUNHO ou REJEITADO).';
    END IF;
END;
$$;

-- 5.2 Aprovar Lançamento (Ação do Administrador)
CREATE OR REPLACE PROCEDURE sp_aprovar_comissao(
    p_lancamento_id UUID,
    p_admin_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'APROVADO',
        aprovado_por = p_admin_id,
        aprovado_em = CURRENT_TIMESTAMP,
        justificativa_rejeicao = NULL,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id
      AND status = 'PENDENTE_APROVACAO';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apenas lançamentos com status PENDENTE_APROVACAO podem ser aprovados pelo Administrador.';
    END IF;
END;
$$;

-- 5.3 Rejeitar Lançamento com Justificativa Obrigatória (Ação do Administrador)
CREATE OR REPLACE PROCEDURE sp_rejeitar_comissao(
    p_lancamento_id UUID,
    p_admin_id UUID,
    p_justificativa TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_justificativa IS NULL OR TRIM(p_justificativa) = '' THEN
        RAISE EXCEPTION 'A justificativa de rejeição é obrigatória para devolver a comissão ao vendedor.';
    END IF;

    UPDATE lancamentos_comissao
    SET status = 'REJEITADO',
        justificativa_rejeicao = p_justificativa,
        aprovado_por = p_admin_id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id
      AND status = 'PENDENTE_APROVACAO';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não localizado ou não está em estado PENDENTE_APROVACAO.';
    END IF;
END;
$$;

-- 5.4 Conferência e Aceite Formal do Vendedor (Requisito 5.1)
CREATE OR REPLACE PROCEDURE sp_conferir_comissao(
    p_lancamento_id UUID,
    p_vendedor_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE lancamentos_comissao
    SET status = 'CONFERIDO',
        conferido_em = CURRENT_TIMESTAMP,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id
      AND vendedor_id = p_vendedor_id
      AND status = 'APROVADO';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lançamento não encontrado ou não está aprovado pelo gestor para conferência do vendedor.';
    END IF;
END;
$$;

-- 5.5 Liquidação Financeira Atômica em Lote (Ação do Administrador)
CREATE OR REPLACE FUNCTION sp_liquidar_repasse_lote(
    p_vendedor_id UUID,
    p_lancamentos_ids UUID[],
    p_data_repasse DATE,
    p_comprovante VARCHAR(255),
    p_admin_id UUID,
    p_observacoes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_repassado NUMERIC(12,2) := 0.00;
    v_repasse_id UUID;
    v_contagem_invalidos INT;
BEGIN
    -- Validar se todos os lançamentos estão com status = 'CONFERIDO' e pertencem ao mesmo vendedor
    SELECT COUNT(*) INTO v_contagem_invalidos
    FROM lancamentos_comissao
    WHERE id = ANY(p_lancamentos_ids)
      AND (status != 'CONFERIDO' OR vendedor_id != p_vendedor_id);

    IF v_contagem_invalidos > 0 THEN
        RAISE EXCEPTION 'Existem lançamentos selecionados que não possuem aceite formal CONFERIDO ou pertencem a outro vendedor.';
    END IF;

    -- Calcular o montante consolidado do lote
    SELECT COALESCE(SUM(valor_comissao_calculado), 0.00) INTO v_total_repassado
    FROM lancamentos_comissao
    WHERE id = ANY(p_lancamentos_ids);

    -- Inserir registro na tabela de repasses
    INSERT INTO repasses (
        vendedor_id,
        data_repasse,
        valor_total_repassado,
        comprovante_transacao,
        registrado_por,
        observacoes
    ) VALUES (
        p_vendedor_id,
        p_data_repasse,
        v_total_repassado,
        p_comprovante,
        p_admin_id,
        p_observacoes
    )
    RETURNING id INTO v_repasse_id;

    -- Vincular e liquidar atomicamente todos os lançamentos do lote
    UPDATE lancamentos_comissao
    SET status = 'LIQUIDADO',
        repasse_id = v_repasse_id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ANY(p_lancamentos_ids);

    RETURN v_repasse_id;
END;
$$;

-- 5.6 Estorno de Comissão Auditado
CREATE OR REPLACE PROCEDURE sp_estornar_comissao(
    p_lancamento_id UUID,
    p_motivo TEXT,
    p_admin_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_motivo IS NULL OR TRIM(p_motivo) = '' THEN
        RAISE EXCEPTION 'O motivo circunstanciado do estorno deve ser informado.';
    END IF;

    UPDATE lancamentos_comissao
    SET status = 'ESTORNADO',
        justificativa_rejeicao = CONCAT('ESTORNO: ', p_motivo, ' (Auditado em ', CURRENT_TIMESTAMP, ')'),
        aprovado_por = p_admin_id,
        atualizado_em = CURRENT_TIMESTAMP
    WHERE id = p_lancamento_id
      AND status IN ('APROVADO', 'CONFERIDO');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Apenas comissões aprovadas ou conferidas (antes do fechamento do repasse bancário) podem ser estornadas.';
    END IF;
END;
$$;
