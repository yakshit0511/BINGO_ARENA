import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

interface FloatingGemProps {
  position?: [number, number, number];
  color?: string;
  wireframe?: boolean;
}

export function FloatingGem({
  position = [0, 0, 0],
  color = '#D946EF',
  wireframe = false,
}: FloatingGemProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.4;
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        wireframe={wireframe}
        emissive={color}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
}
