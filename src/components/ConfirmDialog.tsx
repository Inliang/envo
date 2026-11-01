import { useEffect, useRef, type ReactNode } from 'react';
import { TriangleAlert } from './icons';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
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
        className="w-full max-w-[400px] max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl p-5 sm:p-6"
      >
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[var(--error-bg)] flex items-center justify-center">
          <TriangleAlert className="w-6 h-6 text-[var(--error-fg)]" />
        </div>
        <h3 id="envo-confirm-title" className="text-center text-base font-semibold text-[var(--foreground)] leading-snug">
          {title}
        </h3>
        <p id="envo-confirm-desc" className="mt-2 text-center text-sm leading-7 text-[var(--muted-foreground)]">
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
