import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Icon } from '../components/Icons';
import { Button } from '../components/ui';

// Substitui window.alert() / window.confirm() (feios, bloqueiam a thread,
// não combinam com um SaaS premium) por um toast e um modal de confirmação
// com a identidade visual do NEXO. Uso:
//   const { notify, confirm } = useUIFeedback();
//   notify('Não foi possível salvar: ' + err.message, { type: 'error' });
//   if (!(await confirm({ message: 'Excluir este item?', danger: true }))) return;

const UIFeedbackContext = createContext(null);

let toastSeq = 0;

export function UIFeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolveRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((message, { type = 'info', duration = 4500 } = {}) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration) setTimeout(() => dismissToast(id), duration);
    return id;
  }, [dismissToast]);

  const confirm = useCallback(({ title = 'Confirmar ação', message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ title, message, confirmLabel, cancelLabel, danger });
    });
  }, []);

  function closeConfirm(result) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setConfirmState(null);
  }

  const toastStyles = {
    success: { icon: Icon.check, bg: 'bg-white', bar: 'bg-success', iconBg: 'bg-success-bg text-success' },
    error: { icon: Icon.x, bg: 'bg-white', bar: 'bg-danger', iconBg: 'bg-danger-bg text-danger' },
    info: { icon: Icon.bell, bg: 'bg-white', bar: 'bg-primary', iconBg: 'bg-primary-light text-primary' },
  };

  return (
    <UIFeedbackContext.Provider value={{ notify, confirm }}>
      {children}

      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2.5rem))]">
        {toasts.map((t) => {
          const s = toastStyles[t.type] || toastStyles.info;
          const IconCmp = s.icon;
          return (
            <div key={t.id} className={`relative overflow-hidden rounded-xl shadow-card-lg border border-line ${s.bg} pl-3.5 pr-9 py-3 flex items-start gap-2.5 animate-[fadeIn_.15s_ease]`}>
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
                <IconCmp className="w-4 h-4" />
              </div>
              <div className="text-[12.5px] font-medium text-ink leading-snug pt-0.5">{t.message}</div>
              <button onClick={() => dismissToast(t.id)} className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft">
                <Icon.x className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {confirmState && (
        <div className="fixed inset-0 bg-black/30 z-[110] flex items-center justify-center p-4" onClick={() => closeConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold text-[15px] mb-1.5">{confirmState.title}</div>
            <div className="text-[13px] text-muted mb-5">{confirmState.message}</div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => closeConfirm(false)}>{confirmState.cancelLabel}</Button>
              <Button variant={confirmState.danger ? 'danger' : 'primary'} size="sm" onClick={() => closeConfirm(true)}>{confirmState.confirmLabel}</Button>
            </div>
          </div>
        </div>
      )}
    </UIFeedbackContext.Provider>
  );
}

export function useUIFeedback() {
  const ctx = useContext(UIFeedbackContext);
  if (!ctx) throw new Error('useUIFeedback precisa estar dentro de <UIFeedbackProvider>');
  return ctx;
}
