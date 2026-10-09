PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS faculdades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sigla TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS cursos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    faculdade_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    FOREIGN KEY (faculdade_id) REFERENCES faculdades (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS disciplinas (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    carga_horaria INTEGER NOT NULL DEFAULT 60,
    periodo_sugerido INTEGER NOT NULL DEFAULT 1,
    curso_id INTEGER NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prerequisitos (
    disciplina_id TEXT NOT NULL,
    prerequisito_id TEXT NOT NULL,
    PRIMARY KEY (disciplina_id, prerequisito_id),
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas (id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisito_id) REFERENCES disciplinas (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricula TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    curso_id INTEGER NOT NULL,
    FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matriculas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL,
    disciplina_id TEXT NOT NULL,
    semestre TEXT NOT NULL,
    situacao TEXT NOT NULL CHECK (situacao IN ('APROVADO', 'REPROVADO', 'EM_ANDAMENTO', 'PENDENTE')),
    nota REAL,
    FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas (id) ON DELETE CASCADE
);
