import type { ReactNode } from 'react';

export function MestreDetalhe({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">{children}</div>
    </div>
  );
}

export function Lista({
  titulo,
  contagem,
  acao,
  children,
}: {
  titulo: string;
  contagem: number;
  acao: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h1 className="text-sm font-bold text-slate-900">
          {titulo} <span className="font-normal text-slate-400">({contagem})</span>
        </h1>
        {acao}
      </div>
      <div className="overflow-y-auto">{children}</div>
    </section>
  );
}

export function Detalhe({ children }: { children: ReactNode }) {
  return <section className="min-w-0 space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{children}</section>;
}
