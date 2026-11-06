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
            SELECT a.id, a.matricula, a.nome, a.curso_id, c.nome AS curso
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
            SELECT m.id, d.id AS disciplina_id, d.nome AS disciplina_nome,
                   m.semestre, m.situacao, m.nota
            FROM matriculas m
            JOIN alunos a ON m.aluno_id = a.id
            JOIN disciplinas d ON m.disciplina_id = d.id
            WHERE a.matricula = ?
            ORDER BY m.semestre, d.nome;
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

    def remover_dependencia(self, prerequisito_id: str, disciplina_id: str) -> bool:
        query = """
            DELETE FROM prerequisitos
            WHERE disciplina_id = ? AND prerequisito_id = ?;
        """
        with self.get_connection() as conn:
            cursor = conn.execute(query, (disciplina_id, prerequisito_id))
            conn.commit()
            return cursor.rowcount > 0

    # ------------------------------------------------------------------
    # Utilitários de escrita
    # ------------------------------------------------------------------

    def _executar(self, query: str, parametros: tuple[Any, ...]) -> sqlite3.Cursor:
        with self.get_connection() as conn:
            cursor = conn.execute(query, parametros)
            conn.commit()
            return cursor

    def _buscar_um(self, query: str, parametros: tuple[Any, ...]) -> dict[str, Any] | None:
        with self.get_connection() as conn:
            row = conn.execute(query, parametros).fetchone()
            return dict(row) if row else None

    def _buscar_todos(self, query: str, parametros: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.get_connection() as conn:
            return [dict(r) for r in conn.execute(query, parametros).fetchall()]

    # ------------------------------------------------------------------
    # Disciplinas
    # ------------------------------------------------------------------

    def obter_disciplina(self, disciplina_id: str) -> dict[str, Any] | None:
        return self._buscar_um(
            """SELECT id, codigo, nome, carga_horaria, periodo_sugerido, curso_id
               FROM disciplinas WHERE id = ?;""",
            (disciplina_id,),
        )

    def criar_disciplina(
        self, disciplina_id: str, codigo: str, nome: str,
        carga_horaria: int, periodo_sugerido: int, curso_id: int,
    ) -> None:
        self._executar(
            """INSERT INTO disciplinas (id, codigo, nome, carga_horaria, periodo_sugerido, curso_id)
               VALUES (?, ?, ?, ?, ?, ?);""",
            (disciplina_id, codigo, nome, carga_horaria, periodo_sugerido, curso_id),
        )

    def atualizar_disciplina(
        self, disciplina_id: str, codigo: str, nome: str,
        carga_horaria: int, periodo_sugerido: int,
    ) -> bool:
        cursor = self._executar(
            """UPDATE disciplinas
               SET codigo = ?, nome = ?, carga_horaria = ?, periodo_sugerido = ?
               WHERE id = ?;""",
            (codigo, nome, carga_horaria, periodo_sugerido, disciplina_id),
        )
        return cursor.rowcount > 0

    def remover_disciplina(self, disciplina_id: str) -> bool:
        """Remove a disciplina; pré-requisitos e matrículas saem por ON DELETE CASCADE."""
        cursor = self._executar("DELETE FROM disciplinas WHERE id = ?;", (disciplina_id,))
        return cursor.rowcount > 0

    def contar_matriculas_da_disciplina(self, disciplina_id: str) -> int:
        row = self._buscar_um(
            "SELECT COUNT(*) AS total FROM matriculas WHERE disciplina_id = ?;", (disciplina_id,)
        )
        return int(row["total"]) if row else 0

    # ------------------------------------------------------------------
    # Cursos
    # ------------------------------------------------------------------

    def listar_cursos(self) -> list[dict[str, Any]]:
        return self._buscar_todos("SELECT id, nome, codigo FROM cursos ORDER BY nome;")

    # ------------------------------------------------------------------
    # Alunos
    # ------------------------------------------------------------------

    def obter_aluno(self, aluno_id: int) -> dict[str, Any] | None:
        return self._buscar_um(
            """SELECT a.id, a.matricula, a.nome, a.curso_id, c.nome AS curso
               FROM alunos a JOIN cursos c ON a.curso_id = c.id
               WHERE a.id = ?;""",
            (aluno_id,),
        )

    def criar_aluno(self, matricula: str, nome: str, curso_id: int) -> int:
        cursor = self._executar(
            "INSERT INTO alunos (matricula, nome, curso_id) VALUES (?, ?, ?);",
            (matricula, nome, curso_id),
        )
        return int(cursor.lastrowid or 0)

    def atualizar_aluno(self, aluno_id: int, matricula: str, nome: str, curso_id: int) -> bool:
        cursor = self._executar(
            "UPDATE alunos SET matricula = ?, nome = ?, curso_id = ? WHERE id = ?;",
            (matricula, nome, curso_id, aluno_id),
        )
        return cursor.rowcount > 0

    def remover_aluno(self, aluno_id: int) -> bool:
        cursor = self._executar("DELETE FROM alunos WHERE id = ?;", (aluno_id,))
        return cursor.rowcount > 0

    # ------------------------------------------------------------------
    # Matrículas (histórico)
    # ------------------------------------------------------------------

    def listar_matriculas_do_aluno(self, aluno_id: int) -> list[dict[str, Any]]:
        return self._buscar_todos(
            """SELECT m.id, m.aluno_id, d.id AS disciplina_id, d.nome AS disciplina_nome,
                      m.semestre, m.situacao, m.nota
               FROM matriculas m JOIN disciplinas d ON m.disciplina_id = d.id
               WHERE m.aluno_id = ?
               ORDER BY m.semestre, d.nome;""",
            (aluno_id,),
        )

    def obter_matricula(self, matricula_id: int) -> dict[str, Any] | None:
        return self._buscar_um(
            """SELECT id, aluno_id, disciplina_id, semestre, situacao, nota
               FROM matriculas WHERE id = ?;""",
            (matricula_id,),
        )

    def criar_matricula(
        self, aluno_id: int, disciplina_id: str, semestre: str, situacao: str, nota: float | None
    ) -> int:
        cursor = self._executar(
            """INSERT INTO matriculas (aluno_id, disciplina_id, semestre, situacao, nota)
               VALUES (?, ?, ?, ?, ?);""",
            (aluno_id, disciplina_id, semestre, situacao, nota),
        )
        return int(cursor.lastrowid or 0)

    def atualizar_matricula(
        self, matricula_id: int, disciplina_id: str, semestre: str, situacao: str, nota: float | None
    ) -> bool:
        cursor = self._executar(
            """UPDATE matriculas
               SET disciplina_id = ?, semestre = ?, situacao = ?, nota = ?
               WHERE id = ?;""",
            (disciplina_id, semestre, situacao, nota, matricula_id),
        )
        return cursor.rowcount > 0

    def remover_matricula(self, matricula_id: int) -> bool:
        cursor = self._executar("DELETE FROM matriculas WHERE id = ?;", (matricula_id,))
        return cursor.rowcount > 0
