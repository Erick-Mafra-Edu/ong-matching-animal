# Google Calendar Sync com PGMQ

Esta integracao usa Supabase Edge Function + PGMQ para sincronizar `calendar_events` com Google Calendar em batch.

## Banco

Aplique as migrations:

- `src/backend/db/migrations/013_calendar_oauth_connections.sql`
- `src/backend/db/migrations/014_calendar_sync_pgmq.sql`

A migration `014` habilita `pgmq`, cria as filas:

- `calendar_sync`
- `calendar_sync_failed`

Tambem cria trigger em `calendar_events` para enviar mensagens para `calendar_sync` quando eventos forem criados, atualizados ou removidos.

## Edge Function

Funcao:

- `supabase/functions/sync-google-calendar/index.ts`

Variaveis necessarias:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
CALENDAR_SYNC_SECRET=
CALENDAR_SYNC_BATCH_SIZE=20
CALENDAR_SYNC_MAX_ATTEMPTS=5
CALENDAR_SYNC_VISIBILITY_TIMEOUT_SECONDS=120
CALENDAR_SYNC_TIME_ZONE=America/Sao_Paulo
```

Chamada manual:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/sync-google-calendar" \
  -H "Authorization: Bearer $CALENDAR_SYNC_SECRET"
```

## Fluxo

1. O backend grava apenas em `calendar_events`.
2. O trigger envia uma mensagem PGMQ para `calendar_sync`.
3. A Edge Function le mensagens em batch com visibility timeout.
4. Ao sincronizar com sucesso, a mensagem e arquivada.
5. Ao falhar, a mensagem volta para a fila apos o timeout.
6. Apos `CALENDAR_SYNC_MAX_ATTEMPTS`, a mensagem vai para `calendar_sync_failed`.
7. A mesma execucao tambem puxa eventos alterados no Google e atualiza `calendar_events`.

## Observacao

Atualizacoes feitas pela Edge Function gravam `metadata.calendar_sync.source = "google_edge_function"`.
O trigger ignora essas alteracoes para evitar loop de sincronizacao.
