import { useState, useCallback, useEffect, useRef } from 'react';
import LottieView from './LottieView';
import shieldAnimation from '../assets/lotties/shield-morph.json';
import DecryptedText from './DecryptedText';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'intro' | 'exit'>('intro');
  const [visible, setVisible] = useState(true);
  const COLUMNS = 6;

  const exitTimerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);

  const handleDecryptionComplete = useCallback(() => {
    // Wait 500ms after text finishes, then start exit (stairs).
    exitTimerRef.current = window.setTimeout(() => {
      setPhase('exit');
      // Wait for exit animation to complete before removing from DOM.
      removeTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 1000);
    }, 500);
  }, [onComplete]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
      if (removeTimerRef.current !== null) window.clearTimeout(removeTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="preloader-overlay">
      {/* Column strips for Stairs effect */}
      {Array.from({ length: COLUMNS }).map((_, i) => (
        <div
          key={i}
          className={`preloader-column ${phase === 'exit' ? 'preloader-column-exit' : ''}`}
          style={{ animationDelay: phase === 'exit' ? `${i * 0.06}s` : '0s' }}
        />
      ))}

      {/* Centered content */}
      <div className={`preloader-content ${phase === 'exit' ? 'preloader-fade-out' : ''}`}>
        <div className="w-32 h-32 mb-6 preloader-lottie">
          <LottieView
            animationData={shieldAnimation}
            loop={false}
            autoplay={true}
          />
        </div>
        <div 
          className="font-logo text-sm tracking-[0.2em] uppercase text-center"
          style={{ color: 'var(--bg-primary)', minWidth: '220px' }}
        >
          <DecryptedText 
            text="Null-Secret" 
            speed={25} 
            maxIterations={6} 
            onComplete={handleDecryptionComplete} 
          />
        </div>
      </div>
    </div>
  );
}
