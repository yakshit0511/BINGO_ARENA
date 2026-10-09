import React, { useRef, useEffect } from 'react';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tiltMaxAngle?: number;
  elevated?: boolean;
  glowColor?: 'purple' | 'magenta' | 'gold' | 'none';
  className?: string;
  disableTilt?: boolean;
}

export function TiltCard({
  children,
  tiltMaxAngle = 3,
  elevated = false,
  glowColor = 'none',
  className = '',
  disableTilt = false,
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchRef.current || disableTilt || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    rafId.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -tiltMaxAngle;
      const rotateY = ((x - centerX) / centerX) * tiltMaxAngle;

      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      cardRef.current.style.transition = 'transform 0.08s ease-out';
    });
  };

  const handleMouseLeave = () => {
    if (isTouchRef.current || disableTilt || !cardRef.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);

    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    cardRef.current.style.transition = 'transform 0.35s ease-out';
  };

  // Border & Glow styling
  const glowStyles = {
    purple: 'hover:border-arcade-purple/60 hover:shadow-neon-purple',
    magenta: 'hover:border-arcade-magenta/60 hover:shadow-neon-magenta',
    gold: 'hover:border-arcade-gold/60 hover:shadow-neon-gold',
    none: 'hover:border-arcade-border-accent',
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl border ${
        elevated ? 'glass-card-elevated' : 'glass-card'
      } ${glowStyles[glowColor]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
