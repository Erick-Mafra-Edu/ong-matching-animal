# Compressao de imagens no upload admin

Este documento descreve como a interface administrativa prepara imagens de animais antes do upload para o Supabase Storage.

## Onde fica

O fluxo foi implementado no frontend, em:

`src/frontend/components/features/Admin/AdminPanel.tsx`

O upload continua usando a funcao existente:

`src/frontend/lib/admin.ts` -> `uploadAnimalPhoto`

Essa funcao solicita uma URL assinada ao backend, envia o arquivo direto para o Supabase Storage via `XMLHttpRequest` e registra os metadados da foto depois do envio.

## Objetivo

Antes do envio, a imagem selecionada pelo admin e transformada para um formato adequado para paginas web:

- proporcao vertical `9:16`, equivalente a celular em pe;
- formato final `image/webp`;
- tamanho maximo de `800 KB`;
- resolucao maxima de `1080x1920`;
- qualidade inicial de `0.75`, com reducoes progressivas quando necessario.

## Como funciona

Ao selecionar um arquivo, a interface apenas guarda o `File` original e informa que ele sera convertido antes do envio.

No submit do formulario, a funcao `cropAndCompressAnimalPhoto` executa as etapas:

1. Valida se o arquivo selecionado e uma imagem.
2. Carrega a imagem no browser com `URL.createObjectURL`.
3. Calcula um recorte centralizado em proporcao `9:16`.
4. Desenha o recorte em um `canvas`.
5. Converte o canvas para WebP com `canvas.toBlob`.
6. Testa niveis de qualidade `0.75`, `0.68` e `0.60`.
7. Se ainda passar do limite, reduz a resolucao em escalas `1`, `0.85` e `0.70`.
8. Retorna um novo `File` com extensao `.webp` e `type` igual a `image/webp`.

Se mesmo depois dessas tentativas o arquivo continuar acima de `800 KB`, o upload e bloqueado e a interface pede uma imagem menor.

## Por que nao foi usado CompressorJS

A implementacao usa APIs nativas do browser porque o requisito inclui recorte em `9:16`, conversao para WebP, controle de dimensao e validacao de tamanho final. O `canvas` cobre todas essas etapas sem adicionar dependencia nova ao bundle.

O fluxo de rede tambem nao usa `axios`, porque o projeto ja envia a imagem por URL assinada diretamente ao Supabase Storage usando `XMLHttpRequest`, preservando o progresso de upload existente.

## Metadados enviados

Depois da compressao, o arquivo otimizado substitui o arquivo original no upload. Portanto, os metadados registrados no backend passam a refletir a imagem final:

- `content_type`: `image/webp`;
- `size_bytes`: tamanho do WebP comprimido;
- `fileName`: nome original com extensao substituida por `.webp`.

## Limites atuais

Os limites estao definidos em constantes no `AdminPanel.tsx`:

```ts
const animalPhotoMaxSizeBytes = 800 * 1024;
const animalPhotoMaxWidth = 1080;
const animalPhotoMaxHeight = 1920;
const animalPhotoAspectRatio = 9 / 16;
const animalPhotoQualitySteps = [0.75, 0.68, 0.6];
```

Para mudar a politica de compressao, ajuste essas constantes.
