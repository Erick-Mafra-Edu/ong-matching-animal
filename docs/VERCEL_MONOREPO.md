# Deploy do Monorepo na Vercel

Este repositório usa workspaces npm e dois projetos Vercel associados ao mesmo
repositório Git.

## Estrutura

| Aplicação | Root Directory | Framework | Configuração |
| --- | --- | --- | --- |
| Backend | `src/backend` | Express | `src/backend/vercel.json` |
| Frontend | `src/frontend` | Next.js | `src/frontend/vercel.json` |

O pacote `src/shared` expõe os tipos TypeScript usados pelas duas aplicações.

## Instalação

Execute a instalação uma vez na raiz:

```bash
npm ci
```

O npm cria os links dos workspaces automaticamente. Não instale dependências
separadamente dentro de `src/backend` ou `src/frontend`.

## Desenvolvimento Local

Para iniciar as duas aplicações:

```bash
npm run dev
```

O frontend fica disponível em `http://localhost:3000` e encaminha chamadas
`/api/*` para o backend em `http://localhost:3001`.

Para validar o runtime local da Vercel em terminais separados:

```bash
npm run vercel:dev:backend
npm run vercel:dev:frontend
```

Teste o backend:

```bash
curl http://localhost:3001/api/health
```

## Validação Antes do Push

```bash
npm run verify
```

Esse comando executa a suíte Jest do backend, valida o build Next.js e compila
as duas aplicações.

## Configuração dos Projetos na Vercel

Crie ou ajuste dois projetos Vercel conectados ao mesmo repositório:

1. Backend: defina `Root Directory` como `src/backend`.
2. Frontend: defina `Root Directory` como `src/frontend`.
3. Mantenha habilitado o acesso a arquivos fora do diretório raiz para permitir
   o uso do workspace `src/shared`.
4. Não adicione um `vercel.json` na raiz.
5. Não use a propriedade legada `builds`.

Para registrar os projetos localmente em uma única configuração de monorepo:

```bash
vercel link --repo
```

## Preview Deploy

Com o repositório vinculado:

```bash
# Backend
vercel deploy --yes

# Frontend
vercel deploy src/frontend --yes
```

Para consultar um preview protegido do backend:

```bash
vercel curl /api/health --deployment https://URL-DO-PREVIEW
```

## Produção

Os deploys de produção devem ser gerados a partir da branch `main`. Antes do
push, execute `npm run verify`.

As URLs do backend e do frontend são independentes. Configure no frontend a URL
do backend de produção quando a integração HTTP for implementada.
