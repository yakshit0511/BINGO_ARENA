import React, { useRef, useEffect } from 'react';

export interface Interactive3DStageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTiltX?: number; // max degrees on vertical movement
  maxTiltY?: number; // max degrees on horizontal movement
  perspective?: number;
  glowEffect?: boolean;
  className?: string;
  depth?: number;
  disableTilt?: boolean; // Keep card flat while retaining dynamic 3D cursor lighting
}

/**
 * Interactive3DStage
 * Provides high-performance 3D perspective and dynamic cursor lighting without
 * causing React re-renders or breaking button hit-testing.
 * Uses requestAnimationFrame and direct DOM styling for smooth 60-120 FPS tracking.
 */
export function Interactive3DStage({
  children,
  maxTiltX = 2,
  maxTiltY = 3,
  perspective = 1200,
  glowEffect = true,
  className = '',
  depth = 0,
  disableTilt = false,
  ...props
}: Interactive3DStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchRef.current || !containerRef.current || !contentRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      if (!contentRef.current || !containerRef.current) return;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Update 3D tilt if enabled
      if (!disableTilt && (maxTiltX > 0 || maxTiltY > 0 || depth > 0)) {
        const normX = (x - centerX) / centerX;
        const normY = (y - centerY) / centerY;
        const rotX = -normY * maxTiltX;
        const rotY = normX * maxTiltY;

        contentRef.current.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(${depth}px)`;
        contentRef.current.style.transition = 'transform 0.08s ease-out';
      }

      // Update ambient cursor light position
      if (glowRef.current && glowEffect) {
        const pctX = ((x / rect.width) * 100).toFixed(1);
        const pctY = ((y / rect.height) * 100).toFixed(1);
        glowRef.current.style.background = `radial-gradient(circle 380px at ${pctX}% ${pctY}%, rgba(217, 70, 239, 0.12), rgba(251, 191, 36, 0.06), transparent 70%)`;
        glowRef.current.style.opacity = '1';
      }
    });
  };

  const handleMouseEnter = () => {
    if (isTouchRef.current || !glowRef.current || !glowEffect) return;
    glowRef.current.style.opacity = '1';
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    if (contentRef.current && !disableTilt) {
      contentRef.current.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0px)';
      contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }

    if (glowRef.current && glowEffect) {
      glowRef.current.style.opacity = '0';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: disableTilt ? undefined : `${perspective}px`,
      }}
      className={`relative w-full ${className}`}
      {...props}
    >
      <div
        ref={contentRef}
        style={{
          transformStyle: disableTilt ? 'flat' : 'preserve-3d',
        }}
        className="w-full relative"
      >
        {children}

        {/* Dynamic Interactive Sheen Highlight */}
        {glowEffect && (
          <div
            ref={glowRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 z-10"
          />
        )}
      </div>
    </div>
  );
}
