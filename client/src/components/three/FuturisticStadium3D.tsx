import { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// -------------------------------------------------------------
// Procedural Texture Generator for Glossy Bingo Spheres
// -------------------------------------------------------------
function createBallTexture(
  label: string | number,
  baseColor: string,
  accentColor: string,
  isLetter: boolean = false
): THREE.CanvasTexture {
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

    // Subtle neon gloss rings
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(0, 36, 512, 14);
    ctx.fillRect(0, 206, 512, 14);

    // Front & Back badges
    const drawBadge = (cx: number, cy: number) => {
      // Glow drop shadow
      ctx.beginPath();
      ctx.arc(cx, cy, 62, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();

      // Accent border
      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = baseColor;
      ctx.stroke();

      // Text label
      ctx.fillStyle = '#080711';
      ctx.font = isLetter
        ? '900 68px "Outfit", sans-serif'
        : '900 58px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(label), cx, cy + (isLetter ? 2 : 4));
    };

    drawBadge(256, 128); // Front
    drawBadge(64, 128);  // Back left
    drawBadge(448, 128); // Back right
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// -------------------------------------------------------------
// Floating 3D Stadium Bingo Ball
// -------------------------------------------------------------
interface StadiumBallProps {
  label: string | number;
  size: number;
  color: string;
  accentColor: string;
  position: [number, number, number];
  rotationSpeed?: number;
  floatSpeed?: number;
  isLetter?: boolean;
}

function StadiumBall({
  label,
  size,
  color,
  accentColor,
  position,
  rotationSpeed = 0.4,
  floatSpeed = 1.0,
  isLetter = false,
}: StadiumBallProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(
    () => createBallTexture(label, color, accentColor, isLetter),
    [label, color, accentColor, isLetter]
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    meshRef.current.rotation.y += delta * rotationSpeed;
    meshRef.current.rotation.x = Math.sin(time * floatSpeed * 0.5) * 0.12;
    meshRef.current.position.y = position[1] + Math.sin(time * floatSpeed) * 0.14;
  });

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.2}
        metalness={0.4}
        emissive={color}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

// -------------------------------------------------------------
// Golden Championship Trophy Cup on Pedestal
// -------------------------------------------------------------
function TrophyPedestal({ position }: { position: [number, number, number] }) {
  const trophyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!trophyRef.current) return;
    const time = state.clock.getElapsedTime();
    trophyRef.current.rotation.y = Math.sin(time * 0.4) * 0.15;
  });

  return (
    <group position={position}>
      {/* Tiered Metallic Pedestal */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.7, 0.85, 0.3, 32]} />
        <meshStandardMaterial color="#1a1829" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Glowing Neon Ring on Pedestal */}
      <mesh position={[0, -0.44, 0]}>
        <torusGeometry args={[0.72, 0.03, 16, 48]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.3, 32]} />
        <meshStandardMaterial color="#2d224d" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <torusGeometry args={[0.57, 0.025, 16, 48]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Gold Championship Trophy */}
      <group ref={trophyRef} position={[0, 0.1, 0]}>
        {/* Trophy Base Foot */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.38, 0.15, 32]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Trophy Stem */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.1, 0.16, 0.3, 24]} />
          <meshStandardMaterial color="#FBBF24" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Trophy Cup Body */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.42, 0.18, 0.5, 32]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Crown Rim */}
        <mesh position={[0, 0.8, 0]}>
          <torusGeometry args={[0.43, 0.04, 16, 32]} />
          <meshStandardMaterial color="#FDE047" metalness={1} roughness={0.1} />
        </mesh>
        {/* Trophy Handles */}
        <mesh position={[-0.45, 0.55, 0]} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.2, 0.03, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0.45, 0.55, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <torusGeometry args={[0.2, 0.03, 16, 32, Math.PI]} />
          <meshStandardMaterial color="#F59E0B" metalness={0.95} roughness={0.15} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// Right Pedestal with Glow
// -------------------------------------------------------------
function RightPedestal({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.7, 0.85, 0.3, 32]} />
        <meshStandardMaterial color="#1a1829" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.44, 0]}>
        <torusGeometry args={[0.72, 0.03, 16, 48]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.3, 32]} />
        <meshStandardMaterial color="#2d224d" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <torusGeometry args={[0.57, 0.025, 16, 48]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Reflective Stadium Floor Stage with Glowing Concentric Rings
// -------------------------------------------------------------
function ReflectiveArenaStage() {
  return (
    <group position={[0, -2.4, 0]}>
      {/* Dark Metallic Ground Disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial
          color="#0d0b17"
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>

      {/* Outer Cyan Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6.2, 6.35, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
      </mesh>

      {/* Mid Electric Purple Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[4.8, 4.95, 64]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.9} />
      </mesh>

      {/* Inner Electric Blue Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[3.2, 3.32, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} />
      </mesh>

      {/* Center Core Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <ringGeometry args={[1.5, 1.6, 48]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Subtle Floating Dust Sparkles
// -------------------------------------------------------------
function StadiumSparkles({ count = 35 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color('#a855f7'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#fbbf24'),
      new THREE.Color('#38bdf8'),
    ];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;

      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const array = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] += delta * 0.18;
      if (array[i * 3 + 1] > 4.5) {
        array[i * 3 + 1] = -3.5;
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
        size={0.065}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// -------------------------------------------------------------
// Interactive Parallax Camera Controller
// -------------------------------------------------------------
function ParallaxCamera() {
  useFrame((state) => {
    const { pointer, camera } = state;
    // Subtly interpolate camera target based on mouse coordinates
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, pointer.x * 0.45, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.2 + pointer.y * 0.25, 0.05);
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

// -------------------------------------------------------------
// CSS-Only High-Performance Fallback Stadium Scene
// -------------------------------------------------------------
function FallbackStadiumCSS() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Stadium Top Beams */}
      <div className="absolute -top-32 left-1/4 w-96 h-[500px] bg-gradient-to-b from-cyan-500/20 via-purple-600/10 to-transparent rotate-[25deg] blur-3xl" />
      <div className="absolute -top-32 right-1/4 w-96 h-[500px] bg-gradient-to-b from-purple-500/25 via-blue-600/10 to-transparent -rotate-[25deg] blur-3xl" />

      {/* Stadium Floor Glow & Concentric Rings */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-[100%] bg-gradient-to-t from-purple-900/30 via-indigo-950/20 to-transparent blur-2xl border-t-2 border-cyan-400/40" />

      {/* Left Trophy Silhouette Glow */}
      <div className="hidden lg:block absolute bottom-12 left-12 w-32 h-44 rounded-full bg-amber-500/15 blur-2xl animate-pulse" />

      {/* Floating Ambient Spheres */}
      <div className="hidden md:block absolute bottom-24 left-16 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-700 shadow-[0_0_25px_rgba(168,85,247,0.5)] opacity-60 animate-bounce duration-1000" />
      <div className="hidden md:block absolute bottom-28 right-16 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.5)] opacity-60 animate-bounce duration-700" />
    </div>
  );
}

// -------------------------------------------------------------
// Main Futuristic 3D Stadium Component
// -------------------------------------------------------------
interface FuturisticStadium3DProps {
  intensity?: 'full' | 'compact';
}

export function FuturisticStadium3D({ intensity = 'full' }: FuturisticStadium3DProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // 1. Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }

    // 2. Check mobile viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 3. Pause Three.js render loop when tab is backgrounded
    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!hasWebGL || isPaused) {
    return <FallbackStadiumCSS />;
  }

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
      {/* Stadium Vertical Light Beams Overlay */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#080711] via-transparent to-transparent z-10" />

      {/* Stadium Side Hologram Banners (Desktop Only) */}
      <div className="hidden xl:flex flex-col justify-center absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 hover:opacity-80 transition-opacity">
        <div className="py-6 px-2 rounded-2xl bg-purple-950/40 border border-purple-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300 writing-vertical select-none rotate-180" style={{ writingMode: 'vertical-rl' }}>
            PLAY • CONNECT • COMPETE
          </p>
        </div>
      </div>

      <div className="hidden xl:flex flex-col justify-center absolute right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 hover:opacity-80 transition-opacity">
        <div className="py-6 px-2 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.3)]">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300 select-none" style={{ writingMode: 'vertical-rl' }}>
            BINGO BEYOND BORDERS
          </p>
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0.2, 7.2], fov: isMobile ? 54 : 46 }}
        gl={{ alpha: true, antialias: !isMobile, powerPreference: 'high-performance' }}
        dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5)}
      >
        <Suspense fallback={null}>
          <ParallaxCamera />

          {/* Ambient Lighting */}
          <ambientLight intensity={0.65} color="#312e81" />

          {/* High Stadium Floodlight Beams (Cyan, Purple, Electric Blue) */}
          <directionalLight
            position={[-5, 7, 3]}
            intensity={2.2}
            color="#06b6d4"
          />
          <directionalLight
            position={[5, 7, 3]}
            intensity={2.4}
            color="#a855f7"
          />
          <pointLight
            position={[0, 4, 2]}
            intensity={2.0}
            color="#3b82f6"
            distance={14}
          />

          {/* Stage Warm Trophy Spotlight */}
          <pointLight
            position={[-3.2, 0.5, 1.5]}
            intensity={2.5}
            color="#fbbf24"
            distance={8}
          />

          {/* Right Pedestal Cyan Spotlight */}
          <pointLight
            position={[3.2, 0.5, 1.5]}
            intensity={2.2}
            color="#38bdf8"
            distance={8}
          />

          {/* Reflective Ground Stage with Neon Rings */}
          <ReflectiveArenaStage />

          {/* Left Pedestal & Championship Trophy */}
          <TrophyPedestal position={[-3.6, -1.8, 0.5]} />

          {/* Right Pedestal */}
          <RightPedestal position={[3.6, -1.8, 0.5]} />

          {/* Floating Spheres Matching Reference Image */}
          {/* Main Left Glossy 'B' Ball */}
          <StadiumBall
            label="B"
            size={isMobile ? 0.65 : 0.88}
            color="#7c3aed"
            accentColor="#c084fc"
            position={[-3.4, -0.6, 1.2]}
            rotationSpeed={0.35}
            floatSpeed={0.9}
            isLetter
          />

          {/* Golden '7' Ball */}
          <StadiumBall
            label={7}
            size={isMobile ? 0.45 : 0.58}
            color="#d97706"
            accentColor="#fbbf24"
            position={[-2.4, -1.4, 1.8]}
            rotationSpeed={0.5}
            floatSpeed={1.2}
          />

          {/* Right Pedestal 'G' Ball */}
          <StadiumBall
            label="G"
            size={isMobile ? 0.65 : 0.82}
            color="#2563eb"
            accentColor="#38bdf8"
            position={[3.4, -0.6, 1.2]}
            rotationSpeed={0.38}
            floatSpeed={1.0}
            isLetter
          />

          {/* Right Foreground 'N' Ball */}
          <StadiumBall
            label="N"
            size={isMobile ? 0.48 : 0.62}
            color="#9333ea"
            accentColor="#e879f9"
            position={[2.4, -1.4, 1.8]}
            rotationSpeed={0.45}
            floatSpeed={1.1}
            isLetter
          />

          {/* Additional Ambient Floating Balls (Desktop intensity) */}
          {intensity === 'full' && !isMobile && (
            <>
              {/* Ball #24 Floating Upper Right */}
              <StadiumBall
                label={24}
                size={0.65}
                color="#c026d3"
                accentColor="#f472b6"
                position={[4.2, 1.6, -1.2]}
                rotationSpeed={0.4}
                floatSpeed={1.3}
              />

              {/* Ball #99 Floating Upper Left */}
              <StadiumBall
                label={99}
                size={0.6}
                color="#0284c7"
                accentColor="#38bdf8"
                position={[-4.2, 1.7, -1.2]}
                rotationSpeed={0.42}
                floatSpeed={0.8}
              />
            </>
          )}

          {/* Stadium Atmospheric Dust Sparkles */}
          <StadiumSparkles count={isMobile ? 18 : 45} />
        </Suspense>
      </Canvas>
    </div>
  );
}
