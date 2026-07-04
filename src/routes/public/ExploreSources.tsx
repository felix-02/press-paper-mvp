import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/shells/PublicChrome";
import { InstitutionMark } from "@/components/brand/InstitutionMark";
import { Verified } from "@/components/primitives/Bits";
import { DIRECTORY_SLUGS, inst } from "@/data/institutions";
import { optionFromSearchParam, searchParamValue } from "@/lib/urlState";
import type { Institution } from "@/types";

const CATEGORIES = ["All", "Government", "Local Authority", "University", "Health", "Regulator"] as const;
type SourceCategory = (typeof CATEGORIES)[number];

function blurb(i: Institution): string {
  const map: Record<string, string> = {
    Government: "Official announcements, consultations and policy from the national government.",
    "Local Authority": "Local services, council decisions and community updates.",
    University: "Research, admissions and institutional news.",
    "Health Board": "Public health guidance, statistics and service updates.",
    Regulator: "Standards, guidance and regulatory decisions.",
    "Education Inspectorate": "Inspection reports and education standards.",
  };
  return map[i.category] ?? "Verified official information published directly to the public.";
}

function followers(slug: string): string {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 100000;
  const k = 12 + (h % 240);
  return k > 100 ? `${(k / 10).toFixed(0)}0K` : `${k}.${h % 9}K`;
}

function SourceCard({ slug }: { slug: string }) {
  const i = inst(slug);
  const navigate = useNavigate();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/institution/${slug}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/institution/${slug}`)}
      style={{
        background: "var(--surface-public)",
        border: "1px solid var(--border-faint)",
        borderRadius: "var(--r-lg)",
        padding: 20,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.background = "var(--surface-public-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-faint)";
        e.currentTarget.style.background = "var(--surface-public)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <InstitutionMark institution={i} size={52} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 15.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {i.name}
            </span>
            <Verified size={14} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{i.category}</div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, marginTop: 14, flex: 1 }}>
        {blurb(i)}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
        <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>{followers(slug)}</strong> followers
        </span>
        <Link
          to={`/signup`}
          onClick={(e) => e.stopPropagation()}
          className="pp-btn pp-btn-ghost"
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Follow
        </Link>
      </div>
    </div>
  );
}

function matchesCategory(category: string, selected: SourceCategory): boolean {
  if (selected === "All") return true;
  if (selected === "Health") return category.toLowerCase().includes("health");
  return category.toLowerCase() === selected.toLowerCase();
}

export function ExploreSources() {
  const [params, setParams] = useSearchParams();
  const category = optionFromSearchParam(CATEGORIES, params.get("category"), "All");
  const setCategory = (nextCategory: SourceCategory) => {
    const p = new URLSearchParams(params);
    p.set("category", searchParamValue(nextCategory));
    setParams(p);
  };
  const slugs = DIRECTORY_SLUGS.filter((slug) => matchesCategory(inst(slug).category, category));

  return (
    <div style={{ background: "#000", minHeight: "100vh", color: "var(--text)" }}>
      <PublicHeader />

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "52px 28px 24px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>Explore Verified Sources</h1>
        <p style={{ fontSize: 16, color: "var(--text-secondary)", marginTop: 12, maxWidth: 600 }}>
          Browse the institutions publishing official information on Presspaper.
          Follow the ones that matter to you.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 26, alignItems: "center", flexWrap: "wrap" }}>
          <div
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface-public)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-pill)",
              padding: "10px 16px",
              color: "var(--text-faint)",
              fontSize: 14,
              minWidth: 280,
              flex: 1,
              maxWidth: 380,
            }}
          >
            <Search size={16} />
            <span>Search institutions…</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  style={{
                    fontSize: 13,
                    padding: "7px 14px",
                    borderRadius: "var(--r-pill)",
                    border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                    background: active ? "#fff" : "var(--surface-public)",
                    color: active ? "#0a0a0a" : "var(--text-secondary)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 28px 64px" }}>
        {slugs.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No verified sources in {category} yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {slugs.map((slug) => (
              <SourceCard key={slug} slug={slug} />
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 36 }}>
          <Link to="/signup" className="pp-btn pp-btn-outline" style={{ padding: "11px 22px" }}>
            See all institutions <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
