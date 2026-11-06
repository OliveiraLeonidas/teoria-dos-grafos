import type {
  Aluno,
  Curso,
  DadosAluno,
  DadosDisciplina,
  DadosMatricula,
  Grafo,
  ResultadoConsulta,
  ResultadoOrdenacao,
  ResultadoValidacao,
} from './types';

export interface DetalheErro {
  erro?: string;
  campo?: string;
  ciclo?: string[] | null;
  faltam?: string[];
}

export class ErroApi extends Error {
  constructor(
    public status: number,
    mensagem: string,
    public detalhe: DetalheErro = {},
  ) {
    super(mensagem);
  }
}

export const mensagemDe = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function chamar<T>(metodo: string, rota: string, corpo?: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(rota, {
      method: metodo,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com a API. Rode "python3 main.py --api" na raiz do projeto.');
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new ErroApi(resp.status, dados.erro ?? `Erro HTTP ${resp.status}`, dados);
  return dados as T;
}

const seg = encodeURIComponent;
type Aresta = { pre_requisito: string; dependente: string };

export const api = {
  grafo: () => chamar<Grafo>('GET', '/api/grafo'),
  consultar: (termo: string) => chamar<ResultadoConsulta>('GET', `/api/consulta?termo=${seg(termo)}`),
  validarPrerequisito: (a: Aresta) => chamar<ResultadoValidacao>('POST', '/api/prerequisitos/validar', a),
  ordenacao: () => chamar<ResultadoOrdenacao>('GET', '/api/ordenacao'),

  criarPrerequisito: (a: Aresta) => chamar<Grafo>('POST', '/api/prerequisitos', a),
  removerPrerequisito: (u: string, v: string) => chamar<Grafo>('DELETE', `/api/prerequisitos/${seg(u)}/${seg(v)}`),
  criarDisciplina: (d: DadosDisciplina) => chamar<Grafo>('POST', '/api/disciplinas', d),
  atualizarDisciplina: (id: string, d: DadosDisciplina) => chamar<Grafo>('PUT', `/api/disciplinas/${seg(id)}`, d),
  resumoRemocao: (id: string) =>
    chamar<{ prerequisitos: number; matriculas: number }>('GET', `/api/disciplinas/${seg(id)}/remocao`),
  removerDisciplina: (id: string) => chamar<Grafo>('DELETE', `/api/disciplinas/${seg(id)}`),
  restaurar: () => chamar<Grafo>('POST', '/api/restaurar'),

  cursos: () => chamar<Curso[]>('GET', '/api/cursos'),
  alunos: () => chamar<Aluno[]>('GET', '/api/alunos'),
  criarAluno: (a: DadosAluno) => chamar<Aluno>('POST', '/api/alunos', a),
  atualizarAluno: (id: number, a: DadosAluno) => chamar<Aluno>('PUT', `/api/alunos/${id}`, a),
  removerAluno: (id: number) => chamar<unknown>('DELETE', `/api/alunos/${id}`),
  criarMatricula: (alunoId: number, m: DadosMatricula) =>
    chamar<Aluno>('POST', `/api/alunos/${alunoId}/matriculas`, m),
  atualizarMatricula: (id: number, m: DadosMatricula) => chamar<Aluno>('PUT', `/api/matriculas/${id}`, m),
  removerMatricula: (id: number) => chamar<Aluno>('DELETE', `/api/matriculas/${id}`),
};
