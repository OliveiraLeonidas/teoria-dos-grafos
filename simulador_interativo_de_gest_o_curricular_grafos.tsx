import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Network,
  Database,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Code2,
  FileSpreadsheet,
  GraduationCap,
  Clock,
  ChevronRight,
  Info,
  XCircle,
  FlaskConical
} from 'lucide-react';

// ============================================================================
// DADOS INICIAIS (Fiel aos arquivos disciplinas.csv e dependencias.csv)
// ============================================================================
const INITIAL_DISCIPLINAS = [
  // 1º Semestre (Nível 1 - Base)
  { codigo: 'ALG101', nome: 'Algoritmos e Prog. I', semestre: 1, cargaHoraria: 80, row: 0 },
  { codigo: 'MAT101', nome: 'Matemática Discreta', semestre: 1, cargaHoraria: 60, row: 1 },
  { codigo: 'CAL101', nome: 'Cálculo Diferencial I', semestre: 1, cargaHoraria: 80, row: 2 },

  // 2º Semestre (Nível 2)
  { codigo: 'EDA201', nome: 'Estruturas de Dados', semestre: 2, cargaHoraria: 80, row: 0 },
  { codigo: 'POO202', nome: 'Prog. Orientada a Objetos', semestre: 2, cargaHoraria: 60, row: 1 },
  { codigo: 'ALN203', nome: 'Álgebra Linear', semestre: 2, cargaHoraria: 60, row: 2 },

  // 3º Semestre (Nível 3)
  { codigo: 'GRA301', nome: 'Teoria dos Grafos', semestre: 3, cargaHoraria: 60, row: 0 },
  { codigo: 'BD302', nome: 'Banco de Dados Relacional', semestre: 3, cargaHoraria: 60, row: 1 },
  { codigo: 'PRO303', nome: 'Probabilidade e Estatística', semestre: 3, cargaHoraria: 60, row: 2 },

  // 4º Semestre (Nível 4)
  { codigo: 'IA401', nome: 'Inteligência Artificial', semestre: 4, cargaHoraria: 80, row: 0 },
  { codigo: 'ES402', nome: 'Engenharia de Software', semestre: 4, cargaHoraria: 60, row: 1 },
  { codigo: 'APA403', nome: 'Análise de Algoritmos', semestre: 4, cargaHoraria: 60, row: 2 },

  // 5º Semestre (Nível 5 - Integração)
  { codigo: 'TCC501', nome: 'Projeto Final de Curso', semestre: 5, cargaHoraria: 120, row: 0 },
  { codigo: 'SAD502', nome: 'Sistemas Distribuídos', semestre: 5, cargaHoraria: 60, row: 1 },
];

const INITIAL_DEPENDENCIAS = [
  // Semestre 1 -> 2
  { origem: 'ALG101', destino: 'EDA201' },
  { origem: 'ALG101', destino: 'POO202' },
  { origem: 'CAL101', destino: 'ALN203' },

  // Semestre 1/2 -> 3
  { origem: 'EDA201', destino: 'GRA301' },
  { origem: 'MAT101', destino: 'GRA301' },
  { origem: 'EDA201', destino: 'BD302' },
  { origem: 'POO202', destino: 'BD302' },
  { origem: 'CAL101', destino: 'PRO303' },

  // Semestre 2/3 -> 4
  { origem: 'GRA301', destino: 'IA401' },
  { origem: 'ALN203', destino: 'IA401' },
  { origem: 'PRO303', destino: 'IA401' },
  { origem: 'BD302', destino: 'ES402' },
  { origem: 'POO202', destino: 'ES402' },
  { origem: 'GRA301', destino: 'APA403' },

  // Semestre 4 -> 5
  { origem: 'IA401', destino: 'TCC501' },
  { origem: 'ES402', destino: 'TCC501' },
  { origem: 'APA403', destino: 'SAD502' },
  { origem: 'ES402', destino: 'SAD502' },
];

export default function App() {
  // Estados principais do Grafo
  const [disciplinas, setDisciplinas] = useState(INITIAL_DISCIPLINAS);
  const [dependencias, setDependencias] = useState(INITIAL_DEPENDENCIAS);

  // Aba de visualização: 'grafo' | 'adjacencia' | 'database'
  const [activeTab, setActiveTab] = useState('grafo');

  // Modo de operação interativa:
  // 'exploracao' | 'dfs_ciclo' | 'kahn' | 'caminho_critico' | 'matricula'
  const [activeMode, setActiveMode] = useState('exploracao');

  // Seleção de vértice para análise de impacto / pré-requisitos
  const [selectedNode, setSelectedNode] = useState('GRA301');

  // Estados de algoritmos passo a passo / animados
  const [dfsColors, setDfsColors] = useState({}); // { codigo: 'WHITE' | 'GRAY' | 'BLACK' | 'CYCLE' }
  const [cycleEdges, setCycleEdges] = useState([]);
  const [hasDeadlockEdge, setHasDeadlockEdge] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Estado da Ordenação Topológica (Kahn)
  const [kahnOrder, setKahnOrder] = useState([]);
  const [kahnStepIndex, setKahnStepIndex] = useState(-1);

  // Estado do Caminho Crítico
  const [criticalPath, setCriticalPath] = useState([]);

  // Estado do Simulador de Matrícula (Disciplinas concluídas pelo aluno)
  const [completedCourses, setCompletedCourses] = useState(['ALG101', 'MAT101', 'CAL101']);

  // Modal de nova aresta / disciplina
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEdgeOrigin, setNewEdgeOrigin] = useState('EDA201');
  const [newEdgeTarget, setNewEdgeTarget] = useState('PRO303');

  // Logs do Terminal Python (main.py)
  const [logs, setLogs] = useState([
    { time: '10:00:01', type: 'info', text: '[SQLite] Conectado a data/universidade.db com sucesso.' },
    { time: '10:00:02', type: 'cmd', text: '>>> service = CurriculoService(db_manager)' },
    { time: '10:00:02', type: 'success', text: '[Grafo] 14 vértices (Disciplinas) e 18 arestas carregadas em Lista de Adjacência.' },
    { time: '10:00:03', type: 'info', text: 'Clique em qualquer disciplina no grafo ou execute um algoritmo no painel lateral.' }
  ]);

  const terminalEndRef = useRef(null);

  const addLog = (type, text) => {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    setLogs((prev) => [...prev.slice(-35), { time, type, text }]);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // ============================================================================
  // ESTRUTURAS DERIVADAS DO GRAFO (Lista de Adjacência, Graus, Fecho Transitivo)
  // ============================================================================
  const graphData = useMemo(() => {
    const adj = {};
    const revAdj = {};
    const inDegree = {};
    const outDegree = {};

    disciplinas.forEach((d) => {
      adj[d.codigo] = [];
      revAdj[d.codigo] = [];
      inDegree[d.codigo] = 0;
      outDegree[d.codigo] = 0;
    });

    dependencias.forEach(({ origem, destino }) => {
      if (adj[origem] && adj[destino]) {
        adj[origem].push(destino);
        revAdj[destino].push(origem);
        inDegree[destino] = (inDegree[destino] || 0) + 1;
        outDegree[origem] = (outDegree[origem] || 0) + 1;
      }
    });

    return { adj, revAdj, inDegree, outDegree };
  }, [disciplinas, dependencias]);

  // Calcula Pré-requisitos (Ascendentes) e Dependentes em Cascata (Descendentes) do nó selecionado
  const selectedAnalysis = useMemo(() => {
    if (!selectedNode || !graphData.adj[selectedNode]) {
      return { directPrereqs: new Set(), allPrereqs: new Set(), directDeps: new Set(), allDeps: new Set() };
    }

    const directPrereqs = new Set(graphData.revAdj[selectedNode] || []);
    const directDeps = new Set(graphData.adj[selectedNode] || []);

    // BFS para todos os pré-requisitos acumulados (Ascendentes)
    const allPrereqs = new Set();
    const qPre = [...directPrereqs];
    while (qPre.length > 0) {
      const curr = qPre.shift();
      if (!allPrereqs.has(curr)) {
        allPrereqs.add(curr);
        (graphData.revAdj[curr] || []).forEach((p) => qPre.push(p));
      }
    }

    // BFS para Fecho Transitivo Direto (Efeito Dominó de Reprovação)
    const allDeps = new Set();
    const qDep = [...directDeps];
    while (qDep.length > 0) {
      const curr = qDep.shift();
      if (!allDeps.has(curr)) {
        allDeps.add(curr);
        (graphData.adj[curr] || []).forEach((n) => qDep.push(n));
      }
    }

    return { directPrereqs, allPrereqs, directDeps, allDeps };
  }, [selectedNode, graphData]);

  // ============================================================================
  // ALGORITMO 1: DETECÇÃO DE CICLOS (DFS 3 CORES)
  // ============================================================================
  const runCycleDetectionDFS = () => {
    setActiveMode('dfs_ciclo');
    setIsAnimating(true);
    setCycleEdges([]);

    addLog('cmd', '>>> grafo.tem_ciclo() # Busca em Profundidade (DFS 3 Cores)');
    addLog('info', '[DFS] Inicializando todos os vértices com estado BRANCO (0)...');

    const colors = {};
    disciplinas.forEach((d) => (colors[d.codigo] = 'WHITE'));

    const steps = [];
    let foundCycle = false;
    let detectedBackEdge = null;
    const parentMap = {};

    const dfsVisit = (u) => {
      if (foundCycle) return;
      colors[u] = 'GRAY';
      steps.push({ colors: { ...colors }, msg: `[DFS] Visitando ${u} -> Estado CINZA (Na pilha de recursão)` });

      const neighbors = graphData.adj[u] || [];
      for (const v of neighbors) {
        if (foundCycle) return;
        if (colors[v] === 'GRAY') {
          foundCycle = true;
          detectedBackEdge = { origem: u, destino: v };
          // Reconstruir caminho do ciclo
          const cycleNodes = [v, u];
          let curr = u;
          while (curr !== v && parentMap[curr]) {
            curr = parentMap[curr];
            cycleNodes.push(curr);
          }
          cycleNodes.forEach((cn) => {
            colors[cn] = 'CYCLE';
          });
          steps.push({
            colors: { ...colors },
            cycleEdge: detectedBackEdge,
            msg: `[ERRO CRÍTICO] Aresta de retorno detectada (${u} -> ${v})! Vértice ${v} já estava CINZA. Ciclo encontrado!`
          });
          return;
        } else if (colors[v] === 'WHITE') {
          parentMap[v] = u;
          dfsVisit(v);
        }
      }

      if (!foundCycle) {
        colors[u] = 'BLACK';
        steps.push({ colors: { ...colors }, msg: `[DFS] Finalizado ${u} -> Estado PRETO (Subgrafo validado)` });
      }
    };

    disciplinas.forEach((d) => {
      if (colors[d.codigo] === 'WHITE' && !foundCycle) {
        dfsVisit(d.codigo);
      }
    });

    // Animar os passos
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        const step = steps[i];
        setDfsColors(step.colors);
        if (step.cycleEdge) {
          setCycleEdges([step.cycleEdge]);
          addLog('error', step.msg);
        } else if (i % 4 === 0 || i === steps.length - 1) {
          addLog('info', step.msg);
        }
        i++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        if (!foundCycle) {
          addLog('success', '>>> Retorno: False (Grafo é um DAG válido! Zero dependências circulares. Custo: O(|V|+|E|))');
        } else {
          addLog('error', '>>> ValueError: Deadlock Acadêmico! A grade possui dependência circular e não pode ser homologada.');
        }
      }
    }, 180);
  };

  // Alternar Injeção de Aresta Circular (Deadlock)
  const toggleDeadlockEdge = () => {
    const deadlockEdge = { origem: 'IA401', destino: 'ALG101' };
    if (!hasDeadlockEdge) {
      setDependencias((prev) => [...prev, deadlockEdge]);
      setHasDeadlockEdge(true);
      addLog('cmd', ">>> grafo.adicionar_aresta('IA401', 'ALG101') # Forçando ciclo");
      addLog('error', '[ALERTA] Dependência circular IA401 -> ALG101 inserida! Execute "Detectar Ciclos (DFS)" para testar.');
    } else {
      setDependencias((prev) =>
        prev.filter((e) => !(e.origem === deadlockEdge.origem && e.destino === deadlockEdge.destino))
      );
      setHasDeadlockEdge(false);
      setCycleEdges([]);
      setDfsColors({});
      addLog('cmd', ">>> grafo.remover_aresta('IA401', 'ALG101')");
      addLog('success', '[OK] Aresta anômala removida. O currículo voltou a ser um DAG.');
    }
  };

  // ============================================================================
  // ALGORITMO 2: ORDENAÇÃO TOPOLÓGICA (ALGORITMO DE KAHN)
  // ============================================================================
  const runKahnTopologicalSort = () => {
    setActiveMode('kahn');
    setKahnOrder([]);
    setKahnStepIndex(-1);

    addLog('cmd', '>>> curriculo_service.gerar_ordenacao_topologica() # Algoritmo de Kahn');

    const inDeg = { ...graphData.inDegree };
    const queue = [];
    disciplinas.forEach((d) => {
      if (inDeg[d.codigo] === 0) queue.push(d.codigo);
    });

    addLog('info', `[Kahn] Fila inicial (in-degree = 0): [${queue.join(', ')}]`);

    const order = [];
    while (queue.length > 0) {
      const u = queue.shift();
      order.push(u);
      (graphData.adj[u] || []).forEach((v) => {
        inDeg[v] -= 1;
        if (inDeg[v] === 0) {
          queue.push(v);
        }
      });
    }

    if (order.length < disciplinas.length) {
      addLog('error', `[Kahn] Falha na Ordenação Topológica! Apenas ${order.length}/${disciplinas.length} vértices ordenados (Ciclo presente no grafo).`);
      setKahnOrder(order);
      setKahnStepIndex(order.length - 1);
      return;
    }

    setKahnOrder(order);
    setIsAnimating(true);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < order.length) {
        setKahnStepIndex(idx);
        idx++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        addLog('success', `>>> Sequência Linear Válida (${order.length} matérias): ${order.join(' → ')}`);
      }
    }, 150);
  };

  // ============================================================================
  // ALGORITMO 3: CAMINHO CRÍTICO (MAIOR CAMINHO EM DAG)
  // ============================================================================
  const runCriticalPath = () => {
    setActiveMode('caminho_critico');
    addLog('cmd', '>>> curriculo_service.calcular_caminho_critico() # Programação Dinâmica em DAG');

    if (hasDeadlockEdge) {
      addLog('error', '[Erro] Impossível calcular Caminho Crítico com ciclo ativo. Remova o deadlock primeiro.');
      return;
    }

    // Ordenação topológica rápida
    const inDeg = { ...graphData.inDegree };
    const q = disciplinas.filter((d) => inDeg[d.codigo] === 0).map((d) => d.codigo);
    const topo = [];
    while (q.length > 0) {
      const u = q.shift();
      topo.push(u);
      (graphData.adj[u] || []).forEach((v) => {
        inDeg[v]--;
        if (inDeg[v] === 0) q.push(v);
      });
    }

    const dist = {};
    const parent = {};
    disciplinas.forEach((d) => {
      dist[d.codigo] = 1;
      parent[d.codigo] = null;
    });

    let maxNode = topo[0];
    topo.forEach((u) => {
      (graphData.adj[u] || []).forEach((v) => {
        if (dist[u] + 1 > dist[v]) {
          dist[v] = dist[u] + 1;
          parent[v] = u;
        }
      });
      if (dist[u] > dist[maxNode]) {
        maxNode = u;
      }
    });

    const path = [];
    let curr = maxNode;
    while (curr) {
      path.unshift(curr);
      curr = parent[curr];
    }

    setCriticalPath(path);
    addLog('success', `>>> Caminho Crítico identificado (${path.length} semestres mínimos): ${path.join(' → ')}`);
    addLog('info', '[Análise] Qualquer reprovação nesta trilha atrasa obrigatoriamente a formatura do aluno.');
  };

  // ============================================================================
  // EXECUÇÃO DE TESTES UNITÁRIOS SIMULADOS (pytest)
  // ============================================================================
  const runPytestSuite = () => {
    addLog('cmd', '$ pytest tests/test_grafo.py tests/test_database.py -v');
    setTimeout(() => {
      addLog('success', 'tests/test_database.py::test_conexao_sqlite PASSED [ 16%]');
      addLog('success', 'tests/test_database.py::test_carga_csv_seed PASSED [ 33%]');
      addLog('success', 'tests/test_grafo.py::test_adicionar_vertices_arestas PASSED [ 50%]');
      addLog('success', 'tests/test_grafo.py::test_deteccao_ciclo_dfs PASSED [ 66%]');
      addLog('success', 'tests/test_grafo.py::test_ordenacao_topologica_kahn PASSED [ 83%]');
      addLog('success', 'tests/test_grafo.py::test_fecho_transitivo_reprovacao PASSED [100%]');
      addLog('info', '================ 6 passed in 0.08s ================ (100% Coverage)');
    }, 350);
  };

  // Alternar conclusão de matéria no modo Matrícula
  const toggleCourseCompletion = (codigo) => {
    setCompletedCourses((prev) => {
      const exists = prev.includes(codigo);
      const updated = exists ? prev.filter((c) => c !== codigo) : [...prev, codigo];
      addLog(
        'cmd',
        `>>> aluno.${exists ? 'desmarcar_concluida' : 'registrar_aprovacao'}('${codigo}')`
      );
      return updated;
    });
  };

  // Adicionar nova aresta pelo modal
  const handleAddCustomEdge = (e) => {
    e.preventDefault();
    if (newEdgeOrigin === newEdgeTarget) return;
    const exists = dependencias.some(
      (d) => d.origem === newEdgeOrigin && d.destino === newEdgeTarget
    );
    if (!exists) {
      setDependencias((prev) => [...prev, { origem: newEdgeOrigin, destino: newEdgeTarget }]);
      addLog('cmd', `>>> grafo.adicionar_aresta('${newEdgeOrigin}', '${newEdgeTarget}')`);
      addLog('success', `[SQLite + RAM] Novo pré-requisito registrado: ${newEdgeOrigin} → ${newEdgeTarget}`);
    }
    setShowAddModal(false);
  };

  // Resetar para estado original
  const handleReset = () => {
    setDisciplinas(INITIAL_DISCIPLINAS);
    setDependencias(INITIAL_DEPENDENCIAS);
    setHasDeadlockEdge(false);
    setDfsColors({});
    setCycleEdges([]);
    setKahnOrder([]);
    setKahnStepIndex(-1);
    setCriticalPath([]);
    setActiveMode('exploracao');
    setSelectedNode('GRA301');
    addLog('info', '[Sistema] Grafo restaurado para a configuração original dos arquivos CSV.');
  };

  // ============================================================================
  // COORDENADAS GEOMÉTRICAS DO GRAFO SVG (Responsivo e Limpo)
  // ============================================================================
  const nodePositions = useMemo(() => {
    const pos = {};
    const colWidth = 215;
    const rowHeight = 135;
    const startX = 115;
    const startY = 85;

    disciplinas.forEach((d) => {
      const x = startX + (d.semestre - 1) * colWidth;
      const y = startY + d.row * rowHeight;
      pos[d.codigo] = { x, y, width: 176, height: 84 };
    });
    return pos;
  }, [disciplinas]);

  // Determina a estilização visual de cada Vértice de acordo com o Modo Ativo
  const getNodeVisualStyle = (codigo) => {
    // 1. Modo DFS Detecção de Ciclos
    if (activeMode === 'dfs_ciclo') {
      const state = dfsColors[codigo] || 'WHITE';
      if (state === 'CYCLE') {
        return {
          bg: '#fef2f2',
          border: '#dc2626',
          badgeBg: '#dc2626',
          badgeText: '#ffffff',
          statusLabel: 'CICLO / DEADLOCK',
          opacity: 1
        };
      }
      if (state === 'GRAY') {
        return {
          bg: '#fffbeb',
          border: '#d97706',
          badgeBg: '#d97706',
          badgeText: '#ffffff',
          statusLabel: 'CINZA (Pilha)',
          opacity: 1
        };
      }
      if (state === 'BLACK') {
        return {
          bg: '#0f172a',
          border: '#334155',
          textMain: '#f8fafc',
          textSub: '#94a3b8',
          badgeBg: '#10b981',
          badgeText: '#ffffff',
          statusLabel: 'PRETO (OK)',
          opacity: 1
        };
      }
      return {
        bg: '#ffffff',
        border: '#cbd5e1',
        badgeBg: '#e2e8f0',
        badgeText: '#475569',
        statusLabel: 'BRANCO (0)',
        opacity: 0.85
      };
    }

    // 2. Modo Ordenação Topológica de Kahn
    if (activeMode === 'kahn') {
      const orderIdx = kahnOrder.indexOf(codigo);
      if (orderIdx !== -1 && orderIdx <= kahnStepIndex) {
        return {
          bg: '#eff6ff',
          border: '#2563eb',
          badgeBg: '#1d4ed8',
          badgeText: '#ffffff',
          statusLabel: `${orderIdx + 1}º na Fila`,
          opacity: 1
        };
      }
      return {
        bg: '#f8fafc',
        border: '#cbd5e1',
        badgeBg: '#e2e8f0',
        badgeText: '#64748b',
        statusLabel: `d⁻ = ${graphData.inDegree[codigo]}`,
        opacity: 0.55
      };
    }

    // 3. Modo Caminho Crítico
    if (activeMode === 'caminho_critico') {
      const isCrit = criticalPath.includes(codigo);
      if (isCrit) {
        const stepNum = criticalPath.indexOf(codigo) + 1;
        return {
          bg: '#fffbeb',
          border: '#d97706',
          badgeBg: '#d97706',
          badgeText: '#ffffff',
          statusLabel: `Gargalo #${stepNum}`,
          opacity: 1
        };
      }
      return {
        bg: '#ffffff',
        border: '#e2e8f0',
        badgeBg: '#f1f5f9',
        badgeText: '#64748b',
        statusLabel: 'Folga > 0',
        opacity: 0.4
      };
    }

    // 4. Modo Simulador de Matrícula
    if (activeMode === 'matricula') {
      const isCompleted = completedCourses.includes(codigo);
      const prereqs = graphData.revAdj[codigo] || [];
      const isUnlocked = !isCompleted && prereqs.every((p) => completedCourses.includes(p));

      if (isCompleted) {
        return {
          bg: '#ecfdf5',
          border: '#059669',
          badgeBg: '#059669',
          badgeText: '#ffffff',
          statusLabel: 'CONCLUÍDA ✓',
          opacity: 1
        };
      }
      if (isUnlocked) {
        return {
          bg: '#eff6ff',
          border: '#2563eb',
          badgeBg: '#2563eb',
          badgeText: '#ffffff',
          statusLabel: 'LIBERADA!',
          opacity: 1
        };
      }
      return {
        bg: '#f8fafc',
        border: '#cbd5e1',
        badgeBg: '#e2e8f0',
        badgeText: '#64748b',
        statusLabel: 'BLOQUEADA',
        opacity: 0.5
      };
    }

    // 5. Modo Padrão: Exploração de Impacto & Pré-requisitos
    if (selectedNode === codigo) {
      return {
        bg: '#0f172a',
        border: '#0ea5e9',
        textMain: '#ffffff',
        textSub: '#bae6fd',
        badgeBg: '#0ea5e9',
        badgeText: '#0f172a',
        statusLabel: 'SELECIONADA',
        opacity: 1
      };
    }
    if (selectedAnalysis.directPrereqs.has(codigo)) {
      return {
        bg: '#eff6ff',
        border: '#2563eb',
        badgeBg: '#2563eb',
        badgeText: '#ffffff',
        statusLabel: 'PRÉ-REQ DIRETO',
        opacity: 1
      };
    }
    if (selectedAnalysis.allPrereqs.has(codigo)) {
      return {
        bg: '#f0f9ff',
        border: '#38bdf8',
        badgeBg: '#0284c7',
        badgeText: '#ffffff',
        statusLabel: 'PRÉ-REQ INDIRETO',
        opacity: 0.95
      };
    }
    if (selectedAnalysis.directDeps.has(codigo)) {
      return {
        bg: '#fff1f2',
        border: '#e11d48',
        badgeBg: '#e11d48',
        badgeText: '#ffffff',
        statusLabel: 'TRAVA DIRETA',
        opacity: 1
      };
    }
    if (selectedAnalysis.allDeps.has(codigo)) {
      return {
        bg: '#fff7ed',
        border: '#f97316',
        badgeBg: '#ea580c',
        badgeText: '#ffffff',
        statusLabel: 'EFEITO DOMINÓ',
        opacity: 0.95
      };
    }

    return {
      bg: '#ffffff',
      border: '#cbd5e1',
      badgeBg: '#f1f5f9',
      badgeText: '#475569',
      statusLabel: `d⁻:${graphData.inDegree[codigo]} | d⁺:${graphData.outDegree[codigo]}`,
      opacity: selectedNode ? 0.38 : 1
    };
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none">
      {/* ====================================================================
          HEADER EXECUTIVO (ESTILO CORPORATIVO)
      ==================================================================== */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Engenharia de Computação
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0.0 • universidade.db</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white mt-0.5">
              Sistema de Gestão e Análise Curricular Baseado em Teoria dos Grafos
            </h1>
          </div>
        </div>

        {/* Métricas Rápidas do Grafo G = (V, E) */}
        <div className="flex items-center gap-5 bg-slate-800/90 border border-slate-700 px-4 py-2 rounded-xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Vértices |V|</p>
            <p className="text-base font-bold text-white font-mono">{disciplinas.length}</p>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Arestas |E|</p>
            <p className="text-base font-bold text-sky-400 font-mono">{dependencias.length}</p>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Integridade DAG</p>
            {hasDeadlockEdge ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" /> CICLO ATIVO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> ACÍCLICO
              </span>
            )}
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Complexidade</p>
            <p className="text-xs font-bold text-amber-400 font-mono">O(|V| + |E|)</p>
          </div>
        </div>
      </header>

      {/* ====================================================================
          CORPO PRINCIPAL: SIDEBAR DE ALGORITMOS + ÁREA CENTRAL
      ==================================================================== */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* SIDEBAR ESQUERDA: PAINEL DE CONTROLE (`curriculo_service.py` & `grafo.py`) */}
        <aside className="w-full lg:w-80 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col justify-between p-4 space-y-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Seletor de Modo / Algoritmos */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-sky-400" />
                Módulos Algorítmicos (grafo.py)
              </p>

              <div className="space-y-2">
                {/* Botão 0: Exploração de Fecho Transitivo */}
                <button
                  onClick={() => {
                    setActiveMode('exploracao');
                    addLog('cmd', `>>> curriculo_service.analisar_impacto('${selectedNode || 'GRA301'}')`);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between ${
                    activeMode === 'exploracao'
                      ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GitBranch className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Fecho Transitivo & Impacto</p>
                      <p className="text-[11px] text-slate-400">Pré-requisitos e efeito dominó (BFS)</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Botão 1: Detecção de Ciclos DFS */}
                <button
                  onClick={runCycleDetectionDFS}
                  disabled={isAnimating}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between ${
                    activeMode === 'dfs_ciclo'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">1. Detectar Ciclos (DFS 3 Cores)</p>
                      <p className="text-[11px] text-slate-400">Valida propriedade DAG (Branco/Cinza/Preto)</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-amber-400" />
                </button>

                {/* Botão 2: Ordenação Topológica de Kahn */}
                <button
                  onClick={runKahnTopologicalSort}
                  disabled={isAnimating}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between ${
                    activeMode === 'kahn'
                      ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">2. Ordenação Topológica (Kahn)</p>
                      <p className="text-[11px] text-slate-400">Sequência linear por Grau de Entrada (d⁻)</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-blue-400" />
                </button>

                {/* Botão 3: Caminho Crítico */}
                <button
                  onClick={runCriticalPath}
                  disabled={isAnimating}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between ${
                    activeMode === 'caminho_critico'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">3. Caminho Crítico (DAG Max)</p>
                      <p className="text-[11px] text-slate-400">Maior cadeia sequencial do curso</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-amber-400" />
                </button>

                {/* Botão 4: Simulador de Matrícula */}
                <button
                  onClick={() => {
                    setActiveMode('matricula');
                    addLog('cmd', '>>> curriculo_service.listar_disciplinas_elegiveis(concluidas)');
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between ${
                    activeMode === 'matricula'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">4. Planejador de Matrícula</p>
                      <p className="text-[11px] text-slate-400">Clique nas matérias para aprovar/liberar</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>

            {/* Simulador de Anomalia / Deadlock Acadêmico */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Teste de Estresse & Validação
              </p>

              <button
                onClick={toggleDeadlockEdge}
                className={`w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border transition ${
                  hasDeadlockEdge
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-950/50'
                    : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-200 border-rose-700/60'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                {hasDeadlockEdge
                  ? 'Remover Ciclo (IA401 → ALG101)'
                  : 'Injetar Ciclo (Forçar Deadlock)'}
              </button>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" /> Nova Aresta
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Restaurar
                </button>
              </div>
            </div>

            {/* Card de Inspeção da Disciplina Selecionada */}
            {selectedNode && (
              <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {selectedNode}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {disciplinas.find((d) => d.codigo === selectedNode)?.semestre}º Semestre •{' '}
                    {disciplinas.find((d) => d.codigo === selectedNode)?.cargaHoraria}h
                  </span>
                </div>
                <p className="text-sm font-bold text-white leading-snug">
                  {disciplinas.find((d) => d.codigo === selectedNode)?.nome}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/80">
                    <p className="text-[10px] text-slate-400 uppercase">Pré-requisitos (d⁻)</p>
                    <p className="text-sm font-bold text-blue-400 font-mono">
                      {selectedAnalysis.directPrereqs.size} diretos ({selectedAnalysis.allPrereqs.size} total)
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700/80">
                    <p className="text-[10px] text-slate-400 uppercase">Trava em Cascata</p>
                    <p className="text-sm font-bold text-rose-400 font-mono">
                      {selectedAnalysis.allDeps.size} matérias
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botão Pytest no Rodapé da Sidebar */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={runPytestSuite}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              Executar Suíte Pytest (tests/)
            </button>
          </div>
        </aside>

        {/* ====================================================================
            ÁREA CENTRAL: CANVAS DO GRAFO + ABAS DE ESTRUTURA DE DADOS + TERMINAL
        ==================================================================== */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Barra Superior de Abas e Legenda Dinâmica */}
          <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {/* Abas de Visualização */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('grafo')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'grafo'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                Grafo Expandido (DAG)
              </button>
              <button
                onClick={() => setActiveTab('adjacencia')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'adjacencia'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                Lista de Adjacência (RAM)
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  activeTab === 'database'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                SQLite & CSV (`src/database`)
              </button>
            </div>

            {/* Legenda Contextual conforme o Algoritmo Ativo */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {activeMode === 'exploracao' && (
                <>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-slate-900 border border-sky-400 inline-block" />
                    Disciplina Foco
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-600 inline-block" />
                    Pré-requisitos (Ascendentes)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-rose-100 border-2 border-rose-600 inline-block" />
                    Bloqueio por Reprovação (Fecho Transitivo)
                  </span>
                </>
              )}

              {activeMode === 'dfs_ciclo' && (
                <>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-white border-2 border-slate-400 inline-block" />
                    Branco (Não Visitado)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-amber-100 border-2 border-amber-600 inline-block" />
                    Cinza (Na Pilha Ativa)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-slate-900 border-2 border-emerald-500 inline-block" />
                    Preto (Validado)
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-rose-600">
                    <span className="w-3 h-3 rounded bg-rose-100 border-2 border-rose-600 inline-block" />
                    Ciclo Detectado!
                  </span>
                </>
              )}

              {activeMode === 'matricula' && (
                <>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-600 inline-block" />
                    Concluída (Clique para alternar)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <span className="w-3 h-3 rounded bg-blue-100 border-2 border-blue-600 inline-block" />
                    Elegível para Matrícula (d⁻ pendente = 0)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* ==================================================================
              CONTEÚDO DA ABA 1: VISUALIZAÇÃO INTERATIVA DO GRAFO (SVG)
          ================================================================== */}
          {activeTab === 'grafo' && (
            <div className="flex-1 relative overflow-auto p-4 flex flex-col items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">
              {/* Banner Flutuante de Resultado de Algoritmo */}
              {activeMode === 'kahn' && kahnOrder.length > 0 && (
                <div className="w-full max-w-6xl mb-3 bg-white/95 backdrop-blur border border-blue-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 shrink-0">
                      Ordem Topológica (Kahn):
                    </span>
                    {kahnOrder.slice(0, kahnStepIndex + 1).map((cod, i) => (
                      <React.Fragment key={cod}>
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-xs font-bold shrink-0">
                          {i + 1}. {cod}
                        </span>
                        {i < kahnStepIndex && <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {activeMode === 'caminho_critico' && criticalPath.length > 0 && (
                <div className="w-full max-w-6xl mb-3 bg-amber-50/95 border border-amber-300 rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Caminho Crítico ({criticalPath.length} Semestres):
                    </span>
                    <div className="flex items-center gap-1.5">
                      {criticalPath.map((cod, idx) => (
                        <React.Fragment key={cod}>
                          <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-xs font-bold">
                            {cod}
                          </span>
                          {idx < criticalPath.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">
                    Tempo Mínimo de Integralização: {criticalPath.length} Semestres
                  </span>
                </div>
              )}

              {/* SVG Container do Grafo */}
              <div className="bg-white/90 backdrop-blur-sm border border-slate-200/90 rounded-2xl shadow-sm p-2 overflow-x-auto max-w-full">
                <svg
                  viewBox="0 0 1120 465"
                  className="w-[1080px] h-[440px] select-none"
                >
                  <defs>
                    {/* Marcadores de Seta Direcionada */}
                    <marker
                      id="arrow-default"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#94a3b8" />
                    </marker>
                    <marker
                      id="arrow-prereq"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563eb" />
                    </marker>
                    <marker
                      id="arrow-dep"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#e11d48" />
                    </marker>
                    <marker
                      id="arrow-critical"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#d97706" />
                    </marker>
                  </defs>

                  {/* Colunas de Semestres / Níveis Topológicos */}
                  {[1, 2, 3, 4, 5].map((sem) => {
                    const colX = 115 + (sem - 1) * 215 - 88;
                    return (
                      <g key={sem}>
                        <rect
                          x={colX - 8}
                          y={14}
                          width={192}
                          height={432}
                          rx={14}
                          fill={sem % 2 === 1 ? '#f8fafc' : '#f1f5f9'}
                          stroke="#e2e8f0"
                          strokeWidth="1"
                        />
                        <text
                          x={colX + 88}
                          y={36}
                          textAnchor="middle"
                          className="fill-slate-600 font-bold text-[12px] uppercase tracking-wider"
                        >
                          {sem}º Semestre • Nível {sem}
                        </text>
                      </g>
                    );
                  })}

                  {/* ARESTAS DIRECIONADAS (u -> v) */}
                  {dependencias.map(({ origem, destino }) => {
                    const p1 = nodePositions[origem];
                    const p2 = nodePositions[destino];
                    if (!p1 || !p2) return null;

                    const isDeadlock =
                      origem === 'IA401' && destino === 'ALG101';

                    // Pontos de saída e entrada nos cartões
                    const startX = isDeadlock ? p1.x : p1.x + p1.width / 2;
                    const startY = isDeadlock ? p1.y - p1.height / 2 : p1.y;
                    const endX = isDeadlock ? p2.x : p2.x - p2.width / 2 - 4;
                    const endY = isDeadlock ? p2.y - p2.height / 2 : p2.y;

                    // Curva Bézier suave
                    let pathD = '';
                    if (isDeadlock) {
                      // Arco superior longo demonstrando aresta de retorno (Back-Edge)
                      pathD = `M ${startX} ${startY} C ${startX} 5, ${endX} 5, ${endX} ${endY - 4}`;
                    } else {
                      const midX = (startX + endX) / 2;
                      pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
                    }

                    // Cor e destaque da aresta
                    let strokeColor = '#cbd5e1';
                    let strokeW = 2;
                    let marker = 'url(#arrow-default)';
                    let dash = '';

                    if (isDeadlock) {
                      strokeColor = '#dc2626';
                      strokeW = 3.5;
                      marker = 'url(#arrow-dep)';
                      dash = '6,4';
                    } else if (
                      activeMode === 'caminho_critico' &&
                      criticalPath.includes(origem) &&
                      criticalPath.includes(destino) &&
                      criticalPath.indexOf(destino) === criticalPath.indexOf(origem) + 1
                    ) {
                      strokeColor = '#d97706';
                      strokeW = 3.5;
                      marker = 'url(#arrow-critical)';
                    } else if (activeMode === 'exploracao' && selectedNode) {
                      if (
                        (destino === selectedNode && selectedAnalysis.directPrereqs.has(origem)) ||
                        (selectedAnalysis.allPrereqs.has(origem) && selectedAnalysis.allPrereqs.has(destino))
                      ) {
                        strokeColor = '#2563eb';
                        strokeW = 3;
                        marker = 'url(#arrow-prereq)';
                      } else if (
                        (origem === selectedNode && selectedAnalysis.directDeps.has(destino)) ||
                        (selectedAnalysis.allDeps.has(origem) && selectedAnalysis.allDeps.has(destino))
                      ) {
                        strokeColor = '#e11d48';
                        strokeW = 3;
                        marker = 'url(#arrow-dep)';
                      } else {
                        strokeColor = '#e2e8f0';
                        strokeW = 1.5;
                      }
                    }

                    return (
                      <g key={`${origem}->${destino}`}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeW}
                          strokeDasharray={dash}
                          markerEnd={marker}
                          className="transition-all duration-300"
                        />
                        {isDeadlock && (
                          <text
                            x={(startX + endX) / 2}
                            y={18}
                            textAnchor="middle"
                            className="fill-rose-600 font-bold text-[11px]"
                          >
                            ⚠ ARESTA DE RETORNO (DEADLOCK: IA401 → ALG101)
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* VÉRTICES (DISCIPLINAS) */}
                  {disciplinas.map((disc) => {
                    const pos = nodePositions[disc.codigo];
                    const style = getNodeVisualStyle(disc.codigo);
                    const x = pos.x - pos.width / 2;
                    const y = pos.y - pos.height / 2;

                    return (
                      <g
                        key={disc.codigo}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => {
                          if (activeMode === 'matricula') {
                            toggleCourseCompletion(disc.codigo);
                          } else {
                            setSelectedNode(disc.codigo);
                            addLog(
                              'cmd',
                              `>>> curriculo_service.inspecionar_vertice('${disc.codigo}') # d⁻=${graphData.inDegree[disc.codigo]}, d⁺=${graphData.outDegree[disc.codigo]}`
                            );
                          }
                        }}
                        className="cursor-pointer transition-opacity duration-300"
                        style={{ opacity: style.opacity }}
                      >
                        {/* Sombra/Card */}
                        <rect
                          width={pos.width}
                          height={pos.height}
                          rx={12}
                          fill={style.bg}
                          stroke={style.border}
                          strokeWidth={selectedNode === disc.codigo ? 3 : 2}
                        />

                        {/* Cabeçalho do Vértice: Código + Badge de Estado */}
                        <text
                          x={12}
                          y={23}
                          fill={style.textMain || '#0f172a'}
                          className="font-mono font-bold text-[13px]"
                        >
                          {disc.codigo}
                        </text>

                        <rect
                          x={pos.width - 88}
                          y={9}
                          width={78}
                          height={19}
                          rx={5}
                          fill={style.badgeBg}
                        />
                        <text
                          x={pos.width - 49}
                          y={22}
                          textAnchor="middle"
                          fill={style.badgeText}
                          className="font-bold text-[9.5px] uppercase"
                        >
                          {style.statusLabel}
                        </text>

                        {/* Nome da Disciplina */}
                        <text
                          x={12}
                          y={47}
                          fill={style.textMain || '#1e293b'}
                          className="font-bold text-[12px]"
                        >
                          {disc.nome.length > 22 ? disc.nome.slice(0, 21) + '…' : disc.nome}
                        </text>

                        {/* Rodapé: Carga Horária e Graus */}
                        <text
                          x={12}
                          y={69}
                          fill={style.textSub || '#64748b'}
                          className="font-mono text-[10.5px]"
                        >
                          {disc.cargaHoraria}h • Pré:{graphData.inDegree[disc.codigo]} • Dep:{graphData.outDegree[disc.codigo]}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* ==================================================================
              CONTEÚDO DA ABA 2: LISTA DE ADJACÊNCIA EM MEMÓRIA (`grafo.py`)
          ================================================================== */}
          {activeTab === 'adjacencia' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="max-w-5xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Representação em Memória: Lista de Adjacência (`self.adjacencia: dict`)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Consumo espacial otimizado O(|V| + |E|) ideal para matrizes curriculares esparsas.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
                    src/models/grafo.py
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                  {disciplinas.map((d) => {
                    const vizinhos = graphData.adj[d.codigo] || [];
                    return (
                      <div
                        key={d.codigo}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded bg-slate-900 text-sky-400 font-bold">
                            "{d.codigo}"
                          </span>
                          <span className="text-slate-400">→</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {vizinhos.length === 0 ? (
                            <span className="text-slate-400 italic">[] # Vértice Terminal (d⁺=0)</span>
                          ) : (
                            vizinhos.map((v) => (
                              <span
                                key={v}
                                className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold border border-blue-200"
                              >
                                "{v}"
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              CONTEÚDO DA ABA 3: BANCO DE DADOS SQLITE E ARQUIVOS CSV
          ================================================================== */}
          {activeTab === 'database' && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabela disciplinas.csv */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      Tabela `disciplinas` (data/disciplinas.csv)
                    </h3>
                    <span className="text-xs font-mono text-slate-500">{disciplinas.length} registros</span>
                  </div>
                  <div className="overflow-y-auto max-h-72 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white sticky top-0">
                        <tr>
                          <th className="p-2.5">codigo (PK)</th>
                          <th className="p-2.5">nome</th>
                          <th className="p-2.5">semestre</th>
                          <th className="p-2.5">CH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {disciplinas.map((d) => (
                          <tr key={d.codigo} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-blue-700">{d.codigo}</td>
                            <td className="p-2.5 font-medium">{d.nome}</td>
                            <td className="p-2.5 text-center">{d.semestre}º</td>
                            <td className="p-2.5 font-mono">{d.cargaHoraria}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabela dependencias.csv */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-600" />
                      Tabela `dependencias` (data/dependencias.csv)
                    </h3>
                    <span className="text-xs font-mono text-slate-500">{dependencias.length} arestas</span>
                  </div>
                  <div className="overflow-y-auto max-h-72 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white sticky top-0">
                        <tr>
                          <th className="p-2.5">pre_requisito_id (u)</th>
                          <th className="p-2.5">→</th>
                          <th className="p-2.5">disciplina_id (v)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono">
                        {dependencias.map((dep, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-800">{dep.origem}</td>
                            <td className="p-2.5 text-slate-400">→</td>
                            <td className="p-2.5 font-bold text-blue-700">{dep.destino}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================
              TERMINAL PYTHON AO VIVO (`main.py` & Logs de Execução)
          ================================================================== */}
          <div className="h-44 bg-slate-950 text-slate-200 border-t border-slate-800 flex flex-col">
            <div className="px-4 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono font-bold text-slate-300">
                  Terminal Python • main.py / CurriculoService
                </span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-white transition"
              >
                Limpar Console
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span
                    className={
                      log.type === 'cmd'
                        ? 'text-sky-400 font-semibold'
                        : log.type === 'error'
                        ? 'text-rose-400 font-bold'
                        : log.type === 'success'
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODAL: ADICIONAR NOVA RELAÇÃO DE PRÉ-REQUISITO (ARESTA u -> v)
      ==================================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Adicionar Pré-requisito (Nova Aresta Direcionada)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomEdge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Disciplina Pré-requisito (Origem u)
                </label>
                <select
                  value={newEdgeOrigin}
                  onChange={(e) => setNewEdgeOrigin(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                >
                  {disciplinas.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.codigo} — {d.nome} ({d.semestre}º Sem)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Disciplina Dependente (Destino v)
                </label>
                <select
                  value={newEdgeTarget}
                  onChange={(e) => setNewEdgeTarget(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                >
                  {disciplinas.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.codigo} — {d.nome} ({d.semestre}º Sem)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white"
                >
                  Inserir Aresta (u → v)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}