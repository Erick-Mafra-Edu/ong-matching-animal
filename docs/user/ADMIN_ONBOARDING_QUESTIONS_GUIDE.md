# Cadastro De Perguntas De Onboarding No Admin

Repositorio: `Erick-Mafra-Edu/ong-matching-animal`

Este documento explica como um usuario administrador pode cadastrar, editar, ordenar e ativar perguntas de onboarding no painel administrativo.

## Objetivo

As perguntas de onboarding formam o questionario respondido pelo tutor antes de acessar os matches.

Elas servem para:

- coletar informacoes do adotante;
- montar o perfil usado no matching;
- alimentar campos customizados de tutor;
- orientar a priorizacao dos animais exibidos no sistema.

## Onde Encontrar No Sistema

No painel administrativo:

1. entre em `/admin`;
2. no menu lateral, clique em `Onboarding`;
3. use `Adicionar Novo` para criar uma pergunta.

## Como As Perguntas Funcionam

Cada pergunta cadastrada possui:

- um identificador tecnico;
- um texto visivel para o tutor;
- um tipo de resposta;
- opcionalmente uma lista de opcoes;
- definicao de obrigatoriedade;
- opcionalmente uma condicao eliminatoria;
- status ativo ou inativo;
- ordem de exibicao.

Quando a pergunta esta ativa, ela pode ser carregada no formulario publico de onboarding.

## Antes De Criar Uma Pergunta

Antes de cadastrar, defina:

1. qual dado voce quer coletar;
2. qual tipo de resposta faz sentido;
3. se a resposta precisa ser obrigatoria;
4. se essa pergunta sera usada depois em `Campos customizados` e `Regras`.
5. se essa pergunta deve bloquear o cadastro quando o tutor responder um valor especifico.

Exemplos comuns:

- energia preferida do tutor;
- tipo de moradia;
- convivencia com criancas;
- preferencias de perfil do pet;
- observacoes livres.

## Como Cadastrar Uma Nova Pergunta

### 1. Abrir o formulario

Na tela `Onboarding`, clique em `Adicionar Novo`.

O formulario abre com valores padrao:

- tipo: `text`
- obrigatoria: `ligado`
- ativa: `ligado`
- ordem: `0`

### 2. Preencher o identificador

O campo `Identificador` e a chave tecnica da pergunta.

Regras:

- use apenas letras minusculas;
- use numeros quando necessario;
- use underscore `_` para separar palavras.

Exemplos:

- `preferred_energy`
- `home_type`
- `has_children`

Observacao:

- se voce preencher primeiro o campo `Pergunta`, o admin tenta gerar automaticamente o identificador enquanto ele ainda estiver vazio;
- depois que o identificador for preenchido, ele deixa de ser ajustado automaticamente.

### 3. Preencher o texto da pergunta

No campo `Pergunta`, escreva exatamente o enunciado que o tutor vai ver.

Exemplos:

- `Qual nivel de energia voce prefere no pet?`
- `Voce tem criancas em casa?`
- `Como e o seu tipo de moradia?`

### 4. Adicionar descricao

O campo `Descrição` e opcional.

Use para:

- contextualizar a pergunta;
- orientar a resposta;
- reduzir ambiguidade.

Exemplo:

- `Essa resposta ajuda a priorizar animais com rotina mais compatível com a sua casa.`

### 5. Adicionar texto de apoio

O campo `Texto de apoio` funciona como placeholder ou sugestao curta.

Exemplos:

- `Selecione uma opção`
- `Descreva em poucas palavras`

### 6. Escolher o tipo de resposta

No campo `Tipo de resposta`, escolha um dos formatos disponiveis.

Opcoes existentes no admin:

- `Texto`
- `Número`
- `Escolha única`
- `Múltiplas escolhas`
- `Opções em rádio`
- `Sim ou não`

### 7. Preencher opções, quando necessário

Para perguntas de escolha, use o campo `Opções`.

Adicione uma opcao por linha.

Exemplo:

```text
baixo
medio
alto
```

No envio para o backend, o admin transforma essas opcoes no formato:

```json
[
  { "label": "Baixo", "value": "baixo" },
  { "label": "Medio", "value": "medio" },
  { "label": "Alto", "value": "alto" }
]
```

Ou seja:

- o `value` fica com a chave tecnica;
- o `label` vira a versao humanizada para o tutor.

### 8. Definir se a resposta e obrigatoria

No campo `Resposta obrigatória`:

- ligado: o tutor precisa responder;
- desligado: a pergunta pode ser pulada.

### 9. Definir se a pergunta e eliminatoria

No campo `Pergunta eliminatória`:

- desligado: a pergunta apenas coleta informacao;
- ligado: a pergunta pode bloquear o cadastro se a resposta bater com um dos valores configurados.

Quando ativar essa opcao, o admin libera mais dois campos:

- `Valores que bloqueiam`
- `Mensagem de bloqueio`

### 10. Preencher os valores que bloqueiam

Use o campo `Valores que bloqueiam` para informar quais respostas impedem o cadastro.

Regras praticas:

- informe um valor por linha;
- use o `value` tecnico da pergunta, nao o texto visivel;
- para perguntas `Sim ou não`, use `true` ou `false`.

Exemplos:

```text
false
```

ou

```text
apartamento
casa_sem_quintal
```

Observacao importante:

- o backend valida se esses valores realmente existem entre as opcoes da pergunta;
- perguntas eliminatorias so funcionam com `Escolha única`, `Múltiplas escolhas`, `Opções em rádio` e `Sim ou não`.

### 11. Definir a mensagem de bloqueio

No campo `Mensagem de bloqueio`, escreva o texto que o tutor vera quando a resposta impedir o cadastro.

Exemplo:

- `No momento, esta ONG atende apenas lares com quintal fechado.`

Se esse campo ficar vazio, o sistema usa uma mensagem padrao.

### 12. Definir se a pergunta esta ativa

No campo `Pergunta ativa`:

- ligada: a pergunta pode aparecer no onboarding;
- desligada: a pergunta fica cadastrada, mas fora de uso.

### 13. Definir a ordem

No campo `Ordem`, informe a posicao desejada.

As perguntas sao carregadas em ordem crescente de `sort_order`.

Exemplo:

- `0` para a primeira pergunta
- `10` para a segunda
- `20` para a terceira

Usar intervalos ajuda a reorganizar depois sem precisar renumerar tudo.

## Significado De Cada Campo

### Identificador

Chave tecnica da pergunta.

Esse valor e importante porque:

- identifica a resposta no frontend;
- pode ser usado para vincular `Campos customizados` do tutor;
- influencia a integracao com o matching.

### Pergunta

Texto principal mostrado ao tutor.

### Descrição

Texto auxiliar logo abaixo da pergunta.

### Texto de apoio

Placeholder ou orientacao curta no campo de resposta.

### Tipo de resposta

Controla como a pergunta sera renderizada para o tutor.

### Opções

Usado apenas em perguntas de escolha.

### Resposta obrigatória

Define se o sistema impede o envio sem resposta.

### Pergunta eliminatória

Define se a resposta pode barrar o cadastro.

Quando ativada:

- o frontend valida antes de concluir o cadastro;
- o backend valida novamente antes de salvar o tutor;
- o tutor nao entra no sistema se responder um valor bloqueado.

### Valores que bloqueiam

Lista tecnica de respostas que impedem o cadastro.

### Mensagem de bloqueio

Texto devolvido ao tutor quando a regra eliminatoria for acionada.

### Pergunta ativa

Controla se a pergunta participa do onboarding atual.

### Ordem

Controla a sequencia visual do questionario.

## Tipos De Pergunta E Como O Tutor Ve

### Texto

Renderiza um campo de texto maior, em formato de area de digitacao.

Use para:

- observacoes;
- explicacoes curtas;
- respostas livres.

### Escolha única

Renderiza um seletor com uma unica resposta.

Use para:

- classificacoes simples;
- categorias com apenas uma escolha valida.

### Múltiplas escolhas

Renderiza botoes de selecao multipla.

Use para:

- preferencias;
- combinacoes de perfil;
- caracteristicas desejadas.

### Opções em rádio

Renderiza botoes para apenas uma escolha visivel.

Use para:

- decisoes simples;
- alternativas fechadas.

### Sim ou não

Renderiza botoes `Sim` e `Não`.

Use para:

- perguntas binarias;
- condicoes objetivas.

Esse tipo tambem pode ser usado como pergunta eliminatoria.

### Número

Cuidado operacional:

- o admin aceita esse tipo;
- o backend valida esse tipo;
- mas o formulario publico atual de onboarding nao implementa um campo visual especifico para `number`.

Recomendacao:

- evite criar novas perguntas com `Número` ate validar se a interface publica da versao atual realmente vai tratar esse campo como esperado.

## Quando O Campo Opções E Obrigatório

As opcoes sao obrigatorias para perguntas de escolha:

- `Escolha única`
- `Múltiplas escolhas`
- `Opções em rádio`

Se voce tentar salvar uma dessas perguntas sem opcoes, o backend rejeita o cadastro.

## Como Funciona Uma Pergunta Eliminatoria Na Pratica

Quando uma pergunta eliminatoria esta ativa:

1. o tutor responde normalmente no cadastro;
2. o frontend consulta a validacao de elegibilidade antes de concluir;
3. se a resposta bater em um valor bloqueado, a conta nao e criada;
4. se alguem tentar burlar o frontend, o backend bloqueia do mesmo jeito antes de salvar o tutor.

Isso significa que a regra nao depende apenas da interface visual.

## Exemplo Pratico De Pergunta Eliminatoria

### Cenário

Voce quer impedir cadastro de lares sem quintal.

### Cadastro

- `Identificador`: `has_yard`
- `Pergunta`: `Voce tem quintal?`
- `Tipo de resposta`: `Sim ou não`
- `Resposta obrigatória`: ligada
- `Pergunta eliminatória`: ligada
- `Valores que bloqueiam`:

```text
false
```

- `Mensagem de bloqueio`: `No momento, esta ONG atende apenas lares com quintal fechado.`
- `Pergunta ativa`: ligada
- `Ordem`: `15`

### Resultado esperado

- se o tutor responder `Sim`, o cadastro continua;
- se o tutor responder `Não`, o sistema mostra a mensagem configurada e interrompe o cadastro.

## Exemplo Pratico

### Cenário

Voce quer perguntar qual nivel de energia o tutor prefere.

### Cadastro

- `Identificador`: `preferred_energy`
- `Pergunta`: `Qual nivel de energia voce prefere no pet?`
- `Descrição`: `Essa resposta ajuda a aproximar voce de animais com rotina compatível.`
- `Texto de apoio`: `Selecione uma opção`
- `Tipo de resposta`: `Escolha única`
- `Opções`:

```text
baixo
medio
alto
```

- `Resposta obrigatória`: ligada
- `Pergunta ativa`: ligada
- `Ordem`: `20`

### Resultado esperado

No onboarding, o tutor vera uma pergunta fechada com as opcoes:

- Baixo
- Medio
- Alto

## Como Editar Uma Pergunta

1. clique na pergunta na lista;
2. ajuste os campos desejados;
3. clique em `Salvar Alterações`.

Observacao importante:

- o `Identificador` e `createOnly`, ou seja, ele so aparece no cadastro inicial;
- depois de criada, a pergunta e editada sem trocar esse identificador no formulario.

## Como Desativar Sem Apagar

Se quiser tirar uma pergunta do onboarding sem perder historico:

1. abra a pergunta;
2. desligue `Pergunta ativa`;
3. salve.

Essa e a forma recomendada para testes e transicoes.

## Como Apagar

1. selecione a pergunta;
2. use o botao de exclusao no formulario;
3. confirme a exclusao.

So apague quando tiver certeza de que a pergunta nao sera mais usada.

## Como Organizar A Ordem Das Perguntas

Boas praticas para `Ordem`:

- use blocos de 10 em 10;
- agrupe perguntas parecidas;
- coloque primeiro perguntas essenciais;
- deixe perguntas abertas mais para o final, quando fizer sentido.

Exemplo de sequencia:

- `0` introducao objetiva
- `10` contexto da casa
- `20` energia e rotina
- `30` convivencia
- `40` preferencias
- `50` observacoes livres

## Relação Com Campos Customizados

As perguntas de onboarding podem alimentar campos do tutor usados no matching.

Fluxo recomendado:

1. criar a pergunta em `Onboarding`;
2. criar ou revisar um `Campo customizado` de tutor;
3. vincular o campo customizado a essa pergunta;
4. depois usar esse campo nas `Regras`.

Importante:

- campos customizados de tutor exigem vinculo com pergunta de onboarding ativa;
- se a pergunta estiver inativa ou inexistente, o vinculo pode ser rejeitado pelo backend.

## Relação Com O Matching

Nem toda pergunta precisa virar regra de matching.

Use no matching apenas perguntas que:

- tenham valor comparavel;
- influenciem compatibilidade real;
- possam ser cruzadas com dados do animal.

Exemplos bons para matching:

- energia
- tamanho da casa
- convivencia com criancas
- preferencias de perfil

Exemplos mais livres, normalmente sem regra direta:

- observacoes abertas
- comentarios gerais

Importante:

- uma pergunta eliminatoria de onboarding barra a entrada do tutor no sistema;
- uma regra eliminatoria de matching barra apenas determinados animais.

Sao camadas diferentes e com objetivos diferentes.

## Validações Importantes

O backend valida:

- identificador em formato tecnico;
- texto da pergunta preenchido;
- tipo valido;
- opcoes obrigatorias para perguntas de escolha.
- se a pergunta eliminatoria usa um tipo suportado;
- se os valores bloqueados existem entre as opcoes da pergunta;
- o bloqueio do cadastro antes de salvar o tutor.

## Erros Comuns

### Criar pergunta de escolha sem opções

Resultado:

- o cadastro falha

### Marcar pergunta eliminatoria sem informar valores que bloqueiam

Resultado:

- o backend rejeita o cadastro da pergunta no admin

### Informar valor bloqueado diferente das opcoes da pergunta

Resultado:

- o backend rejeita o cadastro da pergunta no admin

### Usar identificador com espacos, acentos ou maiusculas

Resultado:

- o identificador e sanitizado ou rejeitado

### Criar pergunta com tipo `Número`

Risco:

- o admin salva, mas o formulario publico atual pode nao renderizar esse tipo como esperado

### Desativar pergunta usada por campo customizado sem revisar o restante

Risco:

- o fluxo de dados do tutor ficar inconsistente com campos usados no matching

## Boas Práticas

- escreva perguntas curtas e objetivas;
- use descricao apenas quando ela realmente ajuda;
- padronize identificadores em ingles tecnico ou outro padrao interno consistente;
- use opcoes com valores simples e estaveis;
- use pergunta eliminatoria apenas para requisitos reais da ONG;
- escreva a mensagem de bloqueio em linguagem clara e objetiva;
- prefira desativar antes de excluir;
- revise a relacao entre onboarding, campos customizados e regras de matching.

## Fluxo Recomendado Para Administrador

1. definir a informacao que deseja coletar;
2. criar a pergunta em `Onboarding`;
3. testar se o tipo faz sentido para o tutor;
4. decidir se a pergunta e eliminatoria ou apenas informativa;
5. ajustar a ordem e obrigatoriedade;
6. se a resposta precisar entrar no matching, criar ou vincular o campo customizado correspondente;
7. depois usar esse campo nas regras, se necessario.

## Referencias Tecnicas

- `src/frontend/components/features/Admin/AdminPanel.tsx`
- `src/backend/src/controllers/apiSupport.ts`
- `src/frontend/lib/onboarding.ts`
- `src/frontend/components/features/Onboarding/OnboardingForm.tsx`
