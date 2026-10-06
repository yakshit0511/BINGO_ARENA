import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { FloatingGem } from './FloatingGem';

export function ArcadeCanvas() {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) {
    // Graceful fallback for headless or non-WebGL browsers
    return (
      <div className="w-full h-full flex items-center justify-center opacity-40">
        <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-arcade-purple to-arcade-magenta blur-3xl animate-pulse-slow" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#FBBF24" />
        <pointLight position={[-5, -5, -2]} intensity={2} color="#7C3AED" />
        <pointLight position={[5, -2, 2]} intensity={2} color="#D946EF" />

        <Suspense fallback={null}>
          <Float speed={2} rotationIntensity={1} floatIntensity={1.5}>
            <FloatingGem position={[0, 0, 0]} color="#9333EA" />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
