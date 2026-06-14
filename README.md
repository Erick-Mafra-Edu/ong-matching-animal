# ONG Matching Animal

Sistema de matchmaking dinâmico para adoção de animais com arquitetura separada frontend/backend.

## 🎯 Objetivo

Conectar tutores em busca de animais com os pets disponíveis para adoção, usando regras de matching flexíveis e armazenamento dinâmico de atributos (JSONB + PostGIS).

## 📁 Estrutura do Projeto

```
ong-matching-animal/
├── src/
│   ├── shared/                 # Código compartilhado entre backend e frontend
│   │   ├── types/
│   │   │   └── index.ts        # Tipos centralizados (TutorProfile, AnimalProfile, etc)
│   │   └── README.md
│   │
│   ├── backend/                # Express.js + Node.js (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts        # Entrada da aplicação
│   │   │   ├── lib/
│   │   │   │   └── matching.ts # Algoritmo de matchmaking
│   │   │   ├── db/
│   │   │   │   └── seed.ts     # Script para popular dados de teste
│   │   │   └── types/          # (descontinuado - usar src/shared/types)
│   │   ├── dist/               # Build compilado
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── frontend/               # Next.js (TypeScript)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── globals.css
│   │   ├── types/
│   │   │   └── shared.ts       # Re-export de src/shared/types
│   │   ├── .next/              # Build do Next.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
├── .env.example                # Template de variáveis de ambiente
├── package.json                # Workspaces npm do monorepo
├── tsconfig.json               # Configuração TypeScript da raiz
└── README.md
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase

### 1. Configurar Variáveis de Ambiente

```bash
# Na raiz do projeto
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```env
SUPABASE_URL=https://sua-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 2. Criar Banco de Dados no Supabase

Acesse o SQL Editor do Supabase e execute o conteúdo de `src/backend/db/schema.sql`:

```sql
-- Copy & paste from src/backend/db/schema.sql
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Popular Dados de Teste

```bash
cd src/backend

# Em desenvolvimento (com ts-node)
npm run seed

# Após compilar para produção
npm run seed:prod
```

Isso irá gerar automaticamente:
- 10 tutores com dados fake
- 20 animais com diversas espécies
- 3 regras de matching pré-configuradas

### 5. Rodar Localmente

```bash
# Na raiz do projeto
npm run dev
```

Ou execute cada aplicação separadamente:

**Terminal 1 - Backend (com TypeScript):**
```bash
cd src/backend
npm run dev
# Servidor na porta 3001 com ts-node
```

**Terminal 2 - Frontend:**
```bash
cd src/frontend
npm run dev
# App na porta 3000 (Next.js redireciona /api para o backend)
```

### 6. Build para Produção

```bash
# Na raiz do projeto
npm run build
```

### 7. Executar Testes

```bash
# Testes do backend e validação de build do frontend
npm test

# Testes e builds de todo o monorepo
npm run verify
```

## 📊 Modelo de Dados

### Tutores

```json
{
  "id": "UUID",
  "name": "João Silva",
  "location": "POINT(longitude latitude)",
  "custom_fields": {
    "tamanho_casa": "pequeno|medio|grande",
    "tem_quintal": true|false,
    "tem_criancas": true|false,
    "renda_mensal": "ate_1000|1000_3000|3000_6000|6000_acima",
    "disponibilidade_tempo": "meio_periodo|integral"
  }
}
```

### Animais

```json
{
  "id": "UUID",
  "owner_id": "UUID (tutor que cadastrou)",
  "name": "Rex",
  "species": "Cachorro|Gato|Coelho|Passaro",
  "location": "POINT(longitude latitude)",
  "custom_fields": {
    "raca": "Labrador",
    "idade_meses": 24,
    "peso_kg": 30,
    "tamanho": "pequeno|medio|grande",
    "nivel_energia": "baixo|medio|alto",
    "aceita_criancas": true|false,
    "aceita_outros_animais": true|false,
    "castrado": true|false,
    "vacinado": true|false,
    "requer_espaco": "apartamento|casa_pequena|casa_grande"
  }
}
```

### Regras de Matching

```json
{
  "id": "UUID",
  "rule_name": "Tamanho da casa vs espaço do animal",
  "tutor_field": "tamanho_casa",
  "animal_field": "requer_espaco",
  "comparison_operator": "=|>=|<=|contains",
  "weight": 30,
  "is_active": true
}
```

## ⚙️ Arquitetura

### Backend (Express + TypeScript)

O backend é escrito em **TypeScript** e preparado para rodar na Vercel como Serverless Functions:

```typescript
// src/backend/src/index.ts
// ⚠️ Exporta a app para Vercel
export default app;

// Mas também pode rodar localmente
if (process.env.NODE_ENV !== "production" && require.main === module) {
  app.listen(3001);
}
```

**Endpoints principais:**
- `GET /api/health` - Health check
- `POST /api/tutors` - Criar tutor
- `GET /api/animals` - Listar animais
- `POST /api/match` - Calcular matches

### Frontend (Next.js + TypeScript)

App moderno com SSR, otimizado para SEO e performance. Usa tipos compartilhados de `src/shared/types`.

## 📈 PageSpeed Insights

Scores mais recentes da home (`/`) com base no relatório público do PageSpeed Insights:

- Mobile: `98` Performance, `100` Accessibility, `100` Best Practices, `100` SEO
- Desktop: `100` Performance, `100` Accessibility, `100` Best Practices, `100` SEO

Referências:

- Link do relatório mobile: `https://pagespeed.web.dev/analysis/https-ong-matching-animalfrontend-vercel-app/t81so00amb?form_factor=mobile`
- Captura mobile: [insightsMobile.png](docs/reports_lighthouse/insightsMobile.png)
- Captura desktop: [insightsDesktop.png](docs/reports_lighthouse/insightsDesktop.png)
- Export Lighthouse local da home: [ong-matching-animalfrontend.vercel.app-20260614T194526.json](docs/reports_lighthouse/ong-matching-animalfrontend.vercel.app-20260614T194526.json)

### Tipos Compartilhados

Os tipos estão centralizados em `src/shared/types/index.ts` para evitar duplicação:

```typescript
// Backend
import type { TutorProfile, AnimalProfile } from "@ong-matching-animal/shared/types";

// Frontend
import type { TutorProfile, AnimalProfile } from "@/types/shared";
```

**Tipos disponíveis:**
- `Location` - Coordenadas geográficas
- `TutorProfile` - Perfil do tutor/adotante
- `AnimalProfile` - Perfil do animal
- `MatchingRule` - Regra de compatibilidade
- `MatchResult` - Resultado de um match
- `MatchResponse` - Resposta da API
- `ComparatorFunction` - Função de comparação

Veja [src/shared/README.md](src/shared/README.md) para mais detalhes.

## 🗄️ Decisões Arquiteturais

### 1. JSONB para Atributos Dinâmicos

**Por que?** Schema-less permite que ONGs/Instrutores adicionem novos campos sem ALTER TABLE.

**Tradeoff:** Sem tipagem rígida, requer validação extra no backend.

### 2. PostGIS para Distância

**Por que?** Cálculos geoespaciais nativos no Postgres são muito mais rápidos.

**Índices:** GiST automático em `location`.

### 3. RPC para Match Score

**Por que?** Não baixar 10.000 animais para memória. Postgres calcula e retorna Top N.

**Implementado:** RPC `calculate_match_score(target_tutor_id, result_limit)` no Postgres, consumida pelo endpoint `/api/match`.

### 4. Separação Frontend/Backend no Vercel

**Por que?** Isolamento de responsabilidades, escalabilidade independente.

**Deploy:** Crie dois projetos na mesma organização Vercel, conectados ao mesmo repositório:

| Projeto | Root Directory | Framework |
| --- | --- | --- |
| Backend | `src/backend` | Express (`src/backend/vercel.json`) |
| Frontend | `src/frontend` | Next.js (`src/frontend/vercel.json`) |

A Vercel detecta os frameworks e executa os builds separadamente. Não use `builds` no
`vercel.json` da raiz: essa configuração é legada. Configure no frontend a URL do
backend para chamadas feitas em produção.

O procedimento completo de configuração, validação e deploy está em
[docs/VERCEL_MONOREPO.md](docs/VERCEL_MONOREPO.md).

## 🧪 Scripts Úteis

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Inicia backend e frontend localmente |
| `npm run dev:backend` | Inicia apenas o Express em `http://localhost:3001` |
| `npm run dev:frontend` | Inicia apenas o Next.js em `http://localhost:3000` |
| `npm run vercel:dev:backend` | Inicia o backend usando o runtime local da Vercel |
| `npm run vercel:dev:frontend` | Inicia o frontend usando o runtime local da Vercel |
| `npm run test:backend` | Executa a suíte Jest do backend |
| `npm run test:frontend` | Valida o frontend com build Next.js |
| `npm test` | Executa as validações de backend e frontend |
| `npm run verify` | Executa testes e builds completos |

## 🛠️ Scripts Úteis

### Backend (TypeScript)

```bash
cd src/backend

# Desenvolvimento
npm run dev              # Rodar com ts-node (reload automático)
npm run build           # Compilar TypeScript → JavaScript
npm run seed            # Popular DB com dados fake (usa ts-node)
npm run seed:prod       # Popular DB após compilação (usa node)
npm start               # Rodar versão compilada (produção)
```

### Frontend (Next.js + TypeScript)

```bash
cd src/frontend

npm run dev             # Dev server com hot reload
npm run build           # Build otimizado
npm start               # Produção (requer build prévio)
npm run lint            # ESLint
```

## 📝 Próximas Etapas

- [x] Implementar RPC de Match Score no Postgres
- [ ] Criar endpoints REST para CRUD de Tutores/Animais
- [ ] Dashboard administrativo para configurar Regras
- [ ] Autenticação com Supabase Auth
- [ ] Geolocalização do cliente
- [ ] Notificações de novos matches
- [ ] Testes automatizados

## 📚 Documentação Adicional

- [Supabase](https://supabase.com/docs)
- [Express.js](https://expressjs.com/)
- [Next.js](https://nextjs.org/docs)
- [Faker.js](https://fakerjs.dev/)

## 📄 Licença

GPL-3.0
