import { AlertTriangle, CheckCircle2, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

const VARIANTES = {
  primario: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600',
  secundario: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300',
  perigo: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600',
  fantasma: 'bg-transparent hover:bg-slate-100 text-slate-600 border-transparent',
} as const;

export function Botao({
  variante = 'secundario',
  pequeno = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof VARIANTES; pequeno?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
        pequeno ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm'
      } ${VARIANTES[variante]} ${className}`}
    />
  );
}

export const classeInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20';

export function Campo({
  rotulo,
  dica,
  erro,
  children,
}: {
  rotulo: string;
  dica?: string;
  erro?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-700 mb-1">{rotulo}</span>
      {children}
      {erro ? (
        <span className="block text-xs text-rose-600 mt-1">{erro}</span>
      ) : (
        dica && <span className="block text-xs text-slate-500 mt-1">{dica}</span>
      )}
    </label>
  );
}

export function AlertaErro({ mensagem, ciclo }: { mensagem: string; ciclo?: string[] | null }) {
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
      <p className="font-semibold">{mensagem}</p>
      {ciclo && <p className="font-mono text-xs mt-1">Ciclo: {ciclo.join(' → ')}</p>}
    </div>
  );
}

export function Modal({
  titulo,
  descricao,
  onFechar,
  children,
}: {
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="titulo-modal" className="text-base font-bold text-slate-900">
              {titulo}
            </h2>
            {descricao && <p className="text-sm text-slate-500 mt-0.5">{descricao}</p>}
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function RodapeModal({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-100">{children}</div>;
}

export interface PedidoConfirmacao {
  titulo: string;
  mensagem: ReactNode;
  rotuloConfirmar: string;
  acao: () => Promise<void>;
}

export function DialogoConfirmacao({ pedido, onFechar }: { pedido: PedidoConfirmacao; onFechar: () => void }) {
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    setExecutando(true);
    setErro(null);
    try {
      await pedido.acao();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setExecutando(false);
    }
  };

  return (
    <Modal titulo={pedido.titulo} onFechar={onFechar}>
      <div className="flex gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 space-y-2">{pedido.mensagem}</div>
      </div>
      {erro && (
        <div className="mt-4">
          <AlertaErro mensagem={erro} />
        </div>
      )}
      <RodapeModal>
        <Botao onClick={onFechar}>Cancelar</Botao>
        <Botao variante="perigo" onClick={confirmar} disabled={executando} autoFocus>
          {pedido.rotuloConfirmar}
        </Botao>
      </RodapeModal>
    </Modal>
  );
}

interface Toast {
  id: number;
  tipo: 'sucesso' | 'erro';
  texto: string;
}

interface ApiToast {
  sucesso: (texto: string) => void;
  erro: (texto: string) => void;
}

const ContextoToast = createContext<ApiToast | null>(null);

export function useToast(): ApiToast {
  const ctx = useContext(ContextoToast);
  if (!ctx) throw new Error('useToast fora do ProvedorToast');
  return ctx;
}

export function ProvedorToast({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);

  const fechar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const mostrar = useCallback(
    (tipo: Toast['tipo'], texto: string) => {
      const id = ++proximoId.current;
      setToasts((t) => [...t.slice(-3), { id, tipo, texto }]);
      window.setTimeout(() => fechar(id), tipo === 'erro' ? 7000 : 4000);
    },
    [fechar],
  );

  const [api] = useState<ApiToast>(() => ({
    sucesso: (texto) => mostrar('sucesso', texto),
    erro: (texto) => mostrar('erro', texto),
  }));

  return (
    <ContextoToast.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {t.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            )}
            <span className="flex-1">{t.texto}</span>
            <button onClick={() => fechar(t.id)} aria-label="Fechar aviso" className="pointer-events-auto opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function Chip({
  children,
  cor = 'slate',
  onRemover,
  rotuloRemover,
  titulo,
}: {
  children: ReactNode;
  cor?: 'slate' | 'sky' | 'rose' | 'emerald' | 'amber';
  onRemover?: () => void;
  rotuloRemover?: string;
  titulo?: string;
}) {
  const cores = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    sky: 'bg-sky-50 text-sky-800 border-sky-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return (
    <span
      title={titulo}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${cores[cor]}`}
    >
      {children}
      {onRemover && (
        <button onClick={onRemover} aria-label={rotuloRemover} className="opacity-60 hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</h3>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 italic">{children}</p>;
}
