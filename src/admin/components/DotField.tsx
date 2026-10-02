import { useEffect, useRef, type RefObject } from 'react';

/** Margem livre à volta dos elementos e largura da transição suave (px). */
const CLEAR = 20;
const FADE = 64;

/**
 * Fundo do ecrã de login: grelha de pontos onde passam, devagar, focos de luz
 * na cor da marca. Desenhado em canvas; pára quando o separador está escondido
 * e fica estático com "reduzir movimento".
 * Os elementos em `avoid` ficam com o fundo limpo: não há pontos por trás deles.
 */
export function DotField({ className, avoid = [] }: { className?: string; avoid?: RefObject<HTMLElement | null>[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const avoidRef = useRef(avoid);
  avoidRef.current = avoid;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const GAP = 22;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let raf = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Focos que percorrem curvas de Lissajous lentas (raio relativo ao ecrã).
    const lights = [
      { ax: 0.36, ay: 0.32, fx: 0.00011, fy: 0.00017, px: 0, py: 1.3, r: 0.17 },
      { ax: 0.4, ay: 0.36, fx: 0.00008, fy: 0.00012, px: 2.1, py: 0.4, r: 0.21 },
      { ax: 0.3, ay: 0.4, fx: 0.00014, fy: 0.00009, px: 4.2, py: 2.6, r: 0.13 },
    ];

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const base = Math.max(width, height);
      const pos = lights.map((l) => ({
        x: cx + Math.sin(t * l.fx + l.px) * width * l.ax,
        y: cy + Math.cos(t * l.fy + l.py) * height * l.ay,
        r2: (l.r * base) ** 2,
      }));
      const offsetX = (width % GAP) / 2;
      const offsetY = (height % GAP) / 2;

      // Zonas a evitar, em coordenadas do canvas.
      const origin = canvas.getBoundingClientRect();
      const zones = avoidRef.current
        .map((r) => r.current?.getBoundingClientRect())
        .filter((b): b is DOMRect => !!b && b.width > 0)
        .map((b) => ({ l: b.left - origin.left, t: b.top - origin.top, r: b.right - origin.left, b: b.bottom - origin.top }));

      /** 0 = sem ponto (junto a um elemento), 1 = intensidade normal. */
      const clearance = (x: number, y: number) => {
        let k = 1;
        for (const z of zones) {
          const dx = Math.max(z.l - x, 0, x - z.r);
          const dy = Math.max(z.t - y, 0, y - z.b);
          const d = Math.hypot(dx, dy);
          if (d <= CLEAR) return 0;
          if (d < CLEAR + FADE) {
            const f = (d - CLEAR) / FADE;
            k = Math.min(k, f * f * (3 - 2 * f));
          }
        }
        return k;
      };

      for (let y = offsetY; y < height; y += GAP) {
        for (let x = offsetX; x < width; x += GAP) {
          const k = zones.length ? clearance(x, y) : 1;
          if (k === 0) continue;
          let glow = 0;
          for (const p of pos) {
            const dx = x - p.x;
            const dy = y - p.y;
            glow += Math.exp(-(dx * dx + dy * dy) / p.r2);
          }
          // ondulação subtil para os pontos não ficarem "parados"
          glow += 0.05 * Math.sin(x * 0.012 + y * 0.009 + t * 0.0009);
          glow = Math.min(1, Math.max(0, glow)) * k;

          if (glow < 0.18) {
            ctx.fillStyle = `rgba(255,255,255,${(0.08 * k).toFixed(3)})`;
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
          } else {
            const size = 0.8 + glow * 1.2;
            ctx.fillStyle = `rgba(2,230,255,${(glow * 0.85).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    const loop = (t: number) => {
      // ~30 fps chega para um movimento tão lento e poupa bateria
      if (frame++ % 2 === 0) draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible' && !reduceMotion) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    if (reduceMotion) draw(12000);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
