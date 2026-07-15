import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface Pending {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({ options: opts, resolve });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);
  const opts = pending?.options;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && opts && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="glass-confirm-title">
          <div className="modal-content max-w-md">
            <h2 id="glass-confirm-title" className="text-lg font-semibold text-text mb-2">
              {opts.title ?? 'Confirm'}
            </h2>
            <p className="text-sm text-text-muted mb-6">{opts.message}</p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => close(false)}>
                {opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={opts.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
