from typing import Any


class Vertice:
    def __init__(
        self, id_vertice: str, rotulo: str | None = None, **atributos: Any
    ) -> None:
        self.id: str = id_vertice
        self.rotulo: str = rotulo if rotulo is not None else id_vertice
        self.atributos: dict[str, Any] = atributos

    def __repr__(self) -> str:
        return f"Vertice(id='{self.id}', rotulo='{self.rotulo}')"

    def __str__(self) -> str:
        return self.rotulo

    def __eq__(self, outro: object) -> bool:
        if isinstance(outro, Vertice):
            return self.id == outro.id
        if isinstance(outro, str):
            return self.id == outro
        return False

    def __hash__(self) -> int:
        return hash(self.id)


class GrafoDirecionado:
    def __init__(self) -> None:
        self.vertices: dict[str, Vertice] = {}
        self.adjacencias: dict[str, list[str]] = {}
        self.antecessores: dict[str, list[str]] = {}

    def adicionar_vertice(
        self, id_vertice: str, rotulo: str | None = None, **atributos: Any
    ) -> Vertice:
        if id_vertice not in self.vertices:
            v = Vertice(id_vertice, rotulo, **atributos)
            self.vertices[id_vertice] = v
            self.adjacencias[id_vertice] = []
            self.antecessores[id_vertice] = []
            return v
        if rotulo is not None:
            self.vertices[id_vertice].rotulo = rotulo
        self.vertices[id_vertice].atributos.update(atributos)
        return self.vertices[id_vertice]

    def obter_vertice(self, id_vertice: str) -> Vertice | None:
        return self.vertices.get(id_vertice)

    def contem_vertice(self, id_vertice: str) -> bool:
        return id_vertice in self.vertices

    def adicionar_aresta(self, pre_requisito: str, dependente: str) -> None:
        if pre_requisito not in self.vertices:
            self.adicionar_vertice(pre_requisito)
        if dependente not in self.vertices:
            self.adicionar_vertice(dependente)

        if dependente not in self.adjacencias[pre_requisito]:
            self.adjacencias[pre_requisito].append(dependente)

        if pre_requisito not in self.antecessores[dependente]:
            self.antecessores[dependente].append(pre_requisito)

    def remover_aresta(self, pre_requisito: str, dependente: str) -> bool:
        removido = False
        if (
            pre_requisito in self.adjacencias
            and dependente in self.adjacencias[pre_requisito]
        ):
            self.adjacencias[pre_requisito].remove(dependente)
            removido = True
        if (
            dependente in self.antecessores
            and pre_requisito in self.antecessores[dependente]
        ):
            self.antecessores[dependente].remove(pre_requisito)
            removido = True
        return removido

    def obter_sucessores(self, id_vertice: str) -> list[str]:
        return list(self.adjacencias.get(id_vertice, []))

    def obter_antecessores(self, id_vertice: str) -> list[str]:
        return list(self.antecessores.get(id_vertice, []))

    def total_vertices(self) -> int:
        return len(self.vertices)

    def total_arestas(self) -> int:
        return sum(len(destinos) for destinos in self.adjacencias.values())

    def grau_saida(self, id_vertice: str) -> int:
        return len(self.adjacencias.get(id_vertice, []))

    def grau_entrada(self, id_vertice: str) -> int:
        return len(self.antecessores.get(id_vertice, []))
