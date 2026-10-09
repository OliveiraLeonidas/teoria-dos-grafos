import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from src.database.seed import executar_seed
from src.services.curriculo_service import CurriculoService


def exibir_estrutura_grafo(service: CurriculoService) -> None:
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


def exibir_dados_sqlite(service: CurriculoService) -> None:
    db = service.db_manager
    alunos = db.listar_alunos()

    print("\n" + "=" * 70)
    print("DADOS DO BANCO SQLITE (ALUNOS E MATRICULAS)")
    print("=" * 70)
    for a in alunos:
        print(
            f"Aluno: {a['nome']:18} | Matricula: {a['matricula']:10} | Curso: {a['curso']}"
        )
        historico = db.obter_historico_aluno(a["matricula"])
        for h in historico:
            nota_str = f"Nota: {h['nota']}" if h["nota"] is not None else "Em curso"
            print(
                f"   - {h['disciplina_id']:7} ({h['disciplina_nome']:25}) : {h['situacao']:12} | {nota_str}"
            )
        print()


def menu_interativo(service: CurriculoService) -> None:
    while True:
        print("\n" + "=" * 70)
        print("SISTEMA DE DISCIPLINAS - ESTRUTURAS BASICAS (GRAFOS & SQLITE)")
        print("=" * 70)
        print("[1] Exibir Grafo Completo (Vertices, Arestas, Graus e Adjacencias)")
        print("[2] Exibir Dados do SQLite (Alunos e Historico)")
        print("[3] Consultar Adjacencias de uma Disciplina Especifica")
        print("[4] Adicionar Vertice Manualmente ao Grafo")
        print("[5] Adicionar Aresta Manualmente ao Grafo")
        print("[6] Reinicializar Banco SQLite e CSVs (Seed)")
        print("[0] Sair")
        print("-" * 70)

        opcao = input("Escolha uma opcao [0-6]: ").strip()

        if opcao == "1":
            exibir_estrutura_grafo(service)
        elif opcao == "2":
            exibir_dados_sqlite(service)
        elif opcao == "3":
            grafo = service.carregar_grafo_do_banco()
            disc = input(
                "Digite o identificador da disciplina (ex: ED, PreCalc, IA1): "
            ).strip()
            if grafo.contem_vertice(disc):
                v = grafo.obter_vertice(disc)
                print(f"\nDisciplina: {v.rotulo} [{disc}]")
                print(
                    f"Grau de Entrada (pre-requisitos exigidos): {grafo.grau_entrada(disc)}"
                )
                print(f"Pre-requisitos imediatos: {grafo.obter_antecessores(disc)}")
                print(
                    f"Grau de Saida (disciplinas destravadas): {grafo.grau_saida(disc)}"
                )
                print(f"Dependentes diretos: {grafo.obter_sucessores(disc)}")
            else:
                print(f"Disciplina '{disc}' nao encontrada no grafo.")
        elif opcao == "4":
            grafo = service.carregar_grafo_do_banco()
            v_id = input("ID do novo vertice: ").strip()
            rotulo = input("Nome/Rotulo da disciplina: ").strip()
            grafo.adicionar_vertice(v_id, rotulo)
            print(
                f"Vertice '{v_id}' adicionado com sucesso. Total de vertices: {grafo.total_vertices()}"
            )
        elif opcao == "5":
            grafo = service.carregar_grafo_do_banco()
            u = input("Pre-Requisito (origem): ").strip()
            v = input("Disciplina Dependente (destino): ").strip()
            grafo.adicionar_aresta(u, v)
            print(
                f"Aresta ({u} -> {v}) adicionada com sucesso. Total de arestas: {grafo.total_arestas()}"
            )
        elif opcao == "6":
            executar_seed()
            print("Banco de dados SQLite e arquivos CSV reinicializados.")
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
