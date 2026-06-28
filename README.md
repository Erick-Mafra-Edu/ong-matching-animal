# ONG Matching Animal

Sistema de matchmaking para adocao de animais com arquitetura separada entre frontend, backend e banco Supabase/Postgres.

## Objetivo

Conectar tutores a animais disponiveis para adocao usando:
- atributos dinamicos com JSONB
- consultas geograficas com PostGIS
- regras configuraveis de compatibilidade
- backend como intermediario confiavel para operacoes sensiveis

## Status Atual

Ja implementado no projeto:
- autenticacao de tutor com Supabase Auth e fluxos de recuperacao/troca de senha
- onboarding dinamico com perguntas configuraveis e controle de conclusao
- perfil de conta do tutor e endpoints `me`
- listagem e cadastro de animais, incluindo upload/listagem de fotos
- fluxo de interesse em adocao com prevencao de duplicidade entre o mesmo tutor e o mesmo animal
- agenda de interesses com eventos de calendario
- painel administrativo para recursos principais
- configuracoes publicas da ONG, usadas tambem no footer do frontend
- cache de matching no banco com suporte a `pg_cron`
- RLS e uso do backend para operacoes administrativas e integracoes

## Estrutura do Projeto

```text
ong-matching-animal/
├── src/
│   ├── shared/                    # Tipos e contratos compartilhados
│   ├── backend/
│   │   ├── src/                   # API Express em TypeScript
│   │   ├── db/
│   │   │   ├── schema.sql         # Schema base
│   │   │   ├── all_migrations.sql # Bootstrap completo do banco
│   │   │   ├── migrations/        # Migrations incrementais
│   │   │   └── scripts/           # Scripts utilitarios SQL/Node
│   │   └── package.json
│   └── frontend/
│       ├── app/                   # App Router do Next.js
│       ├── components/
│       └── package.json
├── .env.example
├── package.json
└── README.md
```

## Quick Start

### Pre-requisitos

- Node.js 18+
- npm
- projeto Supabase

### 1. Configurar variaveis de ambiente

```bash
cp .env.example .env.local
```

Preencha ao menos:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

### 2. Criar o banco no Supabase

No SQL Editor, execute o bootstrap consolidado:

```sql
-- src/backend/db/all_migrations.sql
```

Arquivos uteis adicionais:
- `src/backend/db/scripts/first_admin_user.sql`: exemplo para inserir o primeiro admin
- `src/backend/db/scripts/drop_system_tables.sql`: limpeza das tabelas da aplicacao

### 3. Instalar dependencias

```bash
npm install
```

### 4. Popular dados de teste

```bash
cd src/backend
npm run seed
```

O seed atual cria dados falsos para:
- configuracoes da ONG
- perguntas de onboarding
- campos customizados e regras de matching
- tutores e animais
- fotos, interesses e eventos de calendario
- configuracao inicial de servico de calendario

### 5. Rodar localmente

```bash
npm run dev
```

Servicos locais:
- frontend: `http://localhost:3000`
- backend: `http://localhost:3001`

### 6. Testar e buildar

```bash
npm test
npm run build
npm run verify
```

## Endpoints Principais

### Sistema

- `GET /api/health`
- `GET /api/ong-settings`
- `GET /api/onboarding-questions`
- `POST /api/match`

### Autenticacao

- `POST /api/auth/password-recovery`
- `POST /api/auth/change-password`

### Tutor

- `POST /api/tutors`
- `GET /api/tutors/me`
- `PATCH /api/tutors/me`
- `GET /api/tutors/me/discover-access`
- `GET /api/tutors/me/onboarding-status`
- `GET /api/tutors/:id`

### Animais

- `GET /api/animals`
- `POST /api/animals`
- `GET /api/animals/:id/photos`
- `POST /api/animals/:id/photos`
- `POST /api/animals/:id/photos/signed-url`

### Interesses e agenda

- `GET /api/interessados`
- `POST /api/interessados`
- `GET /api/interessados/:uuid_registro`
- `GET /api/calendar-events`
- `POST /api/calendar-events`
- `PUT /api/calendar-events/:id`
- `DELETE /api/calendar-events/:id`

### Admin e integracoes

- `GET /api/admin/me`
- `GET /api/admin/bootstrap`
- `GET /api/admin/:resource`
- `POST /api/admin/admin-users`
- `POST /api/admin/:resource`
- `PUT /api/admin/:resource/:id`
- `DELETE /api/admin/:resource/:id`
- `GET /api/oauth/:provider/start`
- `GET /api/oauth/:provider/callback`
- `POST /api/oauth/:provider/refresh`
- `POST /api/oauth/:provider/disconnect`
- `GET /api/oauth/:provider/status`

## Banco e Matching

Decisoes relevantes que ja estao no codigo:
- JSONB para campos dinamicos de tutor e animal
- PostGIS para localizacao
- funcoes SQL/RPC para calculo e refresh de matches
- cache de matching em `tutor_animal_matches`
- refresh consolidado com suporte a `pg_cron`
- RLS habilitada nas tabelas principais
- constraint de unicidade em `tutor_interessados (tutor_id, animal_id)` para impedir interesse duplicado

## Scripts Uteis

### Raiz

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia backend e frontend |
| `npm run dev:backend` | Inicia apenas o backend |
| `npm run dev:frontend` | Inicia apenas o frontend |
| `npm run build` | Build backend + frontend |
| `npm test` | Testes backend + build frontend |
| `npm run verify` | Testes e builds completos |

### Backend

| Comando | Finalidade |
| --- | --- |
| `npm run dev --prefix src/backend` | Backend local com ts-node |
| `npm run build --prefix src/backend` | Compila o backend |
| `npm run seed --prefix src/backend` | Popula o banco com dados fake |
| `npm start --prefix src/backend` | Executa build compilado |

### Frontend

| Comando | Finalidade |
| --- | --- |
| `npm run dev --prefix src/frontend` | Next.js em desenvolvimento |
| `npm run build --prefix src/frontend` | Build do frontend |
| `npm run test:e2e --prefix src/frontend` | Testes E2E com Playwright |

## Proximas Etapas

Itens ainda razoaveis para evolucao:
- ampliar cobertura E2E do frontend
- endurecer observabilidade e monitoramento em producao
- concluir refinamentos da integracao de calendario e sincronizacao externa
- documentar melhor fluxo operacional de deploy e administracao

## Documentacao Adicional

- [src/shared/README.md](src/shared/README.md)
- [docs/VERCEL_MONOREPO.md](docs/VERCEL_MONOREPO.md)
- [Supabase](https://supabase.com/docs)
- [Next.js](https://nextjs.org/docs)
- [Express.js](https://expressjs.com/)

## Licenca

GPL
