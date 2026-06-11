# Relatório de Auditoria de Segurança - ONG Matching Animal

**Data:** 10 de Junho de 2026  
**Status:** Concluído (Fase 1)  
**Nível de Risco Inicial:** Crítico  
**Nível de Risco Atual:** Médio  

---

## 1. Resumo Executivo
Esta auditoria focou na validação de dados no backend, integridade de uploads e atualização de dependências vulneráveis. Foram eliminados riscos de Execução de Código Remota (RCE) e Mass Assignment que permitiam escalação de privilégios.

## 2. Vulnerabilidades Corrigidas (Resolvidas)

### 2.1. Mass Assignment / Over-posting (API3:2023)
- **Problema:** Controllers aceitavam objetos JSON brutos, permitindo alteração de campos restritos (ex: `is_active`, `role`).
- **Solução:** Implementação da função `pickFields` e centralização da validação em `apiSupport.ts`.

### 2.2. Dependências Críticas Vulneráveis (OWASP A06:2021)
- **Problema:** Next.js v14 e pacotes de sistema com vulnerabilidades de RCE e DoS.
- **Solução:** Atualização para **Next.js v16.2.9** e execução de `npm audit fix --force`.

### 2.3. Integridade de Metadados de Mídia
- **Problema:** O frontend definia a URL pública das fotos, permitindo apontar para domínios maliciosos.
- **Solução:** Geração determinística da `public_url` no servidor.

### 2.4. Injeção de Campos Customizados
- **Problema:** Aceitação de chaves JSON arbitrárias nos perfis de tutores.
- **Solução:** Validação estrita contra a lista de perguntas de onboarding ativas no banco de dados.

## 3. Práticas Positivas Identificadas
- **Content Security Policy (CSP):** Implementação robusta no frontend.
- **Row Level Security (RLS):** Ativo no Supabase para isolamento de dados.
- **Signed URLs:** Uso correto para uploads seguros no Storage.

## 4. Veredito Final
A aplicação está significativamente mais segura. Os riscos bloqueadores foram removidos, restando melhorias de endurecimento (hardening) recomendadas para a próxima fase.

---
**Assinado:** Engenheiro de Segurança de Aplicações Sênior
