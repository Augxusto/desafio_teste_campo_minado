/**
 * Autor: [SEU NOME]
 * Matrícula/RA: [SEU RA]
 * Disciplina: Teste de Software
 *
 * Casos de teste (Jest) - Campo Minado 18 x 14 com 40 bombas.
 */

'use strict';

const {
  criarJogo,
  vizinhos,
  contarBombas,
  podeAbrir,
  abrirCelula,
  alternarBandeira,
  bombasRestantes,
} = require('../src/campo_minado');

/* ------------------------- helpers ------------------------- */

// Mapa fixo: 14 linhas x 18 colunas, '*' = bomba (40 bombas no total)
const MAPA = [
  '*.....*.*.*.*.*.*.', // 0
  '.*...............*', // 1
  '.........*.*.*.*.*', // 2
  '...*...*...*......', // 3
  '....***...........', // 4
  '....*.*...........', // 5
  '....***...........', // 6
  '..................', // 7
  '*.*.*.*.*.........', // 8
  '..................', // 9
  '*.*.*.*.*.........', // 10
  '..................', // 11
  '*.*.*.*.*.........', // 12
  '..................', // 13
];

function posicoesDoMapa(mapa) {
  const posicoes = [];
  mapa.forEach((linha, l) =>
    [...linha].forEach((ch, c) => {
      if (ch === '*') posicoes.push([l, c]);
    })
  );
  return posicoes;
}

const jogoFixo = () => criarJogo({ posicoesBombas: posicoesDoMapa(MAPA) });

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// oráculo independente: conta bombas vizinhas "na unha" a partir do próprio tabuleiro
function vizinhasBruto(jogo, l, c) {
  let n = 0;
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      const linha = jogo.tabuleiro[l + dl];
      if (linha && linha[c + dc] && linha[c + dc].bomba) n++;
    }
  }
  return n;
}

function todasCelulas(jogo) {
  const lista = [];
  jogo.tabuleiro.forEach((linha, l) => linha.forEach((cel, c) => lista.push({ l, c, cel })));
  return lista;
}

const TOTAL_CELULAS = 18 * 14; // 252
const TOTAL_SEGURAS = TOTAL_CELULAS - 40; // 212

/* ------------------------- 1. inicialização ------------------------- */

describe('1. Inicialização do tabuleiro 18 x 14 com 40 bombas', () => {
  test('cria tabuleiro com 14 linhas e 18 colunas por padrão', () => {
    const jogo = criarJogo();
    expect(jogo.altura).toBe(14);
    expect(jogo.largura).toBe(18);
    expect(jogo.tabuleiro).toHaveLength(14);
    jogo.tabuleiro.forEach((linha) => expect(linha).toHaveLength(18));
  });

  test('tem 252 células, todas fechadas e sem bandeira', () => {
    const celulas = todasCelulas(criarJogo());
    expect(celulas).toHaveLength(TOTAL_CELULAS);
    expect(celulas.every(({ cel }) => !cel.aberta && !cel.bandeira && !cel.explodiu)).toBe(true);
  });

  test('começa aguardando a primeira jogada, com 40 bombas a marcar', () => {
    const jogo = criarJogo();
    expect(jogo.totalBombas).toBe(40);
    expect(bombasRestantes(jogo)).toBe(40);
    expect(jogo.status).toBe('aguardando');
    expect(jogo.abertas).toBe(0);
    expect(jogo.bandeiras).toBe(0);
  });

  test('no modo aleatório as bombas só são posicionadas na primeira jogada', () => {
    const jogo = criarJogo({ rng: mulberry32(1) });
    expect(contarBombas(jogo)).toBe(0);
    expect(jogo.bombasPosicionadas).toBe(false);
  });

  test('com posições fixas, o mapa de teste tem exatamente 40 bombas', () => {
    expect(posicoesDoMapa(MAPA)).toHaveLength(40);
    expect(MAPA).toHaveLength(14);
    MAPA.forEach((linha) => expect(linha).toHaveLength(18));
    expect(contarBombas(jogoFixo())).toBe(40);
  });
});

/* ------------------------- 2. validação de parâmetros ------------------------- */

describe('2. Validação de parâmetros', () => {
  test.each([[0, 14], [18, 0], [-1, 14], [18, -3], [1.5, 14], ['18', 14]])(
    'rejeita dimensões inválidas (largura=%p, altura=%p)',
    (largura, altura) => {
      expect(() => criarJogo({ largura, altura })).toThrow(/Dimensões/);
    }
  );

  test.each([0, -5, 1.5, 245, 252, 300])('rejeita quantidade de bombas inválida (%p)', (bombas) => {
    expect(() => criarJogo({ bombas })).toThrow(/bombas/);
  });

  test('aceita o limite máximo de bombas que preserva a 1ª jogada (252 - 9 = 243)', () => {
    expect(() => criarJogo({ bombas: 243 })).not.toThrow();
  });

  test('rejeita posições com quantidade diferente do total de bombas', () => {
    const posicoes = posicoesDoMapa(MAPA).slice(0, 39);
    expect(() => criarJogo({ posicoesBombas: posicoes })).toThrow(/Posições/);
  });

  test('rejeita posições duplicadas', () => {
    const posicoes = posicoesDoMapa(MAPA);
    posicoes[1] = [...posicoes[0]];
    expect(() => criarJogo({ posicoesBombas: posicoes })).toThrow(/Posições/);
  });

  test.each([[14, 0], [0, 18], [-1, 0], [0, -1]])(
    'rejeita posição de bomba fora do tabuleiro (%p, %p)',
    (l, c) => {
      const posicoes = posicoesDoMapa(MAPA);
      posicoes[0] = [l, c];
      expect(() => criarJogo({ posicoesBombas: posicoes })).toThrow(/Posições/);
    }
  );
});

/* ------------------------- 3. posicionamento das bombas ------------------------- */

describe('3. Posicionamento das bombas na primeira jogada', () => {
  test('a primeira jogada posiciona exatamente 40 bombas', () => {
    const jogo = criarJogo({ rng: mulberry32(5) });
    abrirCelula(jogo, 7, 9);
    expect(contarBombas(jogo)).toBe(40);
    expect(jogo.bombasPosicionadas).toBe(true);
    expect(jogo.status).toBe('jogando');
  });

  test('a primeira célula e suas vizinhas nunca têm bomba (200 sorteios, inclusive cantos e bordas)', () => {
    const inicios = [
      [0, 0], [0, 17], [13, 0], [13, 17], // cantos
      [0, 9], [13, 9], [6, 0], [6, 17], // bordas
      [7, 9], [3, 4], // meio
    ];
    for (let seed = 1; seed <= 200; seed++) {
      const [l, c] = inicios[seed % inicios.length];
      const jogo = criarJogo({ rng: mulberry32(seed) });
      abrirCelula(jogo, l, c);

      expect(jogo.status).toBe('jogando');
      expect(jogo.tabuleiro[l][c].bomba).toBe(false);
      vizinhos(jogo, l, c).forEach(([vl, vc]) => expect(jogo.tabuleiro[vl][vc].bomba).toBe(false));
      expect(contarBombas(jogo)).toBe(40);
    }
  });

  test('a primeira jogada sempre abre a célula e todas as suas vizinhas (começa em zero)', () => {
    const jogo = criarJogo({ rng: mulberry32(9) });
    abrirCelula(jogo, 5, 5);
    expect(jogo.tabuleiro[5][5].vizinhas).toBe(0);
    vizinhos(jogo, 5, 5).forEach(([vl, vc]) => expect(jogo.tabuleiro[vl][vc].aberta).toBe(true));
  });

  test('a mesma seed gera o mesmo tabuleiro e seeds diferentes geram tabuleiros diferentes', () => {
    const mapa = (seed) => {
      const jogo = criarJogo({ rng: mulberry32(seed) });
      abrirCelula(jogo, 7, 9);
      return todasCelulas(jogo).map(({ cel }) => (cel.bomba ? '*' : '.')).join('');
    };
    expect(mapa(11)).toBe(mapa(11));
    expect(mapa(11)).not.toBe(mapa(12));
  });

  test('bombas com posições fixas não são redistribuídas na primeira jogada', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 3);
    const mapa = jogo.tabuleiro.map((linha) => linha.map((cel) => (cel.bomba ? '*' : '.')).join(''));
    expect(mapa).toEqual(MAPA);
  });
});

/* ------------------------- 4. contagem de bombas vizinhas ------------------------- */

describe('4. Contagem de bombas vizinhas', () => {
  const casos = [
    [5, 5, 8, 'cercada por 8 bombas'],
    [0, 17, 2, 'canto superior direito'],
    [13, 0, 1, 'canto inferior esquerdo'],
    [13, 17, 0, 'canto inferior direito, sem bombas ao redor'],
    [0, 1, 2, 'borda superior'],
    [1, 0, 2, 'borda esquerda'],
    [7, 0, 1, 'borda esquerda com 1 bomba'],
    [9, 1, 4, 'meio, com 4 bombas'],
    [4, 0, 0, 'região vazia à esquerda'],
  ];

  test.each(casos)('célula (%i, %i) tem %i bomba(s) vizinha(s) — %s', (l, c, esperado) => {
    expect(jogoFixo().tabuleiro[l][c].vizinhas).toBe(esperado);
  });

  test('vizinhos de um canto são 3; de uma borda, 5; do meio, 8', () => {
    const jogo = criarJogo();
    expect(vizinhos(jogo, 0, 0)).toHaveLength(3);
    expect(vizinhos(jogo, 13, 17)).toHaveLength(3);
    expect(vizinhos(jogo, 0, 9)).toHaveLength(5);
    expect(vizinhos(jogo, 6, 0)).toHaveLength(5);
    expect(vizinhos(jogo, 7, 9)).toHaveLength(8);
  });

  test('o número de toda célula sem bomba confere com a contagem independente', () => {
    const jogo = jogoFixo();
    todasCelulas(jogo)
      .filter(({ cel }) => !cel.bomba)
      .forEach(({ l, c, cel }) => {
        expect(cel.vizinhas).toBe(vizinhasBruto(jogo, l, c));
        expect(cel.vizinhas).toBeLessThanOrEqual(8);
      });
  });

  test('a soma dos números é consistente com as bombas (cada bomba é contada pelas suas vizinhas)', () => {
    const jogo = jogoFixo();
    const soma = todasCelulas(jogo)
      .filter(({ cel }) => !cel.bomba)
      .reduce((acc, { cel }) => acc + cel.vizinhas, 0);
    const esperado = todasCelulas(jogo)
      .filter(({ cel }) => cel.bomba)
      .reduce((acc, { l, c }) => acc + vizinhos(jogo, l, c).filter(([vl, vc]) => !jogo.tabuleiro[vl][vc].bomba).length, 0);
    expect(soma).toBe(esperado);
  });
});

/* ------------------------- 5. abrir célula ------------------------- */

describe('5. Abrir célula', () => {
  test('célula com número abre apenas ela mesma', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 3); // 3 bombas vizinhas
    expect(jogo.tabuleiro[5][3].aberta).toBe(true);
    expect(jogo.abertas).toBe(1);
    expect(jogo.status).toBe('jogando');
    vizinhos(jogo, 5, 3).forEach(([l, c]) => expect(jogo.tabuleiro[l][c].aberta).toBe(false));
  });

  test('célula vazia (0) abre em cascata: nenhuma bomba é aberta e todo zero aberto tem vizinhas abertas', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 13, 17);

    expect(jogo.abertas).toBeGreaterThan(1);
    expect(jogo.status).toBe('jogando');
    todasCelulas(jogo)
      .filter(({ cel }) => cel.aberta)
      .forEach(({ l, c, cel }) => {
        expect(cel.bomba).toBe(false);
        if (cel.vizinhas === 0) {
          vizinhos(jogo, l, c).forEach(([vl, vc]) => expect(jogo.tabuleiro[vl][vc].aberta).toBe(true));
        }
      });
  });

  test('a cascata para nas células numeradas e não atravessa para outra região vazia', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 0); // região vazia isolada à esquerda

    const zeros = [[3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [6, 2]];
    zeros.forEach(([l, c]) => expect(jogo.tabuleiro[l][c].aberta).toBe(true));

    // bordas numeradas foram abertas, mas não "vazam" para além delas
    expect(jogo.tabuleiro[4][2].aberta).toBe(true);
    expect(jogo.tabuleiro[5][3].aberta).toBe(true);
    const colunaMaxima = Math.max(...todasCelulas(jogo).filter(({ cel }) => cel.aberta).map(({ c }) => c));
    expect(colunaMaxima).toBeLessThanOrEqual(3);
    expect(jogo.tabuleiro[13][17].aberta).toBe(false);
    expect(jogo.tabuleiro[0][0].aberta).toBe(false);
  });

  test('o contador de abertas só conta células sem bomba', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 13, 17);
    const seguras = todasCelulas(jogo).filter(({ cel }) => cel.aberta && !cel.bomba).length;
    expect(jogo.abertas).toBe(seguras);
  });

  test('abrir uma bomba encerra a partida em derrota', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 0, 0);
    expect(jogo.status).toBe('derrota');
  });

  test('célula com bandeira não pode ser aberta', () => {
    const jogo = jogoFixo();
    alternarBandeira(jogo, 5, 3);
    expect(podeAbrir(jogo, 5, 3)).toBe(false);
    expect(() => abrirCelula(jogo, 5, 3)).toThrow(/bandeira/);
    expect(jogo.tabuleiro[5][3].aberta).toBe(false);
  });

  test('bandeira bloqueia a cascata: a célula marcada permanece fechada', () => {
    const jogo = jogoFixo();
    alternarBandeira(jogo, 13, 10);
    abrirCelula(jogo, 13, 17);
    expect(jogo.tabuleiro[13][10].aberta).toBe(false);
    expect(jogo.tabuleiro[13][10].bandeira).toBe(true);
    expect(jogo.tabuleiro[13][11].aberta).toBe(true);
  });

  test('célula já aberta gera erro', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 3);
    expect(() => abrirCelula(jogo, 5, 3)).toThrow(/já aberta/);
  });

  test.each([[-1, 0], [14, 0], [0, 18], [0, -1], [1.5, 2], [2, 'a']])(
    'coordenadas fora do tabuleiro (%p, %p) geram erro',
    (l, c) => {
      expect(() => abrirCelula(jogoFixo(), l, c)).toThrow(/fora do tabuleiro/);
    }
  );

  test('os limites do tabuleiro 18 x 14 são válidos: linha 13 e coluna 17 existem', () => {
    const jogo = criarJogo({ rng: mulberry32(3) });
    expect(() => abrirCelula(jogo, 13, 17)).not.toThrow();
  });

  test('podeAbrir informa corretamente fechadas, abertas, com bandeira e fora do tabuleiro', () => {
    const jogo = jogoFixo();
    expect(podeAbrir(jogo, 5, 3)).toBe(true);
    abrirCelula(jogo, 5, 3);
    expect(podeAbrir(jogo, 5, 3)).toBe(false); // já aberta
    alternarBandeira(jogo, 7, 7);
    expect(podeAbrir(jogo, 7, 7)).toBe(false); // bandeira
    expect(podeAbrir(jogo, 14, 0)).toBe(false); // fora
    expect(podeAbrir(jogo, 0, 18)).toBe(false); // fora
  });

  test('não é possível abrir células depois do fim da partida', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 0, 0);
    expect(() => abrirCelula(jogo, 5, 3)).toThrow(/encerrado/);
    expect(podeAbrir(jogo, 5, 3)).toBe(false);
  });
});

/* ------------------------- 6. bandeiras ------------------------- */

describe('6. Bandeiras', () => {
  test('marcar célula fechada coloca bandeira e reduz bombas restantes', () => {
    const jogo = jogoFixo();
    alternarBandeira(jogo, 0, 0);
    expect(jogo.tabuleiro[0][0].bandeira).toBe(true);
    expect(jogo.bandeiras).toBe(1);
    expect(bombasRestantes(jogo)).toBe(39);
  });

  test('marcar de novo remove a bandeira', () => {
    const jogo = jogoFixo();
    alternarBandeira(jogo, 0, 0);
    alternarBandeira(jogo, 0, 0);
    expect(jogo.tabuleiro[0][0].bandeira).toBe(false);
    expect(bombasRestantes(jogo)).toBe(40);
  });

  test('não é possível marcar célula já aberta', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 3);
    expect(() => alternarBandeira(jogo, 5, 3)).toThrow(/aberta/);
  });

  test.each([[-1, 0], [14, 0], [0, 18]])('bandeira fora do tabuleiro (%p, %p) gera erro', (l, c) => {
    expect(() => alternarBandeira(jogoFixo(), l, c)).toThrow(/fora do tabuleiro/);
  });

  test('é permitido marcar mais bandeiras que bombas (contador fica negativo)', () => {
    const jogo = jogoFixo();
    todasCelulas(jogo).slice(0, 41).forEach(({ l, c }) => alternarBandeira(jogo, l, c));
    expect(jogo.bandeiras).toBe(41);
    expect(bombasRestantes(jogo)).toBe(-1);
  });

  test('marcar bandeira não inicia a partida nem posiciona bombas', () => {
    const jogo = criarJogo({ rng: mulberry32(2) });
    alternarBandeira(jogo, 7, 9);
    expect(jogo.status).toBe('aguardando');
    expect(contarBombas(jogo)).toBe(0);
  });

  test('não é possível marcar bandeira depois do fim da partida', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 0, 0);
    expect(() => alternarBandeira(jogo, 5, 3)).toThrow(/encerrado/);
  });
});

/* ------------------------- 7. vitória ------------------------- */

describe('7. Condição de vitória (212 células seguras)', () => {
  test('abrir todas as células sem bomba resulta em vitória', () => {
    const jogo = jogoFixo();
    todasCelulas(jogo)
      .filter(({ cel }) => !cel.bomba)
      .forEach(({ l, c }) => {
        if (podeAbrir(jogo, l, c)) abrirCelula(jogo, l, c);
      });
    expect(jogo.status).toBe('vitoria');
    expect(jogo.abertas).toBe(TOTAL_SEGURAS);
    expect(todasCelulas(jogo).filter(({ cel }) => cel.bomba && cel.aberta)).toHaveLength(0);
  });

  test('não vence enquanto falta ao menos uma célula segura fechada', () => {
    const jogo = jogoFixo();
    const numeradas = todasCelulas(jogo).filter(({ cel }) => !cel.bomba && cel.vizinhas > 0);
    const zeros = todasCelulas(jogo).filter(({ cel }) => !cel.bomba && cel.vizinhas === 0);

    // abre todas as numeradas menos a última: nada de cascata, nenhuma vitória
    numeradas.slice(0, -1).forEach(({ l, c }) => abrirCelula(jogo, l, c));
    expect(jogo.abertas).toBe(numeradas.length - 1);
    expect(jogo.status).toBe('jogando');

    // abre a última numerada: ainda faltam as células vazias
    const ultima = numeradas[numeradas.length - 1];
    abrirCelula(jogo, ultima.l, ultima.c);
    expect(jogo.status).toBe('jogando');

    // abre as vazias: agora sim, vitória
    zeros.forEach(({ l, c }) => {
      if (podeAbrir(jogo, l, c)) abrirCelula(jogo, l, c);
    });
    expect(jogo.status).toBe('vitoria');
  });

  test('após a vitória não são aceitas novas jogadas', () => {
    const jogo = jogoFixo();
    todasCelulas(jogo)
      .filter(({ cel }) => !cel.bomba)
      .forEach(({ l, c }) => {
        if (podeAbrir(jogo, l, c)) abrirCelula(jogo, l, c);
      });
    expect(() => abrirCelula(jogo, 0, 0)).toThrow(/encerrado/);
    expect(() => alternarBandeira(jogo, 0, 0)).toThrow(/encerrado/);
  });

  test('colocar bandeiras nas bombas sem abrir as demais células não vence', () => {
    const jogo = jogoFixo();
    todasCelulas(jogo)
      .filter(({ cel }) => cel.bomba)
      .forEach(({ l, c }) => alternarBandeira(jogo, l, c));
    expect(bombasRestantes(jogo)).toBe(0);
    expect(jogo.status).not.toBe('vitoria');
  });
});

/* ------------------------- 8. derrota ------------------------- */

describe('8. Derrota', () => {
  test('a bomba aberta fica marcada como explodida e as demais bombas são reveladas', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 0, 0);

    expect(jogo.status).toBe('derrota');
    expect(jogo.tabuleiro[0][0].explodiu).toBe(true);
    const bombas = todasCelulas(jogo).filter(({ cel }) => cel.bomba);
    expect(bombas).toHaveLength(40);
    expect(bombas.every(({ cel }) => cel.aberta)).toBe(true);
    expect(bombas.filter(({ cel }) => cel.explodiu)).toHaveLength(1);
  });

  test('bombas marcadas com bandeira permanecem marcadas (não são reveladas)', () => {
    const jogo = jogoFixo();
    alternarBandeira(jogo, 0, 6); // bomba
    abrirCelula(jogo, 0, 0);
    expect(jogo.tabuleiro[0][6].bandeira).toBe(true);
    expect(jogo.tabuleiro[0][6].aberta).toBe(false);
    expect(jogo.tabuleiro[0][8].aberta).toBe(true);
  });

  test('a derrota não altera o contador de células seguras abertas', () => {
    const jogo = jogoFixo();
    abrirCelula(jogo, 5, 3);
    abrirCelula(jogo, 4, 4); // bomba
    expect(jogo.abertas).toBe(1);
    expect(jogo.status).toBe('derrota');
  });

  test('a primeira jogada nunca é derrota (100 sorteios)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const jogo = criarJogo({ rng: mulberry32(seed) });
      abrirCelula(jogo, seed % 14, seed % 18);
      expect(jogo.status).toBe('jogando');
    }
  });
});

/* ------------------------- 9. simulações ------------------------- */

describe('9. Simulações com seeds fixas', () => {
  test('300 partidas jogando cliques aleatórios terminam com estado consistente', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = mulberry32(seed);
      const jogo = criarJogo({ rng });
      let passos = 0;

      while (jogo.status === 'aguardando' || jogo.status === 'jogando') {
        const fechadas = todasCelulas(jogo).filter(({ l, c }) => podeAbrir(jogo, l, c));
        const { l, c } = fechadas[Math.floor(rng() * fechadas.length)];
        abrirCelula(jogo, l, c);
        passos++;
        if (passos === 1) expect(jogo.status).toBe('jogando');
        if (passos > 300) throw new Error(`seed ${seed}: partida não terminou`);
      }

      expect(contarBombas(jogo)).toBe(40);
      expect(jogo.abertas).toBeLessThanOrEqual(TOTAL_SEGURAS);
      todasCelulas(jogo)
        .filter(({ cel }) => !cel.bomba)
        .forEach(({ l, c, cel }) => expect(cel.vizinhas).toBe(vizinhasBruto(jogo, l, c)));

      if (jogo.status === 'vitoria') {
        expect(jogo.abertas).toBe(TOTAL_SEGURAS);
        expect(todasCelulas(jogo).some(({ cel }) => cel.bomba && cel.aberta)).toBe(false);
      } else {
        expect(jogo.status).toBe('derrota');
        const explodidas = todasCelulas(jogo).filter(({ cel }) => cel.explodiu);
        expect(explodidas).toHaveLength(1);
        expect(explodidas[0].cel.bomba).toBe(true);
      }
    }
  });

  test('um jogador que só abre células seguras vence em 100 partidas', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const jogo = criarJogo({ rng: mulberry32(seed) });
      abrirCelula(jogo, seed % 14, seed % 18); // 1ª jogada posiciona as bombas

      todasCelulas(jogo)
        .filter(({ cel }) => !cel.bomba)
        .forEach(({ l, c }) => {
          if (podeAbrir(jogo, l, c)) abrirCelula(jogo, l, c);
        });

      expect(jogo.status).toBe('vitoria');
      expect(jogo.abertas).toBe(TOTAL_SEGURAS);
    }
  });
});
