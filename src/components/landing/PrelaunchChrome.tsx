import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Moon, Sun, X } from "lucide-react";
import { SiInstagram, SiSnapchat, SiTiktok, SiX, SiYoutube } from "react-icons/si";

type MarketingTheme = "light" | "dark";

export function PrelaunchHeader({ theme, onToggleTheme }: { theme: MarketingTheme; onToggleTheme: () => void }) {
  const { pathname } = useLocation();
  const onContact = pathname === "/contact";
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (menuOpen && !drawer.open) drawer.showModal();
    if (!menuOpen && drawer.open) drawer.close();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

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
        <button
          className="pp-prelaunch-menu-button"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>
      <dialog
        ref={drawerRef}
        id={drawerId}
        className="pp-prelaunch-drawer"
        aria-label="Navigation menu"
        aria-modal="true"
        onClose={closeMenu}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = event.currentTarget.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a[href], button:not(:disabled)");
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
        }}
      >
        <div className="pp-prelaunch-drawer-header">
          <Link to="/" className="pp-prelaunch-wordmark" onClick={closeMenu}>Presspaper</Link>
          <button type="button" className="pp-prelaunch-drawer-close" aria-label="Close navigation menu" onClick={closeMenu} autoFocus>
            <X size={24} />
          </button>
        </div>
        <nav className="pp-prelaunch-drawer-nav" aria-label="Mobile navigation">
          <Link to="/" aria-current={pathname === "/" ? "page" : undefined} onClick={closeMenu}>Home</Link>
          <Link to="/contact" aria-current={onContact ? "page" : undefined} onClick={closeMenu}>Contact</Link>
          <Link to="/login" onClick={closeMenu}>Log in</Link>
          <Link to="/signup" className="pp-prelaunch-drawer-primary" onClick={closeMenu}>Sign up</Link>
        </nav>
        <div className="pp-prelaunch-drawer-appearance">
          <button type="button" onClick={onToggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </dialog>
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
