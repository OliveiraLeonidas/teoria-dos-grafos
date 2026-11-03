import csv
from pathlib import Path

from ..database.db_manager import DatabaseManager
from ..models.disciplina import AlunoModel, DisciplinaModel
from ..models.grafo import GrafoDirecionado


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
