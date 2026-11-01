/**
 * Envo 内联图标库（design-spec §4）
 * 统一风格：viewBox 0 0 24 24 / fill none / stroke currentColor / 1.5 / round 端帽。
 * 装饰性图标默认 aria-hidden；纯图标按钮由调用处补 aria-label。
 * 零新依赖（不引入 lucide-react）。
 */
import type { SVGProps } from 'react';
import type { ReactNode } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ className, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Envelope({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.99 5.73a2 2 0 0 1-2.02 0L2 7" />
    </Icon>
  );
}

export function BookUser({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M18 21h-8a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 0 2 2z" />
      <path d="M15 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
      <path d="M15 14h.01" />
    </Icon>
  );
}

export function Printer({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </Icon>
  );
}

export function Settings({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function X({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  );
}

export function Check({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

export function TriangleAlert({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Icon>
  );
}

export function Search({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function Upload({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Icon>
  );
}

export function Download({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </Icon>
  );
}

export function Pencil({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M21.17 6.81a1 1 0 0 0-3.99-3.98L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z" />
      <path d="m15 5 4 4" />
    </Icon>
  );
}

export function Trash2({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </Icon>
  );
}

export function Eye({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOff({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
      <circle cx="12" cy="12" r="3" />
      <path d="m3 3 18 18" />
    </Icon>
  );
}

export function Copy({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}

export function ChevronDown({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function Plus({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Icon>
  );
}

/* 页头 logo 几何 monogram（纸飞机 = “寄信”语义），调用处给尺寸与 teal currentColor */
export function Send({ className, ...props }: IconProps) {
  return (
    <Icon className={className} {...props}>
      <path d="M14.54 21.69a.5.5 0 0 0 .94-.02l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.02.94l7.93 3.18a2 2 0 0 1 1.11 1.11z" />
      <path d="m21.85 2.15-10.94 10.94" />
    </Icon>
  );
}
