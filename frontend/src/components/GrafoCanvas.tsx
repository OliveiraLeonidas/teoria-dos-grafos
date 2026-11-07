import { estiloVertice, type ContextoVisual } from '../estilos';
import { calcularRotas, LAYOUT, type Disposicao } from '../layout';
import type { Aresta, Grafo } from '../types';

interface Props {
  grafo: Grafo;
  disposicao: Disposicao;
  ctx: ContextoVisual;
  ciclo: string[] | null;
  arestaSimulada: Aresta | null;
  onClickVertice: (id: string) => void;
  escala?: number;
}

const CORES = {
  padrao: '#94a3b8',
  pre: '#2563eb',
  dep: '#e11d48',
  ciclo: '#dc2626',
  simulada: '#7c3aed',
} as const;
type Marcador = keyof typeof CORES;

const consecutivos = (caminho: string[] | null, a: Aresta) => {
  if (!caminho) return false;
  for (let i = 0; i < caminho.length - 1; i++) {
    if (caminho[i] === a.origem && caminho[i + 1] === a.destino) return true;
  }
  return false;
};

export default function GrafoCanvas({ grafo, disposicao, ctx, ciclo, arestaSimulada, onClickVertice, escala = 1 }: Props) {
  const { posicoes, periodos, largura, altura } = disposicao;
  const { noLargura: w, noAltura: h } = LAYOUT;

  const estiloAresta = (a: Aresta): { cor: string; largura: number; marcador: Marcador } => {
    if (consecutivos(ciclo, a)) return { cor: CORES.ciclo, largura: 3.5, marcador: 'ciclo' };
    const c = ctx.consulta;
    if (ctx.modo === 'consulta' && c) {
      const alcancado = (id: string) => id === c.origem || c.impacto.has(id);
      if (alcancado(a.origem) && c.impacto.has(a.destino)) return { cor: CORES.dep, largura: 3, marcador: 'dep' };
      const exigido = (id: string) => id === c.origem || c.preTodos.has(id);
      if (c.preTodos.has(a.origem) && exigido(a.destino)) return { cor: CORES.pre, largura: 3, marcador: 'pre' };
      return { cor: '#e2e8f0', largura: 1.5, marcador: 'padrao' };
    }
    return { cor: '#cbd5e1', largura: 2, marcador: 'padrao' };
  };

  const arestas = arestaSimulada ? [...grafo.arestas, arestaSimulada] : grafo.arestas;
  const { rotas, altura: alturaTotal } = calcularRotas(disposicao, arestas);

  return (
    <svg
      viewBox={`0 0 ${largura} ${alturaTotal}`}
      width={largura * escala}
      height={alturaTotal * escala}
      className="select-none max-w-none"
      role="img"
      aria-label="Grafo direcionado de pré-requisitos"
    >
      <defs>
        {Object.entries(CORES).map(([nome, cor]) => (
          <marker
            key={nome}
            id={`seta-${nome}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill={cor} />
          </marker>
        ))}
      </defs>
      {periodos.map((p, i) => {
        const cx = LAYOUT.inicioX + i * LAYOUT.colunaLargura;
        return (
          <g key={p}>
            <rect
              x={cx - w / 2 - 8}
              y={20}
              width={w + 16}
              height={altura - 30}
              rx={14}
              fill={i % 2 === 0 ? '#f8fafc' : '#f1f5f9'}
              stroke="#e2e8f0"
            />
            <text x={cx} y={46} textAnchor="middle" className="fill-slate-600 font-bold text-[12px] uppercase tracking-wider">
              {p}º Período
            </text>
          </g>
        );
      })}

      {rotas.map(({ aresta: a, d }) => {
        const simulada = a === arestaSimulada;
        const estilo = simulada
          ? consecutivos(ciclo, a)
            ? { cor: CORES.ciclo, largura: 3.5, marcador: 'ciclo' as Marcador }
            : { cor: CORES.simulada, largura: 3, marcador: 'simulada' as Marcador }
          : estiloAresta(a);

        return (
          <path
            key={`${a.origem}->${a.destino}${simulada ? '-sim' : ''}`}
            d={d}
            fill="none"
            stroke={estilo.cor}
            strokeWidth={estilo.largura}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={simulada ? '7,5' : undefined}
            markerEnd={`url(#seta-${estilo.marcador})`}
            className="transition-all duration-300"
          >
            <title>
              {a.origem} → {a.destino}
              {simulada ? ' (simulada, não gravada)' : ''}
            </title>
          </path>
        );
      })}

      {grafo.vertices.map((v) => {
        const pos = posicoes[v.id];
        const estilo = estiloVertice(v.id, ctx);
        const palavras = v.rotulo.split(' ');
        const linhas = [''];
        for (const palavra of palavras) {
          const i = linhas.length - 1;
          if (linhas[i] && `${linhas[i]} ${palavra}`.length > 25) linhas.push(palavra);
          else linhas[i] = `${linhas[i]} ${palavra}`.trim();
        }
        const nome = linhas.slice(0, 2);
        if (linhas.length > 2) nome[1] = `${nome[1].slice(0, 23)}…`;

        return (
          <g
            key={v.id}
            transform={`translate(${pos.x - w / 2}, ${pos.y - h / 2})`}
            onClick={() => onClickVertice(v.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClickVertice(v.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${v.rotulo} (${v.id})`}
            className="group cursor-pointer transition-opacity duration-300 outline-none"
            style={{ opacity: estilo.opacity }}
          >
            <title>{v.rotulo}</title>
            <rect
              width={w}
              height={h}
              rx={12}
              fill={estilo.bg}
              stroke={estilo.border}
              strokeWidth={ctx.consulta?.origem === v.id && ctx.modo === 'consulta' ? 3 : 2}
              className="group-focus-visible:stroke-sky-500 group-focus-visible:stroke-[3px]"
            />
            <text x={12} y={23} fill={estilo.textMain ?? '#0f172a'} className="font-mono font-bold text-[13px]">
              {v.id}
            </text>
            {estilo.statusLabel && (
              <>
                <rect x={w - 92} y={9} width={84} height={19} rx={5} fill={estilo.badgeBg} />
                <text x={w - 50} y={22} textAnchor="middle" fill={estilo.badgeText} className="font-bold text-[9.5px] uppercase">
                  {estilo.statusLabel}
                </text>
              </>
            )}
            <text fill={estilo.textMain ?? '#1e293b'} className="font-bold text-[12px]">
              {nome.map((linha, i) => <tspan key={i} x={12} y={49 + i * 16}>{linha}</tspan>)}
            </text>
            <text x={12} y={87} fill={estilo.textSub ?? '#64748b'} className="font-mono text-[10.5px]">
              {v.carga_horaria ?? '–'}h • Pré:{v.grau_entrada} • Libera:{v.grau_saida}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
