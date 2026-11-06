# Cenário de Teste: Sistema de Pré-requisitos (Universidade Fundação Hermínio Ometto)

Roteiro para validar, pela interface web, cada etapa do projeto: a estrutura do dígrafo, a pesquisa por DFS (Caso de Teste 1), a detecção de ciclos com DFS de 3 cores (Caso de Teste 2), a ordenação topológica e os cadastros.

Os resultados esperados abaixo foram obtidos executando cada passo sobre os dados iniciais do seed. Siga as etapas **na ordem**: algumas dependem da anterior.

---

## Preparação

| # | Ação | Resultado esperado |
|---|------|--------------------|
| P1 | Na raiz do projeto, rode `python3 -m unittest discover -s tests -v`. | Todos os testes passam (`OK`). Inclui `test_pesquisa_usa_so_o_grafo_em_memoria`, que apaga o banco e confirma que a pesquisa continua respondendo pelo grafo em memória. |
| P2 | Rode `python3 main.py --api` e abra http://127.0.0.1:8000. | Cabeçalho "Universidade Fundação Hermínio Ometto". À direita: **13 disciplinas · 11 pré-requisitos · 3 alunos** e o indicador **DAG** em verde. |
| P3 | Clique em **Restaurar dados** e confirme. | Aviso "Dados iniciais restaurados." Garante que o teste começa do seed. |

---

## Etapa 1: Estrutura do grafo (aba Grafo)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 1.1 | Abra a aba **Grafo**. | O grafo aparece com 4 colunas (1º a 4º período) e 13 vértices. Cada cartão mostra a sigla, o nome, a carga horária e os graus (`Pré:` = grau de entrada d⁻, `Libera:` = grau de saída d⁺). |
| 1.2 | Confira o cartão **ED (Estrutura de Dados)**. | `80h • Pré:0 • Libera:3`. As setas saem de ED para BD, SO e IA1. |
| 1.3 | Confira o cartão **IA1**. | `Pré:2 • Libera:1` (exige ED e AL; libera IA2). |

---

## Etapa 2: Progresso do aluno (aba Grafo, modo *Progresso do aluno*)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 2.1 | Selecione **Lucas Silva (20240101)**. | Progresso **5/13**. Grafo: verdes (concluídas) ED, GA, PreCalc, Calc1 e AL; laranja (cursando) BD e SO; azuis (liberadas) CG, Calc2 e IA1; cinza (bloqueadas) Redes, Calc3 e IA2. |
| 2.2 | Confira o painel lateral. | Pode se matricular (3): Computação Gráfica, Cálculo 2, Inteligência Artificial 1. Cursando (2). Concluídas (5). Bloqueadas (3). |
| 2.3 | Selecione **Mariana Souza (20240102)**. | Progresso **9/13**. Liberadas: Computação Gráfica, Redes de Computadores, Cálculo 3, Inteligência Artificial 2. Bloqueadas (0). |
| 2.4 | Selecione **Carlos Eduardo (20240103)**. | Progresso **2/13** (GA e Pré-Cálculo). Liberadas: Estrutura de Dados, Cálculo 1, Álgebra Linear. Bloqueadas (8). Ele reprovou em ED em 2024.2, por isso SO, BD e IA1 estão bloqueadas. |
| 2.5 | Clique numa disciplina **bloqueada** do grafo (ex.: SO). | Nada acontece: só disciplinas liberadas podem ser registradas. |
| 2.6 | Clique no cartão **ED** (liberada). Na janela, deixe ED selecionada, situação **Aprovado**, nota **7.5** e clique **Registrar**. | Aviso de sucesso. Progresso **3/13**. Liberadas agora: Banco de Dados, Cálculo 1, Sistemas Operacionais, Álgebra Linear. |
| 2.7 | Clique em **Abrir histórico completo**. | Abre a aba **Alunos** com Carlos selecionado; o histórico mostra o registro novo de ED (Aprovado, 7.5) além do reprovado de 2024.2. |

---

## Etapa 3: Caso de Teste 1, consulta de impacto por DFS (aba Grafo, modo *Impacto*)

A pesquisa roda só sobre o grafo em memória (lista de adjacência), não sobre o banco.

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 3.1 | Pesquise **Estrutura de Dados**. | **5 impactadas (Γ⁺)** e **0 pré-requisitos (Γ⁻)**. Lista na ordem da DFS: 1. Banco de Dados (`ED → BD`), 2. Sistemas Operacionais (`ED → SO`), 3. Redes de Computadores (`ED → SO → Redes`), 4. Inteligência Artificial 1 (`ED → IA1`), 5. Inteligência Artificial 2 (`ED → IA1 → IA2`). |
| 3.2 | Observe o grafo. | ED escuro (pesquisada); BD, SO e IA1 em vermelho (impacto direto); Redes e IA2 em laranja (indireto); os demais apagados. Os badges mostram a ordem de visita: "Impacto 1º", "Impacto 2º"... |
| 3.3 | Pesquise **AL** (pela sigla). | Álgebra Linear: 3 impactadas, CG (`AL → CG`), IA1 e IA2 (`AL → IA1 → IA2`); precisa ter cursado: Geometria Analítica. |
| 3.4 | Pesquise **CMP402** (pelo código). | Encontra Inteligência Artificial 1: 1 impactada (IA2); precisa ter cursado ED, AL e GA. |
| 3.5 | Clique no cartão **PreCalc** no grafo. | Pré-Cálculo: 3 impactadas, Calc1, Calc2 e Calc3 (`PreCalc → Calc1 → Calc2 → Calc3`). |
| 3.6 | Pesquise **IA2**. | 0 impactadas ("Nenhuma disciplina depende desta"); precisa ter cursado IA1, ED, AL e GA. |
| 3.7 | Pesquise **Física**. | Erro: "Disciplina 'Física' não encontrada no grafo". |

---

## Etapa 4: Caso de Teste 2, detecção de ciclo com DFS de 3 cores (aba Grafo, modo *Ciclos*)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 4.1 | Abra o modo **Ciclos**. | Caixa verde "A grade atual não tem ciclos." |
| 4.2 | Clique em **Usar IA2 → ED** e depois em **Executar DFS**. | Aparece a aresta proposta tracejada (roxa) de IA2 para ED. A DFS anima no grafo (branco → cinza → preto) e na lista de passos, em 10 passos: `ED → cinza`, `BD → cinza`, `BD → preto`, `SO → cinza`, `Redes → cinza`, `Redes → preto`, `SO → preto`, `IA1 → cinza`, `IA2 → cinza`, `aresta IA2 → ED encontra vértice cinza`. |
| 4.3 | Veja o resultado. | Alerta "Dependência circular detectada", caminho **ED → IA1 → IA2 → ED** em vermelho no grafo, e "A aresta IA2 → ED não pode ser gravada." Não há botão de gravar. |
| 4.4 | Escolha **Redes** (u) e **ED** (v) e execute. | Ciclo **ED → SO → Redes → ED**, em 6 passos. |
| 4.5 | Escolha **ED** e **ED** e execute. | Ciclo **ED → ED** (uma disciplina não pode ser pré-requisito dela mesma). |
| 4.6 | Escolha **ED** e **SO** e execute. | Sem ciclo, mas "Estrutura de Dados já é pré-requisito de Sistemas Operacionais." |
| 4.7 | Clique no grafo em **GA** e depois em **CG**. | Os campos são preenchidos (u = GA, v = CG) e a aresta proposta aparece. |
| 4.8 | Execute e clique em **Gravar GA → CG**. | "Sem ciclo: pode ser gravada." Depois de gravar: confirmação "GA → CG gravado". O cabeçalho passa a **12 pré-requisitos** e o indicador continua **DAG**. |
| 4.9 | Na aba **Disciplinas**, selecione **Geometria Analítica**. | "Libera (2)": Álgebra Linear e Computação Gráfica (a aresta nova aparece). |
| 4.10 | Volte ao modo **Impacto** e pesquise **GA**. | Continuam **4 impactadas**: AL, CG, IA1, IA2. A aresta nova não muda o fecho transitivo, porque CG já era alcançada por `GA → AL → CG`; a DFS visita cada vértice uma vez só. |

---

## Etapa 5: Ordenação topológica (aba Grafo, modo *Ordem*)

Faça antes o passo **R1** (restaurar) se quiser os valores exatos abaixo; com GA → CG gravado, a ordem muda pouco.

| # | Ação | Resultado esperado (dados do seed) |
|---|------|------------------------------------|
| 5.1 | Abra o modo **Ordem**. | "Mínimo de 4 semestres". 1º: ED, GA, Pré-Cálculo (200h). 2º: Álgebra Linear, Banco de Dados, Cálculo 1, Sistemas Operacionais (280h). 3º: Computação Gráfica, Cálculo 2, IA 1, Redes (260h). 4º: Cálculo 3, IA 2 (140h). |
| 5.2 | Confira as sequências. | Kahn: `ED → GA → PreCalc → BD → SO → AL → Calc1 → Redes → CG → IA1 → Calc2 → IA2 → Calc3`. DFS (pós-ordem reversa): `PreCalc → Calc1 → Calc2 → Calc3 → GA → AL → CG → ED → IA1 → IA2 → SO → Redes → BD`. |
| 5.3 | Clique em **Animar Kahn**. | Os cartões ficam azuis um a um, na ordem de Kahn, com badges `#1 · Sem 1` … `#13 · Sem 4`. Nenhuma disciplina fica azul antes dos seus pré-requisitos. |

---

## Etapa 6: Cadastro de disciplinas e pré-requisitos (aba Disciplinas)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 6.1 | Abra a aba **Disciplinas**. | Lista agrupada por período; ao clicar numa disciplina, o detalhe mostra sigla, código, período, CH, pré-requisitos e o que ela libera. |
| 6.2 | Clique **Nova** e tente sigla **T G**. | Erro no campo: "A sigla aceita só letras, números, '_' e '-' (até 20 caracteres)". |
| 6.3 | Tente sigla **TG**, código **CMP201**. | Erro: "Já existe a disciplina ED com esse código". |
| 6.4 | Tente nome **Banco de Dados**. | Erro: "Já existe a disciplina BD com esse nome". |
| 6.5 | Tente carga horária **0**. | Erro: "Carga horária deve ser um inteiro entre 1 e 400". |
| 6.6 | Crie **TG / CMP410 / Teoria dos Grafos / 60h / 3º período**. | Aviso "Teoria dos Grafos criada."; ela fica selecionada. Cabeçalho: **14 disciplinas**. |
| 6.7 | No detalhe de TG, em Pré-requisitos, clique **Adicionar**, escolha **Estrutura de Dados** e confirme. | "ED agora é pré-requisito de TG." TG mostra 1 pré-requisito. |
| 6.8 | Selecione **ED**, clique **Adicionar** pré-requisito e escolha **Teoria dos Grafos**. | Recusado: "TG → ED criaria uma dependência circular" e "Ciclo: ED → TG → ED". |
| 6.9 | Em ED, clique **Ver impacto no grafo**. | Abre a aba Grafo no modo Impacto: agora **6 impactadas**, com TG (`ED → TG`) por último. |
| 6.10 | Volte, selecione TG, clique **Editar** e mude para **80h**. | "Teoria dos Grafos atualizada." O detalhe mostra 80h. |
| 6.11 | Clique **Excluir** em TG. | A confirmação avisa: "Também serão apagados: 1 relação(ões) de pré-requisito." Ao confirmar, TG some e o cabeçalho volta a **13 disciplinas**. |

---

## Etapa 7: Cadastro de alunos e histórico (aba Alunos)

| # | Ação | Resultado esperado |
|---|------|--------------------|
| 7.1 | Clique **Novo** e cadastre **Ana Teste / 20259999**. | "Ana Teste cadastrado." Contadores: 0 concluídas, 3 liberadas (ED, GA, Pré-Cálculo), 10 bloqueadas. |
| 7.2 | Tente cadastrar outro aluno com a matrícula **20259999**. | Erro: "Já existe aluno com essa matrícula". |
| 7.3 | Tente a matrícula **abc**. | Erro: "A matrícula deve conter só números". |
| 7.4 | Em Ana, clique **Registrar** e escolha **Sistemas Operacionais** como **Cursando**. | Recusado: "Pré-requisitos pendentes para SO: ED" (regra do grafo). |
| 7.5 | Registre **ED** como **Aprovado** sem nota. | Erro: "Informe a nota para aprovado ou reprovado". |
| 7.6 | Registre ED, Aprovado, nota 8, semestre **2026.3**. | Erro: "Semestre no formato AAAA.1 ou AAAA.2". |
| 7.7 | Registre ED, Aprovado, nota 8, semestre **2026.1**. | Registrado. Liberadas: Geometria Analítica, Pré-Cálculo, Banco de Dados, Sistemas Operacionais. |
| 7.8 | Registre de novo ED em **2026.1** (Reprovado, 3). | Erro: "O aluno já tem essa disciplina nesse semestre". |
| 7.9 | Edite o registro de ED para **Reprovado, nota 4**. | BD e SO voltam a ficar bloqueadas; liberadas: ED, GA, Pré-Cálculo. |
| 7.10 | Clique **Ver no grafo**. | Aba Grafo no modo Progresso com Ana selecionada; o grafo reflete o histórico. |
| 7.11 | Volte, remova o registro de ED e depois **Exclua** Ana. | A confirmação informa quantos registros serão apagados. O cabeçalho volta a **3 alunos**. |

---

## Encerramento

| # | Ação | Resultado esperado |
|---|------|--------------------|
| R1 | Clique **Restaurar dados** e confirme. | 13 disciplinas, 11 pré-requisitos e 3 alunos; Carlos volta a 2/13 (o registro da etapa 2.6 é desfeito). |

---

## Resumo do que cada etapa valida

| Etapa | Parte do projeto | Algoritmo / regra |
|-------|------------------|-------------------|
| 1 | `GrafoDirecionado`: vértices, arestas, graus | Lista de adjacência e de antecessores |
| 2 | Progresso do aluno | Antecessores de cada vértice × disciplinas aprovadas |
| 3 | **Caso de Teste 1** | `consultar_impacto` (DFS), `consultar_pre_requisitos_transitivos` (DFS reversa), `buscar_caminho_dfs`, `resolver_vertice` |
| 4 | **Caso de Teste 2** | `validar_adicao_aresta` com `detectar_ciclo` (DFS de 3 cores) |
| 5 | Ordem da grade | `ordenacao_topologica` (Kahn), `ordenacao_topologica_dfs`, `ordenacao_topologica_por_niveis` |
| 6 | Cadastro de disciplinas e pré-requisitos | Persistência SQLite + recarga do grafo em memória; validação de ciclo antes de gravar |
| 7 | Cadastro de alunos e histórico | Regra: cursar/aprovar exige pré-requisitos aprovados |
