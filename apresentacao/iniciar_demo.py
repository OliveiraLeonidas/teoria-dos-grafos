"""Abre a demonstração com dados iniciais em um banco temporário independente."""

import sys
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.api.server import iniciar_servidor
from src.database.db_manager import DatabaseManager
from src.database.seed import executar_seed
from src.services.curriculo_service import CurriculoService


def main() -> None:
    if not (ROOT / "frontend/dist/index.html").is_file():
        raise SystemExit("Compile o frontend antes: cd frontend && npm run build")
    with TemporaryDirectory(prefix="grafos-apresentacao-") as diretorio:
        banco = DatabaseManager(str(Path(diretorio) / "demo.db"))
        executar_seed(banco)
        print("Demonstração com dados iniciais. Alterações serão descartadas ao encerrar.")
        iniciar_servidor(8002, CurriculoService(banco))


if __name__ == "__main__":
    main()
