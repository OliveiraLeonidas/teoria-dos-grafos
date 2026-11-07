import { Network, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { mensagemDe } from '../api';
import { FormDisciplina, FormPrerequisito } from '../components/Formularios';
import { Botao, Chip, Secao } from '../components/ui';
import type { Vertice } from '../types';
import { nomeDe, ordenarPorPeriodo, pedirRemocaoDisciplina, pedirRemocaoPrerequisito, type PropsPagina } from './comum';
import { Detalhe, Lista, MestreDetalhe } from './MestreDetalhe';

export default function DisciplinasPage(props: PropsPagina) {
  const { grafo } = props;
  const [selecionadaId, setSelecionadaId] = useState<string | null>(grafo.vertices[0]?.id ?? null);
  const [form, setForm] = useState<{ inicial?: Vertice } | null>(null);
  const [novoPre, setNovoPre] = useState(false);

  const selecionada = grafo.vertices.find((v) => v.id === selecionadaId) ?? null;
  const ordenadas = ordenarPorPeriodo(grafo.vertices);
  const periodos = [...new Set(ordenadas.map((v) => v.periodo ?? 0))];
  const maiorPeriodo = Math.max(1, ...periodos);
  const nome = (id: string) => nomeDe(grafo, id);
  const preRequisitos = selecionada ? grafo.arestas.filter((a) => a.destino === selecionada.id).map((a) => a.origem) : [];
  const libera = selecionada ? grafo.arestas.filter((a) => a.origem === selecionada.id).map((a) => a.destino) : [];

  return (
    <MestreDetalhe>
      <Lista
        titulo="Disciplinas"
        contagem={grafo.vertices.length}
        acao={
          <Botao pequeno variante="primario" onClick={() => setForm({})}>
            <Plus className="w-3.5 h-3.5" /> Nova
          </Botao>
        }
      >
        {periodos.map((p) => (
          <div key={p}>
            <p className="sticky top-0 bg-slate-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 border-y border-slate-100">
              {p}º período
            </p>
            {ordenadas
              .filter((v) => (v.periodo ?? 0) === p)
              .map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelecionadaId(v.id)}
                  aria-current={v.id === selecionadaId}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                    v.id === selecionadaId ? 'bg-sky-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-16 shrink-0 font-mono text-xs font-bold text-sky-700">{v.id}</span>
                  <span className="flex-1 truncate text-sm text-slate-800">{v.rotulo}</span>
                  <span className="text-xs text-slate-400">{v.carga_horaria}h</span>
                </button>
              ))}
          </div>
        ))}
      </Lista>

      {!selecionada ? (
        <Detalhe>
          <p className="text-sm text-slate-500">Selecione uma disciplina.</p>
        </Detalhe>
      ) : (
        <Detalhe>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selecionada.rotulo}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>Sigla {selecionada.id}</Chip>
                <Chip>Código {selecionada.codigo}</Chip>
                <Chip>{selecionada.periodo}º período</Chip>
                <Chip>{selecionada.carga_horaria}h</Chip>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao pequeno onClick={() => props.irPara('grafo', { disciplina: selecionada.id })}>
                <Network className="w-3.5 h-3.5" /> Ver impacto no grafo
              </Botao>
              <Botao pequeno onClick={() => setForm({ inicial: selecionada })}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Botao>
              <Botao
                pequeno
                className="text-rose-700"
                onClick={() =>
                  pedirRemocaoDisciplina(selecionada, props, () => setSelecionadaId(null)).catch((e) =>
                    props.avisar.erro(mensagemDe(e)),
                  )
                }
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Botao>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Secao
              titulo={`Pré-requisitos (${preRequisitos.length})`}
              acao={
                <Botao pequeno variante="fantasma" onClick={() => setNovoPre(true)}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Botao>
              }
            >
              {preRequisitos.length === 0 ? (
                <p className="text-sm text-slate-500">Sem pré-requisitos.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {preRequisitos.map((id) => (
                    <li key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <button className="text-left hover:underline" onClick={() => setSelecionadaId(id)}>
                        <span className="font-medium text-slate-900">{nome(id)}</span>{' '}
                        <span className="font-mono text-xs text-slate-500">{id}</span>
                      </button>
                      <Botao
                        pequeno
                        variante="fantasma"
                        className="text-rose-600"
                        aria-label={`Remover ${id} dos pré-requisitos`}
                        onClick={() => pedirRemocaoPrerequisito(id, selecionada.id, props)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Botao>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>

            <Secao titulo={`Libera (${libera.length})`}>
              {libera.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma disciplina depende desta.</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {libera.map((id) => (
                    <li key={id} className="px-3 py-2 text-sm">
                      <button className="text-left hover:underline" onClick={() => setSelecionadaId(id)}>
                        <span className="font-medium text-slate-900">{nome(id)}</span>{' '}
                        <span className="font-mono text-xs text-slate-500">{id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Secao>
          </div>
        </Detalhe>
      )}

      {form && (
        <FormDisciplina
          inicial={form.inicial}
          periodoSugerido={maiorPeriodo}
          onFechar={() => setForm(null)}
          onSalvo={(g, nomeSalvo) => {
            props.aoMudarGrafo(g);
            if (!form.inicial) {
              const nova = g.vertices.find((v) => v.rotulo === nomeSalvo);
              if (nova) setSelecionadaId(nova.id);
            }
            setForm(null);
            props.avisar.sucesso(form.inicial ? `${nomeSalvo} atualizada.` : `${nomeSalvo} criada.`);
          }}
        />
      )}
      {novoPre && selecionada && (
        <FormPrerequisito
          grafo={grafo}
          dependente={selecionada}
          onFechar={() => setNovoPre(false)}
          onSalvo={(g, pre) => {
            setNovoPre(false);
            props.aoMudarGrafo(g);
            props.avisar.sucesso(`${pre} agora é pré-requisito de ${selecionada.id}.`);
          }}
        />
      )}
    </MestreDetalhe>
  );
}
