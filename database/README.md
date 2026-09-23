# Estrutura de Migrations e Implantação PostgreSQL

Este diretório contém os scripts de migration e implantação do banco de dados relacional **PostgreSQL** para o **Sistema de Comissionamento Comercial**.

---

## 📁 Estrutura de Arquivos

```text
├── database/
│   ├── migrations/
│   │   ├── 001_create_extensions_and_enums.sql   # Extensões (UUID, pgcrypto), ENUMs e tabela de controle
│   │   ├── 002_create_core_tables.sql            # Tabelas centrais (RBAC, vendas, regras, comissões, índices)
│   │   ├── 003_create_stored_procedures_and_triggers.sql # Stored Procedures (plpgsql) e triggers de auditoria
│   │   ├── 004_create_views.sql                  # Views para relatórios e extrato analítico do vendedor
│   │   └── 005_seed_initial_data.sql             # Perfis, usuários iniciais, faixas de entrada e regras
│   ├── deploy_full_database.sql                  # Script consolidado em lote único (All-In-One)
│   └── README.md                                 # Guia passo a passo de implantação
├── scripts/
│   ├── migrate.mjs                               # Executor automatizado em Node.js (cria banco se não existir)
│   ├── deploy-local.sh                           # Script para Linux / macOS
│   └── deploy-local.bat                          # Script para Windows
└── docker-compose.yml                            # Container PostgreSQL 16 pronto para uso
```

---

## 🚀 Como Executar a Implantação no Banco Local

Você tem **3 opções práticas** para criar e migrar o banco de dados no seu ambiente local:

### Opção 1: Via Node.js (`npm run migrate`) - Mais recomendado

O executor automatizado em Node.js detecta o PostgreSQL, verifica se o banco `comissoes_db` existe, cria o banco caso não exista, e aplica as migrations pendentes em ordem transacional.

1. Configure as variáveis de conexão no `.env` ou `.env.local` (ou deixe o padrão do PostgreSQL local):
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/comissoes_db
   ```
2. Execute o comando:
   ```bash
   npm run migrate
   ```
3. Para checar o status de quais migrations foram aplicadas:
   ```bash
   npm run migrate:status
   ```

---

### Opção 2: Via Docker Compose (Zero Configuração)

Se você tem o Docker instalado, você não precisa instalar o PostgreSQL manualmente:

1. Inicie o container:
   ```bash
   docker compose up -d
   ```
2. O container iniciará o **PostgreSQL 16** na porta `5432` e executará todas as migrations da pasta `database/migrations` automaticamente durante o primeiro boot!
3. Credenciais padrão:
   - **Host:** `localhost`
   - **Porta:** `5432`
   - **Banco:** `comissoes_db`
   - **Usuário:** `postgres`
   - **Senha:** `postgrespassword`

---

### Opção 3: Via `psql` (Linha de Comando Nativa do PostgreSQL)

Se você prefere executar diretamente pelo cliente oficial do PostgreSQL:

1. Crie o banco de dados no PostgreSQL:
   ```bash
   psql -U postgres -c "CREATE DATABASE comissoes_db ENCODING 'UTF8';"
   ```
2. Execute o script consolidado:
   ```bash
   psql -U postgres -d comissoes_db -f database/deploy_full_database.sql
   ```
   *Ou execute migration por migration na ordem dos prefixos numéricos (001 -> 005).*

---

## 🔑 Usuários Iniciais Criados no Seed (Migration 005)

| Perfil | Nome | E-mail | Senha Padrão |
| :--- | :--- | :--- | :--- |
| **Administrador** | João Silva | `admin@clinica.com` | `admin123` |
| **Vendedor** | Maria Oliveira | `vendedor1@clinica.com` | `vendedor123` |
| **Vendedor** | Carlos Santos | `vendedor2@clinica.com` | `vendedor123` |

---

## 🧪 Testando as Stored Procedures Diretamente no SQL

Após a implantação, você pode testar o cálculo de comissão de qualquer venda cadastrada:

```sql
-- Calcula a comissão da venda aplicando as faixas vigentes e percentuais de entrada:
SELECT * FROM sp_calcular_comissao_venda('d0000000-0000-0000-0000-000000000001');

-- Consulta o extrato para conferência do vendedor (Requisito 5.1):
SELECT * FROM vw_extrato_vendedor_conferencia WHERE vendedor_nome = 'Maria Oliveira';
```
