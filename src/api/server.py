"""
API HTTP do sistema de disciplinas (somente biblioteca padrão).

Expõe para o frontend os algoritmos de src/models/grafo.py e o cadastro
de disciplinas, pré-requisitos, alunos e histórico. O frontend não reimplementa nenhum algoritmo.

O grafo (lista de adjacência) é carregado do SQLite uma vez e fica em memória.
Toda pesquisa (consulta de impacto, ciclos, ordenação) roda só sobre essa
estrutura. O SQLite é usado apenas para gravar as alterações do cadastro;
depois de cada gravação o grafo em memória é recarregado.

Execução:  python3 main.py --api [--porta 8000]
"""

import json
import mimetypes
import re
import threading
from collections.abc import Callable
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from ..models.grafo import GrafoDirecionado
from ..services.curriculo_service import CurriculoService
from ..services.erros import Conflito, ErroNegocio, ErroValidacao, NaoEncontrado

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
LIMITE_CORPO_BYTES = 64 * 1024

Resposta = tuple[int, Any]

STATUS_ERRO: dict[type[ErroNegocio], HTTPStatus] = {
    ErroValidacao: HTTPStatus.BAD_REQUEST,
    NaoEncontrado: HTTPStatus.NOT_FOUND,
    Conflito: HTTPStatus.CONFLICT,
}


# ---------------------------------------------------------------------------
# Serialização do grafo
# ---------------------------------------------------------------------------


def _vertice_json(grafo: GrafoDirecionado, v_id: str) -> dict[str, Any]:
    v = grafo.vertices[v_id]
    return {
        "id": v_id,
        "rotulo": v.rotulo,
        "codigo": v.atributos.get("codigo", v_id),
        "carga_horaria": v.atributos.get("carga_horaria"),
        "periodo": v.atributos.get("periodo"),
        "grau_entrada": grafo.grau_entrada(v_id),
        "grau_saida": grafo.grau_saida(v_id),
    }


def serializar_grafo(grafo: GrafoDirecionado) -> dict[str, Any]:
    ciclo = grafo.detectar_ciclo()
    return {
        "vertices": [_vertice_json(grafo, v) for v in grafo.vertices],
        "arestas": [
            {"origem": u, "destino": v} for u, destinos in grafo.adjacencias.items() for v in destinos
        ],
        "dag": ciclo is None,
        "ciclo": ciclo,
    }


def _id(m: re.Match, nome: str = "id") -> str:
    return unquote(m[nome])


class Estado:
    """Grafo em memória usado por todas as pesquisas."""

    def __init__(self, service: CurriculoService) -> None:
        self.service = service
        self.grafo = service.carregar_grafo_do_banco()

    def recarregar(self) -> None:
        self.grafo = self.service.carregar_grafo_do_banco()


Handler = Callable[[Estado, re.Match, dict, dict[str, str]], Resposta]


def _grafo(e: Estado) -> dict[str, Any]:
    return serializar_grafo(e.grafo)


# ---------------------------------------------------------------------------
# Rotas de pesquisa (somente o grafo em memória)
# ---------------------------------------------------------------------------


def rota_grafo(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, _grafo(e)


def rota_consulta(e: Estado, _m: re.Match, _c: dict, q: dict) -> Resposta:
    """Caso de Teste 1: consulta de impacto por DFS a partir de uma disciplina."""
    termo = (q.get("termo") or "").strip()
    if not termo:
        raise ErroValidacao("Informe a sigla, o código ou o nome da disciplina", campo="termo")
    g = e.grafo
    v_id = g.resolver_vertice(termo)
    if v_id is None:
        raise NaoEncontrado(f"Disciplina '{termo}' não encontrada no grafo", campo="termo")
    impacto = g.consultar_impacto(v_id)
    return HTTPStatus.OK, {
        **_vertice_json(g, v_id),
        "termo": termo,
        "antecessores": g.obter_antecessores(v_id),
        "sucessores": g.obter_sucessores(v_id),
        "pre_requisitos_transitivos": g.consultar_pre_requisitos_transitivos(v_id),
        "impacto": impacto,
        "fator_bloqueio": len(impacto),
        "cadeias": {dep: g.buscar_caminho_dfs(v_id, dep) for dep in impacto},
    }


def rota_validar(e: Estado, _m: re.Match, corpo: dict, _q: dict) -> Resposta:
    """Caso de Teste 2: DFS de 3 cores com a aresta proposta, sem gravar."""
    return HTTPStatus.OK, e.service.validar_prerequisito(corpo, e.grafo)


def rota_ciclos(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    passos: list[tuple[str, str]] = []
    ciclo = e.grafo.detectar_ciclo(passos=passos)
    return HTTPStatus.OK, {"ciclo": ciclo, "passos": [{"evento": ev, "alvo": a} for ev, a in passos]}


def rota_ordenacao(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    g = e.grafo
    return HTTPStatus.OK, {
        "kahn": g.ordenacao_topologica(),
        "dfs": g.ordenacao_topologica_dfs(),
        "niveis": g.ordenacao_topologica_por_niveis(),
    }


def rota_resumo_remocao(e: Estado, m: re.Match, _c: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.resumo_remocao_disciplina(_id(m), e.grafo)


# ---------------------------------------------------------------------------
# Rotas de cadastro (gravam no SQLite e recarregam o grafo em memória)
# ---------------------------------------------------------------------------


def rota_criar_disciplina(e: Estado, _m: re.Match, corpo: dict, _q: dict) -> Resposta:
    e.service.criar_disciplina(corpo, e.grafo)
    e.recarregar()
    return HTTPStatus.CREATED, _grafo(e)


def rota_atualizar_disciplina(e: Estado, m: re.Match, corpo: dict, _q: dict) -> Resposta:
    e.service.atualizar_disciplina(_id(m), corpo, e.grafo)
    e.recarregar()
    return HTTPStatus.OK, _grafo(e)


def rota_remover_disciplina(e: Estado, m: re.Match, _c: dict, _q: dict) -> Resposta:
    e.service.remover_disciplina(_id(m))
    e.recarregar()
    return HTTPStatus.OK, _grafo(e)


def rota_criar_prerequisito(e: Estado, _m: re.Match, corpo: dict, _q: dict) -> Resposta:
    e.service.adicionar_prerequisito(corpo, e.grafo)
    e.recarregar()
    return HTTPStatus.CREATED, _grafo(e)


def rota_remover_prerequisito(e: Estado, m: re.Match, _c: dict, _q: dict) -> Resposta:
    e.service.remover_prerequisito(_id(m, "u"), _id(m, "v"))
    e.recarregar()
    return HTTPStatus.OK, _grafo(e)


def rota_cursos(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.db_manager.listar_cursos()


def rota_alunos(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.listar_alunos_detalhados(e.grafo)


def rota_criar_aluno(e: Estado, _m: re.Match, corpo: dict, _q: dict) -> Resposta:
    return HTTPStatus.CREATED, e.service.criar_aluno(corpo, e.grafo)


def rota_atualizar_aluno(e: Estado, m: re.Match, corpo: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.atualizar_aluno(int(m["id"]), corpo, e.grafo)


def rota_remover_aluno(e: Estado, m: re.Match, _c: dict, _q: dict) -> Resposta:
    e.service.remover_aluno(int(m["id"]))
    return HTTPStatus.OK, {"removido": int(m["id"])}


def rota_criar_matricula(e: Estado, m: re.Match, corpo: dict, _q: dict) -> Resposta:
    return HTTPStatus.CREATED, e.service.criar_matricula(int(m["id"]), corpo, e.grafo)


def rota_atualizar_matricula(e: Estado, m: re.Match, corpo: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.atualizar_matricula(int(m["id"]), corpo, e.grafo)


def rota_remover_matricula(e: Estado, m: re.Match, _c: dict, _q: dict) -> Resposta:
    return HTTPStatus.OK, e.service.remover_matricula(int(m["id"]), e.grafo)


def rota_restaurar(e: Estado, _m: re.Match, _c: dict, _q: dict) -> Resposta:
    e.service.restaurar_dados_iniciais()
    e.recarregar()
    return HTTPStatus.OK, _grafo(e)


ID = r"(?P<id>[^/]+)"
ARESTA = r"(?P<u>[^/]+)/(?P<v>[^/]+)"
NUM = r"(?P<id>\d+)"

ROTAS: list[tuple[str, re.Pattern[str], Handler]] = [
    (metodo, re.compile(f"^/api/{caminho}$"), handler)
    for metodo, caminho, handler in [
        ("GET", "grafo", rota_grafo),
        ("GET", "consulta", rota_consulta),
        ("POST", "prerequisitos/validar", rota_validar),
        ("GET", "ciclos", rota_ciclos),
        ("GET", "ordenacao", rota_ordenacao),
        ("POST", "disciplinas", rota_criar_disciplina),
        ("GET", f"disciplinas/{ID}/remocao", rota_resumo_remocao),
        ("PUT", f"disciplinas/{ID}", rota_atualizar_disciplina),
        ("DELETE", f"disciplinas/{ID}", rota_remover_disciplina),
        ("POST", "prerequisitos", rota_criar_prerequisito),
        ("DELETE", f"prerequisitos/{ARESTA}", rota_remover_prerequisito),
        ("GET", "cursos", rota_cursos),
        ("GET", "alunos", rota_alunos),
        ("POST", "alunos", rota_criar_aluno),
        ("PUT", f"alunos/{NUM}", rota_atualizar_aluno),
        ("DELETE", f"alunos/{NUM}", rota_remover_aluno),
        ("POST", f"alunos/{NUM}/matriculas", rota_criar_matricula),
        ("PUT", f"matriculas/{NUM}", rota_atualizar_matricula),
        ("DELETE", f"matriculas/{NUM}", rota_remover_matricula),
        ("POST", "restaurar", rota_restaurar),
    ]
]


# ---------------------------------------------------------------------------
# Servidor
# ---------------------------------------------------------------------------


class _ErroHttp(Exception):
    def __init__(self, status: HTTPStatus, mensagem: str) -> None:
        super().__init__(mensagem)
        self.status = status


def criar_handler(service: CurriculoService) -> type[BaseHTTPRequestHandler]:
    estado = Estado(service)
    # Uma operação por vez: o grafo em memória é compartilhado entre as threads
    # e validar + gravar (ex.: checar ciclo e inserir a aresta) precisa ser atômico.
    lock = threading.Lock()

    class ApiHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._despachar("GET")

        def do_POST(self) -> None:
            self._despachar("POST")

        def do_PUT(self) -> None:
            self._despachar("PUT")

        def do_DELETE(self) -> None:
            self._despachar("DELETE")

        def _despachar(self, metodo: str) -> None:
            url = urlparse(self.path)
            caminho = url.path
            query = {k: v[0] for k, v in parse_qs(url.query).items()}
            if not caminho.startswith("/api/"):
                if metodo == "GET":
                    self._servir_frontend(caminho)
                else:
                    self._enviar_json(HTTPStatus.NOT_FOUND, {"erro": "Rota não encontrada"})
                return

            try:
                for metodo_rota, padrao, handler in ROTAS:
                    m = padrao.match(caminho)
                    if m and metodo_rota == metodo:
                        corpo = self._ler_corpo()
                        with lock:
                            status, payload = handler(estado, m, corpo, query)
                        self._enviar_json(status, payload)
                        return
                self._enviar_json(HTTPStatus.NOT_FOUND, {"erro": "Rota não encontrada"})
            except ErroNegocio as e:
                self._enviar_json(STATUS_ERRO[type(e)], {"erro": e.mensagem, **e.detalhes})
            except _ErroHttp as e:
                self._enviar_json(e.status, {"erro": str(e)})

        def _ler_corpo(self) -> dict[str, Any]:
            try:
                tamanho = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                raise _ErroHttp(HTTPStatus.BAD_REQUEST, "Content-Length inválido") from None
            if tamanho < 0:
                raise _ErroHttp(HTTPStatus.BAD_REQUEST, "Content-Length inválido")
            if tamanho == 0:
                return {}
            if tamanho > LIMITE_CORPO_BYTES:
                raise _ErroHttp(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Corpo muito grande")
            try:
                corpo = json.loads(self.rfile.read(tamanho))
            except (json.JSONDecodeError, UnicodeDecodeError):
                raise _ErroHttp(HTTPStatus.BAD_REQUEST, "JSON inválido") from None
            if not isinstance(corpo, dict):
                raise _ErroHttp(HTTPStatus.BAD_REQUEST, "O corpo deve ser um objeto JSON")
            return corpo

        def _enviar_json(self, status: int, payload: Any) -> None:
            self.send_response(status)
            if status == HTTPStatus.NO_CONTENT:
                self.end_headers()
                return
            dados = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        def _servir_frontend(self, caminho: str) -> None:
            """Serve o build do frontend (frontend/dist), se existir."""
            if not FRONTEND_DIST.is_dir():
                self._enviar_json(
                    HTTPStatus.NOT_FOUND,
                    {"erro": "Frontend não compilado. Rode 'npm run build' em frontend/."},
                )
                return
            raiz = FRONTEND_DIST.resolve()
            alvo = (raiz / unquote(caminho).lstrip("/")).resolve()
            if not alvo.is_relative_to(raiz) or not alvo.is_file():
                alvo = raiz / "index.html"  # fallback de SPA
            dados = alvo.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header(
                "Content-Type", mimetypes.guess_type(alvo.name)[0] or "application/octet-stream"
            )
            self.send_header("Content-Length", str(len(dados)))
            self.end_headers()
            self.wfile.write(dados)

        def log_message(self, formato: str, *args: Any) -> None:
            print(f"[API] {formato % args}")

    return ApiHandler


def iniciar_servidor(porta: int = 8000, service: CurriculoService | None = None) -> None:
    # Com uma thread só, uma conexão ociosa (pré-conexão do navegador) trava as demais.
    servidor = ThreadingHTTPServer(
        ("127.0.0.1", porta), criar_handler(service or CurriculoService())
    )
    print(f"API do grafo curricular em http://127.0.0.1:{porta}/api/grafo")
    if FRONTEND_DIST.is_dir():
        print(f"Interface web em http://127.0.0.1:{porta}/")
    print("Ctrl+C para encerrar.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando API.")
    finally:
        servidor.server_close()
