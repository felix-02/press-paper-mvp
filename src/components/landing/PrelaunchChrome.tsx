import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { SiInstagram, SiSnapchat, SiTiktok, SiX, SiYoutube } from "react-icons/si";

type MarketingTheme = "light" | "dark";

export function PrelaunchHeader({ theme, onToggleTheme }: { theme: MarketingTheme; onToggleTheme: () => void }) {
  const { pathname } = useLocation();
  const onContact = pathname === "/contact";

  return (
    <header className="pp-prelaunch-header">
      <div className="pp-prelaunch-container pp-prelaunch-header-inner">
        <Link to="/" className="pp-prelaunch-wordmark">Presspaper</Link>
        <nav className="pp-prelaunch-nav" aria-label="Primary navigation">
          <Link className={onContact ? "is-active" : ""} to="/contact">Contact</Link>
          <Link className="pp-prelaunch-login" to="/login">Log in</Link>
          <Link className="pp-prelaunch-primary" to="/signup">Sign up</Link>
          <button
            className="pp-prelaunch-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </nav>
      </div>
    </header>
  );
}

const SOCIALS = [
  { icon: SiInstagram, label: "Instagram", href: "https://www.instagram.com/presspaperai/" },
  { icon: SiSnapchat, label: "Snapchat", href: "https://www.snapchat.com/@presspaper?sender_web_id=c95e01d1-5d89-4bdc-8eff-613e08b84ed5" },
  { icon: SiTiktok, label: "TikTok", href: "https://www.tiktok.com/@presspaper" },
  { icon: SiX, label: "X", href: "https://x.com/presspaperai" },
  { icon: SiYoutube, label: "YouTube", href: "https://www.youtube.com/@PresspaperAI" },
] as const;

export function PrelaunchFooter() {
  return (
    <footer className="pp-prelaunch-footer">
      <div className="pp-prelaunch-container pp-prelaunch-footer-main">
        <div className="pp-prelaunch-footer-grid">
          <div className="pp-prelaunch-footer-brand">
            <strong>Presspaper</strong>
            <p>Building the world&apos;s most trusted public information infrastructure.</p>
          </div>
          <div>
            <h3>Company</h3>
            <Link to="/contact">Contact</Link>
          </div>
          <div>
            <h3>Legal</h3>
            <a href="#">Privacy Policy</a>
            <a href="#">Cookie Policy</a>
          </div>
          <div>
            <h3>Follow Us</h3>
            <div className="pp-prelaunch-socials">
              {SOCIALS.map(({ icon: Icon, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pp-prelaunch-copyright">© 2026 Presspaper. All rights reserved.</div>
    </footer>
  );
}
