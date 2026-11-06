import { CheckCircle2, GitBranch, GraduationCap, Layers, Maximize, Minus, Play, Plus, Save, Search, ShieldAlert, SkipForward, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, mensagemDe } from '../api';
import { FormMatricula, SeletorDisciplina } from '../components/Formularios';
import GrafoCanvas from '../components/GrafoCanvas';
import MateriasBloqueadas from '../components/MateriasBloqueadas';
import { useAnimacao } from '../components/useAnimacao';
import { AlertaErro, Botao, Campo, Chip, Secao, classeInput } from '../components/ui';
import type { ConjuntosConsulta, ContextoVisual, CorDfs, Modo } from '../estilos';
import { calcularDisposicao } from '../layout';
import type { Aresta, PassoDfs, ResultadoConsulta, ResultadoOrdenacao, ResultadoValidacao } from '../types';
import { existe, nomeDe, ordenarPorPeriodo, type FocoGrafo, type PropsPagina } from './comum';

const MODOS: { id: Modo; rotulo: string; icone: LucideIcon }[] = [
  { id: 'progresso', rotulo: 'Progresso do aluno', icone: GraduationCap },
  { id: 'consulta', rotulo: 'Impacto', icone: GitBranch },
  { id: 'ciclo', rotulo: 'Ciclos', icone: ShieldAlert },
  { id: 'ordem', rotulo: 'Ordem', icone: Layers },
];

export default function GrafoPage(props: PropsPagina & { foco: FocoGrafo | null }) {
  const { grafo, alunos } = props;
  const [modo, setModo] = useState<Modo>(props.foco?.disciplina ? 'consulta' : 'progresso');

  const [alunoId, setAlunoId] = useState<number | null>(props.foco?.alunoId ?? alunos[0]?.id ?? null);
  const [matriculaEm, setMatriculaEm] = useState<string | null>(null);
  const aluno = alunos.find((a) => a.id === alunoId) ?? alunos[0] ?? null;

  const [consulta, setConsulta] = useState<ResultadoConsulta | null>(null);
  const pedidoConsulta = useRef(0);
  const pedidoValidacao = useRef(0);
  const [u, setU] = useState('');
  const [v, setV] = useState('');
  const [validacao, setValidacao] = useState<ResultadoValidacao | null>(null);
  const [passoAtual, setPassoAtual] = useState(-1);
  const [gravada, setGravada] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<ResultadoOrdenacao | null>(null);
  const [ordemVisivel, setOrdemVisivel] = useState(Number.POSITIVE_INFINITY);

  const anim = useAnimacao(300);
  const disposicao = useMemo(() => calcularDisposicao(grafo.vertices, grafo.arestas), [grafo]);
  const areaGrafo = useRef<HTMLDivElement>(null);
  const [larguraDisponivel, setLarguraDisponivel] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const escala = zoom ?? (larguraDisponivel ? Math.min(1, Math.max(0.25, (larguraDisponivel - 50) / disposicao.largura)) : 1);

  useEffect(() => {
    const area = areaGrafo.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => setLarguraDisponivel(entry.contentRect.width));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const trocarModo = (m: Modo) => {
    anim.parar();
    setModo(m);
  };

  const conjuntos = useMemo<ConjuntosConsulta | null>(
    () =>
      consulta && {
        origem: consulta.id,
        preDiretos: new Set(consulta.antecessores),
        preTodos: new Set(consulta.pre_requisitos_transitivos),
        impacto: new Map(consulta.impacto.map((id, i) => [id, i])),
        depDiretos: new Set(consulta.sucessores),
      },
    [consulta],
  );

  const dfsTerminou = !!validacao && passoAtual >= validacao.passos.length - 1;
  const coresDfs = useMemo(() => {
    const cores: Record<string, CorDfs> = {};
    if (!validacao || passoAtual < 0) return cores;
    grafo.vertices.forEach((x) => (cores[x.id] = 'BRANCO'));
    for (const p of validacao.passos.slice(0, passoAtual + 1)) if (p.evento !== 'RETORNO') cores[p.alvo] = p.evento;
    if (dfsTerminou && validacao.ciclo) validacao.ciclo.forEach((x) => (cores[x] = 'CICLO'));
    return cores;
  }, [grafo, validacao, passoAtual, dfsTerminou]);

  const ordemPorVertice = useMemo(() => {
    const r: ContextoVisual['ordem'] = {};
    const nivelDe: Record<string, number> = {};
    ordem?.niveis?.forEach((nivel, i) => nivel.forEach((x) => (nivelDe[x] = i + 1)));
    ordem?.kahn?.forEach((x, i) => (r[x] = { posicao: i, nivel: nivelDe[x] ?? 0 }));
    return r;
  }, [ordem]);

  useEffect(() => {
    setOrdem(null);
    setOrdemVisivel(Number.POSITIVE_INFINITY);
    if (modo !== 'ordem') return;
    let ativo = true;
    api.ordenacao().then(
      (r) => ativo && setOrdem(r),
      (e) => ativo && props.avisar.erro(mensagemDe(e)),
    );
    return () => {
      ativo = false;
    };
  }, [modo, grafo, props.avisar]);

  useEffect(() => {
    pedidoConsulta.current++;
    pedidoValidacao.current++;
    anim.parar();
    setValidacao(null);
    setPassoAtual(-1);
    setConsulta(null);
    setU((id) => grafo.vertices.some((x) => x.id === id) ? id : '');
    setV((id) => grafo.vertices.some((x) => x.id === id) ? id : '');
  }, [grafo]);

  const consultar = async (termo: string) => {
    const pedido = ++pedidoConsulta.current;
    setConsulta(null);
    try {
      const resultado = await api.consultar(termo);
      if (pedido !== pedidoConsulta.current) return null;
      setConsulta(resultado);
      return null;
    } catch (e) {
      if (pedido !== pedidoConsulta.current) return null;
      setConsulta(null);
      return mensagemDe(e);
    }
  };

  useEffect(() => {
    if (props.foco?.disciplina) void consultar(props.foco.disciplina);
  }, [props.foco]);

  const escolher = (novoU: string, novoV: string) => {
    pedidoValidacao.current++;
    anim.parar();
    setValidacao(null);
    setPassoAtual(-1);
    setGravada(null);
    setU(novoU);
    setV(novoV);
  };

  const validar = async () => {
    const pedido = ++pedidoValidacao.current;
    try {
      const r = await api.validarPrerequisito({ pre_requisito: u, dependente: v });
      if (pedido !== pedidoValidacao.current) return;
      setValidacao(r);
      anim.animar(r.passos.length, setPassoAtual);
    } catch (e) {
      if (pedido === pedidoValidacao.current) props.avisar.erro(mensagemDe(e));
    }
  };

  const gravar = async () => {
    if (!validacao) return;
    try {
      props.aoMudarGrafo(
        await api.criarPrerequisito({ pre_requisito: validacao.pre_requisito, dependente: validacao.dependente }),
      );
      setGravada(`${validacao.pre_requisito} → ${validacao.dependente}`);
      props.avisar.sucesso(`${validacao.pre_requisito} → ${validacao.dependente} gravado.`);
    } catch (e) {
      props.avisar.erro(mensagemDe(e));
    }
  };

  const clicarVertice = (id: string) => {
    if (modo === 'progresso') {
      if (aluno?.progresso.liberadas.includes(id)) setMatriculaEm(id);
    } else if (modo === 'consulta') void consultar(id);
    else if (modo === 'ciclo') {
      if (!u || (u && v)) escolher(id, '');
      else escolher(u, id === u ? '' : id);
    }
  };

  const jaExiste = !!u && !!v && grafo.arestas.some((a) => a.origem === u && a.destino === v);
  const arestaProposta: Aresta | null = modo === 'ciclo' && u && v && !jaExiste ? { origem: u, destino: v } : null;

  const ctx: ContextoVisual = {
    modo,
    consulta: conjuntos,
    escolhidos: { u, v },
    coresDfs,
    ordem: ordemPorVertice,
    ordemVisivel,
    progresso: aluno
      ? {
          concluidas: new Set(aluno.progresso.concluidas),
          cursando: new Set(aluno.progresso.cursando),
          liberadas: new Set(aluno.progresso.liberadas),
        }
      : null,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-2.5">
        <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Visualização">
          {MODOS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              role="tab"
              aria-selected={modo === id}
              onClick={() => trocarModo(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                modo === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icone className="w-4 h-4" />
              {rotulo}
            </button>
          ))}
        </div>
        <Legenda modo={modo} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row lg:overflow-hidden">
        <div className="flex min-h-[380px] min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
            <p className="text-xs text-slate-600">Pré-requisito → disciplina dependente</p>
            <div className="flex items-center gap-1" role="group" aria-label="Zoom do grafo">
              <Botao pequeno variante="fantasma" aria-label="Diminuir zoom" disabled={escala <= 0.25} onClick={() => setZoom(Math.max(0.25, escala - 0.1))}>
                <Minus className="h-3.5 w-3.5" />
              </Botao>
              <span className="w-10 text-center text-xs tabular-nums text-slate-600">{Math.round(escala * 100)}%</span>
              <Botao pequeno variante="fantasma" aria-label="Aumentar zoom" disabled={escala >= 1.5} onClick={() => setZoom(Math.min(1.5, escala + 0.1))}>
                <Plus className="h-3.5 w-3.5" />
              </Botao>
              <Botao pequeno variante="fantasma" onClick={() => setZoom(null)}>
                <Maximize className="h-3.5 w-3.5" /> Ajustar
              </Botao>
            </div>
          </div>
          <div ref={areaGrafo} className="min-h-0 flex-1 overflow-auto p-4">
          <div className="mx-auto w-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <GrafoCanvas
              grafo={grafo}
              disposicao={disposicao}
              ctx={ctx}
              ciclo={modo === 'ciclo' && dfsTerminou ? (validacao?.ciclo ?? null) : null}
              arestaSimulada={arestaProposta}
              onClickVertice={clicarVertice}
              escala={escala}
            />
          </div>
          </div>
        </div>
        <aside className="w-full shrink-0 space-y-5 border-t border-slate-200 bg-white p-5 lg:w-[340px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          {modo === 'progresso' && (
            <PainelProgresso props={props} alunoId={aluno?.id ?? null} onAluno={setAlunoId} onRegistrar={setMatriculaEm} />
          )}
          {modo === 'consulta' && (
            <PainelImpacto key={props.foco?.disciplina} props={props} consulta={consulta} onConsultar={consultar} />
          )}
          {modo === 'ciclo' && (
            <PainelCiclos
              props={props}
              u={u}
              v={v}
              onEscolher={escolher}
              onValidar={validar}
              onGravar={gravar}
              onPular={() => (anim.parar(), setPassoAtual((validacao?.passos.length ?? 0) - 1))}
              animando={anim.animando}
              validacao={validacao}
              gravada={gravada}
              passoAtual={passoAtual}
              terminou={dfsTerminou}
            />
          )}
          {modo === 'ordem' && (
            <PainelOrdem
              props={props}
              ordem={ordem}
              animando={anim.animando}
              onAnimar={() => ordem?.kahn && anim.animar(ordem.kahn.length + 1, setOrdemVisivel)}
              onPular={() => (anim.parar(), setOrdemVisivel(Number.POSITIVE_INFINITY))}
            />
          )}
        </aside>
      </div>
      {matriculaEm && aluno && (
        <FormMatricula
          aluno={aluno}
          grafo={grafo}
          disciplinaInicial={matriculaEm}
          onFechar={() => setMatriculaEm(null)}
          onSalvo={async () => {
            setMatriculaEm(null);
            await props.recarregarAlunos();
            props.avisar.sucesso(`${nomeDe(grafo, matriculaEm)} registrada no histórico de ${aluno.nome}.`);
          }}
        />
      )}
    </div>
  );
}

function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-bold text-slate-900">{children}</h2>
      {sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function PainelProgresso({
  props,
  alunoId,
  onAluno,
  onRegistrar,
}: {
  props: PropsPagina;
  alunoId: number | null;
  onAluno: (id: number) => void;
  onRegistrar: (disciplina: string) => void;
}) {
  const { alunos, grafo } = props;
  const aluno = alunos.find((a) => a.id === alunoId);
  if (alunos.length === 0)
    return (
      <p className="text-sm text-slate-500">
        Nenhum aluno cadastrado.{' '}
        <button className="font-semibold text-sky-700 hover:underline" onClick={() => props.irPara('alunos')}>
          Cadastrar aluno
        </button>
      </p>
    );

  const total = grafo.vertices.length || 1;
  const p = aluno?.progresso;
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Aluno</span>
        <select className={classeInput} value={alunoId ?? ''} onChange={(e) => onAluno(Number(e.target.value))}>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome} ({a.matricula})
            </option>
          ))}
        </select>
      </label>
      {aluno && p && (
        <>
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Progresso no curso</span>
              <span className="text-slate-500">
                {p.concluidas.length}/{grafo.vertices.length}
              </span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${(p.concluidas.length / total) * 100}%` }} />
              <div className="bg-amber-400" style={{ width: `${(p.cursando.length / total) * 100}%` }} />
            </div>
          </div>
          <GrupoStatus titulo="Pode se matricular" cor="sky" ids={p.liberadas} grafo={grafo} onClicar={onRegistrar} />
          <MateriasBloqueadas grafo={grafo} progresso={p} />
          <GrupoStatus titulo="Cursando" cor="amber" ids={p.cursando} grafo={grafo} />
          <GrupoStatus titulo="Concluídas" cor="emerald" ids={p.concluidas} grafo={grafo} />
          <Botao className="w-full" onClick={() => props.irPara('alunos', { alunoId: aluno.id })}>
            Abrir histórico completo
          </Botao>
        </>
      )}
    </>
  );
}

function GrupoStatus({
  titulo,
  cor,
  ids,
  grafo,
  onClicar,
}: {
  titulo: string;
  cor: 'sky' | 'amber' | 'emerald' | 'slate';
  ids: string[];
  grafo: PropsPagina['grafo'];
  onClicar?: (id: string) => void;
}) {
  return (
    <Secao titulo={`${titulo} (${ids.length})`}>
      {ids.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <Chip key={id} cor={cor} titulo={onClicar ? 'Registrar no histórico' : undefined}>
              {onClicar ? (
                <button onClick={() => onClicar(id)} className="inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  {nomeDe(grafo, id)}
                </button>
              ) : (
                nomeDe(grafo, id)
              )}
            </Chip>
          ))}
        </div>
      )}
    </Secao>
  );
}

function PainelImpacto({
  props,
  consulta,
  onConsultar,
}: {
  props: PropsPagina;
  consulta: ResultadoConsulta | null;
  onConsultar: (termo: string) => Promise<string | null>;
}) {
  const { grafo } = props;
  const [termo, setTermo] = useState(consulta?.rotulo ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const nome = (id: string) => nomeDe(grafo, id);

  useEffect(() => {
    if (consulta) {
      setTermo(consulta.rotulo);
      setErro(null);
    }
  }, [consulta]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!termo.trim()) return setErro('Digite a sigla, o código ou o nome.');
    setErro(await onConsultar(termo.trim()));
  };

  return (
    <>
      <Titulo sub="Busca em profundidade (DFS) a partir da disciplina: o que trava se o aluno reprovar.">
        Impacto de reprovação
      </Titulo>
      <form onSubmit={enviar} className="flex gap-2" role="search">
        <input
          list="lista-disciplinas"
          aria-label="Disciplina"
          className={classeInput}
          placeholder="Sigla, código ou nome"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <Botao type="submit" variante="primario" aria-label="Pesquisar">
          <Search className="w-4 h-4" />
        </Botao>
        <datalist id="lista-disciplinas">
          {ordenarPorPeriodo(grafo.vertices).map((x) => (
            <option key={x.id} value={x.rotulo} />
          ))}
        </datalist>
      </form>
      {erro && <AlertaErro mensagem={erro} />}

      {!consulta && !erro && <p className="text-sm text-slate-500">Pesquise ou clique numa disciplina do grafo.</p>}

      {consulta && (
        <>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-bold text-slate-900">{consulta.rotulo}</p>
            <p className="text-xs text-slate-500">
              {consulta.id} · {consulta.codigo} · {consulta.periodo}º período · {consulta.carga_horaria}h
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Numero valor={consulta.fator_bloqueio} rotulo="impactadas (Γ⁺)" cor="text-rose-700" />
              <Numero valor={consulta.pre_requisitos_transitivos.length} rotulo="pré-requisitos (Γ⁻)" cor="text-blue-700" />
            </div>
          </div>
          <Secao titulo="Impactadas, na ordem da DFS">
            {consulta.impacto.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma disciplina depende desta.</p>
            ) : (
              <ol className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {consulta.impacto.map((id, i) => (
                  <li key={id} className="flex items-start gap-3 px-3 py-2">
                    <span className="mt-0.5 w-5 text-right text-xs font-bold text-rose-600">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{nome(id)}</p>
                      <p className="text-xs font-mono text-slate-500">{(consulta.cadeias[id] ?? [consulta.id, id]).join(' → ')}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Secao>
          {consulta.pre_requisitos_transitivos.length > 0 && (
            <Secao titulo="Precisa ter cursado">
              <div className="flex flex-wrap gap-1.5">
                {consulta.pre_requisitos_transitivos.map((id) => (
                  <Chip key={id} cor="sky">
                    {nome(id)}
                  </Chip>
                ))}
              </div>
            </Secao>
          )}
        </>
      )}
    </>
  );
}

function Numero({ valor, rotulo, cor }: { valor: number; rotulo: string; cor: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className={`text-xl font-bold ${cor}`}>{valor}</p>
      <p className="text-xs text-slate-500">{rotulo}</p>
    </div>
  );
}

function PainelCiclos(p: {
  props: PropsPagina;
  u: string;
  v: string;
  onEscolher: (u: string, v: string) => void;
  onValidar: () => void;
  onGravar: () => void;
  onPular: () => void;
  animando: boolean;
  validacao: ResultadoValidacao | null;
  gravada: string | null;
  passoAtual: number;
  terminou: boolean;
}) {
  const g = p.props.grafo;
  const nome = (id: string) => nomeDe(g, id);
  const jaGravada = !!p.validacao && g.arestas.some((a) => a.origem === p.validacao!.pre_requisito && a.destino === p.validacao!.dependente);
  const exemplo = existe(g, 'IA2') && existe(g, 'ED') && !g.arestas.some((a) => a.origem === 'IA2' && a.destino === 'ED');

  return (
    <>
      <Titulo sub="Testa uma nova dependência com a DFS de 3 cores antes de gravar.">Detecção de ciclos</Titulo>
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          g.dag ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
        }`}
      >
        {g.dag ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
        {g.dag ? 'A grade atual não tem ciclos.' : `Ciclo na grade: ${g.ciclo?.join(' → ')}`}
      </div>
      <div className="space-y-3">
        <Campo rotulo="Pré-requisito (u)">
          <SeletorDisciplina vertices={g.vertices} valor={p.u} onMudar={(x) => p.onEscolher(x, p.v)} />
        </Campo>
        <Campo rotulo="Disciplina dependente (v)">
          <SeletorDisciplina vertices={g.vertices} valor={p.v} onMudar={(x) => p.onEscolher(p.u, x)} />
        </Campo>
        <div className="flex flex-wrap items-center gap-2">
          <Botao variante="primario" onClick={p.onValidar} disabled={!p.u || !p.v || p.animando}>
            <Play className="w-4 h-4" /> Executar DFS
          </Botao>
          {p.animando && (
            <Botao onClick={p.onPular}>
              <SkipForward className="w-4 h-4" /> Pular
            </Botao>
          )}
          {exemplo && (
            <button className="text-xs font-semibold text-sky-700 hover:underline" onClick={() => p.onEscolher('IA2', 'ED')}>
              Usar IA2 → ED
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">Também dá para clicar no grafo: primeiro u, depois v.</p>
      </div>
      {p.gravada && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{p.gravada}</strong> gravado. A aresta já aparece no grafo e vale para a pesquisa de impacto.
          </span>
        </div>
      )}

      {p.validacao && p.terminou && (
        <ResultadoCiclo validacao={p.validacao} jaGravada={jaGravada} nome={nome} onGravar={p.onGravar} />
      )}

      {p.validacao && p.validacao.passos.length > 0 && <ListaPassos passos={p.validacao.passos} atual={p.passoAtual} />}
    </>
  );
}

function ResultadoCiclo({
  validacao,
  jaGravada,
  nome,
  onGravar,
}: {
  validacao: ResultadoValidacao;
  jaGravada: boolean;
  nome: (id: string) => string;
  onGravar: () => void;
}) {
  const { pre_requisito: u, dependente: v } = validacao;
  if (!validacao.valido)
    return (
      <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 space-y-1">
        <p className="font-semibold">Dependência circular detectada</p>
        <p className="font-mono text-xs">{validacao.ciclo?.join(' → ')}</p>
        <p className="text-xs">A aresta {u} → {v} não pode ser gravada.</p>
      </div>
    );
  if (jaGravada)
    return (
      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        {nome(u)} já é pré-requisito de {nome(v)}.
      </p>
    );
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 space-y-2">
      <p className="font-semibold">Sem ciclo: pode ser gravada.</p>
      <Botao pequeno variante="primario" onClick={onGravar}>
        <Save className="w-3.5 h-3.5" /> Gravar {u} → {v}
      </Botao>
    </div>
  );
}

function ListaPassos({ passos, atual }: { passos: PassoDfs[]; atual: number }) {
  const lista = useRef<HTMLOListElement>(null);
  useEffect(() => {
    lista.current?.querySelector('[data-atual="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [atual]);

  const texto = ({ evento, alvo }: PassoDfs) =>
    evento === 'CINZA'
      ? `${alvo} → cinza`
      : evento === 'PRETO'
        ? `${alvo} → preto`
        : `aresta ${alvo.replace('->', ' → ')} encontra vértice cinza`;

  return (
    <Secao titulo={`Passos da DFS (${Math.min(atual + 1, passos.length)}/${passos.length})`}>
      <ol ref={lista} className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 font-mono text-xs divide-y divide-slate-100">
        {passos.map((passo, i) => (
          <li
            key={i}
            data-atual={i === atual}
            className={`px-3 py-1 ${
              i > atual
                ? 'text-slate-300'
                : passo.evento === 'RETORNO'
                  ? 'bg-rose-50 text-rose-700 font-semibold'
                  : i === atual
                    ? 'bg-sky-50 text-slate-900'
                    : 'text-slate-600'
            }`}
          >
            {String(i + 1).padStart(2, ' ')}. {texto(passo)}
          </li>
        ))}
      </ol>
    </Secao>
  );
}

function PainelOrdem({
  props,
  ordem,
  animando,
  onAnimar,
  onPular,
}: {
  props: PropsPagina;
  ordem: ResultadoOrdenacao | null;
  animando: boolean;
  onAnimar: () => void;
  onPular: () => void;
}) {
  const g = props.grafo;
  if (!ordem) return <p className="text-sm text-slate-500">Calculando…</p>;
  if (!ordem.kahn || !ordem.niveis) return <AlertaErro mensagem="A grade tem um ciclo; não existe ordem válida." />;
  const chDe = (id: string) => g.vertices.find((x) => x.id === id)?.carga_horaria ?? 0;

  return (
    <>
      <Titulo sub="Ordenação topológica (Kahn): todo pré-requisito vem antes.">
        {ordem.niveis.length} níveis de pré-requisitos
      </Titulo>
      <p className="text-xs leading-relaxed text-slate-500">
        Cada nível reúne matérias que podem vir depois do anterior. O cálculo não considera oferta de turmas,
        horários ou limite de carga por semestre.
      </p>
      {animando ? (
        <Botao pequeno onClick={onPular}>
          <SkipForward className="w-3.5 h-3.5" /> Mostrar tudo
        </Botao>
      ) : (
        <Botao pequeno onClick={onAnimar}>
          <Play className="w-3.5 h-3.5" /> Animar Kahn
        </Botao>
      )}
      <ol className="space-y-2">
        {ordem.niveis.map((nivel, i) => (
          <li key={i} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>{i + 1}º semestre</span>
              <span>{nivel.reduce((s, id) => s + chDe(id), 0)}h</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {nivel.map((id) => (
                <Chip key={id} cor="sky">
                  {nomeDe(g, id)}
                </Chip>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <Secao titulo="Sequência (Kahn)">
        <p className="font-mono text-xs leading-relaxed text-slate-600">{ordem.kahn.join(' → ')}</p>
      </Secao>
      {ordem.dfs && (
        <Secao titulo="Sequência (DFS pós-ordem reversa)">
          <p className="font-mono text-xs leading-relaxed text-slate-600">{ordem.dfs.join(' → ')}</p>
        </Secao>
      )}
    </>
  );
}

function Item({ classe, children }: { classe: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className={`h-3 w-3 rounded border-2 ${classe}`} />
      {children}
    </span>
  );
}

function Legenda({ modo }: { modo: Modo }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {modo === 'progresso' && (
        <>
          <Item classe="bg-emerald-100 border-emerald-600">Concluída</Item>
          <Item classe="bg-amber-100 border-amber-600">Cursando</Item>
          <Item classe="bg-blue-100 border-blue-600">Liberada</Item>
          <Item classe="bg-slate-100 border-slate-300">Bloqueada</Item>
        </>
      )}
      {modo === 'consulta' && (
        <>
          <Item classe="bg-slate-900 border-sky-400">Pesquisada</Item>
          <Item classe="bg-rose-100 border-rose-600">Impacto direto</Item>
          <Item classe="bg-orange-100 border-orange-500">Impacto indireto</Item>
          <Item classe="bg-blue-100 border-blue-600">Pré-requisito</Item>
        </>
      )}
      {modo === 'ciclo' && (
        <>
          <Item classe="bg-violet-100 border-violet-600">Proposta</Item>
          <Item classe="bg-white border-slate-400">Branco</Item>
          <Item classe="bg-amber-100 border-amber-600">Cinza</Item>
          <Item classe="bg-slate-900 border-emerald-500">Preto</Item>
          <Item classe="bg-rose-100 border-rose-600">Ciclo</Item>
        </>
      )}
      {modo === 'ordem' && <Item classe="bg-blue-100 border-blue-600">#posição · semestre</Item>}
    </div>
  );
}
