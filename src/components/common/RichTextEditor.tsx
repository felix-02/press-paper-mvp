import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Undo2, Redo2, Check, X } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitizeHtml";

/**
 * A lightweight WYSIWYG editor (contenteditable + formatting toolbar) that emits
 * HTML. Intentionally dependency-free to keep the single-file bundle small.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the full release…",
  minHeight = 280,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const savedSelection = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  // Seed the initial HTML once (uncontrolled thereafter to preserve the caret).
  useEffect(() => {
    const cleanValue = sanitizeRichText(value || "");
    if (ref.current && ref.current.innerHTML !== cleanValue) {
      ref.current.innerHTML = cleanValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(sanitizeRichText(ref.current?.innerHTML ?? ""));

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const openLink = () => {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    savedSelection.current = range && ref.current?.contains(range.commonAncestorContainer)
      ? range.cloneRange()
      : null;
    setLinkValue("");
    setLinkError(null);
    setLinkOpen(true);
    window.requestAnimationFrame(() => linkInputRef.current?.focus());
  };

  const addLink = () => {
    const url = linkValue.trim();
    if (!url) {
      setLinkError("Enter a link first.");
      return;
    }
    try {
      const parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
      if (parsed.username || parsed.password || !["http:", "https:"].includes(parsed.protocol)) throw new Error("unsafe");
      ref.current?.focus();
      if (savedSelection.current) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelection.current);
      }
      document.execCommand("createLink", false, parsed.href);
      emit();
      setLinkOpen(false);
      setLinkValue("");
      setLinkError(null);
    } catch {
      setLinkError("Use a valid http or https link without credentials.");
    }
  };

  const pastePlainText = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    emit();
  };

  const Btn = ({ icon, title, onClick }: { icon: React.ReactNode; title: string; onClick: () => void }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: 7, display: "grid", placeItems: "center", color: "var(--text-secondary)", background: "transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  const Divider = () => <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }} />;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface-1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 8px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", background: "var(--surface-2)" }}>
        <Btn icon={<Bold size={16} />} title="Bold" onClick={() => exec("bold")} />
        <Btn icon={<Italic size={16} />} title="Italic" onClick={() => exec("italic")} />
        <Divider />
        <Btn icon={<Heading2 size={16} />} title="Heading" onClick={() => exec("formatBlock", "h2")} />
        <Btn icon={<Heading3 size={16} />} title="Subheading" onClick={() => exec("formatBlock", "h3")} />
        <Btn icon={<Quote size={16} />} title="Quote" onClick={() => exec("formatBlock", "blockquote")} />
        <Divider />
        <Btn icon={<List size={16} />} title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <Btn icon={<ListOrdered size={16} />} title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <Btn icon={<Link2 size={16} />} title="Link" onClick={openLink} />
        <Divider />
        <Btn icon={<Undo2 size={16} />} title="Undo" onClick={() => exec("undo")} />
        <Btn icon={<Redo2 size={16} />} title="Redo" onClick={() => exec("redo")} />
      </div>
      {linkOpen && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface-1)" }}>
          <Link2 size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <input
            ref={linkInputRef}
            type="url"
            value={linkValue}
            maxLength={1000}
            aria-label="Link URL"
            aria-invalid={Boolean(linkError)}
            placeholder="https://example.org/source"
            onChange={(event) => {
              setLinkValue(event.target.value);
              setLinkError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addLink();
              }
              if (event.key === "Escape") setLinkOpen(false);
            }}
            style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", color: "var(--text)", fontSize: 13 }}
          />
          {linkError && <span role="alert" style={{ color: "var(--red)", fontSize: 11.5 }}>{linkError}</span>}
          <button type="button" aria-label="Add link" onClick={addLink} style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--green)", background: "var(--surface-2)" }}><Check size={15} /></button>
          <button type="button" aria-label="Cancel link" onClick={() => setLinkOpen(false)} style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: "var(--text-muted)" }}><X size={15} /></button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onPaste={pastePlainText}
        onDrop={(event) => event.preventDefault()}
        data-placeholder={placeholder}
        className="pp-rte"
        style={{ minHeight, padding: "14px 16px", fontSize: 15, lineHeight: 1.7, color: "var(--text)", outline: "none" }}
      />
    </div>
  );
}
