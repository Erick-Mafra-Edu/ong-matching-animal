# Shared Types

Pasta centralizada para tipos e interfaces compartilhadas entre **Backend** e **Frontend**.

## 📦 Estrutura

```
src/shared/
└── types/
    └── index.ts  # Tipos compartilhados (TutorProfile, AnimalProfile, MatchingRule, etc)
```

## 🔗 Como Importar

### Backend
```typescript
import type { TutorProfile, AnimalProfile } from "../../shared/types/index.js";
```

### Frontend
```typescript
import type { TutorProfile, AnimalProfile } from "@/types/shared";
// Ou
import type { TutorProfile, AnimalProfile } from "../../shared/types/index.js";
```

## 📝 Tipos Disponíveis

- **Location** - Coordenadas geográficas (lng, lat)
- **TutorProfile** - Perfil do tutor/adotante
- **AnimalProfile** - Perfil do animal
- **MatchingRule** - Regra de compatibilidade
- **MatchResult** - Resultado de um match
- **MatchResponse** - Resposta da API de matching
- **ComparatorFunction** - Função de comparação

## ✨ Benefícios

- ✅ **DRY** - Não repetir tipos entre backend e frontend
- ✅ **Type Safety** - TypeScript nos dois lados
- ✅ **Sincronização** - Alterar uma vez afeta ambos os projetos
- ✅ **Manutenção** - Versão única da verdade para tipos

## 🚀 Adicionando Novos Tipos

1. Edite `src/shared/types/index.ts`
2. Os tipos estarão automaticamente disponíveis em ambos os projetos
3. Nenhum build adicional necessário
