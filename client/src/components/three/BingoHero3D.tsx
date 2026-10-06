import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { BingoBall3D } from './BingoBall3D';
import { ArcadeParticles } from './ArcadeParticles';

export function BingoHero3D() {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect WebGL capability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    // Detect mobile viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!hasWebGL) {
    return (
      <div className="w-full h-full flex items-center justify-center opacity-40">
        <div className="w-64 h-64 rounded-full bg-gradient-to-tr from-arcade-purple via-arcade-magenta to-arcade-gold blur-3xl animate-pulse-slow" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0, 7.5], fov: isMobile ? 55 : 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={isMobile ? [1, 1] : [1, 1.5]}
      >
        {/* Balanced Three.js Arcade Lighting */}
        <ambientLight intensity={0.7} />
        {/* Key Light (warm gold highlight from top right) */}
        <directionalLight position={[6, 6, 4]} intensity={1.8} color="#FBBF24" />
        {/* Rim Lights (royal purple and magenta for dimensional edge specular) */}
        <pointLight position={[-6, -4, 2]} intensity={2.5} color="#7C3AED" distance={15} />
        <pointLight position={[5, -3, 3]} intensity={2.2} color="#D946EF" distance={15} />
        <pointLight position={[0, 5, -2]} intensity={1.5} color="#F97316" distance={12} />

        <Suspense fallback={null}>
          {/* Lightweight atmospheric particles */}
          <ArcadeParticles count={isMobile ? 20 : 50} />

          {/* Curated Atmospheric Group of Floating 3D Bingo Balls */}
          {/* Main Hero Accent Ball (Gold #7) */}
          <BingoBall3D
            number={7}
            size={isMobile ? 0.75 : 0.9}
            color="#D97706"
            accentColor="#FBBF24"
            position={isMobile ? [1.8, 1.5, 0] : [2.8, 1.2, 0.5]}
            rotationSpeed={0.4}
            floatSpeed={1.0}
          />

          {/* Secondary Ball (Magenta #24) */}
          <BingoBall3D
            number={24}
            size={isMobile ? 0.65 : 0.8}
            color="#C026D3"
            accentColor="#EC4899"
            position={isMobile ? [-1.9, -1.3, -0.5] : [-3.0, -1.0, 0]}
            rotationSpeed={0.5}
            floatSpeed={1.3}
          />

          {/* Deep Purple Ball (#42) */}
          <BingoBall3D
            number={42}
            size={isMobile ? 0.6 : 0.75}
            color="#6D28D9"
            accentColor="#9333EA"
            position={isMobile ? [-1.7, 1.6, -1] : [-2.5, 1.8, -1]}
            rotationSpeed={0.35}
            floatSpeed={0.9}
          />

          {/* Warm Amber Ball (#15) - Desktop only for mobile performance */}
          {!isMobile && (
            <BingoBall3D
              number={15}
              size={0.7}
              color="#EA580C"
              accentColor="#F59E0B"
              position={[3.2, -1.6, -0.8]}
              rotationSpeed={0.45}
              floatSpeed={1.1}
            />
          )}

          {/* Distant Background Ball (#88) */}
          {!isMobile && (
            <BingoBall3D
              number={88}
              size={0.55}
              color="#7C3AED"
              accentColor="#D946EF"
              position={[0.2, -2.4, -2.5]}
              rotationSpeed={0.3}
              floatSpeed={0.7}
              interactive={false}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
