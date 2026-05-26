"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  baseOpacity: number;
}

const PARTICLE_COLORS = [
  "#a78bfa", "#8b5cf6", "#7c3aed",   // violet
  "#22d3ee", "#06b6d4", "#0891b2",   // cyan
  "#34d399", "#10b981",               // emerald
];

const CONNECTION_DIST = 90;
const MOUSE_REPEL_DIST = 120;
const PARTICLE_COUNT = 65;

export function LiquidBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const mouse = { x: -9999, y: -9999 };

    // ── Resize ──────────────────────────────────────────
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Particles ────────────────────────────────────────
    const particles: Particle[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const op = Math.random() * 0.35 + 0.08;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 1.8 + 0.4,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        opacity: op,
        baseOpacity: op,
      });
    }

    // ── Mouse tracking ───────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    // ── Draw loop ────────────────────────────────────────
    function draw() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Update + draw particles
      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < MOUSE_REPEL_DIST * MOUSE_REPEL_DIST) {
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / MOUSE_REPEL_DIST) * 0.5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.978;
        p.vy *= 0.978;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Brightness near mouse
        const near = dist2 < (MOUSE_REPEL_DIST * 2) * (MOUSE_REPEL_DIST * 2);
        p.opacity = near
          ? Math.min(p.baseOpacity * 2.5, 0.8)
          : p.baseOpacity;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pa = particles[i];
          const pb = particles[j];
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = "#8b5cf6";
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={{ zIndex: 0 }}
    >
      {/* Deep background */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse at 25% 0%,   rgba(139,92,246,0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse at 85% 75%,  rgba(6,182,212,0.12)  0%, transparent 50%)",
            "radial-gradient(ellipse at 5%  80%,  rgba(16,185,129,0.08) 0%, transparent 40%)",
            "radial-gradient(ellipse at 60% 50%,  rgba(124,58,237,0.06) 0%, transparent 40%)",
            "#05050f",
          ].join(", "),
        }}
      />

      {/* Canvas — particles & connections */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: 0.7 }}
      />

      {/* Blob 1 — violet top-left */}
      <div
        className="absolute rounded-full blur-[140px] opacity-[0.22]"
        style={{
          top: "-12rem",
          left: "-6rem",
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle, #8b5cf6 0%, #6d28d9 45%, transparent 70%)",
          animation: "blob 18s infinite",
          animationTimingFunction: "ease-in-out",
        }}
      />

      {/* Blob 2 — cyan right */}
      <div
        className="absolute rounded-full blur-[120px] opacity-[0.18]"
        style={{
          top: "40%",
          right: "-10rem",
          width: "620px",
          height: "620px",
          background: "radial-gradient(circle, #06b6d4 0%, #0e7490 45%, transparent 70%)",
          animation: "blob 22s infinite 7s",
          animationTimingFunction: "ease-in-out",
        }}
      />

      {/* Blob 3 — emerald bottom */}
      <div
        className="absolute rounded-full blur-[130px] opacity-[0.14]"
        style={{
          bottom: "-10rem",
          left: "28%",
          width: "520px",
          height: "520px",
          background: "radial-gradient(circle, #10b981 0%, #065f46 45%, transparent 70%)",
          animation: "blob 16s infinite 4s",
          animationTimingFunction: "ease-in-out",
        }}
      />

      {/* Blob 4 — amber accent (subtle) */}
      <div
        className="absolute rounded-full blur-[100px] opacity-[0.09]"
        style={{
          top: "20%",
          left: "50%",
          width: "380px",
          height: "380px",
          background: "radial-gradient(circle, #f59e0b 0%, #b45309 50%, transparent 70%)",
          animation: "blob 26s infinite 11s",
          animationTimingFunction: "ease-in-out",
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 25%, rgba(5,5,15,0.55) 100%)",
        }}
      />

      {/* Scanline glare — very subtle */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "30%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.12), rgba(6,182,212,0.1), transparent)",
          filter: "blur(1px)",
        }}
      />
    </div>
  );
}
