export interface Vertice {
  id: string;
  rotulo: string;
  codigo: string;
  carga_horaria: number | null;
  periodo: number | null;
  grau_entrada: number;
  grau_saida: number;
}

export interface Aresta {
  origem: string;
  destino: string;
}

export interface Grafo {
  vertices: Vertice[];
  arestas: Aresta[];
  dag: boolean;
  ciclo: string[] | null;
}

export interface ResultadoConsulta extends Vertice {
  termo: string;
  antecessores: string[];
  sucessores: string[];
  pre_requisitos_transitivos: string[];
  impacto: string[];
  fator_bloqueio: number;
  cadeias: Record<string, string[] | null>;
}

export type EventoDfs = 'CINZA' | 'PRETO' | 'RETORNO';
export interface PassoDfs {
  evento: EventoDfs;
  alvo: string;
}

export interface ResultadoValidacao {
  pre_requisito: string;
  dependente: string;
  ja_existe: boolean;
  valido: boolean;
  ciclo: string[] | null;
  passos: PassoDfs[];
}

export interface ResultadoOrdenacao {
  kahn: string[] | null;
  dfs: string[] | null;
  niveis: string[][] | null;
}

export interface DadosDisciplina {
  id: string;
  codigo: string;
  nome: string;
  carga_horaria: number;
  periodo_sugerido: number;
}

export interface Curso {
  id: number;
  nome: string;
  codigo: string;
}

export type Situacao = 'APROVADO' | 'REPROVADO' | 'EM_ANDAMENTO' | 'PENDENTE';

export interface Matricula {
  id: number;
  disciplina_id: string;
  disciplina_nome: string;
  semestre: string;
  situacao: Situacao;
  nota: number | null;
}

export interface Progresso {
  concluidas: string[];
  cursando: string[];
  liberadas: string[];
  bloqueadas: string[];
}

export interface Aluno {
  id: number;
  matricula: string;
  nome: string;
  curso_id: number;
  curso: string;
  historico: Matricula[];
  progresso: Progresso;
}

export interface DadosAluno {
  matricula: string;
  nome: string;
  curso_id: number;
}

export interface DadosMatricula {
  disciplina_id: string;
  semestre: string;
  situacao: Situacao;
  nota: number | null;
}
