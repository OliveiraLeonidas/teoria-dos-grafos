import { api } from '../api';
import type { PedidoConfirmacao } from '../components/ui';
import type { Aluno, Curso, Grafo, Vertice } from '../types';

export type Aba = 'grafo' | 'disciplinas' | 'alunos';

export interface FocoGrafo {
  disciplina?: string;
  alunoId?: number;
}

export interface PropsPagina {
  grafo: Grafo;
  alunos: Aluno[];
  cursos: Curso[];
  aoMudarGrafo: (g: Grafo) => void;
  recarregarAlunos: () => Promise<void>;
  confirmar: (p: PedidoConfirmacao) => void;
  irPara: (aba: Aba, foco?: FocoGrafo) => void;
  avisar: { sucesso: (t: string) => void; erro: (t: string) => void };
}

export const nomeDe = (grafo: Grafo, id: string) => grafo.vertices.find((v) => v.id === id)?.rotulo ?? id;
export const existe = (grafo: Grafo, id: string) => grafo.vertices.some((v) => v.id === id);

export const ordenarPorPeriodo = (vs: Vertice[]) =>
  [...vs].sort((a, b) => (a.periodo ?? 0) - (b.periodo ?? 0) || a.rotulo.localeCompare(b.rotulo));

export async function pedirRemocaoDisciplina(v: Vertice, p: PropsPagina, aoRemover?: () => void) {
  const resumo = await api.resumoRemocao(v.id);
  const extras = [
    resumo.prerequisitos > 0 && `${resumo.prerequisitos} relação(ões) de pré-requisito`,
    resumo.matriculas > 0 && `${resumo.matriculas} registro(s) no histórico de alunos`,
  ].filter(Boolean);
  p.confirmar({
    titulo: `Excluir ${v.rotulo}?`,
    mensagem: (
      <>
        <p>A disciplina sai do banco e do grafo.</p>
        {extras.length > 0 && <p>Também serão apagados: {extras.join(' e ')}.</p>}
      </>
    ),
    rotuloConfirmar: 'Excluir disciplina',
    acao: async () => {
      p.aoMudarGrafo(await api.removerDisciplina(v.id));
      aoRemover?.();
      p.avisar.sucesso(`${v.rotulo} excluída.`);
    },
  });
}

export function pedirRemocaoPrerequisito(origem: string, destino: string, p: PropsPagina) {
  const g = p.grafo;
  p.confirmar({
    titulo: 'Remover pré-requisito?',
    mensagem: (
      <p>
        <strong>{nomeDe(g, origem)}</strong> deixará de ser exigida para cursar <strong>{nomeDe(g, destino)}</strong>.
      </p>
    ),
    rotuloConfirmar: 'Remover',
    acao: async () => {
      p.aoMudarGrafo(await api.removerPrerequisito(origem, destino));
      p.avisar.sucesso(`Pré-requisito ${origem} → ${destino} removido.`);
    },
  });
}
