export function LiquidBg() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={{ zIndex: 0 }}
    >
      {/* Deep space gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 90% 70% at 15% -15%, rgba(139,92,246,0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse 70% 55% at 90% 85%, rgba(6,182,212,0.12) 0%, transparent 50%)",
            "radial-gradient(ellipse 55% 45% at 50% 50%, rgba(16,185,129,0.05) 0%, transparent 50%)",
            "radial-gradient(ellipse 40% 30% at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 45%)",
            "#050510",
          ].join(", "),
        }}
      />

      {/* Aurora blob 1 — violet (top-left) */}
      <div
        className="absolute rounded-full"
        style={{
          top: "-200px",
          left: "-120px",
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 40%, transparent 65%)",
          filter: "blur(100px)",
          animation: "blob 22s ease-in-out infinite",
        }}
      />

      {/* Aurora blob 2 — cyan (bottom-right) */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: "-150px",
          right: "-120px",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 40%, transparent 65%)",
          filter: "blur(100px)",
          animation: "blob 28s ease-in-out 6s infinite",
        }}
      />

      {/* Aurora blob 3 — emerald (center-bottom) */}
      <div
        className="absolute rounded-full"
        style={{
          top: "60%",
          left: "35%",
          width: "450px",
          height: "450px",
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
          filter: "blur(90px)",
          animation: "blob 20s ease-in-out 3s infinite",
        }}
      />

      {/* Subtle mesh gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.03) 0%, transparent 50%)",
          animation: "aurora 12s ease-in-out infinite",
        }}
      />

      {/* Premium dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0.8px, transparent 0.8px)",
          backgroundSize: "28px 28px",
          opacity: 0.3,
          maskImage: "radial-gradient(ellipse 70% 60% at center, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at center, black 20%, transparent 70%)",
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 35%, rgba(5,5,16,0.8) 100%)",
        }}
      />

      {/* Noise texture */}
      <div className="noise-overlay" />
    </div>
  );
}
