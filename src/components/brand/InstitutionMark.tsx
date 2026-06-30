import { useId } from "react";
import type { Institution } from "@/types";

// ---------------------------------------------------------------------------
// Institution emblems.
//
// DESIGN DECISION (documented in DOCUMENTATION.md): real institutions own
// trademarked logos we cannot reproduce. Instead every institution is rendered
// as an *original* branded emblem — a gradient disc with a clean monogram, plus
// a small curated set of geometric glyphs (a star-ring for the EU, a wireframe
// globe for international bodies). This keeps the set coherent, premium and
// unambiguous (the institution name always sits beside the mark) while making
// no claim on anyone's trademark.
// ---------------------------------------------------------------------------

const ABBR: Record<string, string> = {
  "welsh-government": "WG",
  "world-bank": "WB",
  "uk-parliament": "UK",
  "united-nations": "UN",
  "european-commission": "EC",
  "cardiff-council": "CC",
  "cardiff-university": "CU",
  "swansea-university": "SU",
  "public-health-wales": "PHW",
  "natural-resources-wales": "NRW",
  "swansea-council": "SC",
  "newport-city-council": "NC",
  "bangor-university": "BU",
  "aberystwyth-university": "AU",
  "qualifications-wales": "QW",
  estyn: "Es",
  "senedd-cymru": "SC",
  "transport-for-wales": "TfW",
  "welsh-parliament": "WP",
  "welsh-revenue-authority": "WRA",
  imf: "IMF",
  oecd: "OECD",
  ecb: "ECB",
};

/** Darken / lighten a hex colour by amt (−1..1). */
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v : 255 - v) * amt)));
  r = f(r);
  g = f(g);
  b = f(b);
  return `rgb(${r}, ${g}, ${b})`;
}

function initials(institution: Institution): string {
  if (ABBR[institution.slug]) return ABBR[institution.slug];
  const stop = new Set(["the", "of", "for", "and", "a"]);
  const letters = institution.name
    .split(/\s+/)
    .filter((w) => !stop.has(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters.slice(0, 3) || institution.name.slice(0, 2).toUpperCase();
}

/** Twelve-dot ring — evokes the EU circle of stars, drawn originally. */
function StarRing({ color }: { color: string }) {
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: 50 + Math.cos(a) * 26, y: 50 + Math.sin(a) * 26 };
  });
  return (
    <g>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="3.4" fill={color} />
      ))}
    </g>
  );
}

/** Minimal wireframe globe — meridians + equator. */
function Globe({ color }: { color: string }) {
  return (
    <g
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity={0.95}
    >
      <circle cx="50" cy="50" r="27" />
      <line x1="23" y1="50" x2="77" y2="50" />
      <ellipse cx="50" cy="50" rx="11" ry="27" />
      <path d="M27 39 Q50 47 73 39" />
      <path d="M27 61 Q50 53 73 61" />
    </g>
  );
}

const GLYPH: Record<string, "star-ring" | "globe"> = {
  "european-commission": "star-ring",
  "united-nations": "globe",
  "world-bank": "globe",
};

export function InstitutionMark({
  institution,
  size = 40,
  shape = "circle",
}: {
  institution: Institution;
  size?: number;
  shape?: "circle" | "square";
}) {
  const id = useId().replace(/[:]/g, "");
  const c1 = institution.color;
  const c2 = institution.color2 ?? shade(institution.color, -0.34);
  const glyph = GLYPH[institution.slug];
  const text = initials(institution);
  const radius = shape === "circle" ? 50 : 26;

  // Monogram sizing tuned to letter count so 1–3 letters all sit nicely.
  const fontSize = text.length >= 3 ? 30 : text.length === 2 ? 38 : 46;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={institution.name}
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={`mk-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={shade(c1, 0.12)} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={`hl-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        rx={radius}
        fill={`url(#mk-${id})`}
      />
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        rx={radius}
        fill={`url(#hl-${id})`}
      />
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx={radius - 1}
        fill="none"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1.5"
      />

      {glyph === "star-ring" && <StarRing color="rgba(255,255,255,0.95)" />}
      {glyph === "globe" && <Globe color="rgba(255,255,255,0.95)" />}
      {!glyph && (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-sans)"
          fontSize={fontSize}
          fontWeight={700}
          letterSpacing="-1"
          fill="#fff"
        >
          {text}
        </text>
      )}
    </svg>
  );
}
