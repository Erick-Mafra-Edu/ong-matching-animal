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
│   └── shared/                 # ← Novo: Tipos compartilhados
│       ├── types/
│       │   └── index.ts
│       └── README.md
│
├── vercel.json                 # Configuração de deploy Vercel
├── .env.example                # Template de variáveis de ambiente
├── tsconfig.json               # (opcional - para IDE)
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
# Backend (com TypeScript e ts-node)
cd src/backend
npm install

# Frontend (com TypeScript)
cd ../frontend
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

**Terminal 1 - Backend (com TypeScript):**
```bash
cd src/backend
npm run dev
# Servidor na porta 3000 com ts-node (reload automático)
```

**Terminal 2 - Frontend:**
```bash
cd src/frontend
npm run dev
# App na porta 3001 (Next.js redireciona automaticamente)
```

### 6. Build para Produção

```bash
# Backend
cd src/backend
npm run build
# Gera pasta dist/ com JS compilado

# Frontend
cd ../frontend
npm run build
# Gera .next/ otimizado
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

## ⚙️ Arquitetura

### Backend (Express + TypeScript)

O backend é escrito em **TypeScript** e preparado para rodar na Vercel como Serverless Functions:

```typescript
// src/backend/src/index.ts
// ⚠️ Exporta a app para Vercel
export default app;

// Mas também pode rodar localmente
if (process.env.NODE_ENV !== "production") {
  app.listen(3000);
}
```

**Endpoints principais:**
- `GET /api/health` - Health check
- `POST /api/tutors` - Criar tutor
- `GET /api/animals` - Listar animais
- `POST /api/match` - Calcular matches

### Frontend (Next.js + TypeScript)

App moderno com SSR, otimizado para SEO e performance. Usa tipos compartilhados de `src/shared/types`.

### Tipos Compartilhados

Os tipos estão centralizados em `src/shared/types/index.ts` para evitar duplicação:

```typescript
// Backend
import type { TutorProfile, AnimalProfile } from "../../shared/types/index.js";

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

**A implementar:** Stored Procedure `calculate_match_score(tutor_id)`.

### 4. Separação Frontend/Backend no Vercel

**Por que?** Isolamento de responsabilidades, escalabilidade independente.

**Deploy:** Ambos na mesma organização Vercel, mas builds separados.

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

- [ ] Implementar RPC de Match Score no Postgres
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
