import { AlertTriangle, BookOpen, CheckCircle2, Network, RefreshCw, RotateCcw, Users, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api, mensagemDe } from './api';
import { Botao, DialogoConfirmacao, ProvedorToast, useToast, type PedidoConfirmacao } from './components/ui';
import AlunosPage from './pages/AlunosPage';
import type { Aba, FocoGrafo, PropsPagina } from './pages/comum';
import DisciplinasPage from './pages/DisciplinasPage';
import GrafoPage from './pages/GrafoPage';
import type { Aluno, Curso, Grafo } from './types';

const ABAS: { id: Aba; rotulo: string; icone: LucideIcon }[] = [
  { id: 'grafo', rotulo: 'Grafo', icone: Network },
  { id: 'disciplinas', rotulo: 'Disciplinas', icone: BookOpen },
  { id: 'alunos', rotulo: 'Alunos', icone: Users },
];

export default function App() {
  return (
    <ProvedorToast>
      <Aplicacao />
    </ProvedorToast>
  );
}

function Aplicacao() {
  const avisar = useToast();
  const [grafo, setGrafo] = useState<Grafo | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('grafo');
  const [foco, setFoco] = useState<FocoGrafo | null>(null);
  const [confirmacao, setConfirmacao] = useState<PedidoConfirmacao | null>(null);

  const recarregarAlunos = useCallback(async () => setAlunos(await api.alunos()), []);

  const conectar = useCallback(() => {
    setErroConexao(null);
    Promise.all([api.grafo(), api.alunos(), api.cursos()]).then(
      ([g, a, c]) => {
        setGrafo(g);
        setAlunos(a);
        setCursos(c);
      },
      (e: unknown) => setErroConexao(mensagemDe(e)),
    );
  }, []);
  useEffect(conectar, [conectar]);

  const aoMudarGrafo = useCallback(
    (g: Grafo) => {
      setGrafo(g);
      recarregarAlunos().catch((e: unknown) => avisar.erro(mensagemDe(e)));
    },
    [recarregarAlunos, avisar],
  );

  const irPara = useCallback((destino: Aba, f?: FocoGrafo) => {
    setFoco(f ?? null);
    setAba(destino);
  }, []);

  const restaurar = () =>
    setConfirmacao({
      titulo: 'Restaurar dados iniciais?',
      mensagem: (
        <>
          <p>Disciplinas, pré-requisitos, alunos e históricos voltam ao estado do seed.</p>
          <p>O que foi cadastrado ou alterado pela interface será perdido.</p>
        </>
      ),
      rotuloConfirmar: 'Restaurar',
      acao: async () => {
        aoMudarGrafo(await api.restaurar());
        setFoco(null);
        avisar.sucesso('Dados iniciais restaurados.');
      },
    });

  if (erroConexao) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg bg-white border border-rose-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" /> Sem conexão com a API
          </h1>
          <p className="text-sm text-slate-700">{erroConexao}</p>
          <pre className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs">python3 main.py --api</pre>
          <Botao variante="primario" onClick={conectar}>
            <RefreshCw className="w-4 h-4" /> Tentar de novo
          </Botao>
        </div>
      </div>
    );
  }

  if (!grafo) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">Carregando…</div>;
  }

  const props: PropsPagina = {
    grafo,
    alunos,
    cursos,
    aoMudarGrafo,
    recarregarAlunos,
    confirmar: setConfirmacao,
    irPara,
    avisar,
  };

  return (
    <div className="h-dvh flex flex-col bg-slate-100 text-slate-900 font-sans">
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 bg-slate-900 px-4 py-2 text-white shadow-md lg:px-6 lg:py-0">
        <div className="flex min-w-0 items-center gap-2.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
            <Network className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">Universidade Fundação Hermínio Ometto</p>
            <p className="text-[11px] text-slate-400">Pré-requisitos de disciplinas · Teoria dos Grafos</p>
          </div>
        </div>
        <nav className="order-3 flex w-full self-stretch lg:order-none lg:w-auto" aria-label="Seções">
          {ABAS.map(({ id, rotulo, icone: Icone }) => (
            <button
              key={id}
              onClick={() => irPara(id)}
              aria-current={aba === id ? 'page' : undefined}
              className={`inline-flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-2 text-sm font-semibold transition lg:flex-none ${
                aba === id ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
            </button>
          ))}
        </nav>
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs lg:ml-auto lg:w-auto">
          <span className="text-slate-400">
            {grafo.vertices.length} disciplinas · {grafo.arestas.length} pré-requisitos · {alunos.length} alunos
          </span>
          {grafo.dag ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> DAG
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-400" title={grafo.ciclo?.join(' → ')}>
              <AlertTriangle className="h-4 w-4" /> Ciclo
            </span>
          )}
          <button
            onClick={restaurar}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar dados
          </button>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        {aba === 'grafo' && <GrafoPage key={JSON.stringify(foco)} {...props} foco={foco} />}
        {aba === 'disciplinas' && <DisciplinasPage {...props} />}
        {aba === 'alunos' && <AlunosPage {...props} foco={foco} />}
      </main>
      {confirmacao && <DialogoConfirmacao pedido={confirmacao} onFechar={() => setConfirmacao(null)} />}
    </div>
  );
}
