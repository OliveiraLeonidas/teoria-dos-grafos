export type Modo = 'progresso' | 'consulta' | 'ciclo' | 'ordem';
export type CorDfs = 'BRANCO' | 'CINZA' | 'PRETO' | 'CICLO';

export interface EstiloVertice {
  bg: string;
  border: string;
  textMain?: string;
  textSub?: string;
  badgeBg: string;
  badgeText: string;
  statusLabel: string;
  opacity: number;
}

export interface ConjuntosConsulta {
  origem: string;
  preDiretos: Set<string>;
  preTodos: Set<string>;
  impacto: Map<string, number>;
  depDiretos: Set<string>;
}

export interface ContextoVisual {
  modo: Modo;
  consulta: ConjuntosConsulta | null;
  escolhidos: { u: string; v: string };
  coresDfs: Record<string, CorDfs>;
  ordem: Record<string, { posicao: number; nivel: number }>;
  ordemVisivel: number;
  progresso: { concluidas: Set<string>; cursando: Set<string>; liberadas: Set<string> } | null;
}

const neutro = (statusLabel = '', opacity = 1): EstiloVertice => ({
  bg: '#ffffff',
  border: '#cbd5e1',
  badgeBg: '#f1f5f9',
  badgeText: '#475569',
  statusLabel,
  opacity,
});

const destaque = (bg: string, border: string, badgeBg: string, statusLabel: string, opacity = 1): EstiloVertice => ({
  bg,
  border,
  badgeBg,
  badgeText: '#ffffff',
  statusLabel,
  opacity,
});

export function estiloVertice(id: string, ctx: ContextoVisual): EstiloVertice {
  switch (ctx.modo) {
    case 'progresso': {
      const p = ctx.progresso;
      if (!p) return neutro();
      if (p.concluidas.has(id)) return destaque('#ecfdf5', '#059669', '#059669', 'Concluída');
      if (p.cursando.has(id)) return destaque('#fffbeb', '#d97706', '#d97706', 'Cursando');
      if (p.liberadas.has(id)) return destaque('#eff6ff', '#2563eb', '#2563eb', 'Liberada');
      return { ...neutro('Bloqueada'), bg: '#f8fafc', textMain: '#475569' };
    }

    case 'consulta': {
      const c = ctx.consulta;
      if (!c) return neutro();
      if (c.origem === id)
        return {
          bg: '#0f172a',
          border: '#0ea5e9',
          textMain: '#ffffff',
          textSub: '#bae6fd',
          badgeBg: '#0ea5e9',
          badgeText: '#0f172a',
          statusLabel: 'Consultada',
          opacity: 1,
        };
      const pos = c.impacto.get(id);
      if (pos !== undefined)
        return c.depDiretos.has(id)
          ? destaque('#fff1f2', '#e11d48', '#e11d48', `Impacto ${pos + 1}º`)
          : destaque('#fff7ed', '#f97316', '#ea580c', `Impacto ${pos + 1}º`);
      if (c.preDiretos.has(id)) return destaque('#eff6ff', '#2563eb', '#2563eb', 'Pré-req');
      if (c.preTodos.has(id)) return destaque('#f0f9ff', '#38bdf8', '#0284c7', 'Pré-req ind.', 0.95);
      return neutro('', 0.35);
    }

    case 'ciclo': {
      const cor = ctx.coresDfs[id];
      if (cor === 'CICLO') return destaque('#fef2f2', '#dc2626', '#dc2626', 'Ciclo');
      if (cor === 'CINZA') return destaque('#fffbeb', '#d97706', '#d97706', 'Cinza');
      if (cor === 'PRETO')
        return { ...destaque('#0f172a', '#334155', '#10b981', 'Preto'), textMain: '#f8fafc', textSub: '#94a3b8' };
      if (cor === 'BRANCO') return { ...neutro('Branco', 0.85), badgeBg: '#e2e8f0' };
      if (id === ctx.escolhidos.u) return destaque('#f5f3ff', '#7c3aed', '#7c3aed', 'u (pré-req)');
      if (id === ctx.escolhidos.v) return destaque('#f5f3ff', '#7c3aed', '#7c3aed', 'v (dependente)');
      return neutro();
    }

    case 'ordem': {
      const o = ctx.ordem[id];
      if (o && o.posicao < ctx.ordemVisivel)
        return destaque('#eff6ff', '#2563eb', '#1d4ed8', `#${o.posicao + 1} · Sem ${o.nivel}`);
      return { ...neutro('na fila', 0.5), bg: '#f8fafc' };
    }
  }
}
