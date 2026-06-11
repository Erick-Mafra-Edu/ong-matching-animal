# Implementar RPC de Match Score no Supabase Web

Este guia explica como criar manualmente, pelo painel web do Supabase, a implementação do matching descrita em [MATCHING_ALGORITHM.md](/home/rodrigo/Documentos/Faculdade/ong/ong-matching-animal/docs/MATCHING_ALGORITHM.md:1).

O objetivo aqui não é usar migrations locais. A ideia é permitir que vocês configurem tudo direto no `SQL Editor` do Supabase.

## O que será criado

Este processo cria:

- a função auxiliar `matching_value_rank(raw_value)`
- a RPC principal `calculate_match_score(target_tutor_id, result_limit, max_distance_km)`
- a função `count_match_candidates_for_tutor(target_tutor_id, max_distance_km)` para contar quantos animais entram na etapa de avaliação
- a função compatível `match_animals_for_tutor(...)`, delegando para `calculate_match_score(...)`

## Comportamento esperado

Essa implementação segue o documento arquitetural de matching:

- score por soma de pesos das regras que deram match
- `dealbreaker` zera o score do animal
- filtro geográfico aplicado antes do score
- raio padrão de `50km`
- operador `contains` no sentido `tutor contém animal`
- retorno ordenado por `compatibility_score desc`

## Pré-requisitos no banco

As tabelas abaixo precisam existir antes.

### `tutors`

Colunas mínimas:

- `id uuid primary key`
- `name text`
- `location geography(point)`
- `custom_fields jsonb`

### `animals`

Colunas mínimas:

- `id uuid primary key`
- `name text`
- `location geography(point)`
- `custom_fields jsonb`

### `matching_rules`

Colunas mínimas:

- `id uuid primary key`
- `rule_name text`
- `tutor_field text`
- `animal_field text`
- `comparison_operator text`
- `weight integer`
- `is_active boolean`
- `is_dealbreaker boolean`

Se a coluna `is_dealbreaker` ainda não existir:

```sql
alter table matching_rules
add column if not exists is_dealbreaker boolean not null default false;
```

Se `location` ainda não for `geography(point)`, a filtragem por distância não vai funcionar como descrito no algoritmo.

## Como aplicar no Supabase Web

1. Abra o projeto no Supabase.
2. Vá em `SQL Editor`.
3. Clique em `New query`.
4. Cole o bloco SQL abaixo.
5. Execute.

## SQL completo

```sql
create extension if not exists postgis;

alter table matching_rules
add column if not exists is_dealbreaker boolean not null default false;

create or replace function matching_value_rank(raw_value text)
returns numeric
language sql
immutable
as $$
  select case
    when raw_value is null then 0
    when raw_value ~ '^-?[0-9]+(\.[0-9]+)?$' then raw_value::numeric
    when raw_value in ('baixo', 'apartamento') then 1
    when raw_value in ('medio', 'casa_sem_quintal', 'casa_quintal_pequeno', 'casa_pequena') then 2
    when raw_value in ('alto', 'casa_com_quintal', 'casa_quintal_grande', 'casa_grande') then 3
    else 0
  end;
$$;

create or replace function calculate_match_score(
  target_tutor_id uuid,
  result_limit int default 10,
  max_distance_km numeric default 50
)
returns table (
  animal_id uuid,
  animal_name text,
  compatibility_score int,
  matched_rules jsonb,
  details jsonb
)
language plpgsql
stable
as $$
declare
  tutor_fields jsonb;
  tutor_location geography(point);
begin
  select custom_fields, location
    into tutor_fields, tutor_location
  from tutors
  where id = target_tutor_id;

  if tutor_fields is null then
    return;
  end if;

  return query
  with filtered_animals as (
    select animals.*
    from animals
    where max_distance_km is null
      or tutor_location is null
      or animals.location is null
      or st_dwithin(animals.location, tutor_location, max_distance_km * 1000)
  ),
  evaluated as (
    select
      filtered_animals.id as animal_id,
      filtered_animals.name as animal_name,
      rules.id as rule_id,
      rules.rule_name,
      rules.weight,
      rules.is_dealbreaker,
      case rules.comparison_operator
        when '=' then tutor_fields -> rules.tutor_field = filtered_animals.custom_fields -> rules.animal_field
        when '!=' then tutor_fields -> rules.tutor_field <> filtered_animals.custom_fields -> rules.animal_field
        when 'contains' then
          case
            when jsonb_typeof(tutor_fields -> rules.tutor_field) = 'array'
              and jsonb_typeof(filtered_animals.custom_fields -> rules.animal_field) = 'array'
              then exists (
                select 1
                from jsonb_array_elements_text(filtered_animals.custom_fields -> rules.animal_field) as animal_item(value)
                where tutor_fields -> rules.tutor_field ? animal_item.value
              )
            when jsonb_typeof(tutor_fields -> rules.tutor_field) = 'array'
              then tutor_fields -> rules.tutor_field ? (filtered_animals.custom_fields ->> rules.animal_field)
            when jsonb_typeof(filtered_animals.custom_fields -> rules.animal_field) = 'array'
              then exists (
                select 1
                from jsonb_array_elements_text(filtered_animals.custom_fields -> rules.animal_field) as animal_item(value)
                where tutor_fields ->> rules.tutor_field ilike '%' || animal_item.value || '%'
              )
            else tutor_fields ->> rules.tutor_field ilike '%' || (filtered_animals.custom_fields ->> rules.animal_field) || '%'
          end
        when '>=' then matching_value_rank(tutor_fields ->> rules.tutor_field) >= matching_value_rank(filtered_animals.custom_fields ->> rules.animal_field)
        when '<=' then matching_value_rank(tutor_fields ->> rules.tutor_field) <= matching_value_rank(filtered_animals.custom_fields ->> rules.animal_field)
        else false
      end as matched
    from filtered_animals
    cross join matching_rules rules
    where rules.is_active = true
      and tutor_fields ? rules.tutor_field
      and filtered_animals.custom_fields ? rules.animal_field
  ),
  grouped as (
    select
      evaluated.animal_id,
      evaluated.animal_name,
      sum(case when evaluated.matched then evaluated.weight else 0 end)::int as compatibility_score,
      bool_or(evaluated.is_dealbreaker and not evaluated.matched) as disqualified,
      jsonb_agg(evaluated.rule_id) filter (where evaluated.matched) as matched_rules,
      jsonb_agg(jsonb_build_object(
        'rule_id', evaluated.rule_id,
        'rule_name', evaluated.rule_name,
        'matched', evaluated.matched,
        'weight', evaluated.weight,
        'is_dealbreaker', evaluated.is_dealbreaker
      )) as details
    from evaluated
    group by evaluated.animal_id, evaluated.animal_name
  )
  select
    grouped.animal_id,
    grouped.animal_name,
    grouped.compatibility_score,
    coalesce(grouped.matched_rules, '[]'::jsonb),
    coalesce(grouped.details, '[]'::jsonb)
  from grouped
  where grouped.disqualified = false
    and grouped.compatibility_score > 0
  order by grouped.compatibility_score desc, grouped.animal_name asc
  limit result_limit;
end;
$$;

create or replace function count_match_candidates_for_tutor(
  target_tutor_id uuid,
  max_distance_km numeric default 50
)
returns int
language plpgsql
stable
as $$
declare
  tutor_location geography(point);
  total_candidates int;
begin
  select location
    into tutor_location
  from tutors
  where id = target_tutor_id;

  if not found then
    return 0;
  end if;

  select count(*)::int
    into total_candidates
  from animals
  where max_distance_km is null
    or tutor_location is null
    or animals.location is null
    or st_dwithin(animals.location, tutor_location, max_distance_km * 1000);

  return total_candidates;
end;
$$;

create or replace function match_animals_for_tutor(
  target_tutor_id uuid,
  result_limit int default 10,
  max_distance_km numeric default 50
)
returns table (
  animal_id uuid,
  animal_name text,
  compatibility_score int,
  matched_rules jsonb,
  details jsonb
)
language sql
stable
as $$
  select *
  from calculate_match_score(target_tutor_id, result_limit, max_distance_km);
$$;
```

## Modelagem esperada de `custom_fields`

### Exemplo de tutor

```json
{
  "pref_energia": "alto",
  "tem_criancas": true,
  "tamanho_casa": "casa_quintal_grande",
  "estilos": ["gato", "coelho", "animal_calmo"]
}
```

### Exemplo de animal

```json
{
  "nivel_energia": "alto",
  "aceita_criancas": true,
  "espaco_necessario": "apartamento",
  "estilo": "gato"
}
```

## Operadores suportados

- `=`
- `!=`
- `>=`
- `<=`
- `contains`

### Direção do `contains`

A regra arquitetada no projeto é:

- `tutor contém animal`

Exemplos válidos:

- tutor array `["gato", "coelho"]` contém animal `"gato"`
- tutor string `"gato, coelho, passaro"` contém animal `"gato"`

Não é o inverso.

## Filtragem geográfica

O algoritmo aplica filtro geográfico antes do score.

Regras práticas:

- `max_distance_km = 50` é o padrão
- `max_distance_km = null` desliga o filtro de distância
- se `tutor.location` estiver nulo, o filtro não exclui ninguém
- se `animals.location` estiver nulo, o animal também não é excluído por distância

## Como testar no SQL Editor

### Ver um tutor cadastrado

```sql
select id, name, custom_fields
from tutors
limit 5;
```

### Rodar a RPC de score

```sql
select *
from calculate_match_score('UUID_DO_TUTOR', 10, 50);
```

### Rodar sem filtro de distância

```sql
select *
from calculate_match_score('UUID_DO_TUTOR', 10, null);
```

### Contar quantos animais foram avaliados

```sql
select count_match_candidates_for_tutor('UUID_DO_TUTOR', 50);
```

## Resultado esperado

A RPC `calculate_match_score(...)` retorna:

- `animal_id`
- `animal_name`
- `compatibility_score`
- `matched_rules`
- `details`

Exemplo:

```json
[
  {
    "animal_id": "uuid-do-animal",
    "animal_name": "Rex",
    "compatibility_score": 80,
    "matched_rules": ["uuid-regra-1", "uuid-regra-2"],
    "details": [
      {
        "rule_id": "uuid-regra-1",
        "rule_name": "Energia compativel",
        "matched": true,
        "weight": 50,
        "is_dealbreaker": false
      }
    ]
  }
]
```

## Como a API usa isso

O endpoint `POST /api/match` envia para o Supabase:

- `target_tutor_id`
- `result_limit`
- `max_distance_km`

E usa `count_match_candidates_for_tutor(...)` para preencher `total_animals_evaluated` de acordo com o filtro geográfico.

Exemplo de chamada:

```bash
curl -X POST http://localhost:3001/api/match \
  -H "Content-Type: application/json" \
  -d '{"tutor_id":"UUID_DO_TUTOR","limit":10,"max_distance_km":50}'
```

Para desabilitar o filtro de distância:

```bash
curl -X POST http://localhost:3001/api/match \
  -H "Content-Type: application/json" \
  -d '{"tutor_id":"UUID_DO_TUTOR","limit":10,"max_distance_km":null}'
```

## Problemas comuns

### A RPC retorna vazio

Verifique:

- se o tutor existe
- se `custom_fields` do tutor não está vazio
- se existem regras com `is_active = true`
- se as chaves em `tutor_field` e `animal_field` batem exatamente com o JSON
- se o filtro de distância não está eliminando todos os animais

### Todo mundo fica com score zero

Verifique:

- se alguma regra `is_dealbreaker = true` está falhando para todos
- se as comparações `=` ou `contains` estão coerentes com a direção definida

### `contains` não bate

Lembre que a direção é:

- tutor contém animal

Não:

- animal contém tutor

### `>=` e `<=` se comportam estranho

Isso normalmente indica valor novo faltando em `matching_value_rank`.

## Ordem recomendada de implantação

1. Garantir `postgis`.
2. Criar ou revisar as tabelas base.
3. Garantir `is_dealbreaker`.
4. Criar `matching_value_rank`.
5. Criar `calculate_match_score`.
6. Criar `count_match_candidates_for_tutor`.
7. Testar no SQL Editor.
8. Testar o endpoint `/api/match`.

## Arquivos do projeto relacionados

- [docs/MATCHING_ALGORITHM.md](/home/rodrigo/Documentos/Faculdade/ong/ong-matching-animal/docs/MATCHING_ALGORITHM.md:1)
- [src/backend/db/migrations/018_calculate_match_score_rpc.sql](/home/rodrigo/Documentos/Faculdade/ong/ong-matching-animal/src/backend/db/migrations/018_calculate_match_score_rpc.sql:1)
- [src/backend/db/schema.sql](/home/rodrigo/Documentos/Faculdade/ong/ong-matching-animal/src/backend/db/schema.sql:228)
- [src/backend/src/controllers/SystemController.ts](/home/rodrigo/Documentos/Faculdade/ong/ong-matching-animal/src/backend/src/controllers/SystemController.ts:72)
