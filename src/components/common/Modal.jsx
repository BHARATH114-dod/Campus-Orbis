import { useEffect } from 'react';

/**
 * Reusable modal dialog.
 * @param {{ open: boolean, onClose: () => void, title?: string, children: React.ReactNode, footer?: React.ReactNode }} props
 */
export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('overflow-hidden');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-2xl bg-paper-card p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h2 className="text-xl font-semibold text-ink">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-lg border border-line px-2 py-1 text-sm text-ink-light hover:bg-line/40"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </div>
  );
}
