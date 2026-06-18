# Triagem Das Issues Abertas - 2026-06-18

Repositorio: `Erick-Mafra-Edu/ong-matching-animal`

Este documento reavalia as issues que ainda estavam abertas em 2026-06-18, depois do fechamento de `#33`, `#34`, `#36` e `#37`.

Objetivo da triagem:

1. identificar issues abertas que ja estao concluidas no repositorio, mas ainda sem fechamento manual;
2. separar issues parcialmente concluidas, com parte do escopo entregue;
3. manter como pendentes as issues sem evidencia suficiente de implementacao.

Observacao: quando houve duvida de escopo, a classificacao foi conservadora.

## 1. Concluidas Sem Fechamento

Estas issues continuam abertas no GitHub, mas ja possuem evidencia objetiva no repositorio para serem fechadas.

| Issue | Status sugerido | Motivo | Evidencias |
| --- | --- | --- | --- |
| `#11` - Issue 1.3: Mapeamento do Algoritmo de Match | Fechar | Ja existe documentacao dedicada explicando score, operadores, dealbreakers, fluxo de execucao e referencias tecnicas da implementacao. | `docs/MATCHING_ALGORITHM.md`, `src/backend/src/lib/matching.ts`, `src/backend/src/controllers/SystemController.ts` |
| `#12` - Sub-issue: Definir documentacao da logica de pesos e cruzamento de dados | Fechar | A documentacao do algoritmo ja cobre pesos, comparadores, campos tutor x animal, exemplos de regras e filtragem geografica. | `docs/MATCHING_ALGORITHM.md`, `docs/IMPLEMENTAR_RPC_MATCH_SCORE_SUPABASE_WEB.md` |

## 2. Parcialmente Concluidas

Estas issues tem partes importantes do escopo implementadas, mas ainda nao encontrei evidencia suficiente para fechamento completo.

| Issue | Status sugerido | O que ja existe | O que ainda falta / motivo para manter aberta | Evidencias |
| --- | --- | --- | --- | --- |
| `#38` - Epic 4: Testes, Seguranca e Lancamento | Manter aberta | Ha testes unitarios, testes de integracao backend, testes E2E frontend e artefatos de auditoria Lighthouse. | Ainda existem subitens abertos de QA, responsividade e E2E ate WhatsApp. | `src/backend/src/lib/__tests__/matching.test.ts`, `src/backend/src/__tests__/api.test.ts`, `src/frontend/e2e/login.spec.ts`, `src/frontend/e2e/admin.spec.ts`, `docs/reports_lighthouse/*` |
| `#41` - Issue 4.2: Validacao e Testes Quality Assurance (QA) | Manter aberta | O projeto ja roda Playwright e possui relatorios/artefatos de verificacao. | Nao ha evidencia de um pacote completo de QA fechando responsividade, fluxo ate WhatsApp e criterio formal de aceite. | `src/frontend/playwright.config.ts`, `src/frontend/e2e/*.spec.ts`, `README.md` |
| `#42` - Sub-issue: Realizar testes de responsividade do layout em diferentes dispositivos | Manter aberta | Existem indicios de preocupacao com mobile no codigo e ha relatorios Lighthouse em fator mobile. | Nao encontrei suite dedicada multi-dispositivo, matriz de viewports ou relatorio objetivo cobrindo as telas principais. | `docs/reports_lighthouse/ong-matching-animalfrontend.vercel.app-20260614T*.json`, `src/frontend/components/features/AdoptionDashboard/MobileNavigation.tsx`, `src/frontend/app/globals.css` |
| `#44` - Sub-issue: Realizar teste End-to-End (E2E) simulando o fluxo completo ate o disparo da mensagem no WhatsApp | Manter aberta | Ja existem testes E2E no frontend e o fluxo de WhatsApp foi implementado. | Os testes atuais nao chegam ate o CTA final de WhatsApp nem validam a URL `wa.me` no fluxo completo do usuario. | `src/frontend/e2e/login.spec.ts`, `src/frontend/e2e/admin.spec.ts`, `src/frontend/components/features/AdoptionDashboard/AdoptionDashboard.tsx`, `src/frontend/lib/ongSettings.ts` |
| `#28` - Issue 3.2: Upload e Gerenciamento de Arquivos | Manter aberta | O upload e gerenciamento de fotos de animais pela ONG esta implementado com URL assinada e registro de metadados. | O titulo da issue sugere um escopo mais amplo; o upload de foto da residencia ainda nao foi localizado. | `src/frontend/lib/admin.ts`, `src/backend/src/controllers/AnimalsController.ts`, `docs/IMAGE_UPLOAD_COMPRESSION.md` |
| `#16` - Sub-issue: Configurar variaveis globais de CSS3 (cores, tipografia, espacos) | Manter aberta | Ja ha variaveis globais em `:root` para paleta, contraste, fundos e estados de campos, com suporte claro/escuro. | Nao encontrei padrao equivalente para espacamentos e tipografia via tokens globais; a fonte segue declarada diretamente no `body`. | `src/frontend/app/globals.css` |
| `#14` - Issue 2.1: Estruturacao Base e Design System | Manter aberta | Existe uma base visual consistente, classes reutilizaveis e tokens de cor no global. | Nao ha evidencia clara de documentacao formal do design system, inventario de componentes ou especificacao de uso. | `src/frontend/app/globals.css`, `src/frontend/components/ui/*`, `src/frontend/components/layout/*` |

## 3. Realmente Pendentes

Estas issues continuam abertas por falta de evidencia suficiente no repositorio, ou porque o escopo principal ainda nao apareceu implementado.

| Issue | Status sugerido | Motivo para continuar aberta | Evidencias consultadas |
| --- | --- | --- | --- |
| `#1` - Epic 1: Planejamento, Modelagem e Infraestrutura | Manter aberta | Ainda depende de subitens abertos de documentacao/planejamento do matching e consolidacao da epica. | Relacao com `#11` e `#12`; auditoria anterior em `docs/GITHUB_ISSUES_AUDIT_2026-06-08.md` |
| `#19` - Sub-issue: Desenvolver formulario do Questionario de Pre-entrevista (adotante + upload de foto da residencia) | Manter aberta | O onboarding/questionario existe, mas o upload da foto da residencia nao foi encontrado. | `src/frontend/components/features/Onboarding/*`, `docs/GITHUB_ISSUES_AUDIT_2026-06-08.md`, buscas por `residencia` e `upload` |
| `#21` - Sub-issue: Desenvolver a pagina de Detalhes do Animal | Manter aberta | Nao encontrei uma rota/pagina dedicada de detalhe do animal; o que existe hoje e a tela de detalhe do interesse. | `src/frontend/app/interesses/page.tsx`, `src/backend/src/controllers/InterestsController.ts`, `src/frontend/components/features/AdoptionDashboard/AdoptionDashboard.tsx` |
| `#29` - Sub-issue: Implementar logica JS para enviar foto da residencia ao Supabase Storage durante a pre-entrevista | Manter aberta | Nao foi localizada logica JS para upload da residencia equivalente ao fluxo administrativo de fotos de animais. | `src/frontend/lib/admin.ts`, `src/backend/src/controllers/AnimalsController.ts`, buscas por `residencia`, `signed URL`, `upload` |

## Resumo Executivo

- Prontas para fechamento manual no GitHub: `#11`, `#12`
- Parcialmente concluidas, mas ainda abertas com motivo valido: `#38`, `#41`, `#42`, `#44`, `#28`, `#16`, `#14`
- Realmente pendentes: `#1`, `#19`, `#21`, `#29`

## Mudancas Em Relacao A Auditoria De 2026-06-08

- `#33`, `#34`, `#36` e `#37` ja foram fechadas.
- `#11` e `#12` mudaram de "abertas por falta de documentacao" para "concluidas sem fechamento", porque agora existe `docs/MATCHING_ALGORITHM.md`.
- `#44` mudou de "sem fluxo implementado" para "parcial", porque o fluxo de WhatsApp existe e os E2E existem, mas o teste ponta a ponta ate o CTA final ainda nao foi localizado.
- `#42` passa a ter evidencia parcial por causa dos relatórios Lighthouse mobile, mas isso ainda nao substitui uma validacao responsiva dedicada.

## Proxima Acao Recomendada

1. Fechar manualmente `#11` e `#12`.
2. Criar uma issue tecnica ou subtarefa para ampliar o Playwright ate validar o link `wa.me` no fluxo real de adocao.
3. Decidir se `#28` deve ser repartida em "upload de fotos de animais" e "upload de residencia", para evitar ambiguidade de escopo.
