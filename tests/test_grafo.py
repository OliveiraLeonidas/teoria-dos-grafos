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

    def test_caso_1_consulta_impacto_dfs(self) -> None:
        """
        Caso de Teste 1 do Trabalho:
        Entrada: Consultar impacto de 'ED' (Estrutura de Dados).
        Saida esperada: Conjunto contendo BD, SO, Redes, IA1 e IA2.
        """
        self.g.adicionar_vertice("ED", "Estrutura de Dados")
        self.g.adicionar_vertice("SO", "Sistemas Operacionais")
        self.g.adicionar_vertice("Redes", "Redes de Computadores")
        self.g.adicionar_vertice("BD", "Banco de Dados")
        self.g.adicionar_vertice("IA1", "Inteligência Artificial 1")
        self.g.adicionar_vertice("IA2", "Inteligência Artificial 2")
        self.g.adicionar_vertice("AL", "Álgebra Linear")

        self.g.adicionar_aresta("ED", "SO")
        self.g.adicionar_aresta("SO", "Redes")
        self.g.adicionar_aresta("ED", "BD")
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("AL", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")

        impacto = self.g.consultar_impacto("ED")
        impacto_por_nome = self.g.consultar_impacto("Estrutura de Dados")
        self.assertEqual(impacto, impacto_por_nome)

        impacto_set = set(impacto)
        esperado = {"SO", "Redes", "BD", "IA1", "IA2"}

        self.assertEqual(impacto_set, esperado)
        self.assertNotIn("ED", impacto_set)
        self.assertNotIn("AL", impacto_set)

        nomes_impactados = [self.g.obter_vertice(v).rotulo for v in impacto]
        self.assertIn("Banco de Dados", nomes_impactados)
        self.assertIn("Sistemas Operacionais", nomes_impactados)
        self.assertIn("Redes de Computadores", nomes_impactados)
        self.assertIn("Inteligência Artificial 1", nomes_impactados)
        self.assertIn("Inteligência Artificial 2", nomes_impactados)

    def test_caminhos_dfs(self) -> None:
        self.g.adicionar_aresta("ED", "SO")
        self.g.adicionar_aresta("SO", "Redes")
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")

        caminho_redes = self.g.buscar_caminho_dfs("ED", "Redes")
        self.assertEqual(caminho_redes, ["ED", "SO", "Redes"])

        caminho_ia2 = self.g.buscar_caminho_dfs("ED", "IA2")
        self.assertEqual(caminho_ia2, ["ED", "IA1", "IA2"])

        caminho_invalido = self.g.buscar_caminho_dfs("Redes", "ED")
        self.assertIsNone(caminho_invalido)

    def test_caso_2_identificacao_falha_ciclo_3_cores(self) -> None:
        """
        Caso de Teste 2 do Trabalho:
        Entrada: Adicionar aresta IA2 -> ED em grafo que ja possui ED -> IA1 -> IA2.
        Saida esperada: Alerta de erro com o caminho fechado exato: ED -> IA1 -> IA2 -> ED.
        """
        self.g.adicionar_vertice("ED", "Estrutura de Dados")
        self.g.adicionar_vertice("IA1", "Inteligência Artificial 1")
        self.g.adicionar_vertice("IA2", "Inteligência Artificial 2")

        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")

        self.assertIsNone(self.g.detectar_ciclo())

        valido, ciclo_preventivo = self.g.validar_adicao_aresta("IA2", "ED")
        self.assertFalse(valido)
        self.assertEqual(ciclo_preventivo, ["ED", "IA1", "IA2", "ED"])

        inserido, ciclo_bloqueado = self.g.adicionar_aresta_segura("IA2", "ED")
        self.assertFalse(inserido)
        self.assertEqual(ciclo_bloqueado, ["ED", "IA1", "IA2", "ED"])

        self.g.adicionar_aresta("IA2", "ED")
        ciclo_detectado = self.g.detectar_ciclo()
        self.assertIsNotNone(ciclo_detectado)
        self.assertEqual(ciclo_detectado, ["ED", "IA1", "IA2", "ED"])

    def test_auto_laco_ciclo(self) -> None:
        self.g.adicionar_vertice("Calc1")
        valido, ciclo = self.g.validar_adicao_aresta("Calc1", "Calc1")
        self.assertFalse(valido)
        self.assertEqual(ciclo, ["Calc1", "Calc1"])

    def test_ordenacao_topologica_linear(self) -> None:
        self.g.adicionar_aresta("PreCalc", "Calc1")
        self.g.adicionar_aresta("Calc1", "Calc2")
        self.g.adicionar_aresta("GA", "AL")
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("AL", "IA1")

        ordem = self.g.ordenacao_topologica()
        self.assertIsNotNone(ordem)
        self.assertEqual(len(ordem), 7)

        # Regra da ordenação topológica: se u -> v, u DEVE vir antes de v
        self.assertLess(ordem.index("PreCalc"), ordem.index("Calc1"))
        self.assertLess(ordem.index("Calc1"), ordem.index("Calc2"))
        self.assertLess(ordem.index("GA"), ordem.index("AL"))
        self.assertLess(ordem.index("ED"), ordem.index("IA1"))
        self.assertLess(ordem.index("AL"), ordem.index("IA1"))

        ordem_dfs = self.g.ordenacao_topologica_dfs()
        self.assertIsNotNone(ordem_dfs)
        self.assertEqual(len(ordem_dfs), 7)
        self.assertLess(ordem_dfs.index("PreCalc"), ordem_dfs.index("Calc1"))
        self.assertLess(ordem_dfs.index("Calc1"), ordem_dfs.index("Calc2"))
        self.assertLess(ordem_dfs.index("GA"), ordem_dfs.index("AL"))
        self.assertLess(ordem_dfs.index("ED"), ordem_dfs.index("IA1"))
        self.assertLess(ordem_dfs.index("AL"), ordem_dfs.index("IA1"))

    def test_ordenacao_topologica_com_ciclo_retorna_none(self) -> None:
        self.g.adicionar_aresta("A", "B")
        self.g.adicionar_aresta("B", "C")
        self.g.adicionar_aresta("C", "A")

        self.assertIsNone(self.g.ordenacao_topologica())
        self.assertIsNone(self.g.ordenacao_topologica_dfs())
        self.assertIsNone(self.g.ordenacao_topologica_por_niveis())

    def test_ordenacao_topologica_por_niveis(self) -> None:
        self.g.adicionar_aresta("ED", "SO")
        self.g.adicionar_aresta("SO", "Redes")
        self.g.adicionar_aresta("ED", "BD")

        niveis = self.g.ordenacao_topologica_por_niveis()
        self.assertIsNotNone(niveis)
        self.assertEqual(len(niveis), 3)
        self.assertEqual(niveis[0], ["ED"])
        self.assertEqual(set(niveis[1]), {"SO", "BD"})
        self.assertEqual(niveis[2], ["Redes"])

    def test_fator_bloqueio_e_fecho_transitivo_inverso(self) -> None:
        self.g.adicionar_aresta("GA", "AL")
        self.g.adicionar_aresta("AL", "IA1")
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")

        self.assertEqual(self.g.fator_bloqueio("GA"), 3)
        self.assertEqual(self.g.fator_bloqueio("ED"), 2)
        self.assertEqual(self.g.fator_bloqueio("IA2"), 0)

        ancestrais_ia2 = set(self.g.consultar_pre_requisitos_transitivos("IA2"))
        self.assertEqual(ancestrais_ia2, {"IA1", "ED", "AL", "GA"})
        self.assertEqual(self.g.consultar_pre_requisitos_transitivos("ED"), [])


    def test_validacao_ignora_ciclo_preexistente_fora_da_aresta(self) -> None:
        # Ciclo forçado ED -> IA1 -> ED; a aresta GA -> AL não participa dele.
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "ED")
        self.g.adicionar_vertice("GA")
        self.g.adicionar_vertice("AL")

        self.assertEqual(self.g.validar_adicao_aresta("GA", "AL"), (True, None))
        self.assertFalse(self.g.validar_adicao_aresta("IA1", "ED")[0])

    def test_validacao_registra_passos_da_dfs_3_cores(self) -> None:
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")
        passos: list[tuple[str, str]] = []
        valido, ciclo = self.g.validar_adicao_aresta("IA2", "ED", passos=passos)
        self.assertFalse(valido)
        self.assertEqual(ciclo, ["ED", "IA1", "IA2", "ED"])
        self.assertEqual(passos[-1], ("RETORNO", "IA2->ED"))
        self.assertEqual(self.g.total_arestas(), 2)  # aresta temporária removida

    def test_validacao_nao_altera_o_grafo(self) -> None:
        self.g.adicionar_aresta("ED", "IA1")
        self.g.validar_adicao_aresta("IA1", "NovaDisciplina")
        self.assertFalse(self.g.contem_vertice("NovaDisciplina"))
        self.assertEqual(self.g.total_arestas(), 1)

    def test_detectar_ciclo_registra_passos(self) -> None:
        self.g.adicionar_aresta("ED", "IA1")
        self.g.adicionar_aresta("IA1", "IA2")
        self.g.adicionar_aresta("IA2", "ED")

        passos: list[tuple[str, str]] = []
        ciclo = self.g.detectar_ciclo(passos=passos)
        self.assertEqual(ciclo, ["ED", "IA1", "IA2", "ED"])
        self.assertEqual(
            passos,
            [("CINZA", "ED"), ("CINZA", "IA1"), ("CINZA", "IA2"), ("RETORNO", "IA2->ED")],
        )


if __name__ == "__main__":
    unittest.main()
