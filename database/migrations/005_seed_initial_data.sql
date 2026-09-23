-- ====================================================================
-- MIGRATION 005: CARGA INICIAL DE DADOS (SEED DATA)
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Descrição: Insere perfis padrão, usuários iniciais com senhas,
--            permissões RBAC, catálogo de meios de pagamento,
--            regras de comissão vigentes e faixas escalonadas.
-- ====================================================================

-- 1. PERFIS DE ACESSO RBAC
INSERT INTO perfis (codigo, nome, descricao) VALUES
('ADMINISTRADOR', 'Administrador Geral', 'Acesso total, aprovações, gestão de usuários, regras e fechamento de repasses.'),
('VENDEDOR', 'Vendedor Comercial', 'Lançamento de propostas, gestão de rascunhos, submissão e conferência de comissões.'),
('GERENTE', 'Gerente Comercial', 'Acompanhamento do time de vendas e pré-aprovação de lançamentos.'),
('AUDITOR', 'Auditor de Controladoria', 'Auditoria financeira e compliance sem permissão de alteração.')
ON CONFLICT (codigo) DO NOTHING;

-- 2. USUÁRIOS INICIAIS
-- Senhas criptografadas usando pgcrypto crypt() ou hash padrão
INSERT INTO usuarios (id, perfil_id, nome, email, senha_hash, cargo, ativo) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    (SELECT id FROM perfis WHERE codigo = 'ADMINISTRADOR'),
    'João Silva',
    'admin@clinica.com',
    crypt('admin123', gen_salt('bf', 10)),
    'Diretor Comercial & Admin',
    TRUE
),
(
    'b0000000-0000-0000-0000-000000000002',
    (SELECT id FROM perfis WHERE codigo = 'VENDEDOR'),
    'Maria Oliveira',
    'vendedor1@clinica.com',
    crypt('vendedor123', gen_salt('bf', 10)),
    'Consultora de Vendas Sênior',
    TRUE
),
(
    'c0000000-0000-0000-0000-000000000003',
    (SELECT id FROM perfis WHERE codigo = 'VENDEDOR'),
    'Carlos Santos',
    'vendedor2@clinica.com',
    crypt('vendedor123', gen_salt('bf', 10)),
    'Consultor Comercial',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- 3. PERMISSÕES RBAC POR MÓDULO PARA O ADMINISTRADOR
INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
VALUES 
('a0000000-0000-0000-0000-000000000001', 'dashboard', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'minhas_vendas', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'conferencia_vendedor', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'aprovacoes', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'repasses_admin', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'importar_erp', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'configuracoes', TRUE, TRUE, TRUE, TRUE),
('a0000000-0000-0000-0000-000000000001', 'stored_procedure', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (usuario_id, modulo) DO NOTHING;

-- PERMISSÕES RBAC PARA O VENDEDOR MARIA OLIVEIRA
INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
VALUES 
('b0000000-0000-0000-0000-000000000002', 'dashboard', TRUE, FALSE, FALSE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'minhas_vendas', TRUE, TRUE, TRUE, TRUE),
('b0000000-0000-0000-0000-000000000002', 'conferencia_vendedor', TRUE, TRUE, TRUE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'aprovacoes', FALSE, FALSE, FALSE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'repasses_admin', FALSE, FALSE, FALSE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'importar_erp', FALSE, FALSE, FALSE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'configuracoes', FALSE, FALSE, FALSE, FALSE),
('b0000000-0000-0000-0000-000000000002', 'stored_procedure', FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (usuario_id, modulo) DO NOTHING;

-- 4. CATÁLOGO DE MEIOS DE PAGAMENTO
INSERT INTO meios_pagamento (id, codigo, label, descricao, is_entrada_valida, ativo, sistema_padrao, ordem) VALUES
('mp-pix', 'PIX', 'PIX Instantâneo', 'Transferência instantânea na conta da clínica com liquidação em D+0.', TRUE, TRUE, TRUE, 1),
('mp-dinheiro', 'DINHEIRO', 'Dinheiro em Espécie', 'Pagamento físico em moeda corrente recolhido imediatamente no caixa.', TRUE, TRUE, TRUE, 2),
('mp-debito', 'DEBITO', 'Cartão de Débito', 'Liquidação direta em até 1 dia útil com garantia da adquirente.', TRUE, TRUE, TRUE, 3),
('mp-credito-avista', 'CREDITO_AVISTA', 'Cartão de Crédito à Vista (1x)', 'Crédito sem parcelamento, elegível para antecipação e garantia.', TRUE, TRUE, TRUE, 4),
('mp-boleto', 'BOLETO', 'Boleto Bancário', 'Compensação sujeita a D+1 a D+3 e risco de inadimplência.', FALSE, TRUE, TRUE, 5),
('mp-credito-parcelado', 'CREDITO_PARCELADO', 'Cartão de Crédito Parcelado (2x ou +)', 'Parcelamento futuro; não pontua como entrada líquida imediata.', FALSE, TRUE, TRUE, 6),
('mp-sem-entrada', 'SEM_ENTRADA', 'Sem Entrada (100% a Prazo)', 'Contrato faturado a prazo sem aporte inicial em caixa.', FALSE, TRUE, TRUE, 7)
ON CONFLICT (codigo) DO UPDATE 
SET label = EXCLUDED.label,
    is_entrada_valida = EXCLUDED.is_entrada_valida;

-- 5. CONFIGURAÇÕES GLOBAIS DO SISTEMA
INSERT INTO configuracoes_sistema (
    id,
    nome_empresa,
    logo_url,
    percentual_comissao_padrao_residual,
    exigir_aprovacao_gestor,
    exigir_conferencia_vendedor,
    trava_estorno_apenas_admin,
    dias_alerta_expiracao_vigencia,
    procedimentos_catalogo
) VALUES (
    'GLOBAL_CONFIG',
    'Comissões Pro',
    NULL,
    0.00,
    TRUE,
    TRUE,
    TRUE,
    30,
    '[
        "Harmonização Facial e Aplicação de Preenchedor",
        "Implante Dentário Conexão Cônica + Prótese Cerâmica",
        "Tratamento a Laser Fracionado 5 Sessões",
        "Consulta Especializada e Avaliação Clínica Integral",
        "Cirurgia Plástica Reparadora com Acompanhamento",
        "Preenchimento Labial e Bioestimulador de Colágeno",
        "Protocolo de Lentes em Resina Composta 10 Elementos",
        "Exames Genéticos e Painel Preventivo Molecular"
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 6. REGRAS DE COMISSÃO VIGENTES (ESCALONADO POR ENTRADA)
INSERT INTO regras_comissao_vendedor (
    id,
    vendedor_id,
    tipo_comissao,
    valor_fixo,
    vigencia_inicio,
    vigencia_fim
) VALUES 
(
    'r0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002', -- Maria Oliveira
    'ESCALONADO_ENTRADA',
    0.00,
    '2026-01-01',
    NULL -- Vigência aberta e ativa
),
(
    'r0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003', -- Carlos Santos
    'ESCALONADO_ENTRADA',
    0.00,
    '2026-01-01',
    NULL -- Vigência aberta e ativa
)
ON CONFLICT (id) DO NOTHING;

-- 7. FAIXAS ESCALONADAS DE ENTRADA CONTRATUAIS
-- Faixa 1: Entrada >= 30.00% -> Comissão de 1.00% sobre o total da venda
-- Faixa 2: Entrada entre 10.00% e 29.99% -> Comissão de 0.50% sobre o total
INSERT INTO faixas_entrada_comissao (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
SELECT 'r0000000-0000-0000-0000-000000000001', 30.00, NULL, 1.00
WHERE NOT EXISTS (SELECT 1 FROM faixas_entrada_comissao WHERE regra_id = 'r0000000-0000-0000-0000-000000000001' AND percentual_entrada_min = 30.00);

INSERT INTO faixas_entrada_comissao (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
SELECT 'r0000000-0000-0000-0000-000000000001', 10.00, 29.99, 0.50
WHERE NOT EXISTS (SELECT 1 FROM faixas_entrada_comissao WHERE regra_id = 'r0000000-0000-0000-0000-000000000001' AND percentual_entrada_min = 10.00);

INSERT INTO faixas_entrada_comissao (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
SELECT 'r0000000-0000-0000-0000-000000000002', 30.00, NULL, 1.00
WHERE NOT EXISTS (SELECT 1 FROM faixas_entrada_comissao WHERE regra_id = 'r0000000-0000-0000-0000-000000000002' AND percentual_entrada_min = 30.00);

INSERT INTO faixas_entrada_comissao (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
SELECT 'r0000000-0000-0000-0000-000000000002', 10.00, 29.99, 0.50
WHERE NOT EXISTS (SELECT 1 FROM faixas_entrada_comissao WHERE regra_id = 'r0000000-0000-0000-0000-000000000002' AND percentual_entrada_min = 10.00);

-- 8. EXEMPLOS DE VENDAS INICIAIS E DISPARO DO CÁLCULO VIA STORED PROCEDURE
DO $$
DECLARE
    v_venda1_id UUID := 'd0000000-0000-0000-0000-000000000001';
    v_venda2_id UUID := 'd0000000-0000-0000-0000-000000000002';
BEGIN
    -- Venda 1: R$ 15.000 com 33.33% de entrada via PIX (elegível a 1%)
    IF NOT EXISTS (SELECT 1 FROM vendas WHERE id = v_venda1_id) THEN
        INSERT INTO vendas (
            id,
            numero_documento,
            vendedor_id,
            cliente_nome,
            procedimentos,
            data_venda,
            valor_total_venda,
            valor_entrada_valida,
            tipo_pagamento_entrada
        ) VALUES (
            v_venda1_id,
            'DOC-2026-001',
            'b0000000-0000-0000-0000-000000000002',
            'Beatriz Mendonça',
            'Harmonização Facial e Aplicação de Preenchedor',
            '2026-09-10',
            15000.00,
            5000.00,
            'PIX'
        );

        -- Executa a Stored Procedure de cálculo
        PERFORM sp_calcular_comissao_venda(v_venda1_id);
    END IF;

    -- Venda 2: R$ 8.000 com 20% de entrada via DÉBITO (elegível a 0.5%)
    IF NOT EXISTS (SELECT 1 FROM vendas WHERE id = v_venda2_id) THEN
        INSERT INTO vendas (
            id,
            numero_documento,
            vendedor_id,
            cliente_nome,
            procedimentos,
            data_venda,
            valor_total_venda,
            valor_entrada_valida,
            tipo_pagamento_entrada
        ) VALUES (
            v_venda2_id,
            'DOC-2026-002',
            'b0000000-0000-0000-0000-000000000002',
            'Renato Gusmão',
            'Implante Dentário Conexão Cônica + Prótese Cerâmica',
            '2026-09-15',
            8000.00,
            1600.00,
            'DEBITO'
        );

        -- Executa a Stored Procedure de cálculo
        PERFORM sp_calcular_comissao_venda(v_venda2_id);
    END IF;
END $$;
