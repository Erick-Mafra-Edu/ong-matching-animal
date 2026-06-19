# OpenAPI Contracts

Mantenha os contratos OpenAPI separados por contexto.

## Regras

1. Schemas compartilhados ou de um domínio ficam em `definitions/`.
2. Rotas ficam em `paths/`.
3. Se o contexto já existir, edite o arquivo do contexto.
4. Se for um contexto novo, crie os arquivos correspondentes e importe no `openapi.ts`.
5. O `openapi.ts` deve apenas compor `definitions` e `paths` com spread.

## Fluxo

1. Criar ou alterar o schema em `definitions/<contexto>.ts`.
2. Criar ou alterar a rota em `paths/<contexto>.ts`.
3. Importar e espalhar no `openapi.ts` apenas se o contexto for novo.
