import { useEffect, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 内联二次确认框（design-spec §5.9，B7）。
 * 打印历史删除与地址簿删除共用同一组件，不使用 window.confirm。
 * 交互契约：打开时焦点移到「取消」、Esc 关闭、Tab 焦点陷阱、
 * 关闭后焦点还原到触发按钮、遮罩用 onMouseDown 关闭（防框内按下框外松开误关）。
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '删除',
  cancelText = '取消',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // 安全默认：焦点落在「取消」，防止回车直接触发危险动作
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // 焦点陷阱：Tab / Shift+Tab 在面板内循环
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      // 焦点还原到触发它的按钮
      prevFocus?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="envo-confirm-title"
        aria-describedby="envo-confirm-desc"
        className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 sm:p-6"
      >
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg aria-hidden="true" className="w-6 h-6 text-red-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h3 id="envo-confirm-title" className="text-center text-base font-semibold text-slate-900 leading-snug">
          {title}
        </h3>
        <p id="envo-confirm-desc" className="mt-2 text-center text-sm leading-7 text-slate-600">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button type="button" ref={cancelRef} onClick={onCancel} className="btn-outline w-full sm:w-auto">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} className="btn-danger w-full sm:w-auto">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
