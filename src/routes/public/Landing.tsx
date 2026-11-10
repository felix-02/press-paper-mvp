import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Building2,
  CandlestickChart,
  Crosshair,
  FileText,
  Globe as GlobeIcon,
  GraduationCap,
  Lock,
  Mic,
  Scale,
  ShieldCheck,
  Users,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PrelaunchFooter, PrelaunchHeader } from "@/components/landing/PrelaunchChrome";
import { PrelaunchGlobe } from "@/components/landing/PrelaunchGlobe";
import { useTheme } from "@/lib/useTheme";

type Feature = { icon: LucideIcon; title: string; description: string };

const ROW_ONE: Feature[] = [
  { icon: ShieldCheck, title: "Trust First", description: "We prioritise accuracy and rely on official, verifiable sources." },
  { icon: Crosshair, title: "Clarity in Complexity", description: "We turn complex information into clear, actionable understanding." },
  { icon: GlobeIcon, title: "Built for Everyone", description: "From policymakers to researchers, our infrastructure is for every informed citizen." },
  { icon: Lock, title: "Independent & Neutral", description: "We are not aligned with any agenda—only with the truth and public record." },
];

const ROW_TWO: Feature[] = [
  { icon: Zap, title: "Real-Time & Relevant", description: "Receive important updates as they happen, tailored to the topics that matter to you." },
  { icon: Users, title: "Engage with Confidence", description: "Discuss, react, and share in a space built for real people, not bots." },
  { icon: FileText, title: "Permanent Public Record", description: "A searchable archive of what was said, when it happened—preserved for the public." },
];

const AUDIENCES: { icon: LucideIcon; label: string }[] = [
  { icon: Building2, label: "Businesses" },
  { icon: Mic, label: "Journalists" },
  { icon: Scale, label: "Legal Professionals" },
  { icon: Briefcase, label: "Policy Makers" },
  { icon: BarChart3, label: "Researchers" },
  { icon: GraduationCap, label: "Students" },
  { icon: CandlestickChart, label: "Traders" },
  { icon: UsersRound, label: "Global Citizens" },
];

function SectionHeading({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="pp-prelaunch-section-heading">
      <span>{eyebrow}</span>
      <h2>{children}</h2>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <article className="pp-prelaunch-feature-card">
      <Icon size={26} strokeWidth={1.6} />
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

export function Landing() {
  const { resolvedTheme, toggle } = useTheme();

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff");
  }, [resolvedTheme]);

  return (
    <div className="pp-prelaunch" data-theme={resolvedTheme}>
      <PrelaunchHeader theme={resolvedTheme} onToggleTheme={toggle} />
      <main>
        <section className="pp-prelaunch-container pp-prelaunch-hero">
          <div className="pp-prelaunch-hero-grid">
            <div className="pp-prelaunch-hero-copy pp-prelaunch-fade-up">
              <h1>The Source of Truth<br />in a Digital World</h1>
              <p>
                Presspaper is a global public information platform that centralises
                and delivers verified updates from official institutional sources.
              </p>
              <div className="pp-prelaunch-auth-actions" aria-label="Account actions">
                <Link className="pp-prelaunch-auth-secondary" to="/login">Log in</Link>
                <Link className="pp-prelaunch-auth-primary" to="/signup">Sign up</Link>
              </div>
            </div>
            <div className="pp-prelaunch-hero-globe">
              <PrelaunchGlobe dark={resolvedTheme === "dark"} />
            </div>
          </div>
        </section>

        <div className="pp-prelaunch-sections">
          <section className="pp-prelaunch-container pp-prelaunch-section">
            <SectionHeading eyebrow="WHAT IS IT">Information you can trust. Updates you can act on.</SectionHeading>
            <div className="pp-prelaunch-feature-grid pp-prelaunch-feature-grid-four">
              {ROW_ONE.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>
            <div className="pp-prelaunch-feature-grid pp-prelaunch-feature-grid-three">
              {ROW_TWO.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
            </div>
          </section>

          <section className="pp-prelaunch-container pp-prelaunch-section">
            <SectionHeading eyebrow="WHO IT'S FOR">Built for Professionals. Useful for Everyone.</SectionHeading>
            <div className="pp-prelaunch-audiences">
              {AUDIENCES.map(({ icon: Icon, label }) => (
                <div key={label} className="pp-prelaunch-audience">
                  <Icon size={26} strokeWidth={1.6} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <PrelaunchFooter />
    </div>
  );
}
