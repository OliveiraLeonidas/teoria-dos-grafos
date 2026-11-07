import tempfile
import unittest
from pathlib import Path

from src.database.db_manager import DatabaseManager
from src.database.seed import executar_seed
from src.services.curriculo_service import CurriculoService


class TestDatabaseManager(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        # Banco temporário: os testes não podem alterar data/universidade.db nem os CSVs.
        cls._tmp = tempfile.TemporaryDirectory()
        cls.db_path = str(Path(cls._tmp.name) / "teste.db")
        executar_seed(DatabaseManager(cls.db_path))

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def setUp(self) -> None:
        self.db = DatabaseManager(self.db_path)
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

    def test_impacto_grafo_banco_caso_1(self) -> None:
        grafo = self.service.carregar_grafo_do_banco()
        impacto_ed = set(grafo.consultar_impacto("ED"))
        impacto_por_nome = set(grafo.consultar_impacto("Estrutura de Dados"))
        self.assertEqual(impacto_ed, {"SO", "Redes", "BD", "IA1", "IA2"})
        self.assertEqual(impacto_por_nome, {"SO", "Redes", "BD", "IA1", "IA2"})

    def test_ciclo_grafo_banco_caso_2(self) -> None:
        grafo = self.service.carregar_grafo_do_banco()
        self.assertIsNone(grafo.detectar_ciclo())

        valido, ciclo = grafo.validar_adicao_aresta(
            "Inteligência Artificial 2", "Estrutura de Dados"
        )
        self.assertFalse(valido)
        self.assertEqual(ciclo, ["ED", "IA1", "IA2", "ED"])

        grafo.adicionar_aresta("IA2", "ED")
        self.assertEqual(grafo.detectar_ciclo(), ["ED", "IA1", "IA2", "ED"])

    def test_ordenacao_topologica_banco(self) -> None:
        grafo = self.service.carregar_grafo_do_banco()
        ordem = grafo.ordenacao_topologica()
        ordem_dfs = grafo.ordenacao_topologica_dfs()
        self.assertIsNotNone(ordem)
        self.assertIsNotNone(ordem_dfs)
        self.assertEqual(len(ordem), 13)
        self.assertEqual(len(ordem_dfs), 13)

        # Valida que todos os 11 pré-requisitos aparecem antes de suas dependentes na lista
        dependencias = self.db.listar_dependencias()
        for prereq, dep in dependencias:
            self.assertLess(
                ordem.index(prereq),
                ordem.index(dep),
                f"Pré-requisito {prereq} deveria preceder {dep} na ordenação topológica (Kahn)"
            )
            self.assertLess(
                ordem_dfs.index(prereq),
                ordem_dfs.index(dep),
                f"Pré-requisito {prereq} deveria preceder {dep} na ordenação topológica (DFS)"
            )

        niveis = grafo.ordenacao_topologica_por_niveis()
        self.assertIsNotNone(niveis)
        self.assertEqual(len(niveis), 4)  # 4 semestres mínimos para formatura

    def test_modelos_dominio_e_metricas(self) -> None:
        modelos_disc = self.service.listar_modelos_disciplinas()
        modelos_alunos = self.service.listar_modelos_alunos()
        self.assertEqual(len(modelos_disc), 13)
        self.assertEqual(len(modelos_alunos), 3)

        ia1_model = next(d for d in modelos_disc if d.id == "IA1")
        self.assertEqual(set(ia1_model.pre_requisitos), {"ED", "AL"})

        grafo = self.service.carregar_grafo_do_banco()
        self.assertEqual(grafo.fator_bloqueio("ED"), 5)
        self.assertEqual(
            set(grafo.consultar_pre_requisitos_transitivos("IA2")),
            {"IA1", "ED", "AL", "GA"},
        )

    def test_alunos_trazem_curso_id(self) -> None:
        alunos = self.db.listar_alunos()
        self.assertTrue(all(a["curso_id"] == 1 for a in alunos))

    def test_adicionar_e_remover_dependencia(self) -> None:
        self.db.adicionar_dependencia("GA", "CG")
        self.assertIn(("GA", "CG"), self.db.listar_dependencias())
        self.assertTrue(self.db.remover_dependencia("GA", "CG"))
        self.assertNotIn(("GA", "CG"), self.db.listar_dependencias())
        self.assertFalse(self.db.remover_dependencia("GA", "CG"))


if __name__ == "__main__":
    unittest.main()
