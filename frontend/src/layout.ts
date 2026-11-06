import type { Aresta, Vertice } from './types';

export const LAYOUT = {
  colunaLargura: 292,
  linhaAltura: 144,
  inicioX: 132,
  inicioY: 120,
  noLargura: 204,
  noAltura: 104,
} as const;

export interface Posicao {
  x: number;
  y: number;
  periodo: number;
}

export interface Disposicao {
  posicoes: Record<string, Posicao>;
  periodos: number[];
  largura: number;
  altura: number;
}

export function calcularDisposicao(vertices: Vertice[], arestas: Aresta[]): Disposicao {
  const periodoDe = (v: Vertice) => v.periodo ?? 1;
  const periodos = [...new Set(vertices.map(periodoDe))].sort((a, b) => a - b);
  const colunas = periodos.map((p) => vertices.filter((v) => periodoDe(v) === p).sort((a, b) => a.id.localeCompare(b.id)));
  const linhas = Math.max(1, ...colunas.map((c) => c.length));
  const linha = new Map<string, number>();
  const atualizarLinhas = () => colunas.forEach((c) => c.forEach((v, i) => linha.set(v.id, i + (linhas - c.length) / 2)));
  atualizarLinhas();

  for (let rodada = 0; rodada < 6; rodada++) {
    const reversa = rodada % 2 === 1;
    for (const coluna of reversa ? [...colunas].reverse() : colunas) {
      const media = (id: string) => {
        const vizinhos = arestas
          .filter((a) => (reversa ? a.origem : a.destino) === id)
          .map((a) => linha.get(reversa ? a.destino : a.origem))
          .filter((n): n is number => n !== undefined);
        return vizinhos.length ? vizinhos.reduce((s, n) => s + n, 0) / vizinhos.length : linha.get(id)!;
      };
      const medias = new Map(coluna.map((v) => [v.id, media(v.id)]));
      coluna.sort((a, b) => medias.get(a.id)! - medias.get(b.id)! || linha.get(a.id)! - linha.get(b.id)!);
      atualizarLinhas();
    }
  }

  const posicoes: Record<string, Posicao> = {};
  colunas.forEach((coluna, i) => coluna.forEach((v) => {
    posicoes[v.id] = {
      x: LAYOUT.inicioX + i * LAYOUT.colunaLargura,
      y: LAYOUT.inicioY + linha.get(v.id)! * LAYOUT.linhaAltura,
      periodo: periodoDe(v),
    };
  }));
  return {
    posicoes,
    periodos,
    largura: LAYOUT.inicioX * 2 + Math.max(0, periodos.length - 1) * LAYOUT.colunaLargura,
    altura: LAYOUT.inicioY + (linhas - 1) * LAYOUT.linhaAltura + LAYOUT.noAltura / 2 + 32,
  };
}

export function calcularRotas(disposicao: Disposicao, arestas: Aresta[]) {
  const { posicoes, altura } = disposicao;
  const validas = arestas.filter((a) => posicoes[a.origem] && posicoes[a.destino]);
  const saidas = new Map<string, Aresta[]>();
  const entradas = new Map<string, Aresta[]>();
  validas.forEach((a) => {
    saidas.set(a.origem, [...(saidas.get(a.origem) ?? []), a]);
    entradas.set(a.destino, [...(entradas.get(a.destino) ?? []), a]);
  });
  saidas.forEach((grupo) => grupo.sort((a, b) => posicoes[a.destino].y - posicoes[b.destino].y));
  entradas.forEach((grupo) => grupo.sort((a, b) => posicoes[a.origem].y - posicoes[b.origem].y));
  const porta = (grupo: Aresta[], a: Aresta) => (grupo.indexOf(a) - (grupo.length - 1) / 2) * Math.min(14, 56 / grupo.length);
  let desvios = 0;
  const rotas = validas.map((aresta) => {
    const p1 = posicoes[aresta.origem];
    const p2 = posicoes[aresta.destino];
    const sx = p1.x + LAYOUT.noLargura / 2;
    const sy = p1.y + porta(saidas.get(aresta.origem)!, aresta);
    const ex = p2.x - LAYOUT.noLargura / 2 - 6;
    const ey = p2.y + porta(entradas.get(aresta.destino)!, aresta);
    if (p2.x - p1.x === LAYOUT.colunaLargura) {
      const mx = (sx + ex) / 2;
      return { aresta, d: `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}` };
    }
    const faixa = altura + 12 + desvios++ * 20;
    const direita = sx + 22;
    const esquerda = ex - 16;
    const r = 8;
    const dir = Math.sign(esquerda - direita) || 1;
    const d = `M ${sx} ${sy} L ${direita - r} ${sy} Q ${direita} ${sy} ${direita} ${sy + r} ` +
      `L ${direita} ${faixa - r} Q ${direita} ${faixa} ${direita + r * dir} ${faixa} ` +
      `L ${esquerda - r * dir} ${faixa} Q ${esquerda} ${faixa} ${esquerda} ${faixa - r} ` +
      `L ${esquerda} ${ey + r} Q ${esquerda} ${ey} ${esquerda + r} ${ey} L ${ex} ${ey}`;
    return { aresta, d };
  });
  return { rotas, altura: desvios ? altura + 24 + desvios * 20 : altura };
}
