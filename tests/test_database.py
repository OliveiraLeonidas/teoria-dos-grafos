import unittest

from src.database.db_manager import DatabaseManager
from src.database.seed import executar_seed
from src.services.curriculo_service import CurriculoService


class TestDatabaseManager(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        executar_seed()

    def setUp(self) -> None:
        self.db = DatabaseManager()
        self.service = CurriculoService(self.db)

    def test_disciplinas_cadastradas(self) -> None:
        disciplinas = self.db.listar_disciplinas()
        self.assertEqual(len(disciplinas), 13)
        ids = [d["id"] for d in disciplinas]
        self.assertIn("ED", ids)
        self.assertIn("IA2", ids)
        self.assertIn("PreCalc", ids)

    def test_dependencias_cadastradas(self) -> None:
        deps = self.db.listar_dependencias()
        self.assertIn(("ED", "BD"), deps)
        self.assertIn(("ED", "SO"), deps)
        self.assertIn(("ED", "IA1"), deps)
        self.assertIn(("AL", "IA1"), deps)
        self.assertIn(("IA1", "IA2"), deps)

    def test_historico_aluno(self) -> None:
        historico_carlos = self.db.obter_historico_aluno("20240103")
        self.assertTrue(
            any(
                h["disciplina_id"] == "ED" and h["situacao"] == "REPROVADO"
                for h in historico_carlos
            )
        )

    def test_carga_grafo_do_banco(self) -> None:
        grafo = self.service.carregar_grafo_do_banco()
        self.assertEqual(grafo.total_vertices(), 13)
        self.assertEqual(grafo.total_arestas(), 11)
        self.assertEqual(set(grafo.obter_sucessores("ED")), {"SO", "BD", "IA1"})
        self.assertEqual(set(grafo.obter_antecessores("IA1")), {"ED", "AL"})

    def test_carga_grafo_de_csv(self) -> None:
        grafo = CurriculoService.carregar_grafo_de_csv()
        self.assertEqual(grafo.total_vertices(), 13)
        self.assertEqual(grafo.total_arestas(), 11)
        self.assertEqual(set(grafo.obter_sucessores("ED")), {"SO", "BD", "IA1"})


if __name__ == "__main__":
    unittest.main()
