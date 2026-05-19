# Arquitetura TypeScript do Projeto

Este documento explica como os tipos TypeScript são organizados e compartilhados entre backend e frontend.

## 📦 Estrutura de Tipos

```
src/shared/types/index.ts (FONTE ÚNICA DA VERDADE)
   ↓
   ├→ src/backend/src/lib/matching.ts
   ├→ src/backend/src/index.ts
   ├→ src/backend/src/db/seed.ts
   ├→ src/frontend/types/shared.ts (re-export)
   └→ src/frontend/app/page.tsx
```

## 🎯 Tipos Centralizados

### `src/shared/types/index.ts`

**Tipos exportados:**

```typescript
// Estruturas de dados
interface Location { lng: number; lat: number }
interface TutorProfile { ... }
interface AnimalProfile { ... }
interface MatchingRule { ... }

// Respostas
interface MatchResult { ... }
interface MatchResponse { ... }

// Utilitários
interface ComparatorFunction { ... }
```

**Propósito:** Única fonte de verdade para tipos compartilhados entre backend e frontend.

## 📍 Importações no Backend

### `src/backend/src/lib/matching.ts`

```typescript
// Calcula compatibilidade entre Tutores e Animais
import {
  TutorProfile,
  AnimalProfile,
  MatchingRule,
  MatchResult,
  ComparatorFunction,
} from "../../shared/types/index.js";

export class MatchingAlgorithm {
  // Implementação do algoritmo de scoring
  calculateScore(tutor: TutorProfile, animal: AnimalProfile, rules: MatchingRule[]): MatchResult { ... }
}
```

### `src/backend/src/index.ts`

```typescript
// API Express
import type { MatchResponse } from "../../shared/types/index.js";

app.post("/api/match", (req, res) => {
  const response: MatchResponse = { ... };
  res.json(response);
});
```

### `src/backend/src/db/seed.ts`

```typescript
// Script de seed
import type {
  TutorProfile,
  AnimalProfile,
  MatchingRule,
} from "../../shared/types/index.js";

function generateTutors(): Omit<TutorProfile, "id">[] { ... }
function generateAnimals(): Omit<AnimalProfile, "id">[] { ... }
function generateMatchingRules(): Omit<MatchingRule, "id">[] { ... }
```

## 📍 Importações no Frontend

### `src/frontend/types/shared.ts` (Re-export)

```typescript
// Re-exporta todos os tipos de src/shared/types
export type {
  Location,
  TutorProfile,
  AnimalProfile,
  MatchingRule,
  MatchResult,
  MatchResponse,
  ComparatorFunction,
} from "../../shared/types/index.js";
```

### `src/frontend/app/page.tsx`

```typescript
// Importa via alias configurado em tsconfig.json
import type { MatchResponse } from "@/types/shared";

export default function Home() {
  // Componentes React com tipagem TypeScript
}
```

## 🔧 Configurações TypeScript

### `src/backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

### `src/frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## 🔄 Fluxo de Desenvolvimento

### 1. Adicionar um Novo Tipo

Edite `src/shared/types/index.ts`:

```typescript
export interface NovoTipo {
  id: string;
  valor: string;
}
```

### 2. Usar no Backend

```typescript
// src/backend/src/lib/algo.ts
import type { NovoTipo } from "../../shared/types/index.js";

function processar(obj: NovoTipo) { ... }
```

### 3. Usar no Frontend

```typescript
// src/frontend/app/pagina.tsx
import type { NovoTipo } from "@/types/shared";

export default function Pagina() {
  const obj: NovoTipo = { ... };
}
```

## ✅ Benefícios

- **DRY (Don't Repeat Yourself):** Tipos definidos uma única vez
- **Type Safety:** Ambos os lados do projeto têm a mesma tipagem
- **Manutenção:** Alterar um tipo afeta automaticamente backend e frontend
- **Sincronização:** Impossível ter tipos desincronizados entre projetos
- **Compatibilidade:** Garante que API e cliente usem as mesmas estruturas

## 🚀 Compilação

### Backend

```bash
cd src/backend

# Desenvolvimento (usa ts-node, sem compilar)
npm run dev

# Compilar para produção
npm run build
# Gera: src/backend/dist/index.js
```

### Frontend

```bash
cd src/frontend

# Desenvolvimento
npm run dev

# Build para produção
npm run build
# Gera: src/frontend/.next/
```

## 📝 Próximas Etapas

- [ ] Adicionar validação de tipos em runtime (zod ou io-ts)
- [ ] Implementar geração automática de tipos a partir do schema SQL
- [ ] Criar testes com tipos garantidos
- [ ] Documentação de API com tipos exportados

## 📚 Referências

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js + TypeScript](https://expressjs.com/en/resources/middleware/cors.html)
- [Next.js TypeScript](https://nextjs.org/docs/basic-features/typescript)
