import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture } from 'three';
import type { Mesh } from 'three';

export interface BingoBall3DProps {
  number: number | string;
  size?: number;
  color?: string;
  accentColor?: string;
  position?: [number, number, number];
  rotationSpeed?: number;
  floatSpeed?: number;
  interactive?: boolean;
  onClick?: () => void;
}

/**
 * Procedurally generates a crisp Bingo ball texture on a 512x512 canvas.
 * Creates an authentic glossy arcade lottery ball with front & back numbered badges.
 */
function generateBingoTexture(
  number: number | string,
  baseColor: string,
  accentColor: string
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Background gradient for sphere
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 256);
    bgGrad.addColorStop(0, baseColor);
    bgGrad.addColorStop(0.5, accentColor);
    bgGrad.addColorStop(1, baseColor);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle horizontal racing stripes for arcade look
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 40, 512, 16);
    ctx.fillRect(0, 200, 512, 16);

    // Draw front & back numbered circular badges
    const drawBadge = (cx: number, cy: number) => {
      // Outer glow circle
      ctx.beginPath();
      ctx.arc(cx, cy, 64, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fill();

      // Inner accent ring
      ctx.beginPath();
      ctx.arc(cx, cy, 58, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = baseColor;
      ctx.stroke();

      // Number text
      ctx.fillStyle = '#0B0B10';
      ctx.font = 'bold 54px Outfit, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(number), cx, cy + 2);
    };

    // Front badge (center of UV map)
    drawBadge(256, 128);
    // Back badge
    drawBadge(64, 128);
    drawBadge(448, 128);
  }

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function BingoBall3D({
  number,
  size = 1,
  color = '#7C3AED',
  accentColor = '#D946EF',
  position = [0, 0, 0],
  rotationSpeed = 0.5,
  floatSpeed = 1.2,
  interactive = true,
  onClick,
}: BingoBall3DProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Generate canvas texture once or when number/color changes
  const texture = useMemo(
    () => generateBingoTexture(number, color, accentColor),
    [number, color, accentColor]
  );

  // Smooth floating and rotating animation
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    // Gentle axial spin (spins slightly faster on hover)
    const currentRotSpeed = hovered ? rotationSpeed * 2 : rotationSpeed;
    meshRef.current.rotation.y += delta * currentRotSpeed;
    meshRef.current.rotation.x = Math.sin(time * floatSpeed * 0.5) * 0.15;

    // Gentle vertical float offset
    const floatOffset = Math.sin(time * floatSpeed) * 0.12;
    meshRef.current.position.y = position[1] + floatOffset;
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={hovered && interactive ? 1.15 : 1}
      onClick={onClick}
      onPointerOver={(e) => {
        if (interactive) {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        if (interactive) {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }
      }}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.25}
        metalness={0.4}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={hovered ? 0.35 : 0}
      />
    </mesh>
  );
}
