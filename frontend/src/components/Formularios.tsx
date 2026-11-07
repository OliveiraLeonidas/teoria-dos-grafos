import { useState, type FormEvent, type ReactNode } from 'react';
import { ErroApi, api, mensagemDe, type DetalheErro } from '../api';
import type { Aluno, Curso, Grafo, Matricula, Situacao, Vertice } from '../types';
import { AlertaErro, Botao, Campo, Modal, RodapeModal, classeInput } from './ui';

interface EstadoErro {
  mensagem: string;
  detalhe: DetalheErro;
}

function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<EstadoErro | null>(null);

  const enviar = async (acao: () => Promise<void>) => {
    setEnviando(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro({ mensagem: mensagemDe(e), detalhe: e instanceof ErroApi ? e.detalhe : {} });
    } finally {
      setEnviando(false);
    }
  };

  const doCampo = (campo: string) => (erro?.detalhe.campo === campo ? erro.mensagem : null);
  const geral = erro && !erro.detalhe.campo ? erro : null;

  return { enviando, enviar, doCampo, geral, limpar: () => setErro(null) };
}

function Formulario({
  titulo,
  descricao,
  onFechar,
  onEnviar,
  enviando,
  rotuloEnviar,
  children,
}: {
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  onEnviar: () => void;
  enviando: boolean;
  rotuloEnviar: string;
  children: ReactNode;
}) {
  const submeter = (e: FormEvent) => {
    e.preventDefault();
    onEnviar();
  };
  return (
    <Modal titulo={titulo} descricao={descricao} onFechar={onFechar}>
      <form onSubmit={submeter} className="space-y-4" noValidate>
        {children}
        <RodapeModal>
          <Botao onClick={onFechar}>Cancelar</Botao>
          <Botao type="submit" variante="primario" disabled={enviando}>
            {enviando ? 'Salvando…' : rotuloEnviar}
          </Botao>
        </RodapeModal>
      </form>
    </Modal>
  );
}

const numero = (texto: string) => (texto.trim() === '' ? NaN : Number(texto));

export function FormDisciplina({
  inicial,
  periodoSugerido = 1,
  onSalvo,
  onFechar,
}: {
  inicial?: Vertice;
  periodoSugerido?: number;
  onSalvo: (g: Grafo, nome: string) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [id, setId] = useState(inicial?.id ?? '');
  const [codigo, setCodigo] = useState(inicial?.codigo ?? '');
  const [nome, setNome] = useState(inicial?.rotulo ?? '');
  const [ch, setCh] = useState(String(inicial?.carga_horaria ?? 60));
  const [periodo, setPeriodo] = useState(String(inicial?.periodo ?? periodoSugerido));
  const { enviando, enviar, doCampo, geral } = useEnvio();

  const salvar = () =>
    enviar(async () => {
      const dados = {
        id: id.trim(),
        codigo: codigo.trim(),
        nome: nome.trim(),
        carga_horaria: numero(ch),
        periodo_sugerido: numero(periodo),
      };
      const g = inicial ? await api.atualizarDisciplina(inicial.id, dados) : await api.criarDisciplina(dados);
      await onSalvo(g, dados.nome);
    });

  return (
    <Formulario
      titulo={inicial ? `Editar ${inicial.rotulo}` : 'Nova disciplina'}
      descricao={inicial ? undefined : 'Ela entra no grafo como um vértice sem pré-requisitos.'}
      onFechar={onFechar}
      onEnviar={salvar}
      enviando={enviando}
      rotuloEnviar={inicial ? 'Salvar alterações' : 'Criar disciplina'}
    >
      {geral && <AlertaErro mensagem={geral.mensagem} />}
      <div className="grid grid-cols-2 gap-3">
        <Campo
          rotulo="Sigla (ID)"
          dica={inicial ? 'A sigla não pode ser alterada.' : 'Curta, usada no grafo. Ex.: ED'}
          erro={doCampo('id')}
        >
          <input
            className={classeInput}
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={!!inicial}
            autoFocus={!inicial}
            maxLength={20}
          />
        </Campo>
        <Campo rotulo="Código" dica="Ex.: CMP201" erro={doCampo('codigo')}>
          <input className={classeInput} value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={20} />
        </Campo>
      </div>
      <Campo rotulo="Nome" erro={doCampo('nome')}>
        <input
          className={classeInput}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoFocus={!!inicial}
          maxLength={80}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Carga horária (h)" erro={doCampo('carga_horaria')}>
          <input type="number" min={1} className={classeInput} value={ch} onChange={(e) => setCh(e.target.value)} />
        </Campo>
        <Campo rotulo="Período sugerido" dica="Coluna em que aparece na grade" erro={doCampo('periodo_sugerido')}>
          <input
            type="number"
            min={1}
            className={classeInput}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          />
        </Campo>
      </div>
    </Formulario>
  );
}

export function SeletorDisciplina({
  vertices,
  valor,
  onMudar,
  desabilitadas,
  autoFocus,
}: {
  vertices: Vertice[];
  valor: string;
  onMudar: (id: string) => void;
  desabilitadas?: Set<string>;
  autoFocus?: boolean;
}) {
  const ordenadas = [...vertices].sort((a, b) => (a.periodo ?? 0) - (b.periodo ?? 0) || a.rotulo.localeCompare(b.rotulo));
  return (
    <select className={classeInput} value={valor} onChange={(e) => onMudar(e.target.value)} autoFocus={autoFocus}>
      <option value="" disabled>
        Selecione…
      </option>
      {ordenadas.map((v) => (
        <option key={v.id} value={v.id} disabled={desabilitadas?.has(v.id)}>
          {v.rotulo} ({v.id}) · {v.periodo ?? '–'}º per.
        </option>
      ))}
    </select>
  );
}

export function FormPrerequisito({
  grafo,
  dependente,
  onSalvo,
  onFechar,
}: {
  grafo: Grafo;
  dependente: Vertice;
  onSalvo: (g: Grafo, preRequisito: string) => void;
  onFechar: () => void;
}) {
  const [pre, setPre] = useState('');
  const { enviando, enviar, geral, doCampo } = useEnvio();
  const jaExigidas = new Set(
    grafo.arestas.filter((a) => a.destino === dependente.id).map((a) => a.origem).concat(dependente.id),
  );
  const periodoPre = grafo.vertices.find((v) => v.id === pre)?.periodo ?? 0;

  const salvar = () =>
    enviar(async () => {
      onSalvo(await api.criarPrerequisito({ pre_requisito: pre, dependente: dependente.id }), pre);
    });

  return (
    <Formulario
      titulo={`Novo pré-requisito de ${dependente.rotulo}`}
      descricao="Antes de gravar, a DFS de 3 cores verifica se a nova aresta cria ciclo."
      onFechar={onFechar}
      onEnviar={salvar}
      enviando={enviando}
      rotuloEnviar="Adicionar"
    >
      {geral && <AlertaErro mensagem={geral.mensagem} ciclo={geral.detalhe.ciclo} />}
      <Campo rotulo="Precisa cursar antes" erro={doCampo('pre_requisito')}>
        <SeletorDisciplina vertices={grafo.vertices} valor={pre} onMudar={setPre} desabilitadas={jaExigidas} autoFocus />
      </Campo>
      {pre && periodoPre >= (dependente.periodo ?? 0) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          A disciplina escolhida está sugerida para um período igual ou posterior ao de {dependente.rotulo}.
        </p>
      )}
    </Formulario>
  );
}

export function FormAluno({
  cursos,
  inicial,
  onSalvo,
  onFechar,
}: {
  cursos: Curso[];
  inicial?: Aluno;
  onSalvo: (a: Aluno) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [matricula, setMatricula] = useState(inicial?.matricula ?? '');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [cursoId, setCursoId] = useState(inicial?.curso_id ?? cursos[0]?.id ?? 0);
  const { enviando, enviar, doCampo, geral } = useEnvio();

  const salvar = () =>
    enviar(async () => {
      const dados = { matricula: matricula.trim(), nome: nome.trim(), curso_id: cursoId };
      await onSalvo(inicial ? await api.atualizarAluno(inicial.id, dados) : await api.criarAluno(dados));
    });

  return (
    <Formulario
      titulo={inicial ? `Editar ${inicial.nome}` : 'Novo aluno'}
      onFechar={onFechar}
      onEnviar={salvar}
      enviando={enviando}
      rotuloEnviar={inicial ? 'Salvar alterações' : 'Cadastrar aluno'}
    >
      {geral && <AlertaErro mensagem={geral.mensagem} />}
      <Campo rotulo="Nome" erro={doCampo('nome')}>
        <input className={classeInput} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus maxLength={80} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Matrícula" dica="Só números" erro={doCampo('matricula')}>
          <input
            className={classeInput}
            value={matricula}
            inputMode="numeric"
            onChange={(e) => setMatricula(e.target.value)}
            maxLength={20}
          />
        </Campo>
        <Campo rotulo="Curso" erro={doCampo('curso_id')}>
          <select className={classeInput} value={cursoId} onChange={(e) => setCursoId(Number(e.target.value))}>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
    </Formulario>
  );
}

export const ROTULO_SITUACAO: Record<Situacao, string> = {
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  EM_ANDAMENTO: 'Cursando',
  PENDENTE: 'Pendente',
};

const semestreAtual = () => {
  const hoje = new Date();
  return `${hoje.getFullYear()}.${hoje.getMonth() < 6 ? 1 : 2}`;
};

export function FormMatricula({
  aluno,
  grafo,
  inicial,
  disciplinaInicial,
  onSalvo,
  onFechar,
}: {
  aluno: Aluno;
  grafo: Grafo;
  inicial?: Matricula;
  disciplinaInicial?: string;
  onSalvo: (a: Aluno) => void | Promise<void>;
  onFechar: () => void;
}) {
  const [disciplina, setDisciplina] = useState(inicial?.disciplina_id ?? disciplinaInicial ?? '');
  const [semestre, setSemestre] = useState(inicial?.semestre ?? semestreAtual());
  const [situacao, setSituacao] = useState<Situacao>(inicial?.situacao ?? 'EM_ANDAMENTO');
  const [nota, setNota] = useState(inicial?.nota != null ? String(inicial.nota) : '');
  const { enviando, enviar, doCampo, geral } = useEnvio();

  const temNota = situacao === 'APROVADO' || situacao === 'REPROVADO';
  const { liberadas, concluidas, cursando } = aluno.progresso;
  const statusDe = (id: string) =>
    concluidas.includes(id) ? 'concluída' : cursando.includes(id) ? 'cursando' : liberadas.includes(id) ? 'liberada' : 'bloqueada';

  const salvar = () =>
    enviar(async () => {
      const valorNota = temNota ? numero(nota) : null;
      const dados = {
        disciplina_id: disciplina,
        semestre: semestre.trim(),
        situacao,
        nota: valorNota === null || Number.isNaN(valorNota) ? null : valorNota,
      };
      await onSalvo(inicial ? await api.atualizarMatricula(inicial.id, dados) : await api.criarMatricula(aluno.id, dados));
    });

  const ordenadas = [...grafo.vertices].sort(
    (a, b) => (a.periodo ?? 0) - (b.periodo ?? 0) || a.rotulo.localeCompare(b.rotulo),
  );

  return (
    <Formulario
      titulo={inicial ? 'Editar registro do histórico' : 'Registrar disciplina no histórico'}
      descricao={aluno.nome}
      onFechar={onFechar}
      onEnviar={salvar}
      enviando={enviando}
      rotuloEnviar={inicial ? 'Salvar alterações' : 'Registrar'}
    >
      {geral && <AlertaErro mensagem={geral.mensagem} />}
      <Campo
        rotulo="Disciplina"
        dica="Para cursar ou ser aprovado, os pré-requisitos precisam estar aprovados."
        erro={doCampo('disciplina_id')}
      >
        <select className={classeInput} value={disciplina} onChange={(e) => setDisciplina(e.target.value)} autoFocus>
          <option value="" disabled>
            Selecione…
          </option>
          {ordenadas.map((v) => (
            <option key={v.id} value={v.id}>
              {v.rotulo} ({v.id}) · {statusDe(v.id)}
            </option>
          ))}
        </select>
      </Campo>
      <div className="grid grid-cols-3 gap-3">
        <Campo rotulo="Semestre" dica="AAAA.1 ou AAAA.2" erro={doCampo('semestre')}>
          <input className={classeInput} value={semestre} onChange={(e) => setSemestre(e.target.value)} maxLength={6} />
        </Campo>
        <Campo rotulo="Situação" erro={doCampo('situacao')}>
          <select className={classeInput} value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)}>
            {(Object.keys(ROTULO_SITUACAO) as Situacao[]).map((s) => (
              <option key={s} value={s}>
                {ROTULO_SITUACAO[s]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Nota" dica={temNota ? '0 a 10' : 'Só aprovado/reprovado'} erro={doCampo('nota')}>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            className={classeInput}
            value={temNota ? nota : ''}
            onChange={(e) => setNota(e.target.value)}
            disabled={!temNota}
          />
        </Campo>
      </div>
    </Formulario>
  );
}
