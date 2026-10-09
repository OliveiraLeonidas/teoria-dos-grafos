import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any


class DatabaseManager:
    def __init__(self, db_path: str | None = None) -> None:
        if db_path is None:
            root_dir = Path(__file__).resolve().parent.parent.parent
            data_dir = root_dir / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = str(data_dir / "universidade.db")
        else:
            self.db_path = db_path

    @contextmanager
    def get_connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        try:
            yield conn
        finally:
            conn.close()

    def inicializar_banco(self, schema_path: str | None = None) -> None:
        if schema_path is None:
            schema_file = Path(__file__).resolve().parent / "schema.sql"
        else:
            schema_file = Path(schema_path)

        with open(schema_file, "r", encoding="utf-8") as f:
            script_ddl = f.read()

        with self.get_connection() as conn:
            conn.executescript(script_ddl)
            conn.commit()

    def listar_disciplinas(self) -> list[dict[str, Any]]:
        query = """
            SELECT id, codigo, nome, carga_horaria, periodo_sugerido, curso_id
            FROM disciplinas
            ORDER BY periodo_sugerido, nome;
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            return [dict(row) for row in cursor.fetchall()]

    def listar_dependencias(self) -> list[tuple[str, str]]:
        query = """
            SELECT prerequisito_id, disciplina_id
            FROM prerequisitos;
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            return [
                (row["prerequisito_id"], row["disciplina_id"])
                for row in cursor.fetchall()
            ]

    def listar_alunos(self) -> list[dict[str, Any]]:
        query = """
            SELECT a.id, a.matricula, a.nome, c.nome AS curso
            FROM alunos a
            JOIN cursos c ON a.curso_id = c.id
            ORDER BY a.nome;
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            return [dict(row) for row in cursor.fetchall()]

    def obter_historico_aluno(self, matricula: str) -> list[dict[str, Any]]:
        query = """
            SELECT d.id AS disciplina_id, d.nome AS disciplina_nome,
                   m.semestre, m.situacao, m.nota
            FROM matriculas m
            JOIN alunos a ON m.aluno_id = a.id
            JOIN disciplinas d ON m.disciplina_id = d.id
            WHERE a.matricula = ?;
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, (matricula,))
            return [dict(row) for row in cursor.fetchall()]

    def adicionar_dependencia(self, prerequisito_id: str, disciplina_id: str) -> None:
        query = """
            INSERT OR IGNORE INTO prerequisitos (disciplina_id, prerequisito_id)
            VALUES (?, ?);
        """
        with self.get_connection() as conn:
            conn.execute(query, (disciplina_id, prerequisito_id))
            conn.commit()
