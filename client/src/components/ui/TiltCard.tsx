import React, { useRef, useState, useEffect } from 'react';

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tiltMaxAngle?: number;
  elevated?: boolean;
  glowColor?: 'purple' | 'magenta' | 'gold' | 'none';
  className?: string;
}

export function TiltCard({
  children,
  tiltMaxAngle = 7,
  elevated = false,
  glowColor = 'none',
  className = '',
  ...props
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState<string>('');
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch / coarse pointer devices to safely disable tilt tracking
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    checkTouch();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -tiltMaxAngle;
    const rotateY = ((x - centerX) / centerX) * tiltMaxAngle;

    setTransformStyle(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`
    );
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
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
      style={{
        transform: transformStyle,
        transition: transformStyle ? 'transform 0.15s ease-out' : 'transform 0.35s ease-out',
        willChange: 'transform',
      }}
      className={`relative rounded-2xl transition-all duration-300 border ${
        elevated ? 'glass-card-elevated' : 'glass-card'
      } ${glowStyles[glowColor]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
