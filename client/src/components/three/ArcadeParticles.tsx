import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ArcadeParticlesProps {
  count?: number;
  areaRadius?: number;
}

export function ArcadeParticles({
  count = 45,
  areaRadius = 12,
}: ArcadeParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Generate particle positions and soft color tints (gold, purple, magenta)
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color('#F59E0B'), // Gold
      new THREE.Color('#7C3AED'), // Purple
      new THREE.Color('#D946EF'), // Magenta
      new THREE.Color('#F97316'), // Warm Orange
    ];

    for (let i = 0; i < count; i++) {
      const r = (Math.random() * 0.8 + 0.2) * areaRadius;
      const theta = Math.random() * Math.PI * 2;
      pos[i * 3] = r * Math.cos(theta);
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;

      const chosenColor = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = chosenColor.r;
      col[i * 3 + 1] = chosenColor.g;
      col[i * 3 + 2] = chosenColor.b;
    }

    return [pos, col];
  }, [count, areaRadius]);

  // Very slow ambient drifting
  useFrame((_, delta) => {
    if (reducedMotion || !pointsRef.current) return;

    const positionsArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      positionsArray[i * 3 + 1] += delta * 0.15;
      if (positionsArray[i * 3 + 1] > 4) {
        positionsArray[i * 3 + 1] = -4;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.45}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
