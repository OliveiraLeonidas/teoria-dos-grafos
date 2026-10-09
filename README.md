# Sistema de Dependências de Disciplinas - Estrutura Base de Grafos

Estrutura computacional orientada a objetos para representação de matrizes curriculares utilizando **Grafos Direcionados (Dígrafos)** e persistência em banco relacional **SQLite**.

---

## 📁 Estrutura do Repositório

```text
teoria-dos-grafos/
├── README.md                      # Documentação técnica do código
├── main.py                        # Executável de demonstração e menu interativo
├── data/
│   ├── disciplinas.csv            # Catálogo tabular de matérias
│   ├── dependencias.csv           # Relação PreRequisito -> Disciplina
│   └── universidade.db            # Base de dados SQLite
├── src/
│   ├── models/
│   │   ├── grafo.py               # Classes Vertice e GrafoDirecionado
│   │   └── disciplina.py          # Dataclasses de DisciplinaModel e AlunoModel
│   ├── database/
│   │   ├── schema.sql             # Esquema DDL do SQLite
│   │   ├── db_manager.py          # Gerenciador de conexão e queries SQLite
│   │   └── seed.py                # Script de povoamento inicial e geração de CSVs
│   └── services/
│       └── curriculo_service.py   # Carregador do grafo a partir do SQLite e CSVs
└── tests/
    ├── test_grafo.py              # Testes unitários da estrutura base do dígrafo
    └── test_database.py           # Testes de integração do SQLite
```

---

## 🧠 Modelagem da Estrutura Base do Grafo

### 1. Dígrafo e Orientação das Arestas
A relação de precedência acadêmica é direcionada do pré-requisito para a disciplina dependente:
$$\text{Pré-Requisito } (u) \longrightarrow \text{Disciplina Dependente } (v)$$

### 2. Classes Principais
- **`Vertice`**: Representa a matéria curricular, contendo `id`, `rotulo` e metadados (`carga_horaria`, `periodo`).
- **`GrafoDirecionado`**:
  - `self.vertices`: Dicionário com os nós cadastrados.
  - `self.adjacencias`: Lista de adjacência direta (`Pré-Requisito -> [Dependentes]`).
  - `self.antecessores`: Lista de adjacência reversa (`Disciplina -> [Pré-Requisitos]`).
  - **Grau de Saída ($d^+$)**: Quantidade de matérias destravadas pela conclusão da disciplina.
  - **Grau de Entrada ($d^-$)**: Quantidade de pré-requisitos exigidos pela disciplina.

---

## 🚀 Como executar

### Pré-requisitos
- **Python 3.10+** (utiliza apenas bibliotecas padrão: `sqlite3`, `unittest`, `dataclasses`).

### 1. Visualização Automática das Estruturas e Dados
```bash
python3 main.py --demo
```

### 2. Menu Interativo
```bash
python3 main.py
```

### 3. Execução dos Testes Automatizados
```bash
python3 -m unittest discover -s tests -v
```

### 4. Reinicialização da Base de Dados (Seed)
```bash
python3 src/database/seed.py
```

---

## 💻 Exemplos de Entrada e Saída

### 1. Consulta Interativa no Terminal (`python3 main.py`)

Ao executar `python3 main.py`, selecione a opção `[3]` para consultar uma matéria:

#### Entrada (Input):
```text
Escolha uma opcao [0-6]: 3
Digite o identificador da disciplina (ex: ED, PreCalc, IA1): ED
```

#### Saída (Output):
```text
Disciplina: Estrutura de Dados [ED]
Grau de Entrada (pre-requisitos exigidos): 0
Pre-requisitos imediatos: []
Grau de Saida (disciplinas destravadas): 3
Dependentes diretos: ['SO', 'BD', 'IA1']
```

---

### 2. Consulta via Código Python

#### Entrada (Input no código):
```python
from src.services.curriculo_service import CurriculoService

service = CurriculoService()
grafo = service.carregar_grafo_do_banco()

print("Sucessores de ED:", grafo.obter_sucessores("ED"))
print("Antecessores de IA1:", grafo.obter_antecessores("IA1"))
print("Grau de Saida de ED:", grafo.grau_saida("ED"))
print("Grau de Entrada de IA1:", grafo.grau_entrada("IA1"))
print("Total de Vertices:", grafo.total_vertices())
print("Total de Arestas:", grafo.total_arestas())
```

#### Saída (Output):
```text
Sucessores de ED: ['SO', 'BD', 'IA1']
Antecessores de IA1: ['ED', 'AL']
Grau de Saida de ED: 3
Grau de Entrada de IA1: 2
Total de Vertices: 13
Total de Arestas: 11
```