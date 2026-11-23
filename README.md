# desafio_teste_campo_minado

## Autor

- **Nome:** [SEU NOME]
- **RA/Matrícula:** [SEU RA]
- **Disciplina:** Teste de Software
- **Professor(a):** [NOME DO PROFESSOR]

---

## Especificação do Desafio

Este repositório contém os casos de teste em **JavaScript** utilizando **Jest** (abordagem **TDD**) para o desafio de **Campo Minado**, conforme a disciplina de Teste de Software:

- **Tabuleiro:** `18` colunas x `14` linhas (`252` células), com `40` bombas.
- **Regras principais:**
  * As bombas são posicionadas na primeira jogada: a primeira célula aberta e suas vizinhas nunca têm bomba.
  * Cada célula sem bomba mostra o número de bombas vizinhas (de `0` a `8`).
  * Abrir célula com `0` abre as vizinhas em cascata; célula com número abre só ela.
  * Células com `bandeira` não podem ser abertas e bloqueiam a cascata.
  * Abrir uma bomba encerra a partida em `derrota`; abrir as `212` células sem bomba leva à `vitoria`.
- **Linguagem e framework de teste:** JavaScript (`CommonJS`) com **Jest**.

---

## Funcionamento dos Casos de Teste

A suíte de testes está em `tests/campo_minado.test.js` e valida `criarJogo`, `posicionarBombas`, `vizinhos`, `abrirCelula`, `alternarBandeira`, `podeAbrir`, `contarBombas` e `bombasRestantes`:

1. **Inicialização:** Confirma 14 linhas x 18 colunas, 252 células fechadas, 40 bombas e status `aguardando`.
2. **Validação de parâmetros:** Rejeita dimensões inválidas, quantidade de bombas inválida, posições duplicadas, fora do tabuleiro ou em quantidade diferente de 40.
3. **Posicionamento das bombas:** Exatamente 40 bombas, primeira célula e vizinhas sempre livres (cantos, bordas e meio) e tabuleiros determinísticos por seed.
4. **Contagem de bombas vizinhas:** Valida cantos, bordas, meio e uma célula cercada por 8 bombas, e confere todas as células com uma contagem independente.
5. **Abrir célula:** Número, cascata de células vazias, bandeira bloqueando a cascata, célula já aberta, coordenadas fora do tabuleiro (linha `14` e coluna `18` não existem) e jogo encerrado.
6. **Bandeiras:** Marcar, desmarcar, contador de bombas restantes, célula aberta e jogo encerrado.
7. **Vitória:** Abrir as 212 células seguras vence; faltando uma, não vence; após a vitória não há novas jogadas.
8. **Derrota:** Bomba explodida, bombas reveladas (exceto as com bandeira) e primeira jogada nunca perde.
9. **Simulações:** 300 partidas com cliques aleatórios e 100 partidas de um jogador que só abre células seguras, verificando invariantes.

O mapa fixo usado nos testes está em `MAPA` (14 linhas de 18 caracteres, `*` = bomba), o que torna cada caso fácil de conferir visualmente.

### Como executar os testes

```
npm install
npm test
```
