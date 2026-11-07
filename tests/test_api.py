import json
import os
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen

from src.api.server import criar_handler
from src.database.db_manager import DatabaseManager
from src.database.seed import executar_seed
from src.services.curriculo_service import CurriculoService

NOVA_DISCIPLINA = {
    "id": "TG",
    "codigo": "CMP410",
    "nome": "Teoria dos Grafos",
    "carga_horaria": 60,
    "periodo_sugerido": 3,
}


class TestApi(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self._tmp.name) / "api.db")
        self.db = DatabaseManager(self.db_path)
        executar_seed(self.db)

        handler = criar_handler(CurriculoService(self.db))
        handler.log_message = lambda *a, **k: None  # type: ignore[method-assign]
        self.servidor = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.base = f"http://127.0.0.1:{self.servidor.server_port}"
        threading.Thread(target=self.servidor.serve_forever, daemon=True).start()

    def tearDown(self) -> None:
        self.servidor.shutdown()
        self.servidor.server_close()
        self._tmp.cleanup()

    def chamar(self, metodo: str, rota: str, corpo: dict | None = None) -> tuple[int, Any]:
        dados = json.dumps(corpo).encode() if corpo is not None else None
        req = Request(self.base + rota, data=dados, method=metodo)
        req.add_header("Content-Type", "application/json")
        try:
            with urlopen(req) as resp:
                return resp.status, json.loads(resp.read())
        except HTTPError as e:
            with e:
                return e.code, json.loads(e.read())

    # ------------------------------------------------- Caso de Teste 1

    def test_caso_1_consulta_de_impacto(self) -> None:
        status, r = self.chamar("GET", f"/api/consulta?termo={quote('Estrutura de Dados')}")
        self.assertEqual(status, 200)
        self.assertEqual(r["id"], "ED")
        self.assertEqual(set(r["impacto"]), {"BD", "SO", "Redes", "IA1", "IA2"})
        self.assertEqual(r["fator_bloqueio"], 5)
        self.assertEqual(r["cadeias"]["Redes"], ["ED", "SO", "Redes"])
        self.assertEqual(r["cadeias"]["IA2"], ["ED", "IA1", "IA2"])

        for termo in ("ED", "ed", "CMP201", "estrutura de dados"):
            _, r = self.chamar("GET", f"/api/consulta?termo={quote(termo)}")
            self.assertEqual(r["id"], "ED", termo)

        status, r = self.chamar("GET", "/api/consulta?termo=Inexistente")
        self.assertEqual(status, 404)
        status, _ = self.chamar("GET", "/api/consulta?termo=")
        self.assertEqual(status, 400)

    def test_pesquisa_usa_so_o_grafo_em_memoria(self) -> None:
        # Sem o arquivo do banco, a pesquisa continua respondendo pela memória.
        os.remove(self.db_path)
        status, r = self.chamar("GET", "/api/consulta?termo=ED")
        self.assertEqual((status, r["fator_bloqueio"]), (200, 5))
        status, _ = self.chamar("GET", "/api/ordenacao")
        self.assertEqual(status, 200)
        status, _ = self.chamar(
            "POST", "/api/prerequisitos/validar", {"pre_requisito": "IA2", "dependente": "ED"}
        )
        self.assertEqual(status, 200)

    # ------------------------------------------------- Caso de Teste 2

    def test_caso_2_validacao_com_dfs_3_cores(self) -> None:
        status, r = self.chamar(
            "POST", "/api/prerequisitos/validar", {"pre_requisito": "IA2", "dependente": "ED"}
        )
        self.assertEqual(status, 200)
        self.assertFalse(r["valido"])
        self.assertEqual(r["ciclo"], ["ED", "IA1", "IA2", "ED"])
        self.assertEqual(r["passos"][-1], {"evento": "RETORNO", "alvo": "IA2->ED"})
        self.assertNotIn(("IA2", "ED"), self.db.listar_dependencias())

        status, r = self.chamar("POST", "/api/prerequisitos", {"pre_requisito": "IA2", "dependente": "ED"})
        self.assertEqual(status, 409)
        self.assertEqual(r["ciclo"], ["ED", "IA1", "IA2", "ED"])

        _, r = self.chamar(
            "POST", "/api/prerequisitos/validar", {"pre_requisito": "GA", "dependente": "CG"}
        )
        self.assertTrue(r["valido"])

    def test_adicionar_e_remover_prerequisito(self) -> None:
        status, g = self.chamar("POST", "/api/prerequisitos", {"pre_requisito": "GA", "dependente": "CG"})
        self.assertEqual(status, 201)
        self.assertIn({"origem": "GA", "destino": "CG"}, g["arestas"])
        self.assertIn(("GA", "CG"), self.db.listar_dependencias())

        status, _ = self.chamar("POST", "/api/prerequisitos", {"pre_requisito": "GA", "dependente": "CG"})
        self.assertEqual(status, 409)

        status, g = self.chamar("DELETE", "/api/prerequisitos/GA/CG")
        self.assertEqual(status, 200)
        self.assertNotIn({"origem": "GA", "destino": "CG"}, g["arestas"])
        status, _ = self.chamar("DELETE", "/api/prerequisitos/GA/CG")
        self.assertEqual(status, 404)

    def test_disciplina_desconhecida_nao_cria_vertice(self) -> None:
        status, _ = self.chamar(
            "POST", "/api/prerequisitos", {"pre_requisito": "Estrutura de Dadoss", "dependente": "SO"}
        )
        self.assertEqual(status, 404)
        _, g = self.chamar("GET", "/api/grafo")
        self.assertEqual(len(g["vertices"]), 13)

    # ------------------------------------------------------ Cadastro

    def test_crud_disciplina(self) -> None:
        status, g = self.chamar("POST", "/api/disciplinas", NOVA_DISCIPLINA)
        self.assertEqual(status, 201)
        self.assertIn("TG", [v["id"] for v in g["vertices"]])

        status, r = self.chamar("POST", "/api/disciplinas", {**NOVA_DISCIPLINA, "id": "TG2"})
        self.assertEqual((status, r["campo"]), (409, "codigo"))
        status, _ = self.chamar("POST", "/api/disciplinas", {**NOVA_DISCIPLINA, "id": "a b"})
        self.assertEqual(status, 400)

        status, g = self.chamar("PUT", "/api/disciplinas/TG", {**NOVA_DISCIPLINA, "carga_horaria": 80})
        tg = next(v for v in g["vertices"] if v["id"] == "TG")
        self.assertEqual((status, tg["carga_horaria"]), (200, 80))

        self.chamar("POST", "/api/prerequisitos", {"pre_requisito": "ED", "dependente": "TG"})
        _, resumo = self.chamar("GET", "/api/disciplinas/TG/remocao")
        self.assertEqual(resumo, {"prerequisitos": 1, "matriculas": 0})

        status, g = self.chamar("DELETE", "/api/disciplinas/TG")
        self.assertEqual(status, 200)
        self.assertNotIn("TG", [v["id"] for v in g["vertices"]])
        self.assertNotIn(("ED", "TG"), self.db.listar_dependencias())
        status, _ = self.chamar("DELETE", "/api/disciplinas/TG")
        self.assertEqual(status, 404)

    # ------------------------------------------------- Alunos

    def test_crud_aluno_e_matriculas(self) -> None:
        status, a = self.chamar("POST", "/api/alunos", {"matricula": "20259999", "nome": "Ana", "curso_id": 1})
        self.assertEqual(status, 201)
        aluno_id = a["id"]
        self.assertEqual(set(a["progresso"]["liberadas"]), {"ED", "GA", "PreCalc"})

        status, _ = self.chamar("POST", "/api/alunos", {"matricula": "20259999", "nome": "Outra", "curso_id": 1})
        self.assertEqual(status, 409)

        rota = f"/api/alunos/{aluno_id}/matriculas"
        status, r = self.chamar("POST", rota, {"disciplina_id": "SO", "semestre": "2025.1", "situacao": "EM_ANDAMENTO"})
        self.assertEqual((status, r["faltam"]), (409, ["ED"]))

        status, a = self.chamar(
            "POST", rota, {"disciplina_id": "ED", "semestre": "2025.1", "situacao": "APROVADO", "nota": 8}
        )
        self.assertEqual(status, 201)
        self.assertIn("SO", a["progresso"]["liberadas"])
        matricula_id = a["historico"][0]["id"]

        status, _ = self.chamar("POST", rota, {"disciplina_id": "GA", "semestre": "2025.3", "situacao": "PENDENTE"})
        self.assertEqual(status, 400)

        status, a = self.chamar(
            "PUT", f"/api/matriculas/{matricula_id}",
            {"disciplina_id": "ED", "semestre": "2025.1", "situacao": "REPROVADO", "nota": 4},
        )
        self.assertEqual(status, 200)
        self.assertNotIn("SO", a["progresso"]["liberadas"])

        status, a = self.chamar("DELETE", f"/api/matriculas/{matricula_id}")
        self.assertEqual((status, a["historico"]), (200, []))

        _, a = self.chamar("PUT", f"/api/alunos/{aluno_id}", {"matricula": "20259999", "nome": "Ana Lima", "curso_id": 1})
        self.assertEqual(a["nome"], "Ana Lima")
        status, _ = self.chamar("DELETE", f"/api/alunos/{aluno_id}")
        self.assertEqual(status, 200)
        _, alunos = self.chamar("GET", "/api/alunos")
        self.assertEqual(len(alunos), 3)

    def test_restaurar(self) -> None:
        self.chamar("DELETE", "/api/disciplinas/ED")
        status, g = self.chamar("POST", "/api/restaurar")
        self.assertEqual((status, len(g["vertices"])), (200, 13))

    def test_ordenacao(self) -> None:
        _, o = self.chamar("GET", "/api/ordenacao")
        self.assertEqual(len(o["kahn"]), 13)
        self.assertEqual(len(o["niveis"]), 4)

    def test_json_invalido(self) -> None:
        req = Request(self.base + "/api/prerequisitos", data=b"{", method="POST")
        with self.assertRaises(HTTPError) as ctx:
            urlopen(req)
        with ctx.exception:
            self.assertEqual(ctx.exception.code, 400)

    def test_curso_com_tipo_invalido_retorna_erro_de_campo(self) -> None:
        for curso in ([], {}, True, "1", 1.0):
            with self.subTest(curso=curso):
                status, r = self.chamar(
                    "POST", "/api/alunos",
                    {"matricula": "20269999", "nome": "Teste", "curso_id": curso},
                )
                self.assertEqual((status, r["campo"]), (400, "curso_id"))
        _, alunos = self.chamar("GET", "/api/alunos")
        self.assertEqual(len(alunos), 3)

    def test_tamanho_do_corpo_invalido_nao_trava_servidor(self) -> None:
        from http.client import HTTPConnection

        for tamanho in ("-1", "invalido"):
            with self.subTest(tamanho=tamanho):
                conexao = HTTPConnection("127.0.0.1", self.servidor.server_port, timeout=2)
                try:
                    conexao.request("POST", "/api/alunos", headers={"Content-Length": tamanho})
                    resposta = conexao.getresponse()
                    self.assertEqual(resposta.status, 400)
                    self.assertIn("Content-Length", json.loads(resposta.read())["erro"])
                finally:
                    conexao.close()
        status, _ = self.chamar("GET", "/api/grafo")
        self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
