import { useEffect, useRef } from "react";
import createGlobe from "cobe";

type PrelaunchGlobeProps = {
  dark?: boolean;
  className?: string;
  size?: number;
  scale?: number;
  mobileScale?: number;
  decorative?: boolean;
};

/** Shared rotating WebGL globe used across all public-facing pages. */
export function PrelaunchGlobe({ dark = true, className = "", size, scale = 1, mobileScale = scale, decorative = false }: PrelaunchGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let phi = 0;
    let width = 0;
    let renderScale = scale;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      width = Math.max(1, canvas.offsetWidth);
      renderScale = window.matchMedia("(min-width: 1024px)").matches ? scale : mobileScale;
    };

    window.addEventListener("resize", resize);
    resize();

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.18,
      scale: renderScale,
      dark: dark ? 1 : 0,
      diffuse: dark ? 1.2 : 1.6,
      mapSamples: 17000,
      mapBrightness: dark ? 6.5 : 2.2,
      baseColor: dark ? [1, 1, 1] : [0.28, 0.28, 0.28],
      markerColor: dark ? [0.92, 0.92, 0.92] : [0.15, 0.15, 0.15],
      glowColor: dark ? [0.05, 0.05, 0.05] : [1, 1, 1],
      markers: [
        { location: [40.71, -74.0], size: 0.04 },
        { location: [51.5, -0.12], size: 0.04 },
        { location: [28.61, 77.2], size: 0.05 },
        { location: [35.68, 139.69], size: 0.04 },
        { location: [-33.86, 151.2], size: 0.03 },
        { location: [-23.55, -46.63], size: 0.03 },
      ],
      onRender: (state) => {
        state.phi = phi;
        if (!reduceMotion) phi += 0.0035;
        state.width = width * 2;
        state.height = width * 2;
        state.scale = renderScale;
      },
    });

    const frame = window.requestAnimationFrame(() => {
      canvas.style.opacity = "1";
    });

    return () => {
      window.cancelAnimationFrame(frame);
      globe.destroy();
      window.removeEventListener("resize", resize);
    };
  }, [dark, scale, mobileScale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : "Rotating globe"}
      role={decorative ? undefined : "img"}
      style={size ? { width: size, maxWidth: "100%", aspectRatio: "1 / 1", display: "block" } : undefined}
    />
  );
}
