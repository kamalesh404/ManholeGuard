import type { CSSProperties } from 'react';
import type { StatusLevel } from '../model/types';

interface P {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const base = (size: number): { width: number; height: number; viewBox: string; fill: 'none' } => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
});

/* --- status --------------------------------------------------------- */

export function IconSafe({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.6 4.5 5.6v5.7c0 4.6 3.1 8.4 7.5 10.1 4.4-1.7 7.5-5.5 7.5-10.1V5.6L12 2.6Z" />
      <path d="m8.6 11.9 2.4 2.4 4.4-4.9" />
    </svg>
  );
}

export function IconWarning({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.4 2.6 20h18.8L12 3.4Z" />
      <path d="M12 9.6v4.4" />
      <path d="M12 17.2h.01" />
    </svg>
  );
}

export function IconHigh({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2.8 21.2 12 12 21.2 2.8 12 12 2.8Z" />
      <path d="M12 8v4.6" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function IconCritical({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.2 2.8h7.6L21.2 8.2v7.6l-5.4 5.4H8.2l-5.4-5.4V8.2L8.2 2.8Z" />
      <path d="M12 7.4v5.2" />
      <path d="M12 16.4h.01" />
    </svg>
  );
}

export function IconOffline({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 8.6a15 15 0 0 1 5.2-3.1" />
      <path d="M12 16.4h.01" />
      <path d="M5.2 12.4a10 10 0 0 1 2.6-1.7" />
      <path d="M15.6 11a10 10 0 0 1 3.2 1.4" />
      <path d="M16.7 5.9a15 15 0 0 1 4.8 2.7" />
      <path d="m3 3 18 18" />
    </svg>
  );
}

export function statusIcon(level: StatusLevel, size = 24) {
  switch (level) {
    case 'safe':
      return <IconSafe size={size} />;
    case 'warning':
      return <IconWarning size={size} />;
    case 'high':
      return <IconHigh size={size} />;
    case 'critical':
      return <IconCritical size={size} />;
    case 'offline':
      return <IconOffline size={size} />;
  }
}

/* --- sensors / hardware --------------------------------------------- */

export function IconGas({ size = 24, className, style }: P) {
  return (
    <svg {...base(size)} className={className} style={style} fill="currentColor" aria-hidden>
      <circle cx="8" cy="10" r="3.4" />
      <circle cx="16.4" cy="7.6" r="2.4" />
      <circle cx="15" cy="15.6" r="3" />
    </svg>
  );
}

export function IconDrop({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      fill="none"
      aria-hidden
    >
      <path d="M12 3.2c3.4 4 5.6 6.7 5.6 9.4A5.6 5.6 0 0 1 12 18.2a5.6 5.6 0 0 1-5.6-5.6c0-2.7 2.2-5.4 5.6-9.4Z" />
    </svg>
  );
}

export function IconCover({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      fill="none"
      aria-hidden
    >
      <ellipse cx="12" cy="9.4" rx="8.4" ry="4.4" />
      <path d="M3.6 9.4v3.4c0 2.4 3.8 4.4 8.4 4.4s8.4-2 8.4-4.4V9.4" />
      <path d="M7.6 8.4h8.8" />
    </svg>
  );
}

export function IconVibration({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="none"
      aria-hidden
    >
      <rect x="9.2" y="7" width="5.6" height="10" rx="1.4" />
      <path d="M5.6 9.2a6 6 0 0 0 0 5.6" />
      <path d="M18.4 9.2a6 6 0 0 1 0 5.6" />
      <path d="M3 6.6a10 10 0 0 0 0 10.8" />
      <path d="M21 6.6a10 10 0 0 1 0 10.8" />
    </svg>
  );
}

export function IconChip({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="7" y="7" width="10" height="10" rx="1.6" />
      <rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.6" />
      <path d="M9.4 7V4M14.6 7V4M9.4 20v-3M14.6 20v-3M7 9.4H4M7 14.6H4M20 9.4h-3M20 14.6h-3" />
    </svg>
  );
}

export function IconBattery({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.6"
      fill="none"
      aria-hidden
    >
      <rect x="2.6" y="8" width="16" height="8" rx="2" />
      <path d="M21.4 11v2" />
      <rect x="4.8" y="10.2" width="8" height="3.6" rx="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** USB-serial link (Arduino over a COM port). */
export function IconSerial({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      aria-hidden
    >
      <path d="M12 21V11" />
      <path d="M8.5 11h7l1.4-4.2a1.4 1.4 0 0 0-1.3-1.8H8.4a1.4 1.4 0 0 0-1.3 1.8Z" />
      <path d="M10 7.4v1.8M14 7.4v1.8" />
      <path d="M5.5 4.5 8 3M18.5 4.5 16 3" />
    </svg>
  );
}

export function IconChevronRight({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      aria-hidden
    >
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

export function IconArrowLeft({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m11.5 5.5-6.5 6.5 6.5 6.5" />
    </svg>
  );
}

export function IconGauge({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      fill="none"
      aria-hidden
    >
      <path d="M4.2 17.4a9.4 9.4 0 1 1 15.6 0" />
      <path d="m12 13.6 4-4" />
      <circle cx="12" cy="14.6" r="1.5" />
    </svg>
  );
}

export function IconShieldMark({ size = 24, className, style }: P) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={style}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      fill="none"
      aria-hidden
    >
      <path d="M12 2.6 4.5 5.6v5.7c0 4.6 3.1 8.4 7.5 10.1 4.4-1.7 7.5-5.5 7.5-10.1V5.6L12 2.6Z" />
      <path d="M12 8.4v4.2" />
      <path d="M12 15.6h.01" />
    </svg>
  );
}
