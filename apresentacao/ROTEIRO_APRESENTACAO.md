# Roteiro de apresentação: Grupo 7

**Tema:** Gestão e análise curricular com Teoria dos Grafos  
**Instituição:** Universidade Fundação Hermínio Ometto  
**Arquivo:** `teoria_dos_grafos.pptx`, 13 slides, sem roteiro nas notas ou no rodapé  
**Duração principal:** 17 minutos, incluindo cliques, demonstrações e transições.  
**Janela total:** 15 a 20 minutos. Há uma versão de 15 minutos abaixo; para 20 minutos, use o roteiro de 17 e reserve 3 para perguntas.

## Divisão de fala

| Integrante | RA | Slides | Bloco | Tempo | Intervalo |
|---|---|---|---|---|---|
| André Luis da Silva Junior | 109385 | 1 a 4 | Problema e modelagem | 4min | 00:00 a 04:00 |
| Leonidas Leividy de Oliveira Machado | 110417 | 5 a 7 | Arquitetura e consulta de impacto | 4min20s | 04:00 a 08:20 |
| Bruno Rafael Barbosa | 112944 | 8 a 10 | Detecção de ciclos e Kahn | 4min20s | 08:20 a 12:40 |
| Luiz Augusto Curtolo de Souza | 113363 | 11 a 13 | Progresso do aluno, testes e conclusão | 4min20s | 12:40 a 17:00 |

A distribuição é uma proposta para o ensaio. Cada integrante explica o próprio bloco. Leonidas pode operar o computador durante todas as demonstrações, enquanto o responsável pelo slide continua falando. André acompanha o cronômetro. Os tempos incluem pausas para apontar elementos; a fala sugerida serve como base, não precisa ser lida palavra por palavra.

## Preparação e ensaio

1. Na raiz do projeto, compile o frontend se houve alteração: `cd frontend && npm run build && cd ..`.
2. Execute `python3 apresentacao/iniciar_demo.py` e mantenha o terminal aberto.
3. Abra **http://127.0.0.1:8002/**. Esse comando usa um banco temporário, com os dados iniciais. A aplicação habitual na porta 8000 continua com os próprios dados.
4. Confira **13 disciplinas, 11 pré-requisitos e 3 alunos**. No modo Progresso do aluno, Carlos deve estar em **2/13**. As chamadas e resultados deste roteiro foram conferidos em banco temporário.
5. Abra o PowerPoint e mantenha este roteiro em outra tela ou impresso. Deixe o navegador pronto em outra janela e ensaie a troca com Alt+Tab. Ajuste o zoom do grafo à projeção.
6. Faça um ensaio cronometrado completo. O cadastro de ED no slide 11 muda o histórico de Carlos. Para repetir, encerre o servidor de demonstração com Ctrl+C e execute o comando novamente; cada execução cria uma base limpa.
7. Se a porta 8002 estiver ocupada por outro ensaio, encerre aquele processo antes de iniciar outro. Evite usar “Restaurar dados” na aplicação habitual da porta 8000.
8. Tenha `teoria_dos_grafos.pdf` disponível como alternativa para os slides. Os slides 7, 9 e 11 incluem os resultados esperados caso o navegador não esteja disponível.

**Regra de tempo:** limitar a 15 segundos qualquer tentativa de resolver uma falha durante a apresentação. Nesse caso, explicar o resultado esperado já exibido no slide e seguir. Não tentar instalar dependências ou executar toda a bateria de testes diante da turma.

## Falas, ações e transições

### Slide 1: Gestão curricular com grafos

**Quem:** André, **Tempo:** 00:30, **Cronômetro:** 00:00 a 00:30

**Fala sugerida**

Boa noite. Somos o grupo 7 e vamos apresentar um sistema de gestão e análise de pré-requisitos de disciplinas. A proposta é transformar a grade curricular em um grafo para responder três perguntas: o que uma matéria afeta, se uma nova dependência cria um ciclo e em que ordem as matérias podem ser cursadas. Ao longo da apresentação, vamos mostrar esses resultados no sistema que desenvolvemos.

**Ação / demonstração**

Exibir a capa. Apresentar o tema sem ler o subtítulo inteiro.

**Transição**

Primeiro, vamos mostrar como dividimos a apresentação.

### Slide 2: Integrantes do grupo

**Quem:** André, **Tempo:** 00:40, **Cronômetro:** 00:30 a 01:10

**Fala sugerida**

Eu sou André e vou apresentar o problema e a modelagem. O Leonidas explicará a arquitetura e a consulta de impacto. O Bruno ficará com a detecção de ciclos e a ordenação topológica. O Luiz demonstrará o progresso do aluno, os cadastros e os resultados dos testes. Organizamos a exposição em aproximadamente dezessete minutos. Cada bloco conecta um conceito de grafos a um comportamento do sistema.

**Ação / demonstração**

Apontar os quatro nomes e os blocos. Todos têm uma parte de fala; não é necessário repetir a apresentação pessoal na troca.

**Transição**

Algumas matérias precisam ser concluídas antes de outras.

### Slide 3: O que uma reprovação pode afetar?

**Quem:** André, **Tempo:** 01:10, **Cronômetro:** 01:10 a 02:20

**Fala sugerida**

As disciplinas de uma grade têm relações de pré-requisito. Na nossa base, Estrutura de Dados é pré-requisito de Sistemas Operacionais, que por sua vez é pré-requisito de Redes de Computadores. Se um aluno ainda não concluiu Estrutura de Dados, essa sequência precisa ser considerada no planejamento. Há também outro problema: cadastrar uma relação que faça uma matéria depender dela mesma por meio de uma cadeia. Isso cria uma dependência circular. Nosso sistema representa essas relações e verifica o que elas significam. É importante distinguir a análise geral da grade da situação de um aluno: uma disciplina alcançada pelo grafo pode ter outros pré-requisitos, e a matrícula depende do histórico individual.

**Ação / demonstração**

Percorrer a cadeia ED → SO → Redes com o ponteiro. Ressaltar as três perguntas, sem antecipar os algoritmos.

**Transição**

Para tratar essas perguntas, usamos a representação matemática de um dígrafo.

### Slide 4: Disciplinas e pré-requisitos

**Quem:** André, **Tempo:** 01:40, **Cronômetro:** 02:20 a 04:00

**Fala sugerida**

Representamos a grade por G igual a V e E. Cada vértice é uma disciplina; cada aresta orientada vai do pré-requisito para a matéria dependente. A base de demonstração tem treze disciplinas e onze relações. Por exemplo, de ED saem arestas para BD, SO e IA1: o grau de saída de ED é três. IA1 recebe duas arestas, de ED e de Álgebra Linear; seu grau de entrada é dois. Por isso, concluir só ED não libera necessariamente IA1 para um aluno. Na implementação, guardamos uma lista de sucessores e uma lista de antecessores para cada disciplina. Os sucessores permitem procurar impactos; os antecessores permitem consultar exigências. A grade inicial é um DAG, isto é, um grafo direcionado sem ciclos. As colunas mostram os períodos sugeridos do cadastro; a ordenação por dependências é calculada separadamente. Nessa base, ambas se organizam em quatro níveis.

**Ação / demonstração**

Apontar ED, suas três saídas e as duas entradas de IA1. Mostrar a cadeia Pré-Cálculo → Cálculo 1 → Cálculo 2 → Cálculo 3.

**Transição**

Com essa modelagem definida, o Leonidas vai mostrar como os dados chegam aos algoritmos e à interface.

### Slide 5: A pesquisa acontece no grafo em memória

**Quem:** Leonidas, **Tempo:** 01:20, **Cronômetro:** 04:00 a 05:20

**Fala sugerida**

A aplicação tem uma interface em React e TypeScript, uma API HTTP em Python e a camada de regras e algoritmos. O SQLite guarda os cadastros e o histórico. Ao iniciar a API, o serviço lê a grade do banco e monta as listas de adjacência em memória. Quando pesquisamos impacto, verificamos um ciclo ou pedimos a ordenação, os algoritmos trabalham nessa estrutura. O banco continua sendo usado para persistência e para consultar os dados dos alunos. Depois de uma alteração na grade, o estado do grafo é recarregado. Também existem arquivos CSV: o seed cria os dados iniciais e os exporta; há um carregador alternativo de CSV. Portanto, o fluxo padrão da interface começa no SQLite, mas a busca de dependências é executada no grafo em memória.

**Ação / demonstração**

Percorrer o fluxo de consulta e depois apontar a persistência. Não abrir arquivos de código durante a exposição.

**Transição**

A primeira aplicação dessa estrutura é descobrir o alcance de uma disciplina.

### Slide 6: DFS: cinco disciplinas impactadas por ED

**Quem:** Leonidas, **Tempo:** 01:30, **Cronômetro:** 05:20 a 06:50

**Fala sugerida**

Para a consulta de impacto usamos busca em profundidade, ou DFS. Partimos de ED e seguimos suas arestas. Na ordem de adjacência desta base, visitamos BD; voltamos e seguimos por SO até Redes; depois seguimos por IA1 até IA2. O conjunto de visitados evita repetir disciplinas alcançadas por caminhos diferentes. O resultado tem cinco disciplinas impactadas, e o fator de bloqueio de ED é justamente esse total. A travessia tem custo O de V mais E no pior caso. Isso descreve a DFS sobre as listas de adjacência; a resposta da API ainda inclui tarefas como montar os caminhos exibidos. Esta análise mostra dependência estrutural. Ela não afirma que todas essas matérias ficam imediatamente liberadas: IA1, por exemplo, também exige Álgebra Linear. A consulta dos pré-requisitos faz o percurso inverso, usando os antecessores.

**Ação / demonstração**

Seguir as setas do exemplo e a sequência numerada da DFS. Diferenciar impacto direto e indireto.

**Transição**

Vamos executar exatamente essa consulta no frontend.

### Slide 7: Consulta de impacto no sistema

**Quem:** Leonidas, **Tempo:** 01:30, **Cronômetro:** 06:50 a 08:20

**Fala sugerida**

Na aba Grafo, escolhemos o modo Impacto e pesquisamos ED. O sistema encontra Estrutura de Dados e destaca as cinco disciplinas alcançadas. BD, SO e IA1 dependem diretamente dela; Redes e IA2 aparecem por caminhos indiretos. A lista também mostra o caminho que justifica cada resultado. Por exemplo, para Redes temos ED, SO e Redes. A pesquisa aceita sigla, nome ou código de disciplina. Quando uma disciplina não existe na grade, o sistema apresenta uma mensagem em vez de criar um vértice indevido. Esse resultado é calculado pela API a partir do grafo em memória. O próximo caso trata de uma modificação inválida nessa estrutura.

**Ação / demonstração**

0 a 15s: alternar para http://127.0.0.1:8002, aba Grafo → Impacto. 15 a 35s: pesquisar ED. 35 a 65s: apontar as 5 impactadas e o caminho ED → SO → Redes. 65 a 80s: pesquisar Física e mostrar a mensagem de não encontrada. 80 a 90s: retornar aos slides. Na versão de 15 minutos, omitir a pesquisa por Física.

**Transição**

Bruno, como o sistema evita que uma nova relação crie uma dependência circular?

### Slide 8: DFS de três cores identifica ciclos

**Quem:** Bruno, **Tempo:** 01:30, **Cronômetro:** 08:20 a 09:50

**Fala sugerida**

Na detecção de ciclos, a DFS usa três estados. Branco significa que o vértice ainda não foi visitado. Cinza significa que ele está no caminho de exploração atual, na pilha de recursão. Preto significa que a exploração daquele vértice terminou. Em um grafo direcionado, encontrar uma aresta para um vértice cinza revela um ciclo. A cor preta, sozinha, não indica ciclo. No nosso caso de teste, já existem ED para IA1 e IA1 para IA2. Ao propor IA2 para ED, fechamos ED, IA1, IA2 e ED. A validação insere a aresta temporariamente, executa a busca e restaura a estrutura. A interface apresenta os passos e impede a gravação da relação inválida. Assim, a inconsistência é identificada antes de ser persistida.

**Ação / demonstração**

Apontar os três estados e fechar o ciclo com a seta proposta. Explicar a diferença entre cinza e preto.

**Transição**

Agora vamos testar essa aresta proposta na interface.

### Slide 9: Ciclo causado pela proposta IA2 → ED

**Quem:** Bruno, **Tempo:** 01:30, **Cronômetro:** 09:50 a 11:20

**Fala sugerida**

No modo Ciclos, usamos o exemplo IA2 para ED e executamos a DFS. A aresta tracejada representa a proposta; ela ainda não foi gravada. A animação mostra as mudanças de estado e, no final, a aresta de retorno para ED, que ainda está cinza. A mensagem informa dependência circular e apresenta o caminho ED, IA1, IA2 e ED. Como a proposta é inválida, não há opção para gravá-la. A grade original permanece sem ciclos. Esse é um ponto importante: a simulação ajuda a explicar o erro sem deixar a base inconsistente. Com a grade válida, podemos passar para uma outra pergunta: qual sequência respeita os pré-requisitos?

**Ação / demonstração**

0 a 15s: abrir Grafo → Ciclos. 15 a 30s: clicar Usar IA2 → ED e Executar DFS. 30 a 55s: aguardar a animação e apontar o ciclo. 55 a 75s: mostrar a recusa e os 11 pré-requisitos preservados. 75 a 90s: retornar aos slides. Se a animação demorar, usar o controle de pular para o resultado.

**Transição**

É essa sequência viável que a ordenação topológica calcula.

### Slide 10: Kahn organiza uma ordem viável

**Quem:** Bruno, **Tempo:** 01:20, **Cronômetro:** 11:20 a 12:40

**Fala sugerida**

O algoritmo de Kahn começa pelas disciplinas com grau de entrada zero. Elas entram em uma fila. Ao retirar uma disciplina da fila, reduzimos os graus de entrada dos seus dependentes. Quem chega a zero pode entrar na fila também. Repetimos até processar a grade. Se sobrarem vértices sem processamento, há um ciclo. Uma ordem topológica não é necessariamente única; o requisito é que cada pré-requisito apareça antes de quem depende dele. Agrupando por níveis, nossa base tem quatro camadas, com cargas de duzentas, duzentas e oitenta, duzentas e sessenta e cento e quarenta horas. Esses quatro níveis representam o mínimo no modelo que considera apenas precedência e uma etapa por disciplina. O sistema não calcula oferta de turmas, choque de horários ou limite de carga do aluno. Por isso, não é uma promessa de formatura em quatro semestres.

**Ação / demonstração**

Percorrer os quatro níveis. A demonstração do modo Ordem é opcional apenas se houver folga; não fazer uma quarta troca para o navegador no roteiro principal.

**Transição**

O Luiz vai conectar essas regras ao histórico individual e mostrar o resultado para um aluno.

### Slide 11: Como o histórico altera as matérias liberadas

**Quem:** Luiz, **Tempo:** 02:00, **Cronômetro:** 12:40 a 14:40

**Fala sugerida**

Agora estamos no modo Progresso do aluno e selecionamos Carlos Eduardo. Na base inicial, ele concluiu Geometria Analítica e Pré-Cálculo, então tem duas de treze matérias concluídas. Ele ainda não foi aprovado em ED. A seção Pode se matricular mostra as matérias liberadas, e a seção Matérias bloqueadas explica o que falta concluir para cada uma. Em Sistemas Operacionais, por exemplo, falta ED. Vamos registrar ED como aprovada, com nota sete e meio, no semestre 2026.2. O progresso passa para três de treze e BD e SO deixam de estar bloqueadas. IA1 continua bloqueada, porque ainda falta Álgebra Linear. Ao abrir o histórico completo, vemos o registro salvo. As abas Alunos e Disciplinas também oferecem cadastro, edição e exclusão. O objetivo é permitir a gestão pela interface, mantendo a validação das regras no backend.

**Ação / demonstração**

0 a 25s: Grafo → Progresso do aluno → Carlos Eduardo; apontar 2/13 e SO bloqueada por ED. 25 a 70s: clicar ED liberada; escolher Aprovado, nota 7.5 e semestre 2026.2; clicar Registrar. 70 a 95s: mostrar 3/13, BD e SO liberadas e IA1 ainda bloqueada por AL. 95 a 110s: Abrir histórico completo e apontar o novo registro. 110 a 120s: retornar aos slides. Preparar os campos no ensaio, sem salvar antecipadamente.

**Transição**

Além dessa demonstração, verificamos os comportamentos com testes automatizados.

### Slide 12: Testes e limitações do projeto

**Quem:** Luiz, **Tempo:** 01:20, **Cronômetro:** 14:40 a 16:00

**Fala sugerida**

Rodamos trinta e nove testes automatizados, todos aprovados nesta revisão. Eles verificam a estrutura do grafo, consultas de impacto, ciclos, ordenação, persistência e rotas de cadastro. Os testes usam bancos temporários. Há inclusive um teste que remove o arquivo do banco depois da carga e confirma que as pesquisas continuam funcionando no grafo em memória. Isso dá evidência para a separação que explicamos na arquitetura. Ter todos os testes passando não significa ter cem por cento de cobertura; não medimos nem estamos afirmando isso. Também há limites no modelo: usamos uma grade didática de treze disciplinas, consideramos pré-requisitos e histórico, mas não resolvemos oferta de turmas, horários ou todas as regras acadêmicas de uma universidade. A interface facilita a exploração desses resultados e torna os motivos de bloqueio visíveis.

**Ação / demonstração**

Apontar o número 39 e os três grupos de verificação. Não executar a suíte ao vivo; o resultado já foi conferido. Se perguntarem sobre complexidade, usar a seção de perguntas do roteiro.

**Transição**

Com isso, podemos retomar as três perguntas que abriram a apresentação.

### Slide 13: Resultados do projeto

**Quem:** Luiz, **Tempo:** 01:00, **Cronômetro:** 16:00 a 17:00

**Fala sugerida**

Na consulta de impacto, a DFS mostra os dependentes diretos e indiretos e os caminhos que os conectam. A segunda era se uma relação pode ser cadastrada: a DFS de três cores identifica a dependência circular e permite rejeitar a alteração inválida. A terceira era em que ordem cursar as matérias: Kahn produz uma sequência que respeita as precedências. Ao combinar essas análises com o histórico do aluno, conseguimos mostrar matérias concluídas, em andamento, liberadas e bloqueadas, com explicação dos pré-requisitos pendentes. Esse é o resultado do projeto: usar conceitos de grafos para tornar as relações curriculares compreensíveis e verificáveis em uma aplicação. Obrigado. Agora estamos à disposição para perguntas.

**Ação / demonstração**

Encerrar com os três resultados. Abrir perguntas se houver tempo; cada integrante responde pelo seu bloco.

**Transição**

Perguntas: André: modelagem; Leonidas: arquitetura e impacto; Bruno: ciclos e Kahn; Luiz: interface, histórico e testes.

## Cola das demonstrações

| Slide | Quem fala | Ação essencial | Resultado conferido |
|---|---|---|---|
| 7 | Leonidas | Grafo → Impacto → pesquisar ED | BD, SO, Redes, IA1, IA2; fator de bloqueio 5; caminho até Redes: ED → SO → Redes |
| 7, opcional | Leonidas | Pesquisar Física | Disciplina não encontrada; não cria um vértice |
| 9 | Bruno | Grafo → Ciclos → Usar IA2 → ED → Executar DFS | Ciclo ED → IA1 → IA2 → ED; 10 passos; relação recusada; permanecem 11 pré-requisitos |
| 11 | Luiz | Progresso do aluno → Carlos → ED → Aprovado, nota 7.5, semestre 2026.2 → Registrar | Progresso 2/13 → 3/13; BD e SO liberadas; IA1 continua bloqueada por AL |
| 11 | Luiz | Abrir histórico completo | Registro de ED aprovado aparece no histórico de Carlos |

Antes do slide 11, Carlos tem GA e Pré-Cálculo concluídas. As liberadas são ED, Cálculo 1 e AL. Depois de aprovar ED, as liberadas são BD, Cálculo 1, SO e AL. IA1 ainda exige AL. Não dizer que aprovar ED libera imediatamente todas as cinco impactadas.

## Ajuste para 15 ou 20 minutos

### Versão de 15 minutos

Manter todos os integrantes e todos os conceitos. Encurtar a abertura, retirar a busca por Física e usar apenas os exemplos principais. Não acrescentar cadastro de aluno ou disciplina, edição, exclusão nem animação de Kahn ao vivo.

| Integrante | Tempo | Intervalo |
|---|---|---|
| André | 3min30s | 00:00 a 03:30 |
| Leonidas | 3min45s | 03:30 a 07:15 |
| Bruno | 3min45s | 07:15 a 11:00 |
| Luiz | 4min | 11:00 a 15:00 |

| Slide | Quem | Tempo de 15 min | Cronômetro |
|---|---|---|---|
| 1 | André | 00:20 | 00:00 a 00:20 |
| 2 | André | 00:30 | 00:20 a 00:50 |
| 3 | André | 01:00 | 00:50 a 01:50 |
| 4 | André | 01:40 | 01:50 a 03:30 |
| 5 | Leonidas | 01:10 | 03:30 a 04:40 |
| 6 | Leonidas | 01:20 | 04:40 a 06:00 |
| 7 | Leonidas | 01:15 | 06:00 a 07:15 |
| 8 | Bruno | 01:15 | 07:15 a 08:30 |
| 9 | Bruno | 01:15 | 08:30 a 09:45 |
| 10 | Bruno | 01:15 | 09:45 a 11:00 |
| 11 | Luiz | 01:50 | 11:00 a 12:50 |
| 12 | Luiz | 01:15 | 12:50 a 14:05 |
| 13 | Luiz | 00:55 | 14:05 a 15:00 |

### Versão de 20 minutos

Usar os 17 minutos principais e reservar **17:00 a 20:00** para perguntas. Cada pessoa responde pelo próprio tema. Caso não haja perguntas, usar a margem para mostrar **Grafo → Ordem → Animar Kahn** (Bruno, até 1 minuto) e a aba **Disciplinas → IA1**, com ED e AL como pré-requisitos (Luiz, até 1 minuto). Encerrar sem preencher o tempo com novas funcionalidades não ensaiadas.

## Perguntas prováveis e respostas curtas

**Por que usar um grafo direcionado? (André)**  
Porque a relação tem sentido: ED é pré-requisito de SO; isso não implica que SO seja pré-requisito de ED. O vértice representa a disciplina e a aresta representa essa precedência.

**Por que usar listas de adjacência? (André)**  
Elas guardam os vizinhos de cada vértice com espaço O(|V| + |E|). A grade tem poucas relações em comparação com todas as combinações possíveis. A lista de antecessores facilita consultar as exigências.

**A consulta usa BFS ou DFS? (Leonidas)**  
O caso de impacto implementado usa DFS. Os caminhos são obtidos por busca em profundidade; não estamos afirmando que sejam os menores caminhos.

**A pesquisa é feita no SQLite? (Leonidas)**  
As pesquisas de dependência: impacto, ciclos e ordenação: usam o grafo carregado em memória. O SQLite persiste os cadastros, fornece o histórico dos alunos e é a fonte padrão de carga da grade. Alterar uma disciplina ou um pré-requisito provoca a recarga do grafo.

**O CSV alimenta o banco em toda inicialização? (Leonidas)**  
Não. O seed define os dados iniciais, grava no SQLite e exporta os CSVs. Existe um carregador alternativo de CSV, mas a API usa o grafo carregado do banco como fluxo padrão.

**As cinco impactadas ficam liberadas ao aprovar ED? (Leonidas / Luiz)**  
Não necessariamente. “Impactada” significa que há um caminho de dependência a partir de ED. A liberação individual exige todos os pré-requisitos diretos aprovados. IA1 exige ED e AL.

**Por que a cor cinza detecta ciclo e a preta não? (Bruno)**  
Cinza identifica um vértice no caminho de recursão ainda ativo. Uma aresta de retorno a ele fecha um caminho. Preto identifica uma exploração já encerrada; duas cadeias podem chegar a esse vértice sem formar ciclo.

**A aresta inválida fica no banco? (Bruno)**  
Não. A validação é temporária e restaura o grafo. A API também rejeita a gravação que cria ciclo; não depende apenas de esconder um botão no frontend.

**A ordem topológica é única? (Bruno)**  
Não. Matérias sem relação de precedência entre si podem trocar de posição. O que precisa valer é que todo pré-requisito apareça antes de sua dependente.

**Todos os algoritmos e endpoints são O(|V| + |E|)? (Bruno / Leonidas)**  
As travessias DFS e o núcleo de Kahn têm esse custo sobre listas de adjacência. A implementação de Kahn também ordena os vértices para tornar o resultado previsível; essas ordenações podem acrescentar O(|V| log |V|). A consulta da API monta caminhos para as disciplinas impactadas, então o custo do endpoint completo não deve ser confundido com o de uma única travessia. A apresentação não promete custo linear para toda a aplicação.

**O sistema promete formatura em quatro semestres? (Bruno / Luiz)**  
Não. A base didática tem quatro níveis de dependência. Isso assume uma etapa por disciplina e paralelismo sem restrição entre matérias liberadas. Oferta, horários, reprovações e limite de carga não fazem parte desse cálculo.

**Passar nos 39 testes significa 100% de cobertura? (Luiz)**  
Não. É o número de testes aprovados na execução realizada em 05/11/2026. Não foi feita uma medição de cobertura. Os testes abrangem os cenários implementados, mas não provam ausência de defeitos.

**Por que o slide 4 mostra período e o slide 10 mostra nível? (André / Bruno)**  
Período sugerido é um atributo cadastrado; nível topológico é calculado a partir das dependências. Eles coincidem nessa base inicial, mas uma alteração de cadastro pode fazer os dois diferirem.

## Referências internas para o grupo

- `src/models/grafo.py`: representação do grafo, DFS, ciclos e ordenação.
- `src/api/server.py`: grafo mantido em memória e rotas da API.
- `src/services/curriculo_service.py`: validação e progresso dos alunos.
- `src/database/seed.py`: base de 13 disciplinas, 11 arestas e 3 alunos.
- `frontend/src/pages/GrafoPage.tsx` e `AlunosPage.tsx`: fluxo da demonstração.
- `docs/CENARIO_DE_TESTE.md`: cenário completo para ensaio e validação; é mais longo que a demonstração de 17 minutos.

## Alterações em relação ao arquivo original

A versão revisada usa a grade real do projeto, inclui React e a API na arquitetura, corrige o fluxo do seed/CSV, apresenta DFS como a busca implementada e substitui a afirmação de “100%” pelo resultado medido de 39 testes aprovados. Os quatro níveis são descritos com as hipóteses do modelo. Os diagramas são editáveis. As falas e os tempos ficam somente neste roteiro. O original foi preservado em `teoria_dos_grafos_original.pptx`.
