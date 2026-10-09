from dataclasses import dataclass, field


@dataclass
class DisciplinaModel:
    id: str
    nome: str
    codigo: str
    carga_horaria: int = 60
    periodo_sugerido: int = 1
    curso_id: int | None = 1
    pre_requisitos: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return f"[{self.codigo}] {self.nome} ({self.carga_horaria}h - {self.periodo_sugerido}º Período)"


@dataclass
class AlunoModel:
    id: int
    matricula: str
    nome: str
    curso_id: int
