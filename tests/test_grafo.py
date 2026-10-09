import unittest

from src.models.grafo import GrafoDirecionado


class TestGrafoDirecionado(unittest.TestCase):
    def setUp(self) -> None:
        self.g = GrafoDirecionado()

    def test_adicao_vertices_e_arestas(self) -> None:
        self.g.adicionar_aresta("A", "B")
        self.g.adicionar_aresta("B", "C")

        self.assertEqual(self.g.total_vertices(), 3)
        self.assertEqual(self.g.total_arestas(), 2)
        self.assertEqual(self.g.obter_sucessores("A"), ["B"])
        self.assertEqual(self.g.obter_antecessores("C"), ["B"])
        self.assertEqual(self.g.grau_saida("A"), 1)
        self.assertEqual(self.g.grau_entrada("B"), 1)

    def test_remover_aresta(self) -> None:
        self.g.adicionar_aresta("A", "B")
        self.assertEqual(self.g.total_arestas(), 1)

        removido = self.g.remover_aresta("A", "B")
        self.assertTrue(removido)
        self.assertEqual(self.g.total_arestas(), 0)
        self.assertEqual(self.g.obter_sucessores("A"), [])
        self.assertEqual(self.g.obter_antecessores("B"), [])

    def test_atributos_vertice(self) -> None:
        v = self.g.adicionar_vertice(
            "ED", "Estrutura de Dados", carga_horaria=80, periodo=2
        )
        self.assertEqual(v.id, "ED")
        self.assertEqual(v.rotulo, "Estrutura de Dados")
        self.assertEqual(v.atributos["carga_horaria"], 80)
        self.assertEqual(v.atributos["periodo"], 2)
        self.assertTrue(self.g.contem_vertice("ED"))

    def test_multiplas_arestas_e_graus(self) -> None:
        self.g.adicionar_aresta("ED", "SO")
        self.g.adicionar_aresta("ED", "BD")
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("AL", "IA1")

        self.assertEqual(self.g.grau_saida("ED"), 3)
        self.assertEqual(self.g.grau_entrada("IA1"), 2)
        self.assertEqual(self.g.obter_sucessores("ED"), ["SO", "BD", "IA1"])
        self.assertEqual(self.g.obter_antecessores("IA1"), ["ED", "AL"])


if __name__ == "__main__":
    unittest.main()
