import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PARTICLE_COLORS = ['#00d4ff', '#a855f7'];

const CODE_SNIPPETS = [
  { code: 'import React from "react"', color: '#7dd3fc', x: 6, y: 14, size: 14, dur: 26, delay: 0 },
  { code: 'const [posts, setPosts] = useState([])', color: '#c4b5fd', x: 72, y: 8, size: 13, dur: 30, delay: 1.5 },
  { code: 'await supabase.from("posts").select("*")', color: '#67e8f9', x: 10, y: 64, size: 13, dur: 24, delay: 0.6 },
  { code: '$ git commit -m "fix: solid surfaces"', color: '#86efac', x: 66, y: 70, size: 13, dur: 28, delay: 2.2 },
  { code: 'export default function App() {', color: '#7dd3fc', x: 36, y: 86, size: 14, dur: 22, delay: 1.1 },
  { code: 'npm run build', color: '#f0abfc', x: 42, y: 28, size: 14, dur: 27, delay: 3 },
];

const ParticleCanvas = ({ count = 22 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let particles = [];
    let width = 0;
    let height = 0;

    const init = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 1.4,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.08 - Math.random() * 0.18,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        alpha: 0.15 + Math.random() * 0.3,
      }));
    };

    const step = () => {
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) { p.y = height + 4; p.x = Math.random() * width; }
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(step);
    };

    init();
    raf = requestAnimationFrame(step);

    const onResize = () => init();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
};

const FloatingCode = () => (
  <div className="tech-icons-layer" aria-hidden="true">
    {CODE_SNIPPETS.map((s) => (
      <span
        key={s.code}
        className="tech-icon"
        style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          fontSize: `${s.size}px`,
          color: s.color,
          textShadow: `0 0 14px ${s.color}`,
          animationDuration: `${s.dur}s, 9s`,
          animationDelay: `${s.delay}s, 0s`,
        }}
      >
        {s.code}
      </span>
    ))}
  </div>
);

const Ribbons = () => (
  <div className="ribbons-layer" aria-hidden="true">
    <div className="ribbon ribbon-1" />
    <div className="ribbon ribbon-2" />
    <div className="ribbon ribbon-3" />
    <div className="ribbon ribbon-4" />
  </div>
);

const AnimatedBackground = () => {
  const { pathname } = useLocation();
  const isAuth = ['/login', '/register', '/forgot-password'].includes(pathname);

  return (
    <div className={`animated-bg ${isAuth ? 'auth' : 'main'}`}>
      {isAuth ? (
        <>
          <div className="auth-base" />
          <Ribbons />
          <div className="bg-vignette" />
        </>
      ) : (
        <>
          <div className="tech-base" />
          <div className="tech-grid" />
          <ParticleCanvas count={22} />
          <FloatingCode />
          <div className="bg-vignette" />
        </>
      )}
    </div>
  );
};

export default AnimatedBackground;
