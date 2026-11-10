import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, Check, Clock, Lock, Mail, Send, ShieldCheck } from "lucide-react";
import { PrelaunchFooter, PrelaunchHeader } from "@/components/landing/PrelaunchChrome";
import { useTheme } from "@/lib/useTheme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ContactStatus = "idle" | "loading" | "success" | "error";
type ContactFormState = { name: string; email: string; subject: string; message: string; company: string };

const INFO = [
  { icon: Mail, title: "Email Us", body: "info@presspaper.ai" },
  { icon: Clock, title: "Response Time", body: "We typically respond within 1–2 business days." },
  { icon: ShieldCheck, title: "Your Privacy Matters", body: "All messages are treated with the strictest confidentiality. We will never share your information." },
];

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Could not send your message. Please try again.";
}

function ContactForm() {
  const [form, setForm] = useState<ContactFormState>({ name: "", email: "", subject: "", message: "", company: "" });
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<ContactStatus>("idle");
  const [error, setError] = useState("");

  const update = (key: keyof ContactFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    if (status === "error") setStatus("idle");
  };

  const fail = (message: string) => {
    setStatus("error");
    setError(message);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "loading") return;
    if (!form.name.trim()) return fail("Please enter your name.");
    if (!EMAIL_RE.test(form.email.trim())) return fail("Please enter a valid email address.");
    if (!form.message.trim()) return fail("Please enter a message.");
    if (!agree) return fail("Please agree to the privacy policy and terms.");

    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
    } catch (caught) {
      fail(messageFrom(caught));
    }
  };

  return (
    <div className="pp-contact-card">
      <div className="pp-contact-form-title">
        <span><Send size={22} strokeWidth={1.7} /></span>
        <h2>Send Us a Message</h2>
      </div>
      <p className="pp-contact-form-intro">Fill out the form below and we&apos;ll get back to you.</p>

      {status === "success" ? (
        <div className="pp-contact-success" role="status">
          <Check size={20} />
          <div>
            <strong>Message sent</strong>
            <p>Thanks for reaching out. We typically respond within 1–2 business days.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label className="pp-contact-field">Full Name
            <input value={form.name} onChange={update("name")} maxLength={200} placeholder="Enter your full name" autoComplete="name" />
          </label>
          <label className="pp-contact-field">Email Address
            <input type="email" value={form.email} onChange={update("email")} maxLength={320} placeholder="Enter your email address" autoComplete="email" />
          </label>
          <label className="pp-contact-field">Subject
            <input value={form.subject} onChange={update("subject")} maxLength={200} placeholder="Enter the subject" />
          </label>
          <label className="pp-contact-field">Message
            <textarea value={form.message} onChange={update("message")} maxLength={5000} rows={5} placeholder="Type your message here..." />
          </label>
          <input className="pp-capture-honeypot" value={form.company} onChange={update("company")} tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <label className="pp-contact-agree">
            <input type="checkbox" checked={agree} onChange={(event) => setAgree(event.target.checked)} />
            <span>I agree to the <a href="#">privacy policy</a> and <a href="#">cookie policy</a>.</span>
          </label>

          {status === "error" && <span className="pp-contact-error" role="alert">{error}</span>}
          <button className="pp-contact-submit" type="submit" disabled={status === "loading"}>
            {status === "loading" ? <span className="pp-capture-spinner" aria-label="Submitting" /> : <>Send Message <ArrowRight size={18} /></>}
          </button>
          <span className="pp-capture-privacy"><Lock size={13} /> We respect your privacy. No spam, ever.</span>
        </form>
      )}
    </div>
  );
}

export function Contact() {
  const { resolvedTheme, toggle } = useTheme();

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#ffffff");
  }, [resolvedTheme]);

  return (
    <div className="pp-prelaunch" data-theme={resolvedTheme}>
      <PrelaunchHeader theme={resolvedTheme} onToggleTheme={toggle} />
      <main className="pp-contact-main">
        <div className="pp-prelaunch-container pp-contact-grid">
          <section className="pp-contact-info">
            <span className="pp-prelaunch-eyebrow">CONTACT US</span>
            <h1>We&apos;d Love to Hear from You</h1>
            <p className="pp-contact-lead">Have a question, suggestion, or partnership opportunity? Reach out — our team will get back to you.</p>
            <hr />
            <div className="pp-contact-info-list">
              {INFO.map(({ icon: Icon, title, body }) => (
                <div key={title} className="pp-contact-info-row">
                  <span><Icon size={20} strokeWidth={1.7} /></span>
                  <div><strong>{title}</strong><p>{body}</p></div>
                </div>
              ))}
            </div>
          </section>
          <section><ContactForm /></section>
        </div>
      </main>
      <PrelaunchFooter />
    </div>
  );
}
