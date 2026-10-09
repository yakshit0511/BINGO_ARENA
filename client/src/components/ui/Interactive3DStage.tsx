import React, { useRef, useState, useEffect } from 'react';

export interface Interactive3DStageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxTiltX?: number; // max degrees on vertical movement
  maxTiltY?: number; // max degrees on horizontal movement
  perspective?: number;
  glowEffect?: boolean;
  className?: string;
  depth?: number;
}

/**
 * Interactive3DStage
 * Adds high-end 3D perspective tilt reacting smoothly to cursor movement (left, right, up, down).
 * Features subtle ambient light reflection following the mouse.
 */
export function Interactive3DStage({
  children,
  maxTiltX = 4,
  maxTiltY = 6,
  perspective = 1400,
  glowEffect = true,
  className = '',
  depth = 20,
  ...props
}: Interactive3DStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const isTouchDevice =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouch(isTouchDevice);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouch || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Normalized [-1, 1]
    const normX = (x - centerX) / centerX;
    const normY = (y - centerY) / centerY;

    // rotateX is driven by vertical movement (moving up tilts back, moving down tilts forward)
    // rotateY is driven by horizontal movement (moving left tilts left, moving right tilts right)
    const rotX = -normY * maxTiltX;
    const rotY = normX * maxTiltY;

    setTilt({ x: rotX, y: rotY });
    setMousePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => {
    if (!isTouch) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isTouch) return;
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: `${perspective}px`,
      }}
      className={`relative w-full ${className}`}
      {...props}
    >
      <div
        style={{
          transform: `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) translateZ(${isHovered ? depth : 0}px)`,
          transition: isHovered
            ? 'transform 0.12s cubic-bezier(0.2, 0.8, 0.2, 1)'
            : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transformStyle: 'preserve-3d',
        }}
        className="w-full relative will-change-transform"
      >
        {children}

        {/* Dynamic Interactive Sheen Highlight */}
        {glowEffect && isHovered && !isTouch && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-40 transition-opacity duration-300 z-30"
            style={{
              background: `radial-gradient(circle 500px at ${mousePos.x}% ${mousePos.y}%, rgba(217, 70, 239, 0.15), rgba(251, 191, 36, 0.08), transparent 70%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
