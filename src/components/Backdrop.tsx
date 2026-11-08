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
      t += 0.007;
      mouseX += (targetMouseX - mouseX) * 0.04;
      mouseY += (targetMouseY - mouseY) * 0.04;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      // Gradient Nebula 1 (Top-Right / Center)
      const g1 = ctx.createRadialGradient(
        width * 0.75,
        height * 0.35,
        40,
        width * 0.75,
        height * 0.35,
        width * 0.45
      );
      g1.addColorStop(0, "rgba(88, 28, 135, 0.18)"); // Deep purple
      g1.addColorStop(0.35, "rgba(6, 182, 212, 0.10)"); // Cyan
      g1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      // Gradient Nebula 2 (Bottom-Left / Mid)
      const g2 = ctx.createRadialGradient(
        width * 0.22,
        height * 0.72,
        40,
        width * 0.22,
        height * 0.72,
        width * 0.42
      );
      g2.addColorStop(0, "rgba(16, 185, 129, 0.12)"); // Emerald
      g2.addColorStop(0.4, "rgba(14, 165, 233, 0.08)"); // Cyan/Sky
      g2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // --- STRUCTURE 1: Top-Right Topographic Wave Pattern ---
      const cx1 = width > 1024 ? width * 0.75 : width * 0.65;
      const cy1 = height * 0.35;
      const numRings1 = 10;

      ctx.lineWidth = 1.3;
      for (let i = 1; i <= numRings1; i++) {
        const baseR = 45 + i * 38;
        const opacity = Math.max(0.04, 0.38 - i * 0.032);

        ctx.beginPath();
        const segments = 80;
        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          const wave1 = Math.sin(angle * 4 + t * 1.5 + i * 0.4) * (8 + i * 1.2);
          const wave2 = Math.cos(angle * 2 - t * 0.8) * (6 + i * 0.7);
          const r = baseR + wave1 + wave2;

          const px = cx1 + Math.cos(angle) * r;
          const py = cy1 + Math.sin(angle) * r;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const strokeGrad = ctx.createLinearGradient(cx1 - baseR, cy1 - baseR, cx1 + baseR, cy1 + baseR);
        strokeGrad.addColorStop(0, `rgba(0, 242, 180, ${opacity * 1.1})`);
        strokeGrad.addColorStop(0.5, `rgba(14, 165, 233, ${opacity})`);
        strokeGrad.addColorStop(1, `rgba(139, 92, 246, ${opacity * 0.7})`);

        ctx.strokeStyle = strokeGrad;
        ctx.stroke();
      }

      // --- STRUCTURE 2: Bottom-Left Topographic Wave Pattern ---
      const cx2 = width > 1024 ? width * 0.22 : width * 0.30;
      const cy2 = height * 0.72;
      const numRings2 = 9;

      for (let i = 1; i <= numRings2; i++) {
        const baseR = 40 + i * 36;
        const opacity = Math.max(0.03, 0.32 - i * 0.03);

        ctx.beginPath();
        const segments = 75;
        for (let s = 0; s <= segments; s++) {
          const angle = (s / segments) * Math.PI * 2;
          const wave1 = Math.sin(angle * 3 - t * 1.3 + i * 0.5) * (7 + i * 1.0);
          const wave2 = Math.cos(angle * 4 + t * 0.7) * (5 + i * 0.6);
          const r = baseR + wave1 + wave2;

          const px = cx2 + Math.cos(angle) * r;
          const py = cy2 + Math.sin(angle) * r;

          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const strokeGrad2 = ctx.createLinearGradient(cx2 - baseR, cy2 - baseR, cx2 + baseR, cy2 + baseR);
        strokeGrad2.addColorStop(0, `rgba(6, 182, 212, ${opacity})`);
        strokeGrad2.addColorStop(0.5, `rgba(16, 185, 129, ${opacity * 1.2})`);
        strokeGrad2.addColorStop(1, `rgba(99, 102, 241, ${opacity * 0.6})`);

        ctx.strokeStyle = strokeGrad2;
        ctx.stroke();
      }

      // --- Flowing Luminous Wave Ribbons connecting the canvas ---
      const numWaves = 6;
      for (let w = 0; w < numWaves; w++) {
        ctx.beginPath();
        const startY = height * 0.5 + (w - 2.5) * 45;
        const alpha = Math.max(0.03, 0.18 - Math.abs(w - 2.5) * 0.03);

        for (let x = 0; x <= width; x += 15) {
          const freq = 0.0022;
          const waveHeight = 35 + w * 6;
          const y =
            startY +
            Math.sin(x * freq + t * 1.8 + w * 0.6) * waveHeight +
            Math.cos(x * 0.001 - t) * 18;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const waveGrad = ctx.createLinearGradient(0, startY, width, startY);
        waveGrad.addColorStop(0, `rgba(16, 185, 129, ${alpha * 0.5})`);
        waveGrad.addColorStop(0.3, `rgba(6, 182, 212, ${alpha})`);
        waveGrad.addColorStop(0.7, `rgba(59, 130, 246, ${alpha})`);
        waveGrad.addColorStop(1, `rgba(147, 51, 234, ${alpha * 0.7})`);

        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-90"
      aria-hidden
    />
  );
}
