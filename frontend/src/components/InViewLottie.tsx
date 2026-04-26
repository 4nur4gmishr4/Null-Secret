import React, { useRef, useEffect, useState } from 'react';
import Lottie from 'lottie-react';

// Handle lottie-react default/named export differences across environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LottieComponent = (Lottie as any).default || Lottie;

interface InViewLottieProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animationData: any;
  loop?: boolean;
  className?: string;
  autoplay?: boolean;
  style?: React.CSSProperties;
  rendererSettings?: any;
}

/**
 * InViewLottie: Only plays animations when they enter the viewport.
 * Optimized for production with IntersectionObserver.
 */
function InViewLottie({ 
  animationData, 
  loop = true, 
  className = "", 
  autoplay = true,
  style = {},
  rendererSettings = {}
}: InViewLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(([entry]) => {
        setIsInView(entry.isIntersecting);
      }, {
        root: null,
        rootMargin: '100px',
        threshold: 0.01
      });

      const el = containerRef.current;
      if (el) {
        observer.observe(el);
      }

      return () => {
        if (el) {
          observer.unobserve(el);
        }
        observer.disconnect();
      };
    }
  }, []);

  const defaultRendererSettings = {
    preserveAspectRatio: 'xMidYMid slice',
    progressiveLoad: true,
    hideOnTransparent: true,
    imagePreserveAspectRatio: 'xMidYMid slice',
    ...rendererSettings
  };

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        ...style 
      }}
    >
      <LottieComponent 
        animationData={animationData} 
        loop={loop} 
        autoplay={isInView && autoplay}
        rendererSettings={defaultRendererSettings}
        style={{ width: '100%', height: '100%', ...style }}
      />
    </div>
  );
}

export default React.memo(InViewLottie);
