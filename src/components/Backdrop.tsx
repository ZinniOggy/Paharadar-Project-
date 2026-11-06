"use client";
import { useEffect, useRef } from "react";

export function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let mouseX = width * 0.7;
    let mouseY = height * 0.4;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const onMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let t = 0;

    const render = () => {
      t += 0.006;
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Deep ambient royal purple & cyan nebula in top-right
      const grad = ctx.createRadialGradient(
        width * 0.72,
        height * 0.32,
        60,
        width * 0.72,
        height * 0.32,
        width * 0.5
      );
      grad.addColorStop(0, "rgba(88, 28, 135, 0.15)"); // deep purple
      grad.addColorStop(0.35, "rgba(6, 182, 212, 0.08)"); // cyan
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Fewer, cleaner, more spacious contour rings (only 9 rings with generous spacing)
      const cx = width > 1024 ? width * 0.72 : width * 0.5;
      const cy = height * 0.42;
      const numRings = 9;

      ctx.lineWidth = 1.2;
      for (let i = 1; i <= numRings; i++) {
        const baseR = 50 + i * 36;
        const opacity = Math.max(0.05, 0.4 - i * 0.035);

        ctx.beginPath();
        const segments = 80;
        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          const wave1 = Math.sin(angle * 4 + t * 1.6 + i * 0.4) * (8 + i * 1.1);
          const wave2 = Math.cos(angle * 2 - t) * (6 + i * 0.6);
          const r = baseR + wave1 + wave2;

          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const strokeGrad = ctx.createLinearGradient(cx - baseR, cy - baseR, cx + baseR, cy + baseR);
        strokeGrad.addColorStop(0, `rgba(0, 242, 180, ${opacity * 1.1})`);
        strokeGrad.addColorStop(0.6, `rgba(14, 165, 233, ${opacity})`);
        strokeGrad.addColorStop(1, `rgba(139, 92, 246, ${opacity * 0.6})`);

        ctx.strokeStyle = strokeGrad;
        ctx.stroke();
      }

      // Minimal, elegant flowing wave ribbons (only 5 ribbons)
      const numWaves = 5;
      for (let w = 0; w < numWaves; w++) {
        ctx.beginPath();
        const startY = cy + (w - 2) * 28;
        const alpha = Math.max(0.04, 0.22 - Math.abs(w - 2) * 0.04);

        const waveGrad = ctx.createLinearGradient(0, startY, width, startY);
        waveGrad.addColorStop(0, "rgba(0, 242, 180, 0)");
        waveGrad.addColorStop(0.3, `rgba(0, 242, 180, ${alpha})`);
        waveGrad.addColorStop(0.7, `rgba(14, 165, 233, ${alpha})`);
        waveGrad.addColorStop(0.9, `rgba(139, 92, 246, ${alpha * 0.7})`);
        waveGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += 20) {
          const normX = x / width;
          const dy =
            Math.sin(normX * 5 + t * 1.5 + w * 0.3) * 35 +
            Math.cos(normX * 2.5 - t * 0.8) * 20;
          const y = startY + dy;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full opacity-75" />
    </div>
  );
}
