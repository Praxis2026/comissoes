# PostgreSQL Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage persistence with a real PostgreSQL backend via Next.js API routes, JWT cookie auth, and refactored commission-context.tsx — no component UI changes.

**Architecture:** JWT in HttpOnly cookie (jose, Edge-compatible); pg Pool singleton for all DB access; stored procedures handle state transitions and commission calculation at persist time; TypeScript commission-engine.ts remains for client-side preview. The commission-context.tsx internal implementation changes from localStorage to fetch() while its public interface stays identical.

**Tech Stack:** Next.js 15 App Router, pg, jose, bcryptjs, PostgreSQL 16 with existing stored procedures (sp_calcular_comissao_venda, sp_liquidar_repasse_lote, sp_submeter_aprovacao, sp_aprovar_comissao, sp_rejeitar_comissao, sp_conferir_comissao, sp_estornar_comissao)

**Spec:** `docs/superpowers/specs/2026-09-24-postgresql-backend-design.md`

---

## File Map

**New files:**
```
lib/db.ts
lib/auth.ts
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

**Modified files:**
```
package.json                  adds: jose, bcryptjs, @types/bcryptjs
lib/commission-context.tsx    removes localStorage; adds fetch() calls
.env.example                  adds: JWT_SECRET, ADMIN_EMAIL, ADMIN_SENHA_INICIAL
docker-compose.yml            adds new env vars to app service
components/AdminRepasseBatch.tsx   add await
components/AdminApprovals.tsx      add await
components/VendorSalesList.tsx     add await
components/SalesEntryModal.tsx     add await
components/UserManagement.tsx      add await
components/BrandingSettings.tsx    add await
components/CommissionSettings.tsx  add await
components/VendorConferenceReport.tsx add await
```

---

## Task 1: Install dependencies + lib/db.ts + lib/auth.ts

**Files:**
- Modify: `package.json`
- Create: `lib/db.ts`
- Create: `lib/auth.ts`

- [ ] **Step 1: Install packages**

```bash
npm install jose bcryptjs
npm install --save-dev @types/bcryptjs
```

Expected: packages added to node_modules, package-lock.json updated.

- [ ] **Step 2: Create lib/db.ts**

```typescript
// lib/db.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgrespassword',
  database: process.env.PGDATABASE || 'comissoes_db',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export default pool;
export const query = (text: string, params?: unknown[]) => pool.query(text, params);
```

- [ ] **Step 3: Create lib/auth.ts (JWT only — Edge Runtime compatible, no bcrypt)**

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'dev-secret-CHANGE-IN-PRODUCTION-min-32-chars'
  );

export interface JwtPayload {
  sub: string;   // UUID do usuário
  perfil: string; // 'ADMINISTRADOR' | 'VENDEDOR' | ...
  nome: string;
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors (or only pre-existing errors unrelated to new files).

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/auth.ts package.json package-lock.json
git commit -m "feat: add pg pool singleton and JWT auth helpers"
```

---

## Task 2: middleware.ts

**Files:**
- Create: `middleware.ts` (root of project, same level as `app/`)

- [ ] **Step 1: Create middleware.ts**

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from './lib/auth';

const PUBLIC_API_PATHS = ['/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('jwt')?.value;
  const payload = token ? await verifyJwt(token) : null;

  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set('X-User-Id', payload.sub);
  res.headers.set('X-User-Perfil', payload.perfil);
  res.headers.set('X-User-Nome', payload.nome);

  const impToken = req.cookies.get('jwt-impersonate')?.value;
  if (impToken) {
    const impPayload = await verifyJwt(impToken);
    if (impPayload) {
      res.headers.set('X-Impersonating', impPayload.sub);
    }
  }

  return res;
}

export const config = {
  matcher: ['/api/:path*'],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Next.js middleware for JWT cookie auth"
```

---

## Task 3: Seed script + env vars

**Files:**
- Create: `scripts/seed.mjs`
- Modify: `.env.example`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create scripts/seed.mjs**

```javascript
// scripts/seed.mjs
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgrespassword',
  database: process.env.PGDATABASE || 'comissoes_db',
});

async function seed() {
  const client = await pool.connect();
  try {
    // Verificar se já existe um admin
    const existing = await client.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [process.env.ADMIN_EMAIL || 'admin@empresa.com']
    );

    if (existing.rows.length > 0) {
      console.log('Admin já existe, pulando seed.');
      return;
    }

    const senhaHash = await bcrypt.hash(
      process.env.ADMIN_SENHA_INICIAL || 'admin123',
      12
    );

    // Buscar perfil ADMINISTRADOR
    const perfilRes = await client.query(
      "SELECT id FROM perfis WHERE codigo = 'ADMINISTRADOR'"
    );
    if (perfilRes.rows.length === 0) {
      throw new Error('Perfil ADMINISTRADOR não encontrado. Execute as migrations primeiro.');
    }
    const perfilId = perfilRes.rows[0].id;

    // Criar admin
    const adminRes = await client.query(
      `INSERT INTO usuarios (perfil_id, nome, email, senha_hash, cargo, ativo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [perfilId, 'Administrador', process.env.ADMIN_EMAIL || 'admin@empresa.com', senhaHash, 'Administrador do Sistema']
    );
    const adminId = adminRes.rows[0].id;

    // Criar permissões completas para o admin
    const modulos = ['dashboard','minhas_vendas','conferencia_vendedor','aprovacoes','repasses_admin','importar_erp','configuracoes'];
    for (const modulo of modulos) {
      await client.query(
        `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
         VALUES ($1, $2, true, true, true, true)`,
        [adminId, modulo]
      );
    }

    // Garantir configurações globais
    await client.query(
      `INSERT INTO configuracoes_sistema (id, nome_empresa)
       VALUES ('GLOBAL_CONFIG', $1)
       ON CONFLICT (id) DO NOTHING`,
      [process.env.NOME_EMPRESA || 'Praxis Comissionamentos']
    );

    // Seed meios de pagamento padrão
    const meiosPadrao = [
      { id: 'mp-pix', codigo: 'PIX', label: 'PIX Instantâneo', descricao: 'Transferência instantânea', is_entrada_valida: true, sistema_padrao: true, ordem: 1 },
      { id: 'mp-dinheiro', codigo: 'DINHEIRO', label: 'Dinheiro em Espécie', descricao: 'Pagamento físico em moeda corrente', is_entrada_valida: true, sistema_padrao: true, ordem: 2 },
      { id: 'mp-debito', codigo: 'DEBITO', label: 'Cartão de Débito', descricao: 'Liquidação bancária direta', is_entrada_valida: true, sistema_padrao: true, ordem: 3 },
      { id: 'mp-credito-avista', codigo: 'CREDITO_AVISTA', label: 'Cartão de Crédito à Vista (1x)', descricao: 'Operação de crédito sem parcelamento', is_entrada_valida: true, sistema_padrao: true, ordem: 4 },
      { id: 'mp-boleto', codigo: 'BOLETO', label: 'Boleto Bancário', descricao: 'Compensação sujeita a D+1 a D+3', is_entrada_valida: false, sistema_padrao: true, ordem: 5 },
      { id: 'mp-credito-parcelado', codigo: 'CREDITO_PARCELADO', label: 'Cartão de Crédito Parcelado (2x ou +)', descricao: 'Parcelamento futuro', is_entrada_valida: false, sistema_padrao: true, ordem: 6 },
      { id: 'mp-sem-entrada', codigo: 'SEM_ENTRADA', label: 'Sem Entrada (100% a Prazo)', descricao: 'Venda integralmente a prazo', is_entrada_valida: false, sistema_padrao: true, ordem: 7 },
    ];

    for (const m of meiosPadrao) {
      await client.query(
        `INSERT INTO meios_pagamento (id, codigo, label, descricao, is_entrada_valida, ativo, sistema_padrao, ordem)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [m.id, m.codigo, m.label, m.descricao, m.is_entrada_valida, m.sistema_padrao, m.ordem]
      );
    }

    console.log(`✓ Admin criado: ${process.env.ADMIN_EMAIL || 'admin@empresa.com'}`);
    console.log('✓ Configurações globais e meios de pagamento inicializados.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to package.json**

In `package.json`, add inside `"scripts"`:
```json
"seed": "node scripts/seed.mjs"
```

- [ ] **Step 3: Update .env.example**

Add at the end of `.env.example`:
```env
# Autenticação JWT
JWT_SECRET="gere-com-openssl-rand-base64-64-aqui"

# Seed do usuário administrador inicial
ADMIN_EMAIL="admin@empresa.com"
ADMIN_SENHA_INICIAL="senha-forte-aqui"
NOME_EMPRESA="Praxis Comissionamentos"
```

- [ ] **Step 4: Update docker-compose.yml app service env**

In `docker-compose.yml`, inside `app.environment`, add:
```yaml
      JWT_SECRET: ${JWT_SECRET}
      ADMIN_EMAIL: ${ADMIN_EMAIL:-admin@empresa.com}
      ADMIN_SENHA_INICIAL: ${ADMIN_SENHA_INICIAL}
      NOME_EMPRESA: ${NOME_EMPRESA:-Praxis Comissionamentos}
```

- [ ] **Step 5: Create local .env for development**

Create `.env` (not committed — already in .gitignore):
```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgrespassword
PGDATABASE=comissoes_db
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/comissoes_db
JWT_SECRET=dev-secret-CHANGE-IN-PRODUCTION-min-32-chars-xxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=admin@empresa.com
ADMIN_SENHA_INICIAL=admin123
NOME_EMPRESA=Praxis Comissionamentos
```

- [ ] **Step 6: Start local postgres and run migrations + seed**

```bash
docker compose up postgres -d
node scripts/migrate.mjs
node scripts/seed.mjs
```

Expected:
```
✓ Admin criado: admin@empresa.com
✓ Configurações globais e meios de pagamento inicializados.
```

- [ ] **Step 7: Commit**

```bash
git add scripts/seed.mjs package.json .env.example docker-compose.yml
git commit -m "feat: add seed script and env vars for JWT + admin"
```

---

## Task 4: Auth API routes (login, logout, me, impersonate)

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `app/api/auth/impersonate/route.ts`

- [ ] **Step 1: Create app/api/auth/login/route.ts**

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signJwt } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) {
      return NextResponse.json({ erro: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const result = await query(
      `SELECT u.*, p.codigo AS perfil_nome
       FROM usuarios u
       JOIN perfis p ON u.perfil_id = p.id
       WHERE LOWER(u.email) = LOWER($1) AND u.ativo = true`,
      [email]
    );

    const usuario = result.rows[0];
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      return NextResponse.json({ erro: 'Email ou senha incorretos' }, { status: 401 });
    }

    const permResult = await query(
      'SELECT modulo, acesso, inserir, alterar, excluir FROM usuario_permissoes WHERE usuario_id = $1',
      [usuario.id]
    );

    const token = await signJwt({ sub: usuario.id, perfil: usuario.perfil_nome, nome: usuario.nome });

    const usuarioPublico = {
      id: usuario.id,
      perfil_id: usuario.perfil_id,
      perfil_nome: usuario.perfil_nome,
      nome: usuario.nome,
      email: usuario.email,
      cargo: usuario.cargo,
      ativo: usuario.ativo,
      criado_em: usuario.criado_em,
      permissoes: permResult.rows,
    };

    const res = NextResponse.json({ usuario: usuarioPublico });
    res.cookies.set('jwt', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('/api/auth/login:', err);
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create app/api/auth/logout/route.ts**

```typescript
// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('jwt', '', { maxAge: 0, path: '/' });
  res.cookies.set('jwt-impersonate', '', { maxAge: 0, path: '/' });
  return res;
}
```

- [ ] **Step 3: Create app/api/auth/me/route.ts**

```typescript
// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('X-User-Id');
  const impersonating = req.headers.get('X-Impersonating');
  const effectiveId = impersonating || userId;

  if (!effectiveId) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  }

  const result = await query(
    `SELECT u.*, p.codigo AS perfil_nome
     FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     WHERE u.id = $1 AND u.ativo = true`,
    [effectiveId]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
  }

  const permResult = await query(
    'SELECT modulo, acesso, inserir, alterar, excluir FROM usuario_permissoes WHERE usuario_id = $1',
    [effectiveId]
  );

  const u = result.rows[0];
  return NextResponse.json({
    usuario: {
      id: u.id,
      perfil_id: u.perfil_id,
      perfil_nome: u.perfil_nome,
      nome: u.nome,
      email: u.email,
      cargo: u.cargo,
      ativo: u.ativo,
      criado_em: u.criado_em,
      permissoes: permResult.rows,
    },
    adminOriginalId: impersonating ? userId : null,
  });
}
```

- [ ] **Step 4: Create app/api/auth/impersonate/route.ts**

```typescript
// app/api/auth/impersonate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { signJwt } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const adminPerfil = req.headers.get('X-User-Perfil');
  const adminId = req.headers.get('X-User-Id');

  if (adminPerfil !== 'ADMINISTRADOR') {
    return NextResponse.json({ erro: 'Apenas administradores podem impersonar usuários' }, { status: 403 });
  }

  const { usuario_id } = await req.json();
  const result = await query(
    `SELECT u.*, p.codigo AS perfil_nome FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     WHERE u.id = $1 AND u.ativo = true`,
    [usuario_id]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ erro: 'Usuário alvo não encontrado' }, { status: 404 });
  }

  if (usuario_id === adminId) {
    return NextResponse.json({ erro: 'Não é possível impersonar a si mesmo' }, { status: 400 });
  }

  const u = result.rows[0];
  const token = await signJwt({ sub: u.id, perfil: u.perfil_nome, nome: u.nome });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('jwt-impersonate', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('jwt-impersonate', '', { maxAge: 0, path: '/' });
  return res;
}
```

- [ ] **Step 5: Test login manually**

Start the dev server: `npm run dev`

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","senha":"admin123"}' | jq .
```

Expected: `{ "usuario": { "id": "...", "perfil_nome": "ADMINISTRADOR", ... } }`

```bash
curl -s -b cookies.txt http://localhost:3000/api/auth/me | jq .
```

Expected: same usuario object.

```bash
curl -s -b cookies.txt -X POST http://localhost:3000/api/auth/logout
curl -s -b cookies.txt http://localhost:3000/api/auth/me
```

Expected: `{ "erro": "Não autenticado" }` with status 401.

- [ ] **Step 6: Commit**

```bash
git add app/api/auth/
git commit -m "feat: add auth API routes (login, logout, me, impersonate)"
```

---

## Task 5: Usuarios API routes

**Files:**
- Create: `app/api/usuarios/route.ts`
- Create: `app/api/usuarios/[id]/route.ts`
- Create: `app/api/usuarios/[id]/ativo/route.ts`

- [ ] **Step 1: Create app/api/usuarios/route.ts**

```typescript
// app/api/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import pool from '@/lib/db';

export async function GET() {
  const result = await query(
    `SELECT u.id, u.perfil_id, p.codigo AS perfil_nome, u.nome, u.email, u.cargo,
            u.ativo, u.criado_em,
            json_agg(json_build_object(
              'modulo', up.modulo, 'acesso', up.acesso,
              'inserir', up.inserir, 'alterar', up.alterar, 'excluir', up.excluir
            )) FILTER (WHERE up.modulo IS NOT NULL) AS permissoes
     FROM usuarios u
     JOIN perfis p ON u.perfil_id = p.id
     LEFT JOIN usuario_permissoes up ON up.usuario_id = u.id
     GROUP BY u.id, p.codigo
     ORDER BY u.criado_em`
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { nome, email, senha, perfil_nome, cargo, permissoes } = await req.json();
  if (!nome || !email || !senha || !perfil_nome) {
    return NextResponse.json({ erro: 'nome, email, senha e perfil_nome são obrigatórios' }, { status: 400 });
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const perfilRes = await client.query(
      'SELECT id FROM perfis WHERE codigo = $1', [perfil_nome]
    );
    if (!perfilRes.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ erro: 'Perfil não encontrado' }, { status: 400 });
    }

    const userRes = await client.query(
      `INSERT INTO usuarios (perfil_id, nome, email, senha_hash, cargo)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, cargo, ativo, criado_em`,
      [perfilRes.rows[0].id, nome.trim(), email.trim().toLowerCase(), senhaHash, cargo?.trim() || null]
    );
    const novoUsuario = userRes.rows[0];

    const modulos = ['dashboard','minhas_vendas','conferencia_vendedor','aprovacoes','repasses_admin','importar_erp','configuracoes'];
    const permsMap: Record<string, { acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }> = {};
    (permissoes || []).forEach((p: { modulo: string; acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }) => {
      permsMap[p.modulo] = p;
    });

    for (const modulo of modulos) {
      const p = permsMap[modulo] || { acesso: false, inserir: false, alterar: false, excluir: false };
      await client.query(
        `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [novoUsuario.id, modulo, p.acesso, p.inserir, p.alterar, p.excluir]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...novoUsuario, perfil_nome, permissoes: permissoes || [] }, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('unique') || msg.includes('usuarios_email_key')) {
      return NextResponse.json({ erro: 'Email já cadastrado' }, { status: 409 });
    }
    console.error('/api/usuarios POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Create app/api/usuarios/[id]/route.ts**

```typescript
// app/api/usuarios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool, { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, cargo, senha, perfil_nome, permissoes } = await req.json();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (perfil_nome) {
      const perfilRes = await client.query('SELECT id FROM perfis WHERE codigo = $1', [perfil_nome]);
      if (perfilRes.rows[0]) {
        await client.query('UPDATE usuarios SET perfil_id = $1 WHERE id = $2', [perfilRes.rows[0].id, id]);
      }
    }

    const updates: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (nome) { updates.push(`nome = $${i++}`); vals.push(nome.trim()); }
    if (cargo !== undefined) { updates.push(`cargo = $${i++}`); vals.push(cargo?.trim() || null); }
    if (senha) {
      updates.push(`senha_hash = $${i++}`);
      vals.push(await bcrypt.hash(senha, 12));
    }
    if (updates.length > 0) {
      vals.push(id);
      await client.query(`UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${i}`, vals);
    }

    if (permissoes) {
      for (const p of permissoes as { modulo: string; acesso: boolean; inserir: boolean; alterar: boolean; excluir: boolean }[]) {
        await client.query(
          `INSERT INTO usuario_permissoes (usuario_id, modulo, acesso, inserir, alterar, excluir)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (usuario_id, modulo) DO UPDATE
           SET acesso=$3, inserir=$4, alterar=$5, excluir=$6`,
          [id, p.modulo, p.acesso, p.inserir, p.alterar, p.excluir]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('/api/usuarios/[id] PUT:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/usuarios/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create app/api/usuarios/[id]/ativo/route.ts**

```typescript
// app/api/usuarios/[id]/ativo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ativo } = await req.json();
  await query('UPDATE usuarios SET ativo = $1 WHERE id = $2', [Boolean(ativo), id]);
  return NextResponse.json({ ok: true, ativo: Boolean(ativo) });
}
```

- [ ] **Step 4: Test**

```bash
curl -s -b cookies.txt http://localhost:3000/api/usuarios | jq 'length'
```

Expected: `1` (the admin created in seed).

- [ ] **Step 5: Commit**

```bash
git add app/api/usuarios/
git commit -m "feat: add usuarios CRUD API routes"
```

---

## Task 6: Vendas API routes

**Files:**
- Create: `app/api/vendas/route.ts`
- Create: `app/api/vendas/[id]/route.ts`

Note: POST calls `sp_calcular_comissao_venda` after inserting the venda — this creates the lancamento automatically. `tipo_pagamento_entrada` values not in the DB enum are mapped to `'OUTRO'`.

- [ ] **Step 1: Create app/api/vendas/route.ts**

```typescript
// app/api/vendas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ENUM_VALIDOS = ['PIX','DINHEIRO','DEBITO','CREDITO_AVISTA','BOLETO','CREDITO_PARCELADO','SEM_ENTRADA','OUTRO'] as const;

function normalizarTipoPagamento(tipo: string): string {
  return ENUM_VALIDOS.includes(tipo as typeof ENUM_VALIDOS[number]) ? tipo : 'OUTRO';
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');

  const whereClause = vendedorId ? 'WHERE v.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await pool.query(
    `SELECT v.*, u.nome AS vendedor_nome,
            l.id AS lancamento_id, l.status AS lancamento_status,
            l.valor_comissao_calculado, l.percentual_entrada_calculado,
            l.entrada_valida_considerada, l.aliquota_ou_fixo_aplicado,
            l.regra_aplicada_id, l.aprovado_por, l.aprovado_em,
            l.justificativa_rejeicao, l.repasse_id, l.conferido_em
     FROM vendas v
     JOIN usuarios u ON v.vendedor_id = u.id
     LEFT JOIN lancamentos_comissao l ON l.venda_id = v.id
     ${whereClause}
     ORDER BY v.numero_sequencial DESC`,
    params
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('X-User-Id')!;
  const body = await req.json();
  const { numero_documento, cliente_nome, data_venda, valor_total_venda,
          valor_entrada_valida, tipo_pagamento_entrada, procedimentos, vendedor_id } = body;

  const vendId = vendedor_id || userId;
  const tipo = normalizarTipoPagamento(tipo_pagamento_entrada);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vendaRes = await client.query(
      `INSERT INTO vendas (vendedor_id, numero_documento, cliente_nome, data_venda,
        valor_total_venda, valor_entrada_valida, tipo_pagamento_entrada, procedimentos)
       VALUES ($1, $2, $3, $4, $5, $6, $7::tipo_pagamento_entrada_enum, $8)
       RETURNING *`,
      [vendId, numero_documento, cliente_nome, data_venda,
       valor_total_venda, valor_entrada_valida || 0, tipo, procedimentos || null]
    );
    const venda = vendaRes.rows[0];

    // Calcular e criar o lançamento via stored procedure
    await client.query('SELECT * FROM sp_calcular_comissao_venda($1)', [venda.id]);

    // Buscar lançamento criado
    const lancRes = await client.query(
      `SELECT l.*, u.nome AS vendedor_nome
       FROM lancamentos_comissao l
       JOIN usuarios u ON l.vendedor_id = u.id
       WHERE l.venda_id = $1`,
      [venda.id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ venda, lancamento: lancRes.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Nenhuma regra')) {
      return NextResponse.json({ erro: msg }, { status: 422 });
    }
    console.error('/api/vendas POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Create app/api/vendas/[id]/route.ts**

```typescript
// app/api/vendas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const ENUM_VALIDOS = ['PIX','DINHEIRO','DEBITO','CREDITO_AVISTA','BOLETO','CREDITO_PARCELADO','SEM_ENTRADA','OUTRO'] as const;
function normalizarTipoPagamento(tipo: string): string {
  return ENUM_VALIDOS.includes(tipo as typeof ENUM_VALIDOS[number]) ? tipo : 'OUTRO';
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { numero_documento, cliente_nome, data_venda, valor_total_venda,
          valor_entrada_valida, tipo_pagamento_entrada, procedimentos } = body;

  const tipo = normalizarTipoPagamento(tipo_pagamento_entrada);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE vendas SET numero_documento=$1, cliente_nome=$2, data_venda=$3,
        valor_total_venda=$4, valor_entrada_valida=$5,
        tipo_pagamento_entrada=$6::tipo_pagamento_entrada_enum, procedimentos=$7
       WHERE id = $8`,
      [numero_documento, cliente_nome, data_venda, valor_total_venda,
       valor_entrada_valida || 0, tipo, procedimentos || null, id]
    );

    // Recalcular comissão
    await client.query('SELECT * FROM sp_calcular_comissao_venda($1)', [id]);

    const vendaRes = await client.query('SELECT * FROM vendas WHERE id = $1', [id]);
    const lancRes = await client.query(
      'SELECT * FROM lancamentos_comissao WHERE venda_id = $1', [id]
    );

    await client.query('COMMIT');
    return NextResponse.json({ venda: vendaRes.rows[0], lancamento: lancRes.rows[0] });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('não é permitido') || msg.includes('Nenhuma regra')) {
      return NextResponse.json({ erro: msg }, { status: 422 });
    }
    console.error('/api/vendas/[id] PUT:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // lancamentos_comissao deletes CASCADE from vendas
    await pool.query('DELETE FROM vendas WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/vendas/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Test (need at least one vendedor with a regra first — skip if no test data)**

```bash
curl -s -b cookies.txt http://localhost:3000/api/vendas | jq 'length'
```

Expected: `0` (no sales yet).

- [ ] **Step 4: Commit**

```bash
git add app/api/vendas/
git commit -m "feat: add vendas API routes with sp_calcular_comissao_venda"
```

---

## Task 7: Lancamentos state machine API routes

**Files:**
- Create: `app/api/lancamentos/route.ts`
- Create: `app/api/lancamentos/[id]/submeter/route.ts`
- Create: `app/api/lancamentos/[id]/aprovar/route.ts`
- Create: `app/api/lancamentos/[id]/rejeitar/route.ts`
- Create: `app/api/lancamentos/[id]/conferir/route.ts`
- Create: `app/api/lancamentos/[id]/estornar/route.ts`

- [ ] **Step 1: Create app/api/lancamentos/route.ts**

```typescript
// app/api/lancamentos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');
  const status = searchParams.get('status');

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (vendedorId) { conditions.push(`l.vendedor_id = $${i++}`); params.push(vendedorId); }
  if (status) { conditions.push(`l.status = $${i++}::status_lancamento_enum`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT l.*,
            u.nome AS vendedor_nome,
            v.numero_documento, v.cliente_nome, v.data_venda,
            v.valor_total_venda, v.tipo_pagamento_entrada, v.codigo_venda
     FROM lancamentos_comissao l
     JOIN usuarios u ON l.vendedor_id = u.id
     JOIN vendas v ON l.venda_id = v.id
     ${where}
     ORDER BY v.data_venda DESC`,
    params
  );
  return NextResponse.json(result.rows);
}
```

- [ ] **Step 2: Create app/api/lancamentos/[id]/submeter/route.ts**

```typescript
// app/api/lancamentos/[id]/submeter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  try {
    await query('CALL sp_submeter_aprovacao($1, $2)', [id, userId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
```

- [ ] **Step 3: Create app/api/lancamentos/[id]/aprovar/route.ts**

```typescript
// app/api/lancamentos/[id]/aprovar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminId = req.headers.get('X-User-Id')!;
  try {
    await query('CALL sp_aprovar_comissao($1, $2)', [id, adminId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
```

- [ ] **Step 4: Create app/api/lancamentos/[id]/rejeitar/route.ts**

```typescript
// app/api/lancamentos/[id]/rejeitar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminId = req.headers.get('X-User-Id')!;
  const { justificativa } = await req.json();
  if (!justificativa?.trim()) {
    return NextResponse.json({ erro: 'Justificativa é obrigatória' }, { status: 400 });
  }
  try {
    await query('CALL sp_rejeitar_comissao($1, $2, $3)', [id, adminId, justificativa.trim()]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
```

- [ ] **Step 5: Create app/api/lancamentos/[id]/conferir/route.ts**

```typescript
// app/api/lancamentos/[id]/conferir/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = req.headers.get('X-Impersonating') || req.headers.get('X-User-Id')!;
  try {
    await query('CALL sp_conferir_comissao($1, $2)', [id, userId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
```

- [ ] **Step 6: Create app/api/lancamentos/[id]/estornar/route.ts**

```typescript
// app/api/lancamentos/[id]/estornar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminId = req.headers.get('X-User-Id')!;
  const { motivo } = await req.json();
  if (!motivo?.trim()) {
    return NextResponse.json({ erro: 'Motivo do estorno é obrigatório' }, { status: 400 });
  }
  try {
    await query('CALL sp_estornar_comissao($1, $2, $3)', [id, motivo.trim(), adminId]);
    const result = await query('SELECT * FROM lancamentos_comissao WHERE id = $1', [id]);
    return NextResponse.json(result.rows[0]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add app/api/lancamentos/
git commit -m "feat: add lancamentos API routes with stored procedure state machine"
```

---

## Task 8: Repasses API route

**Files:**
- Create: `app/api/repasses/route.ts`

- [ ] **Step 1: Create app/api/repasses/route.ts**

```typescript
// app/api/repasses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool, { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');

  const where = vendedorId ? 'WHERE r.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await query(
    `SELECT r.*,
            u.nome AS vendedor_nome,
            ub.nome AS registrado_por_nome,
            COALESCE(
              json_agg(l.id) FILTER (WHERE l.id IS NOT NULL), '[]'
            ) AS lancamentos_ids
     FROM repasses r
     JOIN usuarios u ON r.vendedor_id = u.id
     LEFT JOIN usuarios ub ON r.registrado_por = ub.id
     LEFT JOIN lancamentos_comissao l ON l.repasse_id = r.id
     ${where}
     GROUP BY r.id, u.nome, ub.nome
     ORDER BY r.data_repasse DESC`,
    params
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get('X-User-Id')!;
  const { vendedor_id, lancamentos_ids, data_repasse, comprovante_transacao, observacoes } = await req.json();

  if (!lancamentos_ids?.length) {
    return NextResponse.json({ erro: 'Selecione ao menos um lançamento' }, { status: 400 });
  }
  if (!comprovante_transacao?.trim()) {
    return NextResponse.json({ erro: 'Comprovante de transação é obrigatório' }, { status: 400 });
  }

  // Se vendedor_id === 'TODOS', agrupar por vendedor e criar um repasse por grupo
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let repasseIds: string[] = [];

    if (vendedor_id === 'TODOS') {
      // Agrupar lançamentos por vendedor
      const lancRes = await client.query(
        `SELECT id, vendedor_id FROM lancamentos_comissao WHERE id = ANY($1) AND status = 'CONFERIDO'`,
        [lancamentos_ids]
      );
      const grupos = new Map<string, string[]>();
      for (const l of lancRes.rows) {
        const g = grupos.get(l.vendedor_id) || [];
        g.push(l.id);
        grupos.set(l.vendedor_id, g);
      }
      for (const [vId, ids] of grupos) {
        const res = await client.query(
          'SELECT sp_liquidar_repasse_lote($1, $2, $3, $4, $5, $6) AS repasse_id',
          [vId, ids, data_repasse, comprovante_transacao.trim(), adminId, observacoes || null]
        );
        repasseIds.push(res.rows[0].repasse_id);
      }
    } else {
      const res = await client.query(
        'SELECT sp_liquidar_repasse_lote($1, $2, $3, $4, $5, $6) AS repasse_id',
        [vendedor_id, lancamentos_ids, data_repasse, comprovante_transacao.trim(), adminId, observacoes || null]
      );
      repasseIds.push(res.rows[0].repasse_id);
    }

    await client.query('COMMIT');

    const repassesRes = await query(
      `SELECT r.*, u.nome AS vendedor_nome,
              COALESCE(json_agg(l.id) FILTER (WHERE l.id IS NOT NULL), '[]') AS lancamentos_ids
       FROM repasses r
       JOIN usuarios u ON r.vendedor_id = u.id
       LEFT JOIN lancamentos_comissao l ON l.repasse_id = r.id
       WHERE r.id = ANY($1)
       GROUP BY r.id, u.nome`,
      [repasseIds]
    );

    return NextResponse.json(repassesRes.rows, { status: 201 });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ erro: msg }, { status: 422 });
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/repasses/
git commit -m "feat: add repasses API route with sp_liquidar_repasse_lote"
```

---

## Task 9: Regras API routes

**Files:**
- Create: `app/api/regras/route.ts`
- Create: `app/api/regras/[id]/route.ts`

- [ ] **Step 1: Create app/api/regras/route.ts**

```typescript
// app/api/regras/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vendedorId = searchParams.get('vendedor_id');

  const where = vendedorId ? 'WHERE r.vendedor_id = $1' : '';
  const params = vendedorId ? [vendedorId] : [];

  const result = await pool.query(
    `SELECT r.*, u.nome AS vendedor_nome,
            COALESCE(
              json_agg(json_build_object(
                'id', f.id, 'regra_id', f.regra_id,
                'percentual_entrada_min', f.percentual_entrada_min,
                'percentual_entrada_max', f.percentual_entrada_max,
                'percentual_comissao', f.percentual_comissao
              ) ORDER BY f.percentual_entrada_min) FILTER (WHERE f.id IS NOT NULL), '[]'
            ) AS faixas
     FROM regras_comissao_vendedor r
     JOIN usuarios u ON r.vendedor_id = u.id
     LEFT JOIN faixas_entrada_comissao f ON f.regra_id = r.id
     ${where}
     GROUP BY r.id, u.nome
     ORDER BY r.vigencia_inicio DESC`,
    params
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { vendedor_id, tipo_comissao, valor_fixo, vigencia_inicio, faixas } = await req.json();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Encerrar vigência anterior (se existir regra aberta)
    await client.query(
      `UPDATE regras_comissao_vendedor
       SET vigencia_fim = ($1::date - INTERVAL '1 day')::date
       WHERE vendedor_id = $2 AND vigencia_fim IS NULL`,
      [vigencia_inicio, vendedor_id]
    );

    const regraRes = await client.query(
      `INSERT INTO regras_comissao_vendedor
         (vendedor_id, tipo_comissao, valor_fixo, vigencia_inicio)
       VALUES ($1, $2::tipo_comissao_enum, $3, $4)
       RETURNING *`,
      [vendedor_id, tipo_comissao, valor_fixo || 0, vigencia_inicio]
    );
    const regra = regraRes.rows[0];

    if (faixas?.length) {
      for (const f of faixas as { percentual_entrada_min: number; percentual_entrada_max: number | null; percentual_comissao: number }[]) {
        await client.query(
          `INSERT INTO faixas_entrada_comissao
             (regra_id, percentual_entrada_min, percentual_entrada_max, percentual_comissao)
           VALUES ($1, $2, $3, $4)`,
          [regra.id, f.percentual_entrada_min, f.percentual_entrada_max ?? null, f.percentual_comissao]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ ...regra, faixas: faixas || [] }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('/api/regras POST:', err);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  } finally {
    client.release();
  }
}
```

- [ ] **Step 2: Create app/api/regras/[id]/route.ts**

```typescript
// app/api/regras/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vigencia_fim } = await req.json();
  // Encerrar vigência
  await pool.query(
    'UPDATE regras_comissao_vendedor SET vigencia_fim = $1 WHERE id = $2',
    [vigencia_fim, id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await pool.query('DELETE FROM regras_comissao_vendedor WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('/api/regras/[id] DELETE:', err);
    return NextResponse.json({ erro: 'Regra em uso por lançamentos existentes' }, { status: 409 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/regras/
git commit -m "feat: add regras comissao API routes"
```

---

## Task 10: Configurações API routes

**Files:**
- Create: `app/api/configuracoes/route.ts`
- Create: `app/api/configuracoes/meios-pagamento/route.ts`
- Create: `app/api/configuracoes/meios-pagamento/[id]/route.ts`

- [ ] **Step 1: Create app/api/configuracoes/route.ts**

```typescript
// app/api/configuracoes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const cfgRes = await query(
    "SELECT * FROM configuracoes_sistema WHERE id = 'GLOBAL_CONFIG'"
  );
  const meiosRes = await query(
    'SELECT * FROM meios_pagamento ORDER BY ordem, criado_em'
  );

  const cfg = cfgRes.rows[0] || {};
  const meios = meiosRes.rows;
  const validos = meios.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);

  return NextResponse.json({
    nome_empresa: cfg.nome_empresa || 'Praxis Comissionamentos',
    logo_url: cfg.logo_url || null,
    percentual_comissao_padrao_residual: Number(cfg.percentual_comissao_padrao_residual || 0),
    exigir_aprovacao_gestor: cfg.exigir_aprovacao_gestor ?? true,
    exigir_conferencia_vendedor: cfg.exigir_conferencia_vendedor ?? true,
    trava_estorno_apenas_admin: cfg.trava_estorno_apenas_admin ?? true,
    dias_alerta_expiracao_vigencia: cfg.dias_alerta_expiracao_vigencia ?? 30,
    procedimentos_catalogo: cfg.procedimentos_catalogo || [],
    meios_pagamento_catalogo: meios,
    meios_pagamento_entrada_validos: validos,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    nome_empresa, logo_url, percentual_comissao_padrao_residual,
    exigir_aprovacao_gestor, exigir_conferencia_vendedor,
    trava_estorno_apenas_admin, dias_alerta_expiracao_vigencia,
    procedimentos_catalogo,
  } = body;

  await query(
    `UPDATE configuracoes_sistema SET
       nome_empresa = COALESCE($1, nome_empresa),
       logo_url = $2,
       percentual_comissao_padrao_residual = COALESCE($3, percentual_comissao_padrao_residual),
       exigir_aprovacao_gestor = COALESCE($4, exigir_aprovacao_gestor),
       exigir_conferencia_vendedor = COALESCE($5, exigir_conferencia_vendedor),
       trava_estorno_apenas_admin = COALESCE($6, trava_estorno_apenas_admin),
       dias_alerta_expiracao_vigencia = COALESCE($7, dias_alerta_expiracao_vigencia),
       procedimentos_catalogo = COALESCE($8, procedimentos_catalogo),
       atualizado_em = CURRENT_TIMESTAMP
     WHERE id = 'GLOBAL_CONFIG'`,
    [
      nome_empresa, logo_url ?? undefined,
      percentual_comissao_padrao_residual,
      exigir_aprovacao_gestor, exigir_conferencia_vendedor,
      trava_estorno_apenas_admin, dias_alerta_expiracao_vigencia,
      procedimentos_catalogo ? JSON.stringify(procedimentos_catalogo) : undefined,
    ]
  );
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create app/api/configuracoes/meios-pagamento/route.ts**

```typescript
// app/api/configuracoes/meios-pagamento/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const result = await query('SELECT * FROM meios_pagamento ORDER BY ordem, criado_em');
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { id, codigo, label, descricao, is_entrada_valida, ativo, ordem } = await req.json();
  const meioId = id || `mp-${Date.now()}`;
  const result = await query(
    `INSERT INTO meios_pagamento (id, codigo, label, descricao, is_entrada_valida, ativo, ordem)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE
     SET label=$3, descricao=$4, is_entrada_valida=$5, ativo=$6, ordem=$7
     RETURNING *`,
    [meioId, codigo.toUpperCase(), label, descricao || '', Boolean(is_entrada_valida), ativo !== false, ordem || 99]
  );
  return NextResponse.json(result.rows[0], { status: 201 });
}
```

- [ ] **Step 3: Create app/api/configuracoes/meios-pagamento/[id]/route.ts**

```typescript
// app/api/configuracoes/meios-pagamento/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { label, descricao, is_entrada_valida, ativo, ordem } = await req.json();
  const result = await query(
    `UPDATE meios_pagamento
     SET label=$1, descricao=$2, is_entrada_valida=$3, ativo=$4, ordem=$5
     WHERE id = $6 RETURNING *`,
    [label, descricao || '', Boolean(is_entrada_valida), Boolean(ativo), ordem ?? 99, id]
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await query('DELETE FROM meios_pagamento WHERE id = $1 AND sistema_padrao = false', [id]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ erro: 'Não é possível excluir meio de pagamento em uso' }, { status: 409 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/configuracoes/
git commit -m "feat: add configuracoes and meios-pagamento API routes"
```

---

## Task 11: Preview calc route

**Files:**
- Create: `app/api/calcular-comissao/route.ts`

- [ ] **Step 1: Create app/api/calcular-comissao/route.ts**

```typescript
// app/api/calcular-comissao/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularComissao } from '@/lib/commission-engine';

export async function POST(req: NextRequest) {
  const { vendedor_id, valor_total_venda, valor_entrada_valida, data_venda, tipo_pagamento_entrada } = await req.json();

  // Buscar regra vigente
  const regraRes = await query(
    `SELECT r.*, json_agg(json_build_object(
       'id', f.id, 'regra_id', f.regra_id,
       'percentual_entrada_min', f.percentual_entrada_min,
       'percentual_entrada_max', f.percentual_entrada_max,
       'percentual_comissao', f.percentual_comissao
     ) ORDER BY f.percentual_entrada_min) FILTER (WHERE f.id IS NOT NULL) AS faixas
     FROM regras_comissao_vendedor r
     LEFT JOIN faixas_entrada_comissao f ON f.regra_id = r.id
     WHERE r.vendedor_id = $1
       AND r.vigencia_inicio <= $2
       AND (r.vigencia_fim IS NULL OR r.vigencia_fim >= $2)
     GROUP BY r.id
     ORDER BY r.vigencia_inicio DESC
     LIMIT 1`,
    [vendedor_id, data_venda]
  );

  if (!regraRes.rows[0]) {
    return NextResponse.json({ sucesso: false, mensagem: 'Nenhuma regra vigente para este vendedor nesta data.' });
  }

  // Buscar meios de pagamento válidos
  const meiosRes = await query(
    'SELECT codigo FROM meios_pagamento WHERE is_entrada_valida = true AND ativo = true'
  );
  const meiosValidos = meiosRes.rows.map((m) => m.codigo);

  const cfgRes = await query(
    "SELECT percentual_comissao_padrao_residual FROM configuracoes_sistema WHERE id = 'GLOBAL_CONFIG'"
  );
  const aliquotaResidual = Number(cfgRes.rows[0]?.percentual_comissao_padrao_residual || 0);

  const resultado = calcularComissao(
    { valor_total_venda, valor_entrada_valida, tipo_pagamento_entrada, data_venda },
    regraRes.rows[0],
    meiosValidos,
    aliquotaResidual
  );

  return NextResponse.json(resultado);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/calcular-comissao/
git commit -m "feat: add preview commission calc API route"
```

---

## Task 12: commission-context.tsx — auth + initial data load

**Files:**
- Modify: `lib/commission-context.tsx`

This task replaces the localStorage hydration `useEffect` and all auth functions. The rest of the file (business logic, state shape, context value) is untouched.

- [ ] **Step 1: Add isLoading and syncError state declarations**

Find the line `const [isHydrated, setIsHydrated] = useState(false);` and replace it with:

```typescript
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
```

- [ ] **Step 2: Remove all STORAGE_KEYS constant and the localStorage hydration useEffect**

Remove the `const STORAGE_KEYS = { ... }` block near the top of the file.

Remove the entire `useEffect(() => { const timer = setTimeout(() => { ... }) }, [])` block (the one that reads from localStorage — it starts at the `// Restore saved data from localStorage on client mount` comment).

Remove the entire `useEffect(() => { if (!isHydrated) return; localStorage.setItem(...) ... }, [...])` block (the one that writes to localStorage).

- [ ] **Step 3: Add the new API-based initialization useEffect**

After the state declarations, add:

```typescript
  // Inicialização: carrega dados do servidor ao montar
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          setEstaAutenticado(false);
          setIsLoading(false);
          setIsHydrated(true);
          return;
        }
        const { usuario, adminOriginalId } = await meRes.json();
        setUsuarioAtualState({ ...usuario, permissoes: normalizarPermissoesUsuario(usuario) });
        setEstaAutenticado(true);
        if (adminOriginalId) {
          // Em modo impersonação: buscar admin original
          const adminRes = await fetch(`/api/usuarios`);
          if (adminRes.ok) {
            const todos: Usuario[] = await adminRes.json();
            const admin = todos.find((u) => u.id === adminOriginalId) || null;
            setAdminOriginal(admin);
          }
        } else if (usuario.perfil_nome === 'ADMINISTRADOR') {
          setAdminOriginal({ ...usuario, permissoes: normalizarPermissoesUsuario(usuario) });
        }

        const [vendasRes, lancRes, repassesRes, regrasRes, cfgRes, usuariosRes] =
          await Promise.all([
            fetch('/api/vendas'),
            fetch('/api/lancamentos'),
            fetch('/api/repasses'),
            fetch('/api/regras'),
            fetch('/api/configuracoes'),
            fetch('/api/usuarios'),
          ]);

        if (vendasRes.ok) setVendas(await vendasRes.json());
        if (lancRes.ok) setLancamentos(await lancRes.json());
        if (repassesRes.ok) setRepasses(await repassesRes.json());
        if (regrasRes.ok) setRegras(await regrasRes.json());
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          setParametros(cfg);
          setLogoEmpresa(cfg.logo_url || null);
          setNomeEmpresa(cfg.nome_empresa || 'Praxis Comissionamentos');
        }
        if (usuariosRes.ok) {
          const todos: Usuario[] = await usuariosRes.json();
          setUsuarios(todos.map((u) => ({ ...u, permissoes: normalizarPermissoesUsuario(u) })));
        }
      } catch {
        setSyncError('Erro de conexão com o servidor. Verifique sua rede.');
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    };
    init();
  }, []);
```

- [ ] **Step 4: Replace the login() function**

Find and replace the entire `const login = (email: string, senha: string, ...) => { ... }` function with:

```typescript
  const login = async (email: string, senha: string): Promise<{ sucesso: boolean; mensagem: string; usuario?: Usuario }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { sucesso: false, mensagem: data.erro || 'Credenciais inválidas.' };
      }
      const u: Usuario = { ...data.usuario, permissoes: normalizarPermissoesUsuario(data.usuario) };
      setUsuarioAtualState(u);
      setEstaAutenticado(true);
      if (u.perfil_nome === 'ADMINISTRADOR') setAdminOriginal(u);

      // Carregar dados após login
      const [vendasRes, lancRes, repassesRes, regrasRes, cfgRes, usuariosRes] =
        await Promise.all([
          fetch('/api/vendas'),
          fetch('/api/lancamentos'),
          fetch('/api/repasses'),
          fetch('/api/regras'),
          fetch('/api/configuracoes'),
          fetch('/api/usuarios'),
        ]);
      if (vendasRes.ok) setVendas(await vendasRes.json());
      if (lancRes.ok) setLancamentos(await lancRes.json());
      if (repassesRes.ok) setRepasses(await repassesRes.json());
      if (regrasRes.ok) setRegras(await regrasRes.json());
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        setParametros(cfg);
        setLogoEmpresa(cfg.logo_url || null);
        setNomeEmpresa(cfg.nome_empresa || 'Praxis Comissionamentos');
      }
      if (usuariosRes.ok) {
        const todos: Usuario[] = await usuariosRes.json();
        setUsuarios(todos.map((uu) => ({ ...uu, permissoes: normalizarPermissoesUsuario(uu) })));
      }

      return { sucesso: true, mensagem: `Bem-vindo(a), ${u.nome}!`, usuario: u };
    } catch {
      return { sucesso: false, mensagem: 'Erro de rede. Verifique sua conexão.' };
    }
  };
```

- [ ] **Step 5: Replace the logout() function**

Find and replace:

```typescript
  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setEstaAutenticado(false);
    setAdminOriginal(null);
    setVendas([]);
    setLancamentos([]);
    setRepasses([]);
    setRegras([]);
    setUsuarios([]);
  };
```

- [ ] **Step 6: Replace incorporarUsuario() and voltarParaAdministrador()**

Find and replace `incorporarUsuario`:

```typescript
  const incorporarUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const target = usuarios.find((u) => u.id === usuarioId);
    if (!target) return { sucesso: false, mensagem: 'Usuário não encontrado.' };
    if (usuarioAtual.perfil_nome !== 'ADMINISTRADOR' && !adminOriginal) {
      return { sucesso: false, mensagem: 'Apenas administradores podem navegar entre perfis.' };
    }
    const res = await fetch('/api/auth/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId }),
    });
    if (!res.ok) {
      const d = await res.json();
      return { sucesso: false, mensagem: d.erro };
    }
    if (!adminOriginal) setAdminOriginal(usuarioAtual);
    setUsuarioAtualState(target);
    return { sucesso: true, mensagem: `Navegando como ${target.nome}.` };
  };
```

Find and replace `voltarParaAdministrador`:

```typescript
  const voltarParaAdministrador = async () => {
    await fetch('/api/auth/impersonate', { method: 'DELETE' });
    if (adminOriginal) setUsuarioAtualState(adminOriginal);
    setAdminOriginal(null);
  };
```

- [ ] **Step 7: Add isLoading + syncError to context value**

In the `value` object passed to `CommissionContext.Provider`, add:

```typescript
    isLoading,
    syncError,
```

Also add them to the `CommissionContextType` interface at the top of the file:

```typescript
  isLoading: boolean;
  syncError: string | null;
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 9: Commit**

```bash
git add lib/commission-context.tsx
git commit -m "feat: replace localStorage auth with JWT cookie API calls"
```

---

## Task 13: commission-context.tsx — vendas + lancamentos mutations

**Files:**
- Modify: `lib/commission-context.tsx`

- [ ] **Step 1: Replace criarOuEditarVenda()**

Find and replace the entire `const criarOuEditarVenda = (...) => { ... }` function with:

```typescript
  const criarOuEditarVenda = async (
    vendaData: {
      id?: string;
      vendedor_id: string;
      numero_documento: string;
      cliente_nome: string;
      procedimentos?: string;
      data_venda: string;
      valor_total_venda: number;
      valor_entrada_valida: number;
      tipo_pagamento_entrada: TipoPagamentoEntrada;
    },
    submeterDiretamente = false
  ): Promise<{ sucesso: boolean; mensagem: string; vendaId?: string; codigo_venda?: string }> => {
    try {
      const isEdicao = Boolean(vendaData.id);
      const url = isEdicao ? `/api/vendas/${vendaData.id}` : '/api/vendas';
      const method = isEdicao ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendaData),
      });
      const data = await res.json();
      if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar venda.' };

      const { venda, lancamento } = data;
      setVendas((prev) => {
        const idx = prev.findIndex((v) => v.id === venda.id);
        return idx >= 0 ? prev.map((v) => (v.id === venda.id ? venda : v)) : [venda, ...prev];
      });
      setLancamentos((prev) => {
        const idx = prev.findIndex((l) => l.venda_id === venda.id);
        return idx >= 0 ? prev.map((l) => (l.venda_id === venda.id ? lancamento : l)) : [lancamento, ...prev];
      });

      if (submeterDiretamente && lancamento?.id) {
        await submeterParaAprovacao(lancamento.id);
      }

      return {
        sucesso: true,
        mensagem: submeterDiretamente
          ? `Venda ${venda.codigo_venda} enviada para aprovação!`
          : `Venda ${venda.codigo_venda} salva como rascunho!`,
        vendaId: venda.id,
        codigo_venda: venda.codigo_venda,
      };
    } catch {
      return { sucesso: false, mensagem: 'Erro de rede ao salvar venda.' };
    }
  };
```

- [ ] **Step 2: Replace excluirRascunho()**

Find and replace:

```typescript
  const excluirRascunho = async (vendaId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda) return { sucesso: false, mensagem: 'Venda não localizada.' };
    const lanc = lancamentos.find((l) => l.venda_id === vendaId);
    if (lanc && lanc.status !== 'RASCUNHO' && lanc.status !== 'REJEITADO') {
      return { sucesso: false, mensagem: `Não é possível excluir venda com status "${lanc.status}".` };
    }
    const prevVendas = vendas;
    const prevLanc = lancamentos;
    setVendas((prev) => prev.filter((v) => v.id !== vendaId));
    setLancamentos((prev) => prev.filter((l) => l.venda_id !== vendaId));
    const res = await fetch(`/api/vendas/${vendaId}`, { method: 'DELETE' });
    if (!res.ok) {
      setVendas(prevVendas);
      setLancamentos(prevLanc);
      return { sucesso: false, mensagem: 'Erro ao excluir venda no servidor.' };
    }
    return { sucesso: true, mensagem: `Rascunho ${venda.codigo_venda || venda.numero_documento} excluído.` };
  };
```

- [ ] **Step 3: Replace submeterParaAprovacao()**

Find and replace:

```typescript
  const submeterParaAprovacao = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/submeter`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao submeter.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Lançamento enviado para aprovação!' };
  };
```

- [ ] **Step 4: Replace aprovarLancamento(), rejeitarLancamento(), conferirLancamento()**

Find and replace each:

```typescript
  const aprovarLancamento = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/aprovar`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao aprovar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão aprovada!' };
  };

  const rejeitarLancamento = async (lancamentoId: string, justificativa: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/rejeitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa }),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao rejeitar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Lançamento rejeitado e devolvido ao vendedor.' };
  };

  const conferirLancamento = async (lancamentoId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/conferir`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao conferir.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão conferida!' };
  };

  const conferirLancamentosEmLote = async (lancamentosIds: string[]): Promise<{ sucesso: boolean; mensagem: string }> => {
    const resultados = await Promise.all(lancamentosIds.map((id) => conferirLancamento(id)));
    const falhas = resultados.filter((r) => !r.sucesso);
    if (falhas.length > 0) return { sucesso: false, mensagem: `${falhas.length} lançamento(s) com erro.` };
    return { sucesso: true, mensagem: `${lancamentosIds.length} comissão(ões) conferida(s)!` };
  };
```

- [ ] **Step 5: Replace estornarComissao()**

Find and replace the estornar function (may be called `estornarComissao` or similar):

```typescript
  const estornarComissao = async (lancamentoId: string, motivo: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/lancamentos/${lancamentoId}/estornar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao estornar.' };
    setLancamentos((prev) => prev.map((l) => (l.id === lancamentoId ? { ...l, ...data } : l)));
    return { sucesso: true, mensagem: 'Comissão estornada.' };
  };
```

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add lib/commission-context.tsx
git commit -m "feat: replace venda and lancamento mutations with API calls"
```

---

## Task 14: commission-context.tsx — repasses, regras, configurações, usuários

**Files:**
- Modify: `lib/commission-context.tsx`

- [ ] **Step 1: Replace liquidarRepasseLote()**

Find and replace:

```typescript
  const liquidarRepasseLote = async (dados: {
    vendedor_id: string;
    data_repasse: string;
    comprovante_transacao: string;
    lancamentos_ids: string[];
    observacoes?: string;
  }): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/repasses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao criar repasse.' };
    const novosRepasses: Repasse[] = Array.isArray(data) ? data : [data];
    setRepasses((prev) => [...novosRepasses, ...prev]);
    // Atualizar lançamentos para LIQUIDADO
    const idsLiquidados = dados.lancamentos_ids;
    setLancamentos((prev) =>
      prev.map((l) => (idsLiquidados.includes(l.id) ? { ...l, status: 'LIQUIDADO' as StatusLancamento } : l))
    );
    return { sucesso: true, mensagem: `${novosRepasses.length} repasse(s) liquidado(s) com sucesso!` };
  };
```

- [ ] **Step 2: Replace salvarRegra() / criarRegra()**

Find the function that creates/edits commission rules (may be called `salvarRegraComissao` or `adicionarRegra`):

```typescript
  const salvarRegraComissao = async (
    dados: Omit<RegraComissaoVendedor, 'id' | 'criado_em'>
  ): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/regras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar regra.' };
    setRegras((prev) => [data, ...prev.filter((r) => r.vendedor_id !== dados.vendedor_id || r.vigencia_fim !== null)]);
    return { sucesso: true, mensagem: 'Regra de comissão salva com sucesso!' };
  };
```

- [ ] **Step 3: Replace salvarParametros() / configurações mutations**

Find and replace `salvarParametros`:

```typescript
  const salvarParametros = async (partial: Partial<ParametrosComissionamento>): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar configurações.' };
    setParametros((prev) => ({ ...prev, ...partial }));
    return { sucesso: true, mensagem: 'Configurações salvas!' };
  };
```

Find and replace `salvarMeioPagamento`:

```typescript
  const salvarMeioPagamento = async (meioData: Partial<MeioPagamentoConfig> & { id?: string }): Promise<{ sucesso: boolean; mensagem: string }> => {
    const isEdicao = Boolean(meioData.id);
    const url = isEdicao ? `/api/configuracoes/meios-pagamento/${meioData.id}` : '/api/configuracoes/meios-pagamento';
    const method = isEdicao ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meioData),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar meio de pagamento.' };
    setParametros((prev) => {
      const cat = prev.meios_pagamento_catalogo || [];
      const idx = cat.findIndex((m) => m.id === data.id);
      const novoCat = idx >= 0 ? cat.map((m) => (m.id === data.id ? data : m)) : [...cat, data];
      const validos = novoCat.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);
      return { ...prev, meios_pagamento_catalogo: novoCat, meios_pagamento_entrada_validos: validos };
    });
    return { sucesso: true, mensagem: `Meio de pagamento "${data.label}" salvo!` };
  };
```

Find and replace `excluirMeioPagamento`:

```typescript
  const excluirMeioPagamento = async (meioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/configuracoes/meios-pagamento/${meioId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      return { sucesso: false, mensagem: data.erro || 'Erro ao excluir.' };
    }
    setParametros((prev) => {
      const novoCat = (prev.meios_pagamento_catalogo || []).filter((m) => m.id !== meioId);
      const validos = novoCat.filter((m) => m.is_entrada_valida && m.ativo).map((m) => m.codigo);
      return { ...prev, meios_pagamento_catalogo: novoCat, meios_pagamento_entrada_validos: validos };
    });
    return { sucesso: true, mensagem: 'Meio de pagamento excluído.' };
  };
```

Find and replace `salvarLogoEmpresa`:

```typescript
  const salvarLogoEmpresa = async (novoLogo: string | null): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo_url: novoLogo }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar logo.' };
    setLogoEmpresa(novoLogo);
    setParametros((prev) => ({ ...prev, logo_url: novoLogo }));
    return { sucesso: true, mensagem: novoLogo ? 'Logo atualizado!' : 'Logo removido.' };
  };
```

Find and replace `salvarNomeEmpresa`:

```typescript
  const salvarNomeEmpresa = async (novoNome: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const nome = novoNome.trim() || 'Praxis Comissionamentos';
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome_empresa: nome }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao salvar nome.' };
    setNomeEmpresa(nome);
    setParametros((prev) => ({ ...prev, nome_empresa: nome }));
    return { sucesso: true, mensagem: 'Nome da empresa atualizado!' };
  };
```

- [ ] **Step 4: Replace salvarUsuario(), toggleAtivoUsuario(), excluirUsuario()**

```typescript
  const salvarUsuario = async (
    usuarioData: Omit<Usuario, 'id' | 'criado_em'> & { id?: string; senha?: string }
  ): Promise<{ sucesso: boolean; mensagem: string; usuario?: Usuario }> => {
    const isEdicao = Boolean(usuarioData.id);
    const url = isEdicao ? `/api/usuarios/${usuarioData.id}` : '/api/usuarios';
    const method = isEdicao ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData),
    });
    const data = await res.json();
    if (!res.ok) return { sucesso: false, mensagem: data.erro || 'Erro ao salvar usuário.' };
    const u: Usuario = { ...data, permissoes: normalizarPermissoesUsuario(data) };
    setUsuarios((prev) => {
      const idx = prev.findIndex((x) => x.id === u.id);
      return idx >= 0 ? prev.map((x) => (x.id === u.id ? u : x)) : [...prev, u];
    });
    return { sucesso: true, mensagem: isEdicao ? 'Usuário atualizado!' : 'Usuário criado!', usuario: u };
  };

  const toggleAtivoUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string; novoStatus?: boolean }> => {
    const u = usuarios.find((x) => x.id === usuarioId);
    if (!u) return { sucesso: false, mensagem: 'Usuário não encontrado.' };
    const novoAtivo = !u.ativo;
    const res = await fetch(`/api/usuarios/${usuarioId}/ativo`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: novoAtivo }),
    });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao alterar status.' };
    setUsuarios((prev) => prev.map((x) => (x.id === usuarioId ? { ...x, ativo: novoAtivo } : x)));
    return { sucesso: true, mensagem: `Usuário ${novoAtivo ? 'ativado' : 'inativado'}.`, novoStatus: novoAtivo };
  };

  const excluirUsuario = async (usuarioId: string): Promise<{ sucesso: boolean; mensagem: string }> => {
    const res = await fetch(`/api/usuarios/${usuarioId}`, { method: 'DELETE' });
    if (!res.ok) return { sucesso: false, mensagem: 'Erro ao excluir usuário.' };
    setUsuarios((prev) => prev.filter((x) => x.id !== usuarioId));
    return { sucesso: true, mensagem: 'Usuário excluído.' };
  };
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 6: Commit**

```bash
git add lib/commission-context.tsx
git commit -m "feat: replace all remaining localStorage mutations with API calls"
```

---

## Task 15: Add await to component handlers

**Files:** Various components that call mutating context functions.

For each component listed below, find every `onClick` / `onSubmit` / handler that calls a context mutation, and:
1. Make the handler function `async`
2. Add `await` before the context call

- [ ] **Step 1: components/SalesEntryModal.tsx**

Find patterns like:
```typescript
const resultado = criarOuEditarVenda(...)
```
Replace with:
```typescript
const resultado = await criarOuEditarVenda(...)
```
Make the enclosing handler `async` if not already.

- [ ] **Step 2: components/VendorSalesList.tsx**

Find calls to `excluirRascunho`, `submeterParaAprovacao`. Add `await` and make handlers `async`.

- [ ] **Step 3: components/AdminApprovals.tsx**

Find calls to `aprovarLancamento`, `rejeitarLancamento`, `estornarComissao`. Add `await` and make handlers `async`.

- [ ] **Step 4: components/VendorConferenceReport.tsx**

Find calls to `conferirLancamento`, `conferirLancamentosEmLote`. Add `await` and make handlers `async`.

- [ ] **Step 5: components/AdminRepasseBatch.tsx**

Find call to `liquidarRepasseLote`. Add `await` and make handler `async`.

- [ ] **Step 6: components/UserManagement.tsx**

Find calls to `salvarUsuario`, `toggleAtivoUsuario`, `excluirUsuario`. Add `await` and make handlers `async`.

- [ ] **Step 7: components/BrandingSettings.tsx**

Find calls to `salvarLogoEmpresa`, `salvarNomeEmpresa`. Add `await` and make handlers `async`.

- [ ] **Step 8: components/CommissionSettings.tsx**

Find calls to `salvarRegraComissao`, `salvarParametros`, `salvarMeioPagamento`, `excluirMeioPagamento`, `toggleMeioEntradaValida`. Add `await` and make handlers `async`.

- [ ] **Step 9: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 10: Commit**

```bash
git add components/
git commit -m "feat: add async/await to all component mutation handlers"
```

---

## Task 16: Final integration test + push

**Files:** None (testing only + git push)

- [ ] **Step 1: Start full stack locally**

Ensure postgres is running with migrations applied:
```bash
docker compose up postgres -d
node scripts/migrate.mjs
node scripts/seed.mjs
npm run dev
```

- [ ] **Step 2: Test login flow**

Open `http://localhost:3000` in browser. Expected: LoginScreen appears (not the dashboard).

Log in with `admin@empresa.com` / `admin123`. Expected: dashboard loads.

- [ ] **Step 3: Test venda creation (requires regra first)**

In the app: go to Configurações → create a regra de comissão for the admin user.
Then: create a new venda. Expected: venda appears in the list with status RASCUNHO.

- [ ] **Step 4: Test state machine**

Submit the lancamento → Expected: status changes to PENDENTE_APROVACAO.
Approve → APROVADO. Conferir → CONFERIDO.

- [ ] **Step 5: Test repasse**

Create repasse with the CONFERIDO lancamento. Expected: status → LIQUIDADO, repasse appears in the list.

- [ ] **Step 6: Verify no localStorage calls remain**

```bash
grep -r "localStorage" lib/commission-context.tsx
```

Expected: no matches (zero lines).

- [ ] **Step 7: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 8: Update EasyPanel env vars**

In EasyPanel, add to the app service:
```
JWT_SECRET=<openssl rand -base64 64>
ADMIN_EMAIL=admin@suaempresa.com
ADMIN_SENHA_INICIAL=<senha forte>
NOME_EMPRESA=Praxis Comissionamentos
```

- [ ] **Step 9: Deploy and run seed on EasyPanel**

After deploy, run in EasyPanel terminal or via SSH:
```bash
node scripts/seed.mjs
```

Expected: `✓ Admin criado` or `Admin já existe, pulando seed.`

---

**Plan complete and saved to `docs/superpowers/plans/2026-09-24-postgresql-backend.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — subagente fresco por task, revisão entre tasks, iteração rápida

**2. Inline Execution** — executa nesta sessão com checkpoints de revisão

Qual você prefere?
