import { useEffect, useRef } from 'react';

interface CelebrationFxProps {
  active?: boolean;
  className?: string;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  isSpark: boolean;
  gravity: number;
  flicker: boolean;
}

interface PetalParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  size: number;
  color: string;
  oscillation: number;
  oscillationSpeed: number;
}

interface FireFlare {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

const FIREWORK_COLORS = [
  '#FFD700', // Gold
  '#FF4500', // OrangeRed
  '#FF1493', // DeepPink
  '#00FFFF', // Cyan
  '#39FF14', // Neon Green
  '#FF0055', // Bright Crimson
  '#FFB703', // Amber Flame
  '#FB8500', // Bright Fire Orange
  '#FFFFFF', // White Spark
];

const PETAL_COLORS = [
  '#FF007F', // Rose Magenta
  '#FF1493', // Deep Rose
  '#FF4D6D', // Soft Coral Pink
  '#FFB703', // Golden Marigold
  '#FB8500', // Saffron Flower
  '#E63946', // Crimson Red
  '#FFD166', // Buttercup Yellow
];

export function CelebrationFx({ active = true, className = '' }: CelebrationFxProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: FireworkParticle[] = [];
    const petals: PetalParticle[] = [];
    const flares: FireFlare[] = [];

    // Initialize floral petals
    const petalCount = 60;
    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        vy: 1.2 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 1.5,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: 0.02 + Math.random() * 0.04,
        rotSpeedY: 0.015 + Math.random() * 0.03,
        rotSpeedZ: 0.01 + Math.random() * 0.02,
        size: 9 + Math.random() * 9,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
        oscillation: Math.random() * Math.PI * 2,
        oscillationSpeed: 0.03 + Math.random() * 0.04,
      });
    }

    // Launch firework explosion with crackers & burning fire embers
    const launchFirework = (targetX?: number, targetY?: number) => {
      const startX = targetX ?? (width * 0.15 + Math.random() * width * 0.7);
      const startY = targetY ?? (height * 0.12 + Math.random() * height * 0.45);
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];
      const sparkColor = '#FFF5CC';

      // 1. Fire Flare / Burning flash aura
      flares.push({
        x: startX,
        y: startY,
        radius: 12,
        maxRadius: 100 + Math.random() * 60,
        alpha: 0.9,
        color,
      });

      // 2. Primary explosion particles (firecracker bursts)
      const count = 75 + Math.floor(Math.random() * 45);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 8.5;
        particles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.02,
          size: 2.2 + Math.random() * 2.6,
          color: Math.random() > 0.3 ? color : sparkColor,
          isSpark: Math.random() > 0.6,
          gravity: 0.14,
          flicker: Math.random() > 0.4,
        });
      }

      // 3. Crackers sparkling fire crackles (fast twinkling crackle sparks)
      for (let j = 0; j < 35; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 5.5;
        particles.push({
          x: startX + (Math.random() - 0.5) * 20,
          y: startY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.025 + Math.random() * 0.035,
          size: 1.5 + Math.random() * 1.5,
          color: '#FFE266',
          isSpark: true,
          gravity: 0.08,
          flicker: true,
        });
      }
    };

    // Auto launcher timer
    let nextLaunchTime = 0;

    const render = (timestamp: number) => {
      ctx.clearRect(0, 0, width, height);

      // Periodically trigger multiple firecracker rockets
      if (timestamp > nextLaunchTime) {
        launchFirework();
        if (Math.random() > 0.4) {
          setTimeout(() => launchFirework(), 150 + Math.random() * 200);
        }
        nextLaunchTime = timestamp + 650 + Math.random() * 750;
      }

      // Render Fire Flares (Heat wave burn)
      for (let i = flares.length - 1; i >= 0; i--) {
        const flare = flares[i];
        flare.radius += (flare.maxRadius - flare.radius) * 0.15;
        flare.alpha *= 0.88;

        if (flare.alpha <= 0.01) {
          flares.splice(i, 1);
          continue;
        }

        const grad = ctx.createRadialGradient(
          flare.x,
          flare.y,
          0,
          flare.x,
          flare.y,
          flare.radius
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${flare.alpha * 0.9})`);
        grad.addColorStop(0.35, `${flare.color}${Math.floor(flare.alpha * 180).toString(16).padStart(2, '0')}`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(flare.x, flare.y, flare.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Firework & Crackers particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.flicker && Math.random() > 0.4 ? p.alpha * 0.4 : p.alpha;
        ctx.fillStyle = p.color;

        // Glowing spark head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Spark crackle trail
        if (p.isSpark && p.alpha > 0.3) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render 3D Flower Petals (Rose / Marigold tumbling petals)
      for (let i = 0; i < petals.length; i++) {
        const pet = petals[i];
        pet.oscillation += pet.oscillationSpeed;
        pet.x += pet.vx + Math.sin(pet.oscillation) * 0.8;
        pet.y += pet.vy;

        pet.rotX += pet.rotSpeedX;
        pet.rotY += pet.rotSpeedY;
        pet.rotZ += pet.rotSpeedZ;

        // Wrap around when falling past bottom
        if (pet.y > height + 20) {
          pet.y = -20 - Math.random() * 40;
          pet.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(pet.x, pet.y);

        // 3D perspective tumbling transformation via 2D scale/skew
        const scaleX = Math.cos(pet.rotY);
        const scaleY = Math.sin(pet.rotX);
        ctx.rotate(pet.rotZ);
        ctx.scale(Math.abs(scaleX) > 0.1 ? scaleX : 0.1, Math.abs(scaleY) > 0.1 ? scaleY : 0.1);

        // Draw delicate curved floral petal
        ctx.fillStyle = pet.color;
        ctx.shadowColor = pet.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(0, -pet.size);
        ctx.bezierCurveTo(pet.size * 0.8, -pet.size * 0.6, pet.size * 0.9, pet.size * 0.4, 0, pet.size);
        ctx.bezierCurveTo(-pet.size * 0.9, pet.size * 0.4, -pet.size * 0.8, -pet.size * 0.6, 0, -pet.size);
        ctx.fill();

        // Petal vein highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -pet.size * 0.7);
        ctx.lineTo(0, pet.size * 0.7);
        ctx.stroke();

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-40 ${className}`}
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
