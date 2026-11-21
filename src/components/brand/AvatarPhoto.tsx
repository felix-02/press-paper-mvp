import { useState, type ReactNode } from "react";

export function AvatarPhoto({ src, alt, size, radius, ring, children }: {
  src?: string | null;
  alt: string;
  size: number;
  radius: number | string;
  ring?: boolean;
  children: ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || !/^https:\/\//i.test(src) || src === failedSrc) return children;

  return (
    <img
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailedSrc(src)}
      style={{
        flexShrink: 0,
        display: "block",
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "cover",
        filter: "none",
        background: "var(--surface-3)",
        outline: ring ? "1px solid rgba(255,255,255,0.25)" : undefined,
        outlineOffset: ring ? -2 : undefined,
      }}
    />
  );
}
