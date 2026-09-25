# PostgreSQL Backend — Design Spec

**Data:** 2026-09-24
**Projeto:** Sistema de Comissionamento Comercial
**Repo:** github.com/Praxis2026/comissoes

---

## Objetivo

Substituir a persistência em `localStorage` por um backend PostgreSQL real, mantendo a interface pública do `commission-context.tsx` intacta (componentes não mudam). O resultado é um sistema multi-usuário com dados compartilhados, sessão segura e auditoria persistente.

---

## Decisões arquiteturais

| Decisão | Escolha | Motivo |
|---|---|---|
| Auth | JWT em cookie HttpOnly | Sem dependências extras, seguro contra XSS |
| Cálculo de comissão | Híbrido | TypeScript para preview em tempo real, stored procedure para persistência |
| Estratégia de migração | Substituição total | `commission-context.tsx` é o único ponto de dados — trocar a implementação é cirúrgico |
| Biblioteca JWT | `jose` | Suportada no Edge Runtime do Next.js |
| Hash de senha | `bcrypt` (custo 12) | Padrão da indústria |
| Conexão banco | `pg` Pool singleton | Já é dependência do projeto |

---

## Seção 1 — Arquitetura em camadas

```
Browser (React)
  └── commission-context.tsx  ← estado React + fetch()
        │
        ▼ HTTP (cookie JWT automático)
Next.js API Routes  (/app/api/**)
  ├── auth/login, logout, me
  ├── usuarios/[id]
  ├── vendas/[id]
  ├── lancamentos/[id]/[acao]
  ├── repasses/
  ├── regras/[id]
  └── configuracoes/
        │
        ▼ pg Pool
lib/db.ts  ← singleton de conexão
        │
        ▼
PostgreSQL (EasyPanel)
  ├── stored procedures (cálculo e transições de status)
  └── triggers (auditoria, código VEN-XXXX, timestamps)
```

**Middleware (`middleware.ts`):** intercepta toda request, verifica cookie JWT com `JWT_SECRET`, injeta headers `X-User-Id` e `X-User-Perfil`. Retorna 401 para API ou redireciona para `/` (LoginScreen) para páginas sem sessão válida.

**Rotas públicas sem verificação:** `POST /api/auth/login`.

---

## Seção 2 — Auth (JWT + Cookie HttpOnly)

### Fluxo de login
```
POST /api/auth/login  { email, senha }
  → SELECT usuario WHERE email = $1
  → bcrypt.compare(senha, senha_hash)
  → signJwt({ sub: uuid, perfil, nome }, expiresIn: '8h')
  → Set-Cookie: jwt=<token>; HttpOnly; SameSite=Lax; Secure; Max-Age=28800
  → retorna { usuario } sem senha_hash
```

### Impersonação (admin navega como vendedor)
- Cookie secundário `jwt-impersonate` com UUID do usuário alvo
- Middleware injeta `X-Impersonating: <uuid>` quando presente
- Leituras respeitam o usuário impersonado
- Escritas sensíveis (repasse, estorno) validam perfil do admin original via `X-User-Perfil`

### Seed inicial
- Migration cria admin via env var `ADMIN_EMAIL` + `ADMIN_SENHA_INICIAL`
- Hash gerado com bcrypt no script de seed (`scripts/seed.mjs`)

### Arquivos novos
```
lib/auth.ts          — signJwt(), verifyJwt(), hashSenha(), verificarSenha()
middleware.ts        — proteção global de rotas
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
```

---

## Seção 3 — API Routes

Toda rota lê `X-User-Id` / `X-User-Perfil` dos headers injetados pelo middleware.

### Auth
```
POST  /api/auth/login              { email, senha } → { usuario }
POST  /api/auth/logout             → limpa cookie
GET   /api/auth/me                 → { usuario } com permissões
```

### Usuários
```
GET    /api/usuarios
POST   /api/usuarios               { nome, email, senha, perfil_nome, cargo, permissoes[] }
PUT    /api/usuarios/[id]          { nome, cargo, permissoes[], ... }
PATCH  /api/usuarios/[id]/ativo    { ativo: boolean }
DELETE /api/usuarios/[id]
```

### Vendas
```
GET    /api/vendas                 ?vendedor_id=&status=&page=
POST   /api/vendas                 { numero_documento, cliente_nome, data_venda,
                                     valor_total_venda, valor_entrada_valida,
                                     tipo_pagamento_entrada, procedimentos }
PUT    /api/vendas/[id]            mesmos campos
DELETE /api/vendas/[id]
```

### Lançamentos (máquina de estados — sem PUT genérico)
```
GET   /api/lancamentos             ?vendedor_id=&status=
POST  /api/lancamentos/[id]/submeter    → RASCUNHO → PENDENTE_APROVACAO
POST  /api/lancamentos/[id]/aprovar     → PENDENTE → APROVADO
POST  /api/lancamentos/[id]/rejeitar    { justificativa }
POST  /api/lancamentos/[id]/conferir    → APROVADO → CONFERIDO
POST  /api/lancamentos/[id]/estornar    { motivo, forma_compensacao }
```

### Repasses
```
GET   /api/repasses                ?vendedor_id=
POST  /api/repasses                { vendedor_id, lancamentos_ids[], data_repasse,
                                     comprovante_transacao, observacoes }
                                   → chama fn_liquidar_lote() via stored procedure
```

### Regras de comissão
```
GET    /api/regras                 ?vendedor_id=
POST   /api/regras                 { vendedor_id, tipo_comissao, valor_fixo,
                                     vigencia_inicio, faixas[] }
PUT    /api/regras/[id]            (encerra vigência anterior, cria nova)
DELETE /api/regras/[id]
```

### Configurações
```
GET   /api/configuracoes
PUT   /api/configuracoes           { nome_empresa, logo_url, percentual_residual,
                                     exigir_aprovacao_gestor, exigir_conferencia_vendedor,
                                     trava_estorno_apenas_admin, dias_alerta_expiracao_vigencia,
                                     procedimentos_catalogo[] }
GET   /api/configuracoes/meios-pagamento
POST  /api/configuracoes/meios-pagamento   { codigo, label, is_entrada_valida, ativo }
PUT   /api/configuracoes/meios-pagamento/[id]
DELETE /api/configuracoes/meios-pagamento/[id]
```

### Cálculo de preview (sem persistir)
```
POST  /api/calcular-comissao       { vendedor_id, valor_total_venda,
                                     valor_entrada_valida, data_venda }
                                   → usa commission-engine.ts no servidor
                                   → retorna CalculoComissaoResultado
```

---

## Seção 4 — Refactor do `commission-context.tsx`

### Interface pública: mudanças mínimas e localizadas
Os tipos e nomes de todas as funções do contexto permanecem iguais. A única mudança nos componentes é adicionar `await` nos `onClick` handlers que chamam funções mutadoras — cada componente muda em 1–3 linhas. Nenhuma lógica de UI, layout ou renderização é alterada.

### Carregamento inicial
```
antes:  localStorage.getItem(key) → parse → setState
depois: Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/vendas'),
          fetch('/api/lancamentos'),
          fetch('/api/repasses'),
          fetch('/api/regras'),
          fetch('/api/configuracoes'),
        ]) → popula todo o state de uma vez
```

Estado novo adicionado ao contexto:
```ts
isLoading: boolean      // true durante fetch inicial
syncError: string | null  // erro de rede para exibir no topo
```

### Funções mutadoras viram async
```ts
// antes
criarOuEditarVenda(dados): { sucesso: boolean, mensagem: string }

// depois
criarOuEditarVenda(dados): Promise<{ sucesso: boolean, mensagem: string }>
```
Componentes adicionam `await` nos `onClick` handlers — mudança trivial pois todos já são funções async.

### Padrão otimista por mutação
```
1. setState(novoValorOtimista)   ← UI responde imediatamente
2. await fetch('/api/...')       ← persiste no banco
   sucesso → confirma (nada a fazer, state já está certo)
   erro    → rollback setState(valorAnterior) + syncError = mensagem
```

### Auth
```
antes:  localStorage.getItem('auth_status') === 'true'
depois: GET /api/auth/me → 200 = autenticado, 401 = não autenticado

antes:  login() faz comparação de senha em memória
depois: POST /api/auth/login → seta cookie, retorna usuario
```

### Impersonação
```
antes:  setUsuarioAtualState(target) + localStorage
depois: POST /api/auth/impersonate { usuario_id }
        → seta cookie jwt-impersonate
        → middleware injeta X-Impersonating nas próximas requests
```

---

## Variáveis de ambiente necessárias (produção)

```env
PGHOST=postgres
PGPORT=5432
PGUSER=postgres
PGPASSWORD=<senha forte>
PGDATABASE=comissoes_db
DATABASE_URL=postgresql://postgres:<senha>@postgres:5432/comissoes_db

JWT_SECRET=<string aleatória 64+ chars>

ADMIN_EMAIL=admin@empresa.com
ADMIN_SENHA_INICIAL=<senha forte>
```

---

## Arquivos que surgem (novos)

```
lib/auth.ts
lib/db.ts
middleware.ts
scripts/seed.mjs
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/api/auth/me/route.ts
app/api/auth/impersonate/route.ts
app/api/usuarios/route.ts
app/api/usuarios/[id]/route.ts
app/api/usuarios/[id]/ativo/route.ts
app/api/vendas/route.ts
app/api/vendas/[id]/route.ts
app/api/lancamentos/route.ts
app/api/lancamentos/[id]/submeter/route.ts
app/api/lancamentos/[id]/aprovar/route.ts
app/api/lancamentos/[id]/rejeitar/route.ts
app/api/lancamentos/[id]/conferir/route.ts
app/api/lancamentos/[id]/estornar/route.ts
app/api/repasses/route.ts
app/api/regras/route.ts
app/api/regras/[id]/route.ts
app/api/configuracoes/route.ts
app/api/configuracoes/meios-pagamento/route.ts
app/api/configuracoes/meios-pagamento/[id]/route.ts
app/api/calcular-comissao/route.ts
```

## Arquivos que mudam (existentes)

```
lib/commission-context.tsx   — implementação interna (sem mudança de interface)
package.json                 — adiciona: jose, bcryptjs, @types/bcryptjs
```

## Arquivos que mudam minimamente (só await)

```
components/**   — apenas handlers onClick: adicionar await nas chamadas mutadoras
```

## Arquivos que não mudam

```
lib/commission-engine.ts     — cálculo de preview (intacto)
lib/types.ts                 — tipos (intactos)
lib/permissions.ts           — RBAC (intacto)
database/migrations/**       — schema já existe (intacto)
```

## Observação sobre stored procedures

O `POST /api/repasses` chama `fn_liquidar_lote()`. Se essa função não existir em migration 003, o plano de implementação deve incluir uma migration 005 que a cria. Verificar durante a implementação.
