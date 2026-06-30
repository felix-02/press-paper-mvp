import { Link } from "react-router-dom";
import { Twitter, Linkedin, Github, Youtube } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

/** Top bar for the pure-black public pages (landing, sources). */
export function PublicHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 30,
        borderBottom: "1px solid var(--border-faint)",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          height: 66,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Logo size={20} to="/" />
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            to="/sources"
            style={{ fontSize: 14, color: "var(--text-secondary)", padding: "8px 12px" }}
          >
            Explore Sources
          </Link>
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            style={{ fontSize: 14, color: "var(--text-secondary)", padding: "8px 12px" }}
          >
            For Institutions
          </button>
          <Link to="/login" className="pp-btn pp-btn-ghost" style={{ marginLeft: 6 }}>
            Log In
          </Link>
          <Link to="/signup" className="pp-btn pp-btn-primary">
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLS: { title: string; links: string[] }[] = [
  { title: "Platform", links: ["For Institutions", "For Individuals", "Explore Sources", "Pricing"] },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { title: "Resources", links: ["Help Centre", "Guidelines", "Developers", "Status"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Security"] },
];

/** Footer for the public pages. All links are presentational. */
export function PublicFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border-faint)", background: "#000" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 28px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr repeat(4, 1fr)",
            gap: 32,
          }}
        >
          <div>
            <Logo size={20} />
            <p
              style={{
                marginTop: 14,
                fontSize: 13.5,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                maxWidth: 280,
              }}
            >
              The home for verified public information. Read official releases
              straight from the institutions that issue them.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              {[Twitter, Linkedin, Github, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Social link"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--text-secondary)",
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                  marginBottom: 14,
                }}
              >
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      textAlign: "left",
                      fontSize: 13.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 22,
            borderTop: "1px solid var(--border-faint)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--text-faint)",
          }}
        >
          <span>© 2026 Presspaper. All rights reserved.</span>
          <span>Verified public information.</span>
        </div>
      </div>
    </footer>
  );
}
