import csv
import re
import sqlite3
from pathlib import Path
from typing import Any

from ..database.db_manager import DatabaseManager
from ..models.disciplina import AlunoModel, DisciplinaModel
from ..database.seed import executar_seed
from ..models.grafo import GrafoDirecionado
from .erros import Conflito, ErroValidacao, NaoEncontrado

SITUACOES = ("APROVADO", "REPROVADO", "EM_ANDAMENTO", "PENDENTE")
PADRAO_ID = re.compile(r"^[A-Za-z0-9_-]{1,20}$")
PADRAO_SEMESTRE = re.compile(r"^\d{4}\.[12]$")


def _texto(dados: dict[str, Any], campo: str, rotulo: str, maximo: int = 120) -> str:
    valor = dados.get(campo)
    if not isinstance(valor, str) or not valor.strip():
        raise ErroValidacao(f"{rotulo} é obrigatório", campo=campo)
    valor = valor.strip()
    if len(valor) > maximo:
        raise ErroValidacao(f"{rotulo} deve ter no máximo {maximo} caracteres", campo=campo)
    return valor


def _inteiro(dados: dict[str, Any], campo: str, rotulo: str, minimo: int, maximo: int) -> int:
    valor = dados.get(campo)
    if isinstance(valor, bool) or not isinstance(valor, int) or not minimo <= valor <= maximo:
        raise ErroValidacao(f"{rotulo} deve ser um inteiro entre {minimo} e {maximo}", campo=campo)
    return valor


class CurriculoService:
    def __init__(self, db_manager: DatabaseManager | None = None) -> None:
        self.db_manager = db_manager or DatabaseManager()

    def listar_modelos_disciplinas(self) -> list[DisciplinaModel]:
        disciplinas_raw = self.db_manager.listar_disciplinas()
        dependencias = self.db_manager.listar_dependencias()

        prereqs_por_disc: dict[str, list[str]] = {}
        for prereq_id, disc_id in dependencias:
            prereqs_por_disc.setdefault(disc_id, []).append(prereq_id)

        return [
            DisciplinaModel(
                id=d["id"],
                nome=d["nome"],
                codigo=d["codigo"],
                carga_horaria=d["carga_horaria"],
                periodo_sugerido=d["periodo_sugerido"],
                curso_id=d.get("curso_id", 1),
                pre_requisitos=prereqs_por_disc.get(d["id"], []),
            )
            for d in disciplinas_raw
        ]

    def listar_modelos_alunos(self) -> list[AlunoModel]:
        alunos_raw = self.db_manager.listar_alunos()
        return [
            AlunoModel(
                id=a["id"],
                matricula=a["matricula"],
                nome=a["nome"],
                curso_id=a.get("curso_id", 1),
                curso_nome=a.get("curso", ""),
            )
            for a in alunos_raw
        ]

    def salvar_dependencia_no_banco(
        self, pre_requisito_id: str, disciplina_id: str
    ) -> None:
        self.db_manager.adicionar_dependencia(pre_requisito_id, disciplina_id)

    def carregar_grafo_do_banco(self) -> GrafoDirecionado:
        grafo = GrafoDirecionado()
        modelos = self.listar_modelos_disciplinas()

        for d in modelos:
            grafo.adicionar_vertice(
                id_vertice=d.id,
                rotulo=d.nome,
                codigo=d.codigo,
                carga_horaria=d.carga_horaria,
                periodo=d.periodo_sugerido,
            )

        for d in modelos:
            for prereq_id in d.pre_requisitos:
                grafo.adicionar_aresta(prereq_id, d.id)

        return grafo

    @staticmethod
    def carregar_grafo_de_csv(
        caminho_disciplinas: str | None = None,
        caminho_dependencias: str | None = None,
    ) -> GrafoDirecionado:
        root_dir = Path(__file__).resolve().parent.parent.parent
        data_dir = root_dir / "data"

        if caminho_disciplinas is None:
            caminho_disciplinas = str(data_dir / "disciplinas.csv")
        if caminho_dependencias is None:
            caminho_dependencias = str(data_dir / "dependencias.csv")

        grafo = GrafoDirecionado()

        with open(caminho_disciplinas, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                grafo.adicionar_vertice(
                    id_vertice=row["id"],
                    rotulo=row["nome"],
                    codigo=row.get("codigo", row["id"]),
                    carga_horaria=int(row.get("carga_horaria", 60)),
                    periodo=int(row.get("periodo_sugerido", 1)),
                )

        with open(caminho_dependencias, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                prereq = row["PreRequisito"].strip()
                disc = row["Disciplina"].strip()
                grafo.adicionar_aresta(prereq, disc)

        return grafo

    # ======================================================================
    # Cadastro com regras de negócio (usado pela API)
    #
    # As validações consultam o grafo em memória recebido como parâmetro;
    # o SQLite só é usado para gravar as alterações.
    # ======================================================================

    # ---------------------------- Disciplinas -----------------------------

    def _validar_disciplina(
        self, dados: dict[str, Any], grafo: GrafoDirecionado, proprio_id: str | None
    ) -> dict[str, Any]:
        validos = {
            "codigo": _texto(dados, "codigo", "Código", 20),
            "nome": _texto(dados, "nome", "Nome", 80),
            "carga_horaria": _inteiro(dados, "carga_horaria", "Carga horária", 1, 400),
            "periodo_sugerido": _inteiro(dados, "periodo_sugerido", "Período", 1, 20),
        }
        # ID, código e nome identificam a disciplina na pesquisa do grafo
        # (resolver_vertice), então não podem coincidir com outra disciplina.
        for campo, rotulo in (("codigo", "código"), ("nome", "nome")):
            dono = grafo.resolver_vertice(validos[campo])
            if dono is not None and dono != proprio_id:
                raise Conflito(f"Já existe a disciplina {dono} com esse {rotulo}", campo=campo)
        return validos

    def criar_disciplina(self, dados: dict[str, Any], grafo: GrafoDirecionado) -> str:
        disciplina_id = _texto(dados, "id", "Sigla", 20)
        if not PADRAO_ID.match(disciplina_id):
            raise ErroValidacao(
                "A sigla aceita só letras, números, '_' e '-' (até 20 caracteres)", campo="id"
            )
        dono = grafo.resolver_vertice(disciplina_id)
        if dono is not None:
            raise Conflito(f"Já existe a disciplina {dono} com essa sigla", campo="id")
        validos = self._validar_disciplina(dados, grafo, None)

        cursos = self.db_manager.listar_cursos()
        if not cursos:
            raise ErroValidacao("Cadastre um curso antes de criar disciplinas")
        self.db_manager.criar_disciplina(
            disciplina_id, validos["codigo"], validos["nome"],
            validos["carga_horaria"], validos["periodo_sugerido"], cursos[0]["id"],
        )
        return disciplina_id

    def atualizar_disciplina(
        self, disciplina_id: str, dados: dict[str, Any], grafo: GrafoDirecionado
    ) -> str:
        if disciplina_id not in grafo.vertices:
            raise NaoEncontrado(f"Disciplina '{disciplina_id}' não encontrada")
        validos = self._validar_disciplina(dados, grafo, disciplina_id)
        self.db_manager.atualizar_disciplina(
            disciplina_id, validos["codigo"], validos["nome"],
            validos["carga_horaria"], validos["periodo_sugerido"],
        )
        return disciplina_id

    def resumo_remocao_disciplina(
        self, disciplina_id: str, grafo: GrafoDirecionado
    ) -> dict[str, Any]:
        """O que será apagado junto com a disciplina (para o diálogo de confirmação)."""
        if disciplina_id not in grafo.vertices:
            raise NaoEncontrado(f"Disciplina '{disciplina_id}' não encontrada")
        return {
            "prerequisitos": grafo.grau_entrada(disciplina_id) + grafo.grau_saida(disciplina_id),
            "matriculas": self.db_manager.contar_matriculas_da_disciplina(disciplina_id),
        }

    def remover_disciplina(self, disciplina_id: str) -> None:
        if not self.db_manager.remover_disciplina(disciplina_id):
            raise NaoEncontrado(f"Disciplina '{disciplina_id}' não encontrada")

    # --------------------------- Pré-requisitos ---------------------------

    def resolver_aresta(self, dados: dict[str, Any], grafo: GrafoDirecionado) -> tuple[str, str]:
        ids = []
        for campo, rotulo in (("pre_requisito", "Pré-requisito"), ("dependente", "Disciplina")):
            termo = _texto(dados, campo, rotulo)
            resolvido = grafo.resolver_vertice(termo)
            if resolvido is None:
                raise NaoEncontrado(f"Disciplina '{termo}' não encontrada", campo=campo)
            ids.append(resolvido)
        return ids[0], ids[1]

    def validar_prerequisito(self, dados: dict[str, Any], grafo: GrafoDirecionado) -> dict[str, Any]:
        """
        Caso de Teste 2: roda a DFS de 3 cores sobre o grafo em memória com a
        aresta proposta e devolve o resultado e os passos, sem gravar nada.
        """
        u, v = self.resolver_aresta(dados, grafo)
        passos: list[tuple[str, str]] = []
        valido, ciclo = grafo.validar_adicao_aresta(u, v, passos=passos)
        return {
            "pre_requisito": u,
            "dependente": v,
            "ja_existe": v in grafo.obter_sucessores(u),
            "valido": valido,
            "ciclo": ciclo,
            "passos": [{"evento": e, "alvo": a} for e, a in passos],
        }

    def adicionar_prerequisito(self, dados: dict[str, Any], grafo: GrafoDirecionado) -> dict[str, str]:
        resultado = self.validar_prerequisito(dados, grafo)
        u, v = resultado["pre_requisito"], resultado["dependente"]
        if resultado["ja_existe"]:
            raise Conflito(f"{u} já é pré-requisito de {v}")
        if not resultado["valido"]:
            raise Conflito(
                f"{u} → {v} criaria uma dependência circular", ciclo=resultado["ciclo"]
            )
        self.db_manager.adicionar_dependencia(u, v)
        return {"pre_requisito": u, "dependente": v}

    def remover_prerequisito(self, u: str, v: str) -> None:
        if not self.db_manager.remover_dependencia(u, v):
            raise NaoEncontrado(f"{u} não é pré-requisito de {v}")

    # ------------------------------- Alunos -------------------------------

    def _validar_aluno(self, dados: dict[str, Any]) -> tuple[str, str, int]:
        matricula = _texto(dados, "matricula", "Matrícula", 20)
        if not matricula.isdigit():
            raise ErroValidacao("A matrícula deve conter só números", campo="matricula")
        nome = _texto(dados, "nome", "Nome", 80)
        cursos = {c["id"] for c in self.db_manager.listar_cursos()}
        curso_id = dados.get("curso_id")
        if isinstance(curso_id, bool) or not isinstance(curso_id, int) or curso_id not in cursos:
            raise ErroValidacao("Curso inválido", campo="curso_id")
        return matricula, nome, int(curso_id)

    def detalhar_aluno(self, aluno_id: int, grafo: GrafoDirecionado) -> dict[str, Any]:
        aluno = self.db_manager.obter_aluno(aluno_id)
        if aluno is None:
            raise NaoEncontrado(f"Aluno {aluno_id} não encontrado")
        historico = self.db_manager.listar_matriculas_do_aluno(aluno_id)
        return {**aluno, "historico": historico, "progresso": self._progresso(historico, grafo)}

    def listar_alunos_detalhados(self, grafo: GrafoDirecionado) -> list[dict[str, Any]]:
        return [self.detalhar_aluno(a["id"], grafo) for a in self.db_manager.listar_alunos()]

    def criar_aluno(self, dados: dict[str, Any], grafo: GrafoDirecionado) -> dict[str, Any]:
        matricula, nome, curso_id = self._validar_aluno(dados)
        try:
            aluno_id = self.db_manager.criar_aluno(matricula, nome, curso_id)
        except sqlite3.IntegrityError:
            raise Conflito("Já existe aluno com essa matrícula", campo="matricula") from None
        return self.detalhar_aluno(aluno_id, grafo)

    def atualizar_aluno(
        self, aluno_id: int, dados: dict[str, Any], grafo: GrafoDirecionado
    ) -> dict[str, Any]:
        self.detalhar_aluno(aluno_id, grafo)
        matricula, nome, curso_id = self._validar_aluno(dados)
        try:
            self.db_manager.atualizar_aluno(aluno_id, matricula, nome, curso_id)
        except sqlite3.IntegrityError:
            raise Conflito("Já existe aluno com essa matrícula", campo="matricula") from None
        return self.detalhar_aluno(aluno_id, grafo)

    def remover_aluno(self, aluno_id: int) -> None:
        if not self.db_manager.remover_aluno(aluno_id):
            raise NaoEncontrado(f"Aluno {aluno_id} não encontrado")

    @staticmethod
    def _progresso(historico: list[dict[str, Any]], grafo: GrafoDirecionado) -> dict[str, list[str]]:
        """Classifica cada disciplina para o aluno usando os antecessores do grafo."""
        aprovadas = {h["disciplina_id"] for h in historico if h["situacao"] == "APROVADO"}
        cursando = {
            h["disciplina_id"] for h in historico if h["situacao"] == "EM_ANDAMENTO"
        } - aprovadas
        progresso: dict[str, list[str]] = {
            "concluidas": [], "cursando": [], "liberadas": [], "bloqueadas": []
        }
        for v in grafo.vertices:
            if v in aprovadas:
                progresso["concluidas"].append(v)
            elif v in cursando:
                progresso["cursando"].append(v)
            elif all(p in aprovadas for p in grafo.obter_antecessores(v)):
                progresso["liberadas"].append(v)
            else:
                progresso["bloqueadas"].append(v)
        return progresso

    # ------------------------------ Matrículas -----------------------------

    def _validar_matricula(
        self, aluno_id: int, dados: dict[str, Any], grafo: GrafoDirecionado, ignorar_id: int | None
    ) -> tuple[str, str, str, float | None]:
        disciplina_id = _texto(dados, "disciplina_id", "Disciplina", 20)
        if disciplina_id not in grafo.vertices:
            raise NaoEncontrado(f"Disciplina '{disciplina_id}' não encontrada", campo="disciplina_id")
        semestre = _texto(dados, "semestre", "Semestre", 6)
        if not PADRAO_SEMESTRE.match(semestre):
            raise ErroValidacao("Semestre no formato AAAA.1 ou AAAA.2", campo="semestre")
        situacao = dados.get("situacao")
        if situacao not in SITUACOES:
            raise ErroValidacao("Situação inválida", campo="situacao")
        nota = dados.get("nota")
        if situacao in ("EM_ANDAMENTO", "PENDENTE"):
            nota = None
        elif nota is None:
            raise ErroValidacao("Informe a nota para aprovado ou reprovado", campo="nota")
        elif isinstance(nota, bool) or not isinstance(nota, (int, float)) or not 0 <= nota <= 10:
            raise ErroValidacao("A nota deve estar entre 0 e 10", campo="nota")
        else:
            nota = float(nota)

        historico = [
            h for h in self.db_manager.listar_matriculas_do_aluno(aluno_id) if h["id"] != ignorar_id
        ]
        if any(h["disciplina_id"] == disciplina_id and h["semestre"] == semestre for h in historico):
            raise Conflito("O aluno já tem essa disciplina nesse semestre", campo="semestre")

        # Regra do grafo: para cursar ou ser aprovado, os pré-requisitos diretos
        # precisam estar aprovados.
        if situacao in ("APROVADO", "EM_ANDAMENTO"):
            aprovadas = {h["disciplina_id"] for h in historico if h["situacao"] == "APROVADO"}
            faltam = [p for p in grafo.obter_antecessores(disciplina_id) if p not in aprovadas]
            if faltam:
                raise Conflito(
                    f"Pré-requisitos pendentes para {disciplina_id}: {', '.join(faltam)}",
                    campo="disciplina_id",
                    faltam=faltam,
                )
        return disciplina_id, semestre, situacao, nota

    def criar_matricula(
        self, aluno_id: int, dados: dict[str, Any], grafo: GrafoDirecionado
    ) -> dict[str, Any]:
        self.detalhar_aluno(aluno_id, grafo)
        campos = self._validar_matricula(aluno_id, dados, grafo, None)
        self.db_manager.criar_matricula(aluno_id, *campos)
        return self.detalhar_aluno(aluno_id, grafo)

    def atualizar_matricula(
        self, matricula_id: int, dados: dict[str, Any], grafo: GrafoDirecionado
    ) -> dict[str, Any]:
        atual = self.db_manager.obter_matricula(matricula_id)
        if atual is None:
            raise NaoEncontrado(f"Matrícula {matricula_id} não encontrada")
        campos = self._validar_matricula(atual["aluno_id"], dados, grafo, matricula_id)
        self.db_manager.atualizar_matricula(matricula_id, *campos)
        return self.detalhar_aluno(atual["aluno_id"], grafo)

    def remover_matricula(self, matricula_id: int, grafo: GrafoDirecionado) -> dict[str, Any]:
        atual = self.db_manager.obter_matricula(matricula_id)
        if atual is None:
            raise NaoEncontrado(f"Matrícula {matricula_id} não encontrada")
        self.db_manager.remover_matricula(matricula_id)
        return self.detalhar_aluno(atual["aluno_id"], grafo)

    # -------------------------------- Seed --------------------------------

    def restaurar_dados_iniciais(self) -> None:
        executar_seed(self.db_manager)
