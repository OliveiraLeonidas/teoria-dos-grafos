import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from src.database.seed import executar_seed
from src.models.grafo import GrafoDirecionado
from src.services.curriculo_service import CurriculoService


def exibir_estrutura_grafo(
    service: CurriculoService, grafo: GrafoDirecionado | None = None
) -> None:
    if grafo is None:
        grafo = service.carregar_grafo_do_banco()

    print("=" * 70)
    print("ESTRUTURA BASICA DO GRAFO DE DISCIPLINAS (DIGRAFO)")
    print("=" * 70)
    print(f"Total de Vertices (|V|): {grafo.total_vertices()}")
    print(f"Total de Arestas  (|E|): {grafo.total_arestas()}\n")

    print("-" * 70)
    print("VERTICES CADASTRADOS (DISCIPLINAS):")
    print("-" * 70)
    for v_id, v in grafo.vertices.items():
        periodo = v.atributos.get("periodo", "-")
        ch = v.atributos.get("carga_horaria", "-")
        codigo = v.atributos.get("codigo", v_id)
        print(
            f"[{v_id:7}] {v.rotulo:28} | Cod: {codigo:6} | {periodo}o Periodo | {ch}h"
        )

    print("\n" + "-" * 70)
    print("LISTA DE ADJACENCIAS (Pre-Requisito -> Dependentes):")
    print("-" * 70)
    for u, sucessores in grafo.adjacencias.items():
        grau_sai = grafo.grau_saida(u)
        grau_ent = grafo.grau_entrada(u)
        suc_str = ", ".join(sucessores) if sucessores else "(nenhum dependente)"
        print(f"[{u:7}] grau_saida={grau_sai} | grau_entrada={grau_ent} -> {suc_str}")

    print("\n" + "-" * 70)
    print("LISTA DE ANTECESSORES (Disciplina <- Pre-Requisitos):")
    print("-" * 70)
    for v, antecessores in grafo.antecessores.items():
        ant_str = ", ".join(antecessores) if antecessores else "(sem pre-requisitos)"
        print(f"[{v:7}] exige <- {ant_str}")

    print("\n" + "=" * 70)
    print("DEMONSTRACAO - CASO DE TESTE 1: CONSULTA DE IMPACTO (BUSCA DFS)")
    print("=" * 70)
    exibir_consulta_impacto(service, disc_id="Estrutura de Dados", grafo=grafo)

    print("\n" + "=" * 70)
    print("DEMONSTRACAO - CASO DE TESTE 2: IDENTIFICACAO DE FALHA (DFS 3 CORES)")
    print("=" * 70)
    exibir_deteccao_ciclos(service, simular_caso_2=True, grafo=grafo)

    print("\n" + "=" * 70)
    print("DEMONSTRACAO - ORDENACAO TOPOLOGICA DA GRADE (KAHN & DFS)")
    print("=" * 70)
    exibir_ordenacao_topologica(service, grafo=grafo)


def exibir_consulta_impacto(
    service: CurriculoService,
    disc_id: str | None = None,
    grafo: GrafoDirecionado | None = None,
) -> None:
    if grafo is None:
        grafo = service.carregar_grafo_do_banco()

    if disc_id is None:
        disc_id = input(
            "Digite o ID ou nome da disciplina para consulta de impacto (ex: ED ou Estrutura de Dados): "
        ).strip()
        if not disc_id:
            disc_id = "ED"

    id_canonic = grafo.resolver_vertice(disc_id)
    if id_canonic is None:
        print(f"Disciplina '{disc_id}' nao encontrada no grafo.")
        return

    v_origem = grafo.obter_vertice(id_canonic)
    impactados = grafo.consultar_impacto(id_canonic)
    bf = grafo.fator_bloqueio(id_canonic)
    pre_reqs_trans = grafo.consultar_pre_requisitos_transitivos(id_canonic)

    print(f"\nDisciplina Selecionada: {v_origem.rotulo} [{id_canonic}]")
    print(
        f"Pre-Requisitos Acumulados - Fecho Inverso Γ-({id_canonic}): {len(pre_reqs_trans)} -> {pre_reqs_trans}"
    )
    print(
        f"Dependentes Diretos (|Sucessores|): {len(grafo.obter_sucessores(id_canonic))} -> {grafo.obter_sucessores(id_canonic)}"
    )
    print(
        f"Total de Disciplinas Impactadas - Fecho Direto Γ+({id_canonic}) / Blocking Factor BF({id_canonic}): {bf}"
    )

    if not impactados:
        print("  -> Nenhuma disciplina depende desta materia (materia folha/terminal).")
        return

    print("\nDisciplinas Impactadas Direta ou Indiretamente:")
    for v_dep_id in impactados:
        v_dep = grafo.obter_vertice(v_dep_id)
        caminho = grafo.buscar_caminho_dfs(id_canonic, v_dep_id)
        caminho_str = " -> ".join(caminho) if caminho else id_canonic
        periodo = v_dep.atributos.get("periodo", "-")
        print(
            f"  * [{v_dep_id:7}] {v_dep.rotulo:28} ({periodo}o Periodo) | Cadeia: {caminho_str}"
        )

    nomes = [grafo.obter_vertice(i).rotulo for i in impactados]
    print(f"\nLista de nomes impactados: {nomes}")


def exibir_deteccao_ciclos(
    service: CurriculoService,
    simular_caso_2: bool = False,
    grafo: GrafoDirecionado | None = None,
) -> None:
    if grafo is None:
        grafo = service.carregar_grafo_do_banco()

    print("\nVerificando integridade da grade curricular (Algoritmo DFS de 3 Cores)...")
    ciclo = grafo.detectar_ciclo()

    if ciclo is not None:
        caminho_str = " -> ".join(ciclo)
        print("\n[ALERTA CRITICO] O grafo atual contem um ciclo / dependencia circular!")
        print(f"Caminho fechado do ciclo detectado: {caminho_str}")
        return

    print("Grafo atual valido: nenhum ciclo detectado (Grafo Aciclico Direcionado - DAG).")

    if simular_caso_2:
        print("\n--- SIMULACAO: CASO DE TESTE 2 (INSERCAO DE ARESTA PROBLEMATICA) ---")
        print("Tentativa de adicionar dependencia curricular:")
        print("  Pre-Requisito: IA2 (Inteligencia Artificial 2)")
        print("  Dependente:    ED  (Estrutura de Dados)")

        valido, ciclo_detectado = grafo.validar_adicao_aresta(
            "Inteligencia Artificial 2", "Estrutura de Dados"
        )
        if not valido and ciclo_detectado:
            caminho_str = " -> ".join(ciclo_detectado)
            print("\n[ALERTA DE ERRO: DEPENDENCIA CIRCULAR DETECTADA]")
            print(f"Caminho fechado do ciclo: {caminho_str}")

            print("\nDetalhamento do ciclo entre materias (DFS de 3 Cores):")
            for idx, vertice_id in enumerate(ciclo_detectado):
                rotulo = (
                    grafo.obter_vertice(vertice_id).rotulo
                    if grafo.contem_vertice(vertice_id)
                    else vertice_id
                )
                indicador = (
                    " (retorna a origem - aresta para vertice CINZA!)"
                    if idx == len(ciclo_detectado) - 1
                    else ""
                )
                print(f"  {idx + 1}. {rotulo} [{vertice_id}]{indicador}")
            print(
                "\nOperacao abortada para proteger a integridade do curriculo academico."
            )


def exibir_ordenacao_topologica(
    service: CurriculoService, grafo: GrafoDirecionado | None = None
) -> None:
    if grafo is None:
        grafo = service.carregar_grafo_do_banco()

    ordem = grafo.ordenacao_topologica()
    if ordem is None:
        ciclo = grafo.detectar_ciclo()
        ciclo_str = f" ({' -> '.join(ciclo)})" if ciclo else ""
        print(
            f"\n[ERRO] Nao e possivel gerar a ordenacao topologica pois o grafo contem ciclo{ciclo_str}."
        )
        return

    ordem_dfs = grafo.ordenacao_topologica_dfs()
    niveis = grafo.ordenacao_topologica_por_niveis()

    print("\n--- ORDENACAO TOPOLOGICA LINEAR (ALGORITMO DE KAHN - GRAUS DE ENTRADA) ---")
    print("Ordem estrita respeitando todos os pré-requisitos curriculares:")
    for idx, v_id in enumerate(ordem, start=1):
        v = grafo.obter_vertice(v_id)
        pre_reqs = grafo.obter_antecessores(v_id)
        pre_str = f"<- exige {pre_reqs}" if pre_reqs else "(inicio imediato)"
        print(f"  {idx:2d}. [{v_id:7}] {v.rotulo:28} | {pre_str}")

    if ordem_dfs:
        print("\n--- ORDENACAO TOPOLOGICA VIA BUSCA EM PROFUNDIDADE (DFS POS-ORDEM REVERSA) ---")
        print("  -> " + " -> ".join(ordem_dfs))

    if niveis:
        print("\n--- ORGANIZACAO SUGERIDA POR SEMESTRES (CAMADAS TOPOLOGICAS) ---")
        print(f"Tempo minimo teorico para conclusao da grade: {len(niveis)} semestres.")
        for sem_idx, materias_nivel in enumerate(niveis, start=1):
            print(
                f"\n[Semestre {sem_idx}] ({len(materias_nivel)} materias disponiveis):"
            )
            for m_id in materias_nivel:
                m = grafo.obter_vertice(m_id)
                ch = m.atributos.get("carga_horaria", 60)
                print(f"   * [{m_id:7}] {m.rotulo:28} ({ch}h)")


def exibir_dados_sqlite(service: CurriculoService) -> None:
    db = service.db_manager
    alunos = service.listar_modelos_alunos()

    print("\n" + "=" * 70)
    print("DADOS DO BANCO SQLITE (ALUNOS E MATRICULAS)")
    print("=" * 70)
    for a in alunos:
        print(
            f"Aluno: {a.nome:18} | Matricula: {a.matricula:10} | Curso: {a.curso_nome}"
        )
        historico = db.obter_historico_aluno(a.matricula)
        for h in historico:
            nota_str = f"Nota: {h['nota']}" if h["nota"] is not None else "Em curso"
            print(
                f"   - {h['disciplina_id']:7} ({h['disciplina_nome']:25}) : {h['situacao']:12} | {nota_str}"
            )
        print()


def menu_interativo(service: CurriculoService) -> None:
    grafo = service.carregar_grafo_do_banco()
    fonte_atual = "SQLite (universidade.db)"

    while True:
        print("\n" + "=" * 70)
        print("SISTEMA DE DISCIPLINAS - TEORIA DOS GRAFOS (CLI INTERATIVO)")
        print(
            f"Fonte ativa: {fonte_atual} | |V|={grafo.total_vertices()} | |E|={grafo.total_arestas()}"
        )
        print("=" * 70)
        print("[1] Exibir Grafo Completo + Demonstracao Completa (Casos 1, 2 e Ordenacao)")
        print("[2] Exibir Dados do SQLite (Alunos e Historico Academico)")
        print("[3] Consultar Adjacencias e Graus de uma Disciplina")
        print("[4] Adicionar Vertice (Disciplina) ao Grafo em Memoria")
        print("[5] Adicionar Aresta (Pre-Requisito -> Dependente) com Validacao de Ciclos")
        print("[6] Recarregar Grafo (do SQLite ou de arquivos CSV) / Reinicializar Seed")
        print("[7] Caso de Teste 1: Consulta de Impacto com Busca DFS")
        print("[8] Caso de Teste 2: Deteccao de Ciclos com DFS de 3 Cores")
        print("[9] Ordenacao da Grade Curricular (Ordenacao Topologica Kahn & DFS)")
        print("[0] Sair")
        print("-" * 70)

        opcao = input("Escolha uma opcao [0-9]: ").strip()

        if opcao == "1":
            exibir_estrutura_grafo(service, grafo=grafo)
        elif opcao == "2":
            exibir_dados_sqlite(service)
        elif opcao == "3":
            disc = input(
                "Digite o ID ou nome da disciplina (ex: ED, Estrutura de Dados, IA1): "
            ).strip()
            id_canonic = grafo.resolver_vertice(disc)
            if id_canonic is not None:
                v = grafo.obter_vertice(id_canonic)
                print(f"\nDisciplina: {v.rotulo} [{id_canonic}]")
                print(
                    f"Grau de Entrada (pre-requisitos exigidos): {grafo.grau_entrada(id_canonic)}"
                )
                print(f"Pre-requisitos imediatos: {grafo.obter_antecessores(id_canonic)}")
                print(
                    f"Pre-requisitos acumulados Γ-({id_canonic}): {grafo.consultar_pre_requisitos_transitivos(id_canonic)}"
                )
                print(
                    f"Grau de Saida (disciplinas destravadas): {grafo.grau_saida(id_canonic)}"
                )
                print(f"Dependentes diretos: {grafo.obter_sucessores(id_canonic)}")
                print(
                    f"Impacto total via DFS Γ+({id_canonic}) [BF={grafo.fator_bloqueio(id_canonic)}]: {grafo.consultar_impacto(id_canonic)}"
                )
            else:
                print(f"Disciplina '{disc}' nao encontrada no grafo.")
        elif opcao == "4":
            v_id = input("ID do novo vertice (ex: TCC): ").strip()
            rotulo = input("Nome/Rotulo da disciplina: ").strip()
            if not v_id:
                print("ID invalido.")
                continue
            grafo.adicionar_vertice(v_id, rotulo or v_id)
            print(
                f"Vertice '{v_id}' adicionado com sucesso. Total de vertices: {grafo.total_vertices()}"
            )
        elif opcao == "5":
            u_in = input("Pre-Requisito (origem, ex: IA2): ").strip()
            v_in = input("Disciplina Dependente (destino, ex: ED): ").strip()
            if not u_in or not v_in:
                print("Origem e destino devem ser informados.")
                continue

            u = grafo.resolver_vertice(u_in) or u_in
            v = grafo.resolver_vertice(v_in) or v_in

            valido, ciclo = grafo.validar_adicao_aresta(u, v)
            if not valido and ciclo:
                caminho_ciclo = " -> ".join(ciclo)
                print(
                    f"\n[ALERTA DE ERRO: DEPENDENCIA CIRCULAR DETECTADA] A aresta ({u} -> {v}) fecha o ciclo: {caminho_ciclo}"
                )
                confirmar = (
                    input(
                        "Deseja forcar a insercao mesmo assim para testar o grafo corrompido? (s/N): "
                    )
                    .strip()
                    .lower()
                )
                if confirmar != "s":
                    print("Operacao cancelada. Aresta nao inserida.")
                    continue

            grafo.adicionar_aresta(u, v)
            print(
                f"Aresta ({u} -> {v}) adicionada ao grafo em memoria. Total de arestas: {grafo.total_arestas()}"
            )
            if valido:
                ids_banco = {d.id for d in service.listar_modelos_disciplinas()}
                if u in ids_banco and v in ids_banco:
                    persistir = (
                        input("Deseja persistir tambem no banco SQLite? (s/N): ")
                        .strip()
                        .lower()
                    )
                    if persistir == "s":
                        service.salvar_dependencia_no_banco(u, v)
                        print("Dependencia salva no banco SQLite com sucesso.")
        elif opcao == "6":
            print("\nOpcoes de recarga:")
            print("  [1] Reinicializar Seed e carregar do SQLite (padrao)")
            print("  [2] Carregar diretamente dos arquivos CSV (data/disciplinas.csv e data/dependencias.csv)")
            sub = input("Escolha [1/2] (Enter para 1): ").strip()
            if sub == "2":
                grafo = CurriculoService.carregar_grafo_de_csv()
                fonte_atual = "CSV (disciplinas.csv & dependencias.csv)"
                print("Grafo recarregado a partir dos arquivos CSV com sucesso.")
            else:
                executar_seed()
                grafo = service.carregar_grafo_do_banco()
                fonte_atual = "SQLite (universidade.db)"
                print("Banco de dados SQLite e arquivos CSV reinicializados (Seed).")
        elif opcao == "7":
            exibir_consulta_impacto(service, grafo=grafo)
        elif opcao == "8":
            exibir_deteccao_ciclos(service, simular_caso_2=True, grafo=grafo)
        elif opcao == "9":
            exibir_ordenacao_topologica(service, grafo=grafo)
        elif opcao == "0":
            print("Encerrando.")
            break
        else:
            print("Opcao invalida.")


def main() -> None:
    service = CurriculoService()
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        exibir_estrutura_grafo(service)
        exibir_dados_sqlite(service)
    elif sys.stdin.isatty():
        menu_interativo(service)
    else:
        exibir_estrutura_grafo(service)
        exibir_dados_sqlite(service)


if __name__ == "__main__":
    main()
