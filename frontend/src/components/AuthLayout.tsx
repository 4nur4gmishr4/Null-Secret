import type { ReactNode } from 'react';
import NoiseBackground from './NoiseBackground';

interface AuthLayoutProps {
  heroTitle: ReactNode;
  children: ReactNode;
}

export default function AuthLayout({ heroTitle, children }: AuthLayoutProps) {
  return (
    <div
      className="h-[calc(100vh-var(--header-h))] w-full flex p-3 sm:p-4 font-sans fade-in overflow-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden p-8 flex-col justify-between"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
      >
        <NoiseBackground />
        <div className="relative z-10 flex items-center gap-3">
          <span className="font-logo text-2xl tracking-wide uppercase">Null-Secret</span>
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">{heroTitle}</h1>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[380px] space-y-4">{children}</div>
      </div>
    </div>
  );
}
