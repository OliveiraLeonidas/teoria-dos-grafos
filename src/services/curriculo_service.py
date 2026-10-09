import csv
from pathlib import Path

from ..database.db_manager import DatabaseManager
from ..models.grafo import GrafoDirecionado


class CurriculoService:
    def __init__(self, db_manager: DatabaseManager | None = None) -> None:
        self.db_manager = db_manager or DatabaseManager()

    def carregar_grafo_do_banco(self) -> GrafoDirecionado:
        grafo = GrafoDirecionado()

        disciplinas = self.db_manager.listar_disciplinas()
        for d in disciplinas:
            grafo.adicionar_vertice(
                id_vertice=d["id"],
                rotulo=d["nome"],
                codigo=d["codigo"],
                carga_horaria=d["carga_horaria"],
                periodo=d["periodo_sugerido"],
            )

        dependencias = self.db_manager.listar_dependencias()
        for prereq_id, dep_id in dependencias:
            grafo.adicionar_aresta(prereq_id, dep_id)

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
