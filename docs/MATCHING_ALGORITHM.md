# Algoritmo de Matching

Este documento detalha o funcionamento, lógica, pesos e critérios do algoritmo de compatibilidade entre tutores e animais no sistema ONG Matching Animal.

## Visão Geral

O algoritmo tem como objetivo ordenar os animais disponíveis para um tutor com base na compatibilidade de seus perfis. A compatibilidade é calculada comparando campos customizados (`custom_fields`) de ambos os perfis através de regras pré-definidas.

## Lógica do Score

O score de compatibilidade é calculado pela soma dos pesos das regras que resultaram em um "match":

$$Score = \sum (Match(Regra_i) ? Weight_i : 0)$$

### Dealbreakers

Algumas regras podem ser marcadas como `is_dealbreaker`. Se uma regra dealbreaker não resultar em match, o score total para aquele animal será **zero**, independentemente das outras regras.

## Operadores de Comparação

O algoritmo suporta os seguintes operadores para comparar os campos do tutor com os do animal:

| Operador | Descrição | Exemplo |
| :--- | :--- | :--- |
| `=` | Igualdade exata | `tutor.pref_energia` == `animal.nivel_energia` |
| `!=` | Diferença | `tutor.preferencia` != `animal.caracteristica` |
| `>=` | Maior ou igual | `tutor.espaco` >= `animal.necessidade_espaco` |
| `<=` | Menor ou igual | `tutor.tempo` <= `animal.esforco_necessario` |
| `contains` | Contém valor | `tutor.estilos` contém `animal.estilo` |

No operador `contains`, a direção da comparação é sempre `tutor contém animal`.
Se o campo do tutor for array, o valor do animal precisa existir dentro desse array.
Se o campo do tutor for texto, o valor do animal precisa aparecer no texto do tutor.

### Conversão de Escalas

Para operadores numéricos (`>=`, `<=`), o sistema converte escalas textuais em valores numéricos:

**Energia:**
- `baixo`: 1
- `medio`: 2
- `alto`: 3

**Espaço/Tamanho:**
- `apartamento`: 1
- `casa_quintal_pequeno`: 2
- `casa_quintal_grande`: 3

## Regras Atuais (Exemplos do Seed)

As regras são dinâmicas e podem ser ajustadas via banco de dados (`matching_rules`). Abaixo estão as regras padrão configuradas no ambiente:

| Regra | Campo Tutor | Campo Animal | Operador | Peso |
| :--- | :--- | :--- | :--- | :--- |
| Energia | `pref_energia` | `nivel_energia` | `=` | 40 |
| Crianças | `tem_criancas` | `aceita_criancas` | `=` | 35 |
| Espaço | `tamanho_casa` | `espaco_necessario` | `=` | 50 |

## Filtragem Geográfica

Antes do cálculo do score, o sistema pode filtrar animais por distância.
O cálculo utiliza a **Fórmula de Haversine** para determinar a distância em quilômetros entre a latitude/longitude do tutor e do animal.

- **Raio Padrão:** 50km (configurável).

## Implementação Técnica

A lógica de referência reside em `src/backend/src/lib/matching.ts`.
Na API, a execução principal ocorre no Postgres via RPC `calculate_match_score(...)`, consumida pelo endpoint `POST /api/match`.

### Fluxo de Execução

1. **Entrada:** Tutor alvo, limite de resultados e raio máximo em km.
2. **Filtragem:** Remove animais fora do raio de distância antes do score.
3. **Cálculo:** Para cada animal restante, avalia cada regra ativa.
4. **Disqualificação:** Se falhar em um `is_dealbreaker`, score = 0.
5. **Ordenação:** Retorna a lista de animais com score > 0, ordenados de forma decrescente pelo score.

## Próximos Passos

- [ ] Implementar pesos dinâmicos ajustáveis por interface administrativa.
- [ ] Adicionar mais escalas de conversão (ex: tempo disponível, experiência).
- [x] Otimizar consulta de animais próximos usando PostGIS.
