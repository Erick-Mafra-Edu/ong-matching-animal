# Cadastro De Regras No Admin

Repositorio: `Erick-Mafra-Edu/ong-matching-animal`

Este documento explica como um usuario administrador pode cadastrar, revisar e testar regras de matching no menu de admin.

## Objetivo

As regras de matching definem como o sistema compara dados do tutor com dados do animal para decidir:

- quais animais ganham pontos;
- quais animais devem ser excluidos da fila;
- como a ordenacao final de compatibilidade sera montada.

Em termos simples:

- uma regra normal soma pontos quando a comparacao passa;
- uma regra eliminatoria remove o animal do resultado quando falha.

## Onde Encontrar No Sistema

No painel administrativo:

1. entre em `/admin`;
2. no menu lateral, clique em `Regras`;
3. a tela abre o workspace `Motor de Regras`.

Nessa area existem duas partes principais:

- lista de regras cadastradas;
- formulario visual para criar ou editar a regra;
- simulador para testar o efeito das regras com tutores e animais reais cadastrados.

## Antes De Cadastrar Uma Regra

O cadastro de regra depende de campos customizados existentes.

Isso significa que, antes de criar uma regra, voce precisa garantir que:

1. existe um campo customizado para o tutor;
2. existe um campo customizado para o animal;
3. os dois campos fazem sentido para comparacao.

Exemplos:

- tutor: `pref_energia`
- animal: `nivel_energia`

ou

- tutor: `tem_criancas`
- animal: `aceita_criancas`

Se o campo ainda nao existir:

1. abra `Campos customizados`;
2. crie o campo para `tutor` ou `animal`;
3. volte ao menu `Regras`.

## Como Cadastrar Uma Nova Regra

### 1. Abrir o formulario

Na tela `Regras`, clique em `Adicionar Novo`.

O formulario sera aberto com valores padrao:

- condicao: `=`
- impacto: `50`
- regra eliminatoria: `desligado`
- regra ativa: `ligado`

### 2. Preencher o nome da regra

No campo `Nome da regra`, escreva um nome claro e operacional.

Boas praticas:

- use nomes curtos;
- descreva o criterio da comparacao;
- facilite auditoria futura.

Exemplos:

- `Energia compativel`
- `Tutor aceita pet com criancas`
- `Espaco minimo para porte grande`

### 3. Definir a logica da comparacao

Na secao `Construtor logico visual`, preencha:

- `Se o`: campo do tutor
- `For`: operador de comparacao
- `Do que`: campo do animal

Exemplo:

- `Se o` = `pref_energia`
- `For` = `Igual a`
- `Do que` = `nivel_energia`

Isso cria a expressao:

```text
pref_energia = nivel_energia
```

## Significado Dos Campos

### Nome da regra

Campo livre para identificar a regra na fila administrativa, no simulador e em futuras auditorias.

### Campo do tutor

Seleciona qual dado do perfil do tutor sera usado na comparacao.

Essas opcoes sao carregadas a partir dos campos customizados cadastrados para `tutor`.

### Condicao

Define como os valores serao comparados.

Opcoes disponiveis:

- `Igual a` (`=`): os valores precisam ser iguais
- `Diferente de` (`!=`): os valores precisam ser diferentes
- `Contiver` (`contains`): o valor precisa estar contido conforme a logica do sistema
- `Maior ou igual a` (`>=`): usado para comparacoes de nivel/rank
- `Menor ou igual a` (`<=`): usado para comparacoes de nivel/rank

### Campo do animal

Seleciona qual dado do animal sera comparado com o campo do tutor.

Essas opcoes sao carregadas a partir dos campos customizados cadastrados para `animal`.

### Impacto na pontuacao

Usado apenas quando a regra nao e eliminatoria.

Faixa:

- `0` = impacto minimo
- `50` = impacto medio
- `100` = impacto alto

Quando a regra passa, esse valor e somado ao score do animal.

### Regra eliminatoria

Quando ativada, a regra deixa de somar pontos e passa a funcionar como corte.

Efeito:

- se a comparacao passar, o animal continua elegivel;
- se a comparacao falhar, o animal sai da fila de resultados para aquele tutor.

Use com cautela.

### Regra ativa

Controla se a regra participa ou nao do matching.

- ativa: entra no calculo;
- pausada: fica salva, mas nao interfere no resultado.

## Como Escolher O Operador Correto

### `Igual a`

Use quando tutor e animal devem ter exatamente o mesmo valor.

Exemplos:

- `pref_energia = nivel_energia`
- `tem_criancas = aceita_criancas`

### `Diferente de`

Use quando o valor do tutor nao pode coincidir com o valor do animal.

Exemplo:

- restricao especifica entre preferencia e caracteristica

### `Contiver`

Use quando a relacao envolve listas, grupos de preferencias ou textos com multiplas opcoes.

Exemplo:

- tutor informa preferencias
- animal possui caracteristicas

Observacao importante:

- o sistema trata essa comparacao como uma verificacao de compatibilidade entre os valores armazenados nos campos;
- em casos de arrays e listas, o simulador ajuda a validar o comportamento antes de ativar a regra.

### `Maior ou igual a` e `Menor ou igual a`

Use quando os valores representam escalas ordenadas.

Exemplos comuns:

- energia
- espaco
- exigencia

O sistema converte alguns textos em rank interno, por exemplo:

- `baixo` = 1
- `medio` = 2
- `alto` = 3

e tambem:

- `apartamento` = 1
- `casa_quintal_pequeno` = 2
- `casa_quintal_grande` = 3

## Regras Normais X Regras Eliminatorias

### Quando usar regra normal

Use regra normal quando o criterio deve influenciar a ordem dos resultados, mas nao bloquear completamente o animal.

Exemplo:

- energia compativel vale `+40`

### Quando usar regra eliminatoria

Use regra eliminatoria apenas quando o criterio for obrigatorio.

Exemplos:

- tutor nao pode receber animal incompatível com criancas
- tutor nao possui espaco minimo para um perfil especifico

Se uma regra eliminatoria falhar, o animal e removido do resultado, mesmo que tivesse pontuacao alta nas outras regras.

## Exemplo Pratico De Cadastro

### Cenário

Voce quer dar pontos quando a preferencia de energia do tutor combina com o nivel de energia do animal.

### Preenchimento

- `Nome da regra`: `Energia compativel`
- `Campo do tutor`: `pref_energia`
- `Condicao`: `Igual a`
- `Campo do animal`: `nivel_energia`
- `Impacto na pontuacao`: `40`
- `Regra eliminatoria`: `desligado`
- `Regra ativa`: `ligado`

### Resultado esperado

Quando os dois valores forem iguais:

- o animal recebe `+40` pontos

Quando forem diferentes:

- o animal nao ganha pontos por essa regra

## Como Salvar

Depois de preencher:

1. revise o `Preview da regra`;
2. confirme se a frase montada representa o comportamento esperado;
3. clique em `Criar Registro`.

Para alterar uma regra existente:

1. clique na regra na lista;
2. ajuste os campos;
3. clique em `Salvar Alterações`.

Para remover:

1. selecione a regra;
2. use o botao de exclusao do formulario.

## Como Pausar E Reativar Uma Regra

Na lista de regras, cada item possui um botao:

- `Pausar para teste A/B`
- `Reativar regra`

Esse recurso e util para:

- testar impacto sem apagar a regra;
- comparar resultados antes e depois;
- desativar temporariamente um criterio problemático.

## Como Testar No Simulador

A tela de `Regras` possui um `Simulador conectado`.

Ele usa dados reais de:

- tutores cadastrados;
- animais cadastrados;
- regras salvas.

### Como usar

1. selecione um tutor;
2. selecione um animal, se quiser auditar um caso especifico;
3. veja o score e os dealbreakers;
4. revise o detalhamento de cada regra.

### O que observar

Para cada regra, o simulador mostra:

- se passou ou falhou;
- qual valor veio do tutor;
- qual valor veio do animal;
- quantos pontos foram somados;
- se a regra apenas liberou o fluxo ou eliminou o animal.

### Quando usar o simulador

Use sempre que:

- criar uma regra nova;
- mudar operador;
- transformar regra normal em eliminatoria;
- ajustar peso;
- suspeitar que os campos cadastrados nao estao coerentes.

## Erros Comuns

### Campo do tutor e campo do animal nao combinam

Exemplo:

- comparar um campo booleano com um campo textual

Risco:

- a regra nunca passa

### Usar regra eliminatoria em criterio que deveria ser apenas preferencia

Risco:

- remover animais demais da fila

### Peso alto demais em regra secundaria

Risco:

- distorcer a ordem final dos resultados

### Campo customizado ainda nao preenchido nos cadastros

Risco:

- a comparacao falha por falta de valor

## Boas Praticas

- crie nomes de regra objetivos;
- prefira começar com peso medio e ajustar depois;
- use o simulador antes de deixar a regra ativa em producao;
- reserve `Regra eliminatoria` para requisitos realmente obrigatorios;
- mantenha regras pausadas em vez de apagar, quando estiver testando variacoes;
- revise se os campos customizados do tutor e do animal usam o mesmo vocabulario.

## Fluxo Recomendado Para Administrador

1. cadastrar ou revisar os `Campos customizados`;
2. garantir que tutores e animais tenham esses dados preenchidos;
3. criar a regra em `Regras`;
4. validar no `Preview da regra`;
5. testar no simulador;
6. salvar e manter ativa apenas quando o comportamento estiver coerente.

## Referencias Tecnicas

Para entendimento mais profundo do motor de matching:

- `docs/MATCHING_ALGORITHM.md`
- `src/frontend/components/features/Admin/AdminPanel.tsx`
- `src/backend/src/controllers/apiSupport.ts`
