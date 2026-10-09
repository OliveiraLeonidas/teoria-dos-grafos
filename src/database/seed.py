import csv
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from .db_manager import DatabaseManager
except ImportError:
    from src.database.db_manager import DatabaseManager


def executar_seed(db_manager: DatabaseManager | None = None) -> None:
    if db_manager is None:
        db_manager = DatabaseManager()

    db_manager.inicializar_banco()

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute("DELETE FROM matriculas;")
        cursor.execute("DELETE FROM prerequisitos;")
        cursor.execute("DELETE FROM disciplinas;")
        cursor.execute("DELETE FROM alunos;")
        cursor.execute("DELETE FROM cursos;")
        cursor.execute("DELETE FROM faculdades;")

        cursor.execute(
            "INSERT INTO faculdades (id, nome, sigla) VALUES (1, ?, ?);",
            ("Instituto de Tecnologia e Ciência da Computação", "ITCC"),
        )

        cursor.execute(
            "INSERT INTO cursos (id, faculdade_id, nome, codigo) VALUES (1, 1, ?, ?);",
            ("Bacharelado em Ciência da Computação", "BCC"),
        )

        disciplinas = [
            ("PreCalc", "MAT101", "Pré-Cálculo", 60, 1, 1),
            ("Calc1", "MAT102", "Cálculo 1", 80, 2, 1),
            ("Calc2", "MAT201", "Cálculo 2", 80, 3, 1),
            ("Calc3", "MAT301", "Cálculo 3", 80, 4, 1),
            ("GA", "MAT103", "Geometria Analítica", 60, 1, 1),
            ("AL", "MAT202", "Álgebra Linear", 60, 2, 1),
            ("CG", "CMP301", "Computação Gráfica", 60, 3, 1),
            ("ED", "CMP201", "Estrutura de Dados", 80, 2, 1),
            ("SO", "CMP302", "Sistemas Operacionais", 80, 3, 1),
            ("Redes", "CMP401", "Redes de Computadores", 60, 4, 1),
            ("BD", "CMP303", "Banco de Dados", 60, 3, 1),
            ("IA1", "CMP402", "Inteligência Artificial 1", 60, 4, 1),
            ("IA2", "CMP501", "Inteligência Artificial 2", 60, 5, 1),
        ]

        cursor.executemany(
            """INSERT INTO disciplinas (id, codigo, nome, carga_horaria, periodo_sugerido, curso_id)
               VALUES (?, ?, ?, ?, ?, ?);""",
            disciplinas,
        )

        dependencias = [
            ("Calc1", "PreCalc"),
            ("Calc2", "Calc1"),
            ("Calc3", "Calc2"),
            ("AL", "GA"),
            ("CG", "AL"),
            ("SO", "ED"),
            ("Redes", "SO"),
            ("BD", "ED"),
            ("IA1", "ED"),
            ("IA1", "AL"),
            ("IA2", "IA1"),
        ]

        cursor.executemany(
            """INSERT INTO prerequisitos (disciplina_id, prerequisito_id)
               VALUES (?, ?);""",
            dependencias,
        )

        alunos = [
            (1, "20240101", "Lucas Silva", 1),
            (2, "20240102", "Mariana Souza", 1),
            (3, "20240103", "Carlos Eduardo", 1),
        ]
        cursor.executemany(
            "INSERT INTO alunos (id, matricula, nome, curso_id) VALUES (?, ?, ?, ?);",
            alunos,
        )

        matriculas = [
            (1, "PreCalc", "2024.1", "APROVADO", 8.5),
            (1, "GA", "2024.1", "APROVADO", 7.0),
            (1, "Calc1", "2024.2", "APROVADO", 7.5),
            (1, "AL", "2024.2", "APROVADO", 8.0),
            (1, "ED", "2024.2", "APROVADO", 9.0),
            (1, "SO", "2025.1", "EM_ANDAMENTO", None),
            (1, "BD", "2025.1", "EM_ANDAMENTO", None),
            (2, "PreCalc", "2023.1", "APROVADO", 9.5),
            (2, "Calc1", "2023.2", "APROVADO", 9.0),
            (2, "Calc2", "2024.1", "APROVADO", 8.5),
            (2, "GA", "2023.1", "APROVADO", 9.0),
            (2, "AL", "2023.2", "APROVADO", 9.2),
            (2, "ED", "2023.2", "APROVADO", 9.8),
            (2, "SO", "2024.1", "APROVADO", 8.7),
            (2, "BD", "2024.1", "APROVADO", 9.0),
            (2, "IA1", "2024.2", "APROVADO", 9.5),
            (3, "PreCalc", "2024.1", "APROVADO", 7.0),
            (3, "GA", "2024.1", "APROVADO", 6.5),
            (3, "ED", "2024.2", "REPROVADO", 4.0),
        ]
        cursor.executemany(
            """INSERT INTO matriculas (aluno_id, disciplina_id, semestre, situacao, nota)
               VALUES (?, ?, ?, ?, ?);""",
            matriculas,
        )

        conn.commit()

    root_dir = Path(__file__).resolve().parent.parent.parent
    data_dir = root_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    csv_disc_path = data_dir / "disciplinas.csv"
    with open(csv_disc_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "codigo", "nome", "carga_horaria", "periodo_sugerido"])
        for d in disciplinas:
            writer.writerow([d[0], d[1], d[2], d[3], d[4]])

    csv_dep_path = data_dir / "dependencias.csv"
    with open(csv_dep_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["PreRequisito", "Disciplina"])
        for dep in dependencias:
            writer.writerow([dep[1], dep[0]])


if __name__ == "__main__":
    executar_seed()
