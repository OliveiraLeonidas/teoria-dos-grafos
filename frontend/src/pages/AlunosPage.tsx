import { Network, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api';
import { FormAluno, FormMatricula, ROTULO_SITUACAO } from '../components/Formularios';
import MateriasBloqueadas from '../components/MateriasBloqueadas';
import { Botao, Chip, Secao } from '../components/ui';
import type { Aluno, Matricula, Situacao } from '../types';
import { nomeDe, type FocoGrafo, type PropsPagina } from './comum';
import { Detalhe, Lista, MestreDetalhe } from './MestreDetalhe';

const COR_SITUACAO: Record<Situacao, 'emerald' | 'rose' | 'amber' | 'slate'> = {
  APROVADO: 'emerald',
  REPROVADO: 'rose',
  EM_ANDAMENTO: 'amber',
  PENDENTE: 'slate',
};

export default function AlunosPage(props: PropsPagina & { foco: FocoGrafo | null }) {
  const { alunos, cursos, grafo } = props;
  const [selecionadoId, setSelecionadoId] = useState<number | null>(props.foco?.alunoId ?? alunos[0]?.id ?? null);
  const [formAluno, setFormAluno] = useState<{ inicial?: Aluno } | null>(null);
  const [formMatricula, setFormMatricula] = useState<{ inicial?: Matricula; disciplina?: string } | null>(null);

  const aluno = alunos.find((a) => a.id === selecionadoId) ?? alunos[0] ?? null;
  const total = grafo.vertices.length || 1;

  const excluirAluno = (a: Aluno) =>
    props.confirmar({
      titulo: `Excluir ${a.nome}?`,
      mensagem: <p>O aluno e os {a.historico.length} registro(s) do histórico dele serão apagados.</p>,
      rotuloConfirmar: 'Excluir aluno',
      acao: async () => {
        await api.removerAluno(a.id);
        setSelecionadoId(null);
        await props.recarregarAlunos();
        props.avisar.sucesso(`${a.nome} excluído.`);
      },
    });

  const excluirMatricula = (m: Matricula) =>
    props.confirmar({
      titulo: 'Remover registro do histórico?',
      mensagem: (
        <p>
          {m.disciplina_nome} em {m.semestre} ({ROTULO_SITUACAO[m.situacao].toLowerCase()}).
        </p>
      ),
      rotuloConfirmar: 'Remover',
      acao: async () => {
        await api.removerMatricula(m.id);
        await props.recarregarAlunos();
        props.avisar.sucesso('Registro removido.');
      },
    });

  return (
    <MestreDetalhe>
      <Lista
        titulo="Alunos"
        contagem={alunos.length}
        acao={
          <Botao pequeno variante="primario" onClick={() => setFormAluno({})} disabled={cursos.length === 0}>
            <UserPlus className="w-3.5 h-3.5" /> Novo
          </Botao>
        }
      >
        {alunos.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum aluno.</p>}
        <ul className="divide-y divide-slate-100">
          {alunos.map((a) => {
            const pct = Math.round((a.progresso.concluidas.length / total) * 100);
            return (
              <li key={a.id}>
                <button
                  onClick={() => setSelecionadoId(a.id)}
                  aria-current={a.id === aluno?.id}
                  className={`w-full px-4 py-3 text-left transition ${a.id === aluno?.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{a.nome}</span>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                  <div className="font-mono text-xs text-slate-500">{a.matricula}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </Lista>

      {!aluno ? (
        <Detalhe>
          <p className="text-sm text-slate-500">Selecione um aluno.</p>
        </Detalhe>
      ) : (
        <Detalhe>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{aluno.nome}</h2>
              <p className="text-sm text-slate-500">
                <span className="font-mono">{aluno.matricula}</span> · {aluno.curso}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao pequeno onClick={() => props.irPara('grafo', { alunoId: aluno.id })}>
                <Network className="w-3.5 h-3.5" /> Ver no grafo
              </Botao>
              <Botao pequeno onClick={() => setFormAluno({ inicial: aluno })}>
                <Pencil className="w-3.5 h-3.5" /> Editar
              </Botao>
              <Botao pequeno className="text-rose-700" onClick={() => excluirAluno(aluno)}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </Botao>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Contador rotulo="Concluídas" ids={aluno.progresso.concluidas} cor="text-emerald-700" />
            <Contador rotulo="Cursando" ids={aluno.progresso.cursando} cor="text-amber-700" />
            <Contador rotulo="Liberadas" ids={aluno.progresso.liberadas} cor="text-sky-700" />
            <Contador rotulo="Bloqueadas" ids={aluno.progresso.bloqueadas} cor="text-slate-600" />
          </div>

          <Secao titulo="Pode se matricular">
            {aluno.progresso.liberadas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma disciplina liberada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {aluno.progresso.liberadas.map((id) => (
                  <Chip key={id} cor="sky" titulo="Registrar no histórico">
                    <button className="inline-flex items-center gap-1" onClick={() => setFormMatricula({ disciplina: id })}>
                      <Plus className="w-3 h-3" />
                      {nomeDe(grafo, id)}
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </Secao>

          <MateriasBloqueadas grafo={grafo} progresso={aluno.progresso} />

          <Secao
            titulo={`Histórico (${aluno.historico.length})`}
            acao={
              <Botao pequeno variante="fantasma" onClick={() => setFormMatricula({})}>
                <Plus className="w-3.5 h-3.5" /> Registrar
              </Botao>
            }
          >
            {aluno.historico.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum registro ainda.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Semestre</th>
                      <th className="px-3 py-2">Disciplina</th>
                      <th className="px-3 py-2">Situação</th>
                      <th className="px-3 py-2 text-center">Nota</th>
                      <th className="px-3 py-2" aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aluno.historico.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2 font-mono text-slate-600">{m.semestre}</td>
                        <td className="px-3 py-2 text-slate-900">{m.disciplina_nome}</td>
                        <td className="px-3 py-2">
                          <Chip cor={COR_SITUACAO[m.situacao]}>{ROTULO_SITUACAO[m.situacao]}</Chip>
                        </td>
                        <td className="px-3 py-2 text-center">{m.nota ?? '–'}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Botao pequeno variante="fantasma" onClick={() => setFormMatricula({ inicial: m })} aria-label="Editar registro">
                              <Pencil className="w-3.5 h-3.5" />
                            </Botao>
                            <Botao
                              pequeno
                              variante="fantasma"
                              className="text-rose-600"
                              onClick={() => excluirMatricula(m)}
                              aria-label="Remover registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Botao>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Secao>
        </Detalhe>
      )}

      {formAluno && (
        <FormAluno
          cursos={cursos}
          inicial={formAluno.inicial}
          onFechar={() => setFormAluno(null)}
          onSalvo={async (a) => {
            setFormAluno(null);
            setSelecionadoId(a.id);
            await props.recarregarAlunos();
            props.avisar.sucesso(formAluno.inicial ? `${a.nome} atualizado.` : `${a.nome} cadastrado.`);
          }}
        />
      )}
      {formMatricula && aluno && (
        <FormMatricula
          aluno={aluno}
          grafo={grafo}
          inicial={formMatricula.inicial}
          disciplinaInicial={formMatricula.disciplina}
          onFechar={() => setFormMatricula(null)}
          onSalvo={async () => {
            setFormMatricula(null);
            await props.recarregarAlunos();
            props.avisar.sucesso(formMatricula.inicial ? 'Registro atualizado.' : 'Disciplina registrada.');
          }}
        />
      )}
    </MestreDetalhe>
  );
}

function Contador({ rotulo, ids, cor }: { rotulo: string; ids: string[]; cor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2" title={ids.join(', ')}>
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className={`text-xl font-bold ${cor}`}>{ids.length}</p>
    </div>
  );
}
