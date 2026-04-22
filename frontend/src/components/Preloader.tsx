import { useState, useEffect, useCallback } from 'react';
import Lottie from 'lottie-react';
import shieldAnimation from '../assets/lotties/shield-morph.json';
import DecryptedText from './DecryptedText';

const LottiePlayer = (Lottie as any).default || Lottie;

interface PreloaderProps {
  onComplete: () => void;
}

/**
 * Full-screen preloader with a column-drop reveal animation.
 * - Plays the shield Lottie animation once during load.
 * - Columns slide up to reveal the main app beneath.
 * - All colors adapt to the current theme (black/white).
 */
export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'intro' | 'focused' | 'exit'>('intro');
  const [visible, setVisible] = useState(true);
  const COLUMNS = 6;

  const handleComplete = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const focusTimer = setTimeout(() => setPhase('focused'), 400);
    const exitTimer = setTimeout(() => setPhase('exit'), 2200);
    const completeTimer = setTimeout(handleComplete, 3000);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [handleComplete]);

  if (!visible) return null;

  return (
    <div className="preloader-overlay">
      {/* Column strips that slide up to reveal content */}
      {Array.from({ length: COLUMNS }).map((_, i) => (
        <div
          key={i}
          className={`preloader-column ${phase === 'exit' ? 'preloader-column-exit' : ''}`}
          style={{ animationDelay: phase === 'exit' ? `${i * 0.07}s` : '0s' }}
        />
      ))}

      {/* Centered Lottie animation */}
      <div className={`preloader-content ${phase === 'intro' ? 'preloader-blur' : ''} ${phase === 'exit' ? 'preloader-fade-out' : ''}`}>
        <div className="preloader-lottie">
          <LottiePlayer
            animationData={shieldAnimation}
            loop={false}
            autoplay={true}
          />
        </div>
        <p className="preloader-text">
          <DecryptedText text="Null-Secret" speed={40} maxIterations={10} />
        </p>
      </div>
    </div>
  );
}
