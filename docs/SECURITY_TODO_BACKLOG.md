# Checklist de Segurança - Próximas Etapas (Backlog)

Este documento lista as tarefas pendentes identificadas durante a auditoria de segurança de Junho/2026.

## 🔴 Alta Prioridade (Segurança de Dados)

- [x] **Criptografia de Tokens OAuth em Repouso:** (Concluido em 2026-06-10)
  - Implementado AES-256-GCM em `CalendarOAuthController.ts`.
  - Utiliza `ENCRYPTION_SECRET` das variaveis de ambiente.
- [x] **Implementação de Rate Limiting:** (Concluido em 2026-06-10)
  - Instalado `express-rate-limit` e configurado em `app.ts`.
  - Limites globais e estritos para `/api/match` e gerenciamento de admins.

## 🟡 Média Prioridade (Hardening)

- [x] **Endurecimento de Cabeçalhos HTTP (Backend):** (Concluido em 2026-06-10)
  - Adicionado o middleware `helmet` no `app.ts` do Express.
- [x] **Logs de Auditoria de Administração:**
  - Criar uma tabela de logs para registrar quem alterou recursos críticos via `AdminController`.
  - Implementado log de auditoria em `AdminController.ts` e `src/backend/src/lib/audit.ts` para operações de criação, atualização e exclusão.
- [x] **Validação de Runtime com Zod:**
  - Migrar as validações manuais de `apiSupport.ts` para schemas `zod` para garantir integridade de tipos em runtime.
  - `validateCalendarEventPayload` refatorado para usar Zod.
  - `validateMatchingRulePayload` refatorado para usar Zod.
  - `validateOngSettingsPayload` refatorado para usar Zod.
  - `validateCustomFieldPayload` refatorado para usar Zod (validação básica).
  - `validateTutorCustomFields` refatorado para usar Zod (validação básica).

## 🟢 Baixa Prioridade (Manutenção)

- [x] **Monitoramento de Dependências:**
  - Configurar o Dependabot ou similar para alertas automáticos de novas vulnerabilidades.
  - Configurado Dependabot via `.github/dependabot.yml` para dependencias NPM no root, backend e frontend.
- [x] **Revisão de Políticas de RLS:**
  - Auditar se todas as tabelas novas possuem RLS habilitado por padrão.
  - `admin_audit_logs` criada com RLS habilitado e politicas restritas a `public.is_admin(auth.uid())`; insercoes diretas tambem exigem `auth_user_id = auth.uid()`, enquanto o backend registra eventos com service role.
