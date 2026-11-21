import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translateTexts } from "@/lib/translate";

// Include controls that can open later so their labels are ready with the post.
const POST_LABELS = [
  "Back", "View {name} profile", "Verified", "Follow", "Following", "view", "views", "comment", "comments",
  "Save", "Saved", "Removed from saved", "Attachments ({count})", "Download", "Print",
  "Overview", "No body content was provided for this release.", "Comments", "Translate", "Translating…",
  "Search languages…", "No match", "AI Summary", "Summary", "Summarising…",
  "No summary is available for this release.", "AI-generated. Verify important information.", "Source summary",
  "Share", "Email", "Copy link", "Copied!", "Copy failed", "Add to list", "Add to watchlist",
  "No watchlists yet.", "List name", "Add", "Create new list", "Already in {name}", "Added to {name}",
  "Couldn't update watchlist", "Couldn't create watchlist", "{count} additional topics",
  "Release media", "Previous media", "Next media", "Show media {count}", "Transcript added", "Transcript",
  "This video cannot play in this browser.", "Download video", "Download {name}",
  "Edited", "This release was edited after publication — view previous versions", "Previous versions", "Close",
  "Read-only record of this release before each published edit. Newest first.", "Loading previous versions",
  "No previous versions recorded.", "Version {count}", "until {date}", "Reactions", "Like", "Love", "Laugh",
  "Wow", "Sad", "Celebrate", "Sign in to react", "Couldn't save your reaction", "Couldn't remove comment",
  "Comment removed", "Remove this comment from your release", "Delete your comment", "Removing…", "Remove",
  "Reply", "Reply to {name}…", "Cancel", "Posting…", "Add a thoughtful comment…", "Comment",
  "Loading comments", "Try again", "Be the first to comment on this release.", "Reader",
];

type TextValues = Record<string, string | number>;
type TranslatePostText = (source: string, values?: TextValues) => string;

function formatText(source: string, values?: TextValues) {
  return values ? source.replace(/\{(\w+)\}/g, (token, key: string) => String(values[key] ?? token)) : source;
}

export const PostLanguageContext = createContext<{
  text: TranslatePostText;
  addTexts?: (sources: string[]) => void;
}>({ text: formatText });

export function usePostText(sources: readonly (string | null | undefined)[] = []) {
  const { text, addTexts } = useContext(PostLanguageContext);
  const sourceKey = addTexts && sources.length ? JSON.stringify(sources.filter(Boolean)) : "";
  useEffect(() => {
    if (sourceKey) addTexts?.(JSON.parse(sourceKey) as string[]);
  }, [addTexts, sourceKey]);
  return text;
}

// Replace only text nodes and titles in the already-sanitized HTML.
export function mapPostHtml(html: string, text: TranslatePostText) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const original = node.nodeValue ?? "";
    const source = original.trim();
    if (source) node.nodeValue = original.replace(source, () => text(source));
  }
  template.content.querySelectorAll("[title]").forEach(element => {
    const source = element.getAttribute("title");
    if (source) element.setAttribute("title", text(source));
  });
  return template.innerHTML;
}

function splitText(source: string) {
  const parts: string[] = [];
  let remaining = source;
  while (remaining.length > 2000) {
    const prefix = remaining.slice(0, 2000);
    const sentence = [...prefix.matchAll(/[.!?。！？][”’"')\]]*(?=\s|$)|\n/gu)].pop();
    const boundary = sentence && sentence.index + sentence[0].length > 1000
      ? sentence.index + sentence[0].length
      : Math.max(remaining.lastIndexOf(" ", 2000), remaining.lastIndexOf("\n", 2000));
    let end = boundary > 1000 ? boundary : 2000;
    if (/[\uD800-\uDBFF]/u.test(remaining.charAt(end - 1))) end--;
    parts.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  return [...parts, remaining];
}

async function translatePost(language: string, sources: string[], signal: AbortSignal) {
  const pieces = sources.map(splitText);
  const unique = new Set(pieces.flatMap(parts => parts.map(part => part.trim()).filter(Boolean)));
  const encoder = new TextEncoder();
  const batches: string[][] = [];
  let batch: string[] = [];
  let bytes = 0;
  let characters = 0;
  for (const text of unique) {
    const size = encoder.encode(JSON.stringify(text)).length + 1;
    if (batch.length === 20 || bytes + size > 24_000 || characters + text.length > 7200) {
      batches.push(batch);
      batch = [];
      bytes = 0;
      characters = 0;
    }
    batch.push(text);
    bytes += size;
    characters += text.length;
  }
  if (batch.length) batches.push(batch);

  const translations = new Map<string, string>();
  for (let index = 0; index < batches.length; index += 2) {
    if (signal.aborted) return { error: null, values: null };
    const group = batches.slice(index, index + 2);
    const results = await Promise.all(group.map(texts => translateTexts(language, texts, signal)));
    for (const [batchIndex, result] of results.entries()) {
      if (!result.texts) return { error: result.error, values: null };
      result.texts.forEach((value, textIndex) => translations.set(group[batchIndex][textIndex], value));
    }
  }

  const values = new Map(sources.map((source, index) => [
    source,
    pieces[index].map(piece => {
      const key = piece.trim();
      return key ? piece.replace(key, () => translations.get(key) ?? key) : piece;
    }).join(""),
  ]));
  return { error: null, values };
}

export function usePostTranslation(language: string, content: readonly string[], onError: (message: string) => void) {
  const [additional, setAdditional] = useState<string[]>([]);
  const [dictionaries, setDictionaries] = useState(() => new Map<string, Map<string, string>>());
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const current = useRef<AbortController | null>(null);
  const addTexts = useCallback((sources: string[]) => {
    setAdditional(previous => {
      const next = [...new Set([...previous, ...sources])];
      return next.length === previous.length ? previous : next;
    });
  }, []);
  const sources = useMemo(() => [...new Set([...content, ...POST_LABELS, ...additional].filter(value => value.trim()))], [content, additional]);
  const dictionary = dictionaries.get(language);

  useEffect(() => () => current.current?.abort(), [language]);

  useEffect(() => {
    if (language === "English" || (current.current && !current.current.signal.aborted)) return;
    const missing = sources.filter(source => !dictionary?.has(source));
    if (!missing.length) return;

    const controller = new AbortController();
    current.current = controller;
    setPendingLanguage(language);
    void translatePost(language, missing, controller.signal).then(({ error, values }) => {
      if (controller.signal.aborted) return;
      current.current = null;
      setPendingLanguage(null);
      if (values) {
        setDictionaries(previous => new Map(previous).set(language, new Map([...(previous.get(language) ?? []), ...values])));
      } else if (error) {
        onError(error);
      }
    });
  }, [language, sources, dictionary, onError]);

  const text = useCallback<TranslatePostText>((source, values) => {
    const translated = dictionary?.get(source) || source;
    const hasValues = !values || Object.keys(values).every(key => translated.includes(`{${key}}`));
    return formatText(hasValues ? translated : source, values);
  }, [dictionary]);
  return { text, addTexts, translating: pendingLanguage === language, translated: !!dictionary };
}
