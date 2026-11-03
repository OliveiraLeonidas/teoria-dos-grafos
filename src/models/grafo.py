from collections import deque
from typing import Any
import unicodedata


def _normalizar_texto(texto: str) -> str:
    texto_nfd = unicodedata.normalize("NFD", texto.strip().lower())
    return "".join(c for c in texto_nfd if unicodedata.category(c) != "Mn")


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
        resolvido = self.resolver_vertice(id_vertice)
        return self.vertices.get(resolvido) if resolvido is not None else None

    def contem_vertice(self, id_vertice: str) -> bool:
        return self.resolver_vertice(id_vertice) is not None

    def resolver_vertice(self, termo: str) -> str | None:
        """
        Resolve o identificador canônico de um vértice a partir do ID exato,
        ID sem distinção de maiúsculas/minúsculas, rótulo (nome da disciplina)
        ou código acadêmico (ex: 'ED', 'ed', 'Estrutura de Dados', 'CMP201').
        """
        if not termo:
            return None
        if termo in self.vertices:
            return termo

        termo_norm = _normalizar_texto(termo)
        for v_id, vertice in self.vertices.items():
            if _normalizar_texto(v_id) == termo_norm:
                return v_id
            if _normalizar_texto(vertice.rotulo) == termo_norm:
                return v_id
            codigo = str(vertice.atributos.get("codigo", ""))
            if codigo and _normalizar_texto(codigo) == termo_norm:
                return v_id

        return None

    def adicionar_aresta(self, pre_requisito: str, dependente: str) -> None:
        u = self.resolver_vertice(pre_requisito) or pre_requisito
        v = self.resolver_vertice(dependente) or dependente

        if u not in self.vertices:
            self.adicionar_vertice(u)
        if v not in self.vertices:
            self.adicionar_vertice(v)

        if v not in self.adjacencias[u]:
            self.adjacencias[u].append(v)

        if u not in self.antecessores[v]:
            self.antecessores[v].append(u)

    def remover_aresta(self, pre_requisito: str, dependente: str) -> bool:
        u = self.resolver_vertice(pre_requisito) or pre_requisito
        v = self.resolver_vertice(dependente) or dependente

        removido = False
        if u in self.adjacencias and v in self.adjacencias[u]:
            self.adjacencias[u].remove(v)
            removido = True
        if v in self.antecessores and u in self.antecessores[v]:
            self.antecessores[v].remove(u)
            removido = True
        return removido

    def obter_sucessores(self, id_vertice: str) -> list[str]:
        u = self.resolver_vertice(id_vertice) or id_vertice
        return list(self.adjacencias.get(u, []))

    def obter_antecessores(self, id_vertice: str) -> list[str]:
        u = self.resolver_vertice(id_vertice) or id_vertice
        return list(self.antecessores.get(u, []))

    def total_vertices(self) -> int:
        return len(self.vertices)

    def total_arestas(self) -> int:
        return sum(len(destinos) for destinos in self.adjacencias.values())

    def grau_saida(self, id_vertice: str) -> int:
        u = self.resolver_vertice(id_vertice) or id_vertice
        return len(self.adjacencias.get(u, []))

    def grau_entrada(self, id_vertice: str) -> int:
        u = self.resolver_vertice(id_vertice) or id_vertice
        return len(self.antecessores.get(u, []))

    def consultar_impacto(self, id_vertice: str) -> list[str]:
        """
        Realiza uma Busca em Profundidade (DFS) a partir de id_vertice
        para identificar todas as disciplinas que dependem direta ou
        indiretamente da conclusão desta matéria (fecho transitivo direto).

        Retorna a lista de identificadores das disciplinas impactadas
        na ordem de visita da DFS (excluindo o vértice de partida).
        """
        origem = self.resolver_vertice(id_vertice)
        if origem is None:
            return []

        visitados: set[str] = {origem}
        impacto: list[str] = []

        def _dfs(u: str) -> None:
            for vizinho in self.adjacencias.get(u, []):
                if vizinho not in visitados:
                    visitados.add(vizinho)
                    impacto.append(vizinho)
                    _dfs(vizinho)

        _dfs(origem)
        return impacto

    def fator_bloqueio(self, id_vertice: str) -> int:
        """
        Retorna o Fator de Bloqueio (Blocking Factor - BF(u)), definido como
        a cardinalidade do fecho transitivo direto |Γ+(u)|.
        """
        return len(self.consultar_impacto(id_vertice))

    def consultar_pre_requisitos_transitivos(self, id_vertice: str) -> list[str]:
        """
        Realiza uma Busca em Profundidade (DFS) reversa sobre a lista de
        antecessores a partir de id_vertice para identificar toda a cadeia
        prévia exigida direta ou indiretamente para cursar a matéria
        (Fecho Transitivo Inverso Γ-(u)).
        """
        destino = self.resolver_vertice(id_vertice)
        if destino is None:
            return []

        visitados: set[str] = {destino}
        ancestrais: list[str] = []

        def _dfs_reverso(v: str) -> None:
            for pre_req in self.antecessores.get(v, []):
                if pre_req not in visitados:
                    visitados.add(pre_req)
                    ancestrais.append(pre_req)
                    _dfs_reverso(pre_req)

        _dfs_reverso(destino)
        return ancestrais

    def buscar_caminho_dfs(
        self, origem: str, destino: str, visitados: set[str] | None = None
    ) -> list[str] | None:
        """
        Busca um caminho direcionado de 'origem' até 'destino' utilizando DFS.
        Retorna a lista de identificadores formando o caminho [origem, ..., destino],
        ou None caso não exista caminho direcionado entre os dois vértices.
        """
        if visitados is None:
            u = self.resolver_vertice(origem)
            v = self.resolver_vertice(destino)
            if u is None or v is None:
                return None
            origem, destino = u, v
            visitados = set()
        else:
            if origem not in self.vertices or destino not in self.vertices:
                return None

        if origem == destino:
            return [origem]

        visitados.add(origem)

        for vizinho in self.adjacencias.get(origem, []):
            if vizinho not in visitados:
                caminho = self.buscar_caminho_dfs(vizinho, destino, visitados)
                if caminho is not None:
                    return [origem] + caminho

        return None

    @staticmethod
    def _rotacionar_ciclo(ciclo: list[str], inicio_preferido: str) -> list[str]:
        """
        Rotaciona um ciclo fechado [v0, v1, ..., vk, v0] para que comece
        e termine no vértice 'inicio_preferido', preservando a direção das arestas.
        """
        nucleo = ciclo[:-1]
        if inicio_preferido not in nucleo:
            return ciclo
        idx = nucleo.index(inicio_preferido)
        rotacionado = nucleo[idx:] + nucleo[:idx]
        rotacionado.append(inicio_preferido)
        return rotacionado

    def detectar_ciclo(self, vertice_referencia: str | None = None) -> list[str] | None:
        """
        Verifica se o dígrafo contém ciclos utilizando Busca em Profundidade (DFS)
        com o algoritmo de coloração de 3 cores:
          - BRANCO (0): Vértice não visitado
          - CINZA  (1): Vértice em processamento (na pilha de recursão / caminho atual)
          - PRETO  (2): Vértice totalmente explorado

        Retorna o caminho fechado do ciclo (ex: ['ED', 'IA1', 'IA2', 'ED'])
        ou None caso o grafo seja um Grafo Acíclico Direcionado (DAG).
        """
        BRANCO, CINZA, PRETO = 0, 1, 2
        cor: dict[str, int] = {v: BRANCO for v in self.vertices}
        pai: dict[str, str | None] = {v: None for v in self.vertices}
        ciclo_encontrado: list[str] | None = None

        ref = self.resolver_vertice(vertice_referencia) if vertice_referencia else None

        def _dfs(u: str) -> bool:
            nonlocal ciclo_encontrado
            cor[u] = CINZA

            for vizinho in self.adjacencias.get(u, []):
                # Se o vizinho é CINZA, detectamos uma aresta de retorno (back-edge)
                if cor.get(vizinho, BRANCO) == CINZA:
                    caminho = [vizinho]
                    atual = u
                    while atual != vizinho and atual is not None:
                        caminho.append(atual)
                        atual = pai.get(atual)
                    caminho.append(vizinho)
                    caminho.reverse()

                    # Normaliza o início do ciclo para o vértice de referência
                    # ou para o vértice do ciclo que aparece primeiro no cadastro
                    nucleo = caminho[:-1]
                    if ref and ref in nucleo:
                        caminho = self._rotacionar_ciclo(caminho, ref)
                    else:
                        ordem_cadastro = list(self.vertices.keys())
                        primeiro = min(nucleo, key=lambda x: ordem_cadastro.index(x))
                        caminho = self._rotacionar_ciclo(caminho, primeiro)

                    ciclo_encontrado = caminho
                    return True

                elif cor.get(vizinho, BRANCO) == BRANCO:
                    pai[vizinho] = u
                    if _dfs(vizinho):
                        return True

            cor[u] = PRETO
            return False

        ordem_vertices = list(self.vertices.keys())
        if ref and ref in cor:
            ordem_vertices.remove(ref)
            ordem_vertices.insert(0, ref)

        for v in ordem_vertices:
            if cor[v] == BRANCO:
                if _dfs(v):
                    return ciclo_encontrado

        return None

    def validar_adicao_aresta(
        self, pre_requisito: str, dependente: str
    ) -> tuple[bool, list[str] | None]:
        """
        Verifica preventivamente se a inclusão da aresta (pre_requisito -> dependente)
        violaria a propriedade acíclica (criando dependência circular/ciclo),
        executando o algoritmo DFS de 3 cores (detectar_ciclo).

        Retorna:
          (True, None) caso a aresta seja segura.
          (False, ciclo) contendo o caminho fechado caso crie um ciclo.
        """
        u = self.resolver_vertice(pre_requisito) or pre_requisito
        v = self.resolver_vertice(dependente) or dependente

        if u == v:
            return False, [u, v]

        # Se algum dos vértices ainda não existe no grafo e u != v,
        # uma única aresta nova entre eles jamais fechará ciclo se não havia ciclo antes.
        u_existia = u in self.vertices
        v_existia = v in self.vertices
        aresta_existia = u_existia and v_existia and (v in self.adjacencias.get(u, []))

        self.adicionar_aresta(u, v)
        try:
            ciclo = self.detectar_ciclo(vertice_referencia=v)
        finally:
            if not aresta_existia:
                self.remover_aresta(u, v)
            if not u_existia:
                self.vertices.pop(u, None)
                self.adjacencias.pop(u, None)
                self.antecessores.pop(u, None)
            if not v_existia:
                self.vertices.pop(v, None)
                self.adjacencias.pop(v, None)
                self.antecessores.pop(v, None)

        if ciclo is not None:
            return False, ciclo

        return True, None

    def adicionar_aresta_segura(
        self, pre_requisito: str, dependente: str
    ) -> tuple[bool, list[str] | None]:
        """
        Tenta adicionar a aresta direcionada apenas se ela não gerar ciclo.
        Se for válida, insere no grafo e retorna (True, None).
        Se criar ciclo, aborta a inserção e retorna (False, ciclo_detectado).
        """
        valido, ciclo = self.validar_adicao_aresta(pre_requisito, dependente)
        if not valido:
            return False, ciclo

        self.adicionar_aresta(pre_requisito, dependente)
        return True, None

    def ordenacao_topologica(self) -> list[str] | None:
        """
        Retorna uma sequência linear de vértices (Ordenação Topológica)
        onde cada matéria pré-requisito aparece antes de todas as suas dependentes.
        Utiliza o Algoritmo de Kahn baseado nos graus de entrada (in-degrees).

        Retorna:
          list[str]: Sequência válida de IDs das disciplinas para conclusão do curso.
          None: Se o grafo contiver ciclo (não for um DAG).
        """
        graus_entrada = {v: self.grau_entrada(v) for v in self.vertices}
        # Fila inicial com disciplinas de grau de entrada 0 (sem pré-requisitos)
        iniciais = sorted(
            [v for v, grau in graus_entrada.items() if grau == 0],
            key=lambda x: (self.vertices[x].atributos.get("periodo", 1), x),
        )
        fila: deque[str] = deque(iniciais)

        ordenacao: list[str] = []

        while fila:
            u = fila.popleft()
            ordenacao.append(u)

            novos_habilitados = []
            for vizinho in self.adjacencias.get(u, []):
                graus_entrada[vizinho] -= 1
                if graus_entrada[vizinho] == 0:
                    novos_habilitados.append(vizinho)

            novos_habilitados.sort(
                key=lambda x: (self.vertices[x].atributos.get("periodo", 1), x)
            )
            fila.extend(novos_habilitados)

        if len(ordenacao) != len(self.vertices):
            return None  # Ciclo detectado (impossível ordenar topologicamente)

        return ordenacao

    def ordenacao_topologica_dfs(self) -> list[str] | None:
        """
        Gera uma Ordenação Topológica utilizando Busca em Profundidade (DFS)
        baseada na pós-ordem reversa (tempo de finalização PRETO da DFS de 3 cores).

        Retorna:
          list[str]: Sequência válida de IDs das disciplinas.
          None: Se o grafo contiver ciclo (aresta de retorno para vértice CINZA).
        """
        BRANCO, CINZA, PRETO = 0, 1, 2
        cor: dict[str, int] = {v: BRANCO for v in self.vertices}
        pos_ordem: list[str] = []

        def _dfs(u: str) -> bool:
            cor[u] = CINZA
            for vizinho in self.adjacencias.get(u, []):
                if cor.get(vizinho, BRANCO) == CINZA:
                    return False  # Ciclo detectado
                if cor.get(vizinho, BRANCO) == BRANCO:
                    if not _dfs(vizinho):
                        return False
            cor[u] = PRETO
            pos_ordem.append(u)
            return True

        vertices_ordenados = sorted(
            self.vertices.keys(),
            key=lambda x: (self.vertices[x].atributos.get("periodo", 1), x),
        )
        for v in vertices_ordenados:
            if cor[v] == BRANCO:
                if not _dfs(v):
                    return None

        pos_ordem.reverse()
        return pos_ordem

    def ordenacao_topologica_por_niveis(self) -> list[list[str]] | None:
        """
        Agrupa os vértices em camadas/níveis topológicos (semestres sugeridos).
        Nível 1: Matérias sem pré-requisitos (grau de entrada 0).
        Nível k: Matérias cujos pré-requisitos foram todos satisfeitos em níveis anteriores.

        Retorna uma lista de listas com os IDs das disciplinas por nível, ou None se houver ciclo.
        """
        graus_entrada = {v: self.grau_entrada(v) for v in self.vertices}
        atuais = [v for v, grau in graus_entrada.items() if grau == 0]
        atuais.sort(key=lambda x: (self.vertices[x].atributos.get("periodo", 1), x))

        niveis: list[list[str]] = []
        processados = 0

        while atuais:
            niveis.append(atuais)
            processados += len(atuais)
            proximos: list[str] = []

            for u in atuais:
                for vizinho in self.adjacencias.get(u, []):
                    graus_entrada[vizinho] -= 1
                    if graus_entrada[vizinho] == 0:
                        proximos.append(vizinho)

            proximos.sort(key=lambda x: (self.vertices[x].atributos.get("periodo", 1), x))
            atuais = proximos

        if processados != len(self.vertices):
            return None

        return niveis
