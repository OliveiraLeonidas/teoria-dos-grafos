import { LockKeyhole } from 'lucide-react';
import type { Grafo, Progresso } from '../types';
import { Secao } from './ui';

export default function MateriasBloqueadas({ grafo, progresso }: { grafo: Grafo; progresso: Progresso }) {
  const concluidas = new Set(progresso.concluidas);
  const nome = (id: string) => grafo.vertices.find((v) => v.id === id)?.rotulo ?? id;

  return (
    <Secao titulo={`Matérias bloqueadas (${progresso.bloqueadas.length})`}>
      {progresso.bloqueadas.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma matéria bloqueada por pré-requisitos.</p>
      ) : (
        <ul className="space-y-2">
          {progresso.bloqueadas.map((id) => {
            const pendentes = grafo.arestas
              .filter((a) => a.destino === id && !concluidas.has(a.origem))
              .map((a) => a.origem);
            return (
              <li key={id} className="flex gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{nome(id)}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Falta concluir: {pendentes.map(nome).join(', ')}.
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Secao>
  );
}
