import { useState, useCallback } from 'react';
import Lottie from 'lottie-react';
import shieldAnimation from '../assets/lotties/shield-morph.json';
import DecryptedText from './DecryptedText';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottiePlayer = (Lottie as any).default || Lottie;

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'intro' | 'exit'>('intro');
  const [visible, setVisible] = useState(true);
  const COLUMNS = 6;

  const handleDecryptionComplete = useCallback(() => {
    // Wait 500ms after text finishes, then start exit (stairs)
    setTimeout(() => {
      setPhase('exit');
      // Wait for exit animation to complete before removing from DOM
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 1000);
    }, 500);
  }, [onComplete]);

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
        <div className="preloader-lottie">
          <LottiePlayer
            animationData={shieldAnimation}
            loop={false}
            autoplay={true}
          />
        </div>
        <div 
          className="preloader-text text-center"
          style={{ minWidth: '220px' }}
        >
          <DecryptedText 
            text="NULL-SECRET" 
            speed={25} 
            maxIterations={6} 
            onComplete={handleDecryptionComplete} 
          />
        </div>
      </div>
    </div>
  );
}
