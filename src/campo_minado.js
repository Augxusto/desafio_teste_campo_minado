/**
 * Autor: [SEU NOME]
 * Matrícula/RA: [SEU RA]
 * Disciplina: Teste de Software
 *
 * Campo Minado - tabuleiro 18 x 14 (18 colunas, 14 linhas) com 40 bombas.
 *
 * Regras adotadas:
 *  - As bombas só são posicionadas na primeira jogada: a primeira célula aberta
 *    e todas as suas vizinhas nunca têm bomba (a primeira jogada sempre abre uma região).
 *  - Abrir célula com número (> 0) abre só ela; célula com 0 abre as vizinhas em cascata.
 *  - Célula com bandeira não pode ser aberta e bloqueia a cascata.
 *  - Abrir bomba encerra a partida em "derrota" e revela as bombas sem bandeira.
 *  - Vitória: todas as células sem bomba (252 - 40 = 212) abertas.
 *  - É permitido marcar mais bandeiras que bombas (bombasRestantes pode ficar negativo).
 *
 * Status: 'aguardando' (nenhuma jogada) | 'jogando' | 'vitoria' | 'derrota'
 */

'use strict';

const LARGURA_PADRAO = 18;
const ALTURA_PADRAO = 14;
const BOMBAS_PADRAO = 40;

/* ----------------------------- criação ----------------------------- */

function criarCelula() {
  return { bomba: false, aberta: false, bandeira: false, explodiu: false, vizinhas: 0 };
}

function dentroDoTabuleiro(jogo, linha, coluna) {
  return (
    Number.isInteger(linha) &&
    Number.isInteger(coluna) &&
    linha >= 0 &&
    linha < jogo.altura &&
    coluna >= 0 &&
    coluna < jogo.largura
  );
}

function criarJogo({
  largura = LARGURA_PADRAO,
  altura = ALTURA_PADRAO,
  bombas = BOMBAS_PADRAO,
  posicoesBombas = null,
  rng = Math.random,
} = {}) {
  if (!Number.isInteger(largura) || !Number.isInteger(altura) || largura < 1 || altura < 1) {
    throw new Error('Dimensões inválidas');
  }

  const total = largura * altura;
  // com bombas aleatórias, a 1ª célula e suas 8 vizinhas precisam ficar livres
  const maximo = posicoesBombas ? total - 1 : total - 9;
  if (!Number.isInteger(bombas) || bombas < 1 || bombas > maximo) {
    throw new Error('Quantidade de bombas inválida');
  }

  const jogo = {
    largura,
    altura,
    totalBombas: bombas,
    tabuleiro: Array.from({ length: altura }, () =>
      Array.from({ length: largura }, criarCelula)
    ),
    status: 'aguardando',
    bombasPosicionadas: false,
    abertas: 0, // células SEM bomba abertas
    bandeiras: 0,
    rng,
  };

  if (posicoesBombas) {
    if (!Array.isArray(posicoesBombas) || posicoesBombas.length !== bombas) {
      throw new Error('Posições de bombas inválidas');
    }
    const vistas = new Set();
    for (const pos of posicoesBombas) {
      if (!Array.isArray(pos) || !dentroDoTabuleiro(jogo, pos[0], pos[1])) {
        throw new Error('Posições de bombas inválidas');
      }
      const chave = `${pos[0]},${pos[1]}`;
      if (vistas.has(chave)) throw new Error('Posições de bombas inválidas');
      vistas.add(chave);
      jogo.tabuleiro[pos[0]][pos[1]].bomba = true;
    }
    jogo.bombasPosicionadas = true;
    calcularVizinhas(jogo);
  }

  return jogo;
}

/* ----------------------------- bombas ----------------------------- */

function vizinhos(jogo, linha, coluna) {
  const lista = [];
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      if (dentroDoTabuleiro(jogo, linha + dl, coluna + dc)) {
        lista.push([linha + dl, coluna + dc]);
      }
    }
  }
  return lista;
}

function calcularVizinhas(jogo) {
  for (let l = 0; l < jogo.altura; l++) {
    for (let c = 0; c < jogo.largura; c++) {
      jogo.tabuleiro[l][c].vizinhas = vizinhos(jogo, l, c).filter(
        ([vl, vc]) => jogo.tabuleiro[vl][vc].bomba
      ).length;
    }
  }
}

function posicionarBombas(jogo, linhaSegura, colunaSegura) {
  const zonaSegura = new Set(
    [[linhaSegura, colunaSegura], ...vizinhos(jogo, linhaSegura, colunaSegura)].map(
      ([l, c]) => `${l},${c}`
    )
  );

  const candidatas = [];
  for (let l = 0; l < jogo.altura; l++) {
    for (let c = 0; c < jogo.largura; c++) {
      if (!zonaSegura.has(`${l},${c}`)) candidatas.push([l, c]);
    }
  }

  // Fisher-Yates parcial: sorteia as primeiras totalBombas posições
  for (let i = 0; i < jogo.totalBombas; i++) {
    const j = i + Math.floor(jogo.rng() * (candidatas.length - i));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
    const [l, c] = candidatas[i];
    jogo.tabuleiro[l][c].bomba = true;
  }

  jogo.bombasPosicionadas = true;
  calcularVizinhas(jogo);
}

function contarBombas(jogo) {
  return jogo.tabuleiro.flat().filter((cel) => cel.bomba).length;
}

/* ----------------------------- jogadas ----------------------------- */

function exigirJogoAtivo(jogo) {
  if (jogo.status === 'vitoria' || jogo.status === 'derrota') {
    throw new Error('Jogo já encerrado');
  }
}

function exigirDentro(jogo, linha, coluna) {
  if (!dentroDoTabuleiro(jogo, linha, coluna)) {
    throw new Error('Coordenadas fora do tabuleiro');
  }
}

function podeAbrir(jogo, linha, coluna) {
  if (jogo.status === 'vitoria' || jogo.status === 'derrota') return false;
  if (!dentroDoTabuleiro(jogo, linha, coluna)) return false;
  const cel = jogo.tabuleiro[linha][coluna];
  return !cel.aberta && !cel.bandeira;
}

function expandir(jogo, linha, coluna) {
  const pilha = [[linha, coluna]];
  while (pilha.length > 0) {
    const [l, c] = pilha.pop();
    const cel = jogo.tabuleiro[l][c];
    if (cel.aberta || cel.bandeira || cel.bomba) continue;
    cel.aberta = true;
    jogo.abertas++;
    if (cel.vizinhas === 0) pilha.push(...vizinhos(jogo, l, c));
  }
}

function explodir(jogo, celula) {
  celula.aberta = true;
  celula.explodiu = true;
  for (const cel of jogo.tabuleiro.flat()) {
    if (cel.bomba && !cel.bandeira) cel.aberta = true;
  }
  jogo.status = 'derrota';
}

function abrirCelula(jogo, linha, coluna) {
  exigirJogoAtivo(jogo);
  exigirDentro(jogo, linha, coluna);

  const cel = jogo.tabuleiro[linha][coluna];
  if (cel.bandeira) throw new Error('Célula marcada com bandeira');
  if (cel.aberta) throw new Error('Célula já aberta');

  if (!jogo.bombasPosicionadas) posicionarBombas(jogo, linha, coluna);
  jogo.status = 'jogando';

  if (cel.bomba) {
    explodir(jogo, cel);
    return jogo;
  }

  expandir(jogo, linha, coluna);
  if (jogo.abertas === jogo.largura * jogo.altura - jogo.totalBombas) {
    jogo.status = 'vitoria';
  }
  return jogo;
}

function alternarBandeira(jogo, linha, coluna) {
  exigirJogoAtivo(jogo);
  exigirDentro(jogo, linha, coluna);

  const cel = jogo.tabuleiro[linha][coluna];
  if (cel.aberta) throw new Error('Célula aberta não pode receber bandeira');

  cel.bandeira = !cel.bandeira;
  jogo.bandeiras += cel.bandeira ? 1 : -1;
  return jogo;
}

function bombasRestantes(jogo) {
  return jogo.totalBombas - jogo.bandeiras;
}

module.exports = {
  LARGURA_PADRAO,
  ALTURA_PADRAO,
  BOMBAS_PADRAO,
  criarJogo,
  dentroDoTabuleiro,
  vizinhos,
  calcularVizinhas,
  posicionarBombas,
  contarBombas,
  podeAbrir,
  abrirCelula,
  alternarBandeira,
  bombasRestantes,
};
