-- ====================================================================
-- MIGRATION 004: VIEWS ANALÍTICAS E RELATÓRIOS DO SISTEMA
-- Banco: PostgreSQL 14+ / 15 / 16
-- Data: 2026-09-23
-- Descrição: Cria views otimizadas para o dashboard executivo,
--            conferência do vendedor e relatórios de repasses.
-- ====================================================================

-- 1. VIEW ANALÍTICA: Extrato Completo do Vendedor para Conferência (5.1)
CREATE OR REPLACE VIEW vw_extrato_vendedor_conferencia AS
SELECT 
    l.id AS lancamento_id,
    v.id AS venda_id,
    v.codigo_venda,
    v.numero_documento,
    v.data_venda,
    v.cliente_nome,
    v.procedimentos,
    v.valor_total_venda,
    v.valor_entrada_valida,
    v.tipo_pagamento_entrada,
    l.percentual_entrada_calculado,
    l.aliquota_ou_fixo_aplicado,
    l.valor_comissao_calculado,
    l.status AS status_lancamento,
    l.justificativa_rejeicao,
    l.aprovado_em,
    l.conferido_em,
    u_vend.id AS vendedor_id,
    u_vend.nome AS vendedor_nome,
    u_vend.email AS vendedor_email,
    u_adm.nome AS aprovador_nome,
    r.comprovante_transacao,
    r.data_repasse
FROM lancamentos_comissao l
INNER JOIN vendas v ON v.id = l.venda_id
INNER JOIN usuarios u_vend ON u_vend.id = l.vendedor_id
LEFT JOIN usuarios u_adm ON u_adm.id = l.aprovado_por
LEFT JOIN repasses r ON r.id = l.repasse_id;

-- 2. VIEW ANALÍTICA: Resumo Gerencial Consolidado por Vendedor
CREATE OR REPLACE VIEW vw_resumo_gerencial_vendedores AS
SELECT 
    u.id AS vendedor_id,
    u.nome AS vendedor_nome,
    u.email AS vendedor_email,
    COUNT(v.id) AS total_vendas_cadastradas,
    COALESCE(SUM(v.valor_total_venda), 0.00) AS volume_total_vendido,
    COALESCE(SUM(v.valor_entrada_valida), 0.00) AS total_entradas_captadas,
    COALESCE(SUM(l.valor_comissao_calculado), 0.00) AS total_comissoes_geradas,
    COALESCE(SUM(CASE WHEN l.status = 'LIQUIDADO' THEN l.valor_comissao_calculado ELSE 0 END), 0.00) AS total_comissoes_pagas,
    COALESCE(SUM(CASE WHEN l.status IN ('APROVADO', 'CONFERIDO') THEN l.valor_comissao_calculado ELSE 0 END), 0.00) AS total_comissoes_a_pagar,
    COUNT(CASE WHEN l.status = 'PENDENTE_APROVACAO' THEN 1 END) AS qtd_pendente_aprovacao,
    COUNT(CASE WHEN l.status = 'RASCUNHO' THEN 1 END) AS qtd_rascunhos
FROM usuarios u
LEFT JOIN vendas v ON v.vendedor_id = u.id
LEFT JOIN lancamentos_comissao l ON l.venda_id = v.id
WHERE u.perfil_id = (SELECT id FROM perfis WHERE codigo = 'VENDEDOR' LIMIT 1)
GROUP BY u.id, u.nome, u.email;

-- 3. VIEW ANALÍTICA: Lotes de Repasse Financeiro com Detalhamento
CREATE OR REPLACE VIEW vw_lotes_repasse_financeiro AS
SELECT 
    r.id AS repasse_id,
    r.numero_sequencial,
    r.data_repasse,
    r.valor_total_repassado,
    r.comprovante_transacao,
    r.observacoes,
    r.criado_em,
    u_vend.nome AS vendedor_nome,
    u_vend.email AS vendedor_email,
    u_adm.nome AS registrado_por_nome,
    COUNT(l.id) AS quantidade_contratos_liquidados
FROM repasses r
INNER JOIN usuarios u_vend ON u_vend.id = r.vendedor_id
LEFT JOIN usuarios u_adm ON u_adm.id = r.registrado_por
LEFT JOIN lancamentos_comissao l ON l.repasse_id = r.id
GROUP BY r.id, r.numero_sequencial, r.data_repasse, r.valor_total_repassado, r.comprovante_transacao, r.observacoes, r.criado_em, u_vend.nome, u_vend.email, u_adm.nome;
