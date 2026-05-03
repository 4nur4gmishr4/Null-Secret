import type { ReactNode } from 'react';
import LottieView from './LottieView';
import privacylockData from '../assets/lotties/privacylock.json';

interface SecurityPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  lottie?: object;
  eyebrowColor?: string;
}

export default function SecurityPageHeader({
  eyebrow,
  title,
  description,
  aside,
  lottie = privacylockData,
  eyebrowColor = 'var(--text-tertiary)',
}: SecurityPageHeaderProps) {
  return (
    <div
      className="flex flex-col md:flex-row items-center gap-6 md:gap-10 border-b pb-8 md:pb-10"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 lottie-themed flex-shrink-0">
        <LottieView animationData={lottie} loop={true} />
      </div>
      <div className="space-y-4 text-center md:text-left">
        <p className="eyebrow-label" style={{ color: eyebrowColor }}>
          {eyebrow}
        </p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <p className="text-sm md:text-base leading-relaxed max-w-xl font-medium" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      {aside && <div className="md:ml-auto w-full md:w-auto flex flex-col items-center md:items-end gap-2">{aside}</div>}
    </div>
  );
}
