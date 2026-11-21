import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Film, Music2 } from "lucide-react";
import { MediaTile } from "@/components/media/MediaTile";
import { formatAsset, RELEASE_FILES_BUCKET, type EditableAsset } from "@/lib/releaseAssets";
import { supabase } from "@/lib/supabase";
import { usePostText } from "@/lib/postTranslation";

type FileUrls = Record<string, string>;

function downloadUrl(src: string, name: string): string {
  return src.startsWith("blob:") ? src : `${src}&download=${encodeURIComponent(name)}`;
}

function GalleryVideo({ src, name }: { src: string; name: string }) {
  const text = usePostText();
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="pp-release-gallery-empty">
    <Film size={22} aria-hidden />
    <span>{text("This video cannot play in this browser.")}</span>
    <a className="pp-btn pp-btn-outline" href={downloadUrl(src, name)} download={name}><Download size={14} /> {text("Download video")}</a>
  </div>;
  return <video src={src} aria-label={name} controls playsInline preload="metadata" onError={() => setFailed(true)} />;
}

export function useReleaseFileUrls(files: readonly EditableAsset[] = []): FileUrls {
  const paths = files.filter(file => !file.localUrl).map(file => file.path).join("\n");
  const [signed, setSigned] = useState<{ paths: string; urls: FileUrls }>({ paths: "", urls: {} });
  useEffect(() => {
    if (!paths || !supabase) return;
    const storage = supabase.storage.from(RELEASE_FILES_BUCKET);
    let active = true;
    const sign = async () => {
      const { data } = await storage.createSignedUrls(paths.split("\n"), 1800);
      if (!active || !data) return;
      setSigned({ paths, urls: Object.fromEntries(data.flatMap(item => item.path && item.signedUrl ? [[item.path, item.signedUrl]] : [])) });
    };
    void sign();
    const timer = window.setInterval(() => void sign(), 25 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [paths]);

  return {
    ...(signed.paths === paths ? signed.urls : {}),
    ...Object.fromEntries(files.flatMap(file => file.localUrl ? [[file.path, file.localUrl]] : [])),
  };
}

export function ReleaseCategories({ categories }: { categories: string[] }) {
  if (!categories.length) return null;
  return <ul className="pp-release-categories" aria-label="Categories">{categories.map(category => <li key={category}>{category}</li>)}</ul>;
}

/** Compact release cover, using the same media order as the gallery. */
export function ReleaseThumbnail({ files = [], scene, radius = 8 }: {
  files?: readonly EditableAsset[];
  scene: string;
  radius?: number;
}) {
  const cover = files.find(file => file.kind === "image" || file.kind === "video");
  const urls = useReleaseFileUrls(cover ? [cover] : []);
  const src = cover && urls[cover.path];
  if (!cover && scene && scene !== "none") return <MediaTile scene={scene} radius={radius} className="pp-release-thumbnail" />;

  const fill: CSSProperties = { width: "100%", height: "100%", display: "block", objectFit: "cover" };
  return (
    <div className="pp-release-thumbnail" style={{
      width: "100%", height: "100%", display: "grid", placeItems: "center",
      borderRadius: radius, overflow: "hidden", background: "var(--surface-3)", color: "var(--text-muted)",
    }}>
      {cover && src ? cover.kind === "image"
        ? <img src={src} alt={cover.alt || cover.name} loading="lazy" style={fill} />
        : <video src={src} aria-label={cover.name} muted playsInline preload="metadata" style={fill} />
        : <FileText size={16} aria-hidden />}
    </div>
  );
}

export function ReleaseGallery({ files, urls, scene, style }: {
  files: readonly EditableAsset[];
  urls: FileUrls;
  scene: string;
  style?: CSSProperties;
}) {
  const text = usePostText();
  const media = files.filter(file => file.kind === "image" || file.kind === "video");
  const [selected, setSelected] = useState<string | null>(null);
  const index = Math.max(0, media.findIndex(file => file.path === selected));
  const file = media[index];
  const src = file && urls[file.path];
  if (!file && scene === "none") return null;
  const step = (direction: number) => setSelected(media[(index + direction + media.length) % media.length].path);

  return (
    <div className="pp-release-gallery" role="group" aria-label={text("Release media")} style={style}>
      <div className="pp-release-gallery-frame">
        {file ? (
          src ? file.kind === "video"
            ? <GalleryVideo key={src} src={src} name={file.name} />
            : <img src={src} alt={file.alt ? text(file.alt) : file.name} loading="lazy" />
            : <div className="pp-release-gallery-empty"><Film size={22} />{file.name}</div>
        ) : <MediaTile scene={scene} radius={12} />}
        {media.length > 1 && (
          <>
            <button type="button" className="pp-gallery-prev" onClick={() => step(-1)} aria-label={text("Previous media")}><ChevronLeft size={16} /></button>
            <button type="button" className="pp-gallery-next" onClick={() => step(1)} aria-label={text("Next media")}><ChevronRight size={16} /></button>
            <span className="pp-gallery-count" role="status">{index + 1} / {media.length}</span>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="pp-gallery-dots">
          {media.map((item, position) => <button key={item.path} type="button" aria-label={text("Show media {count}", { count: position + 1 })} aria-pressed={index === position} onClick={() => setSelected(item.path)} />)}
        </div>
      )}
    </div>
  );
}

export function ReleaseFileList({ files, urls, actions, showTranscripts = true }: {
  files: readonly EditableAsset[];
  urls: FileUrls;
  actions?: (file: EditableAsset) => ReactNode;
  showTranscripts?: boolean;
}) {
  const text = usePostText();
  const resources = files.filter(file => file.kind === "audio" || file.kind === "document");
  if (!resources.length) return null;
  return (
    <ul className="pp-release-files">
      {resources.map(file => (
        <li key={file.path} className="pp-release-file">
          {file.kind === "audio" ? <Music2 size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
          <div className="pp-release-file-info">
            <strong title={file.name}>{file.name}</strong>
            <span>{text(formatAsset(file))}{file.kind === "audio" && file.transcript && <> · {text("Transcript added")}</>}</span>
            {file.kind === "audio" && urls[file.path] && <audio controls src={urls[file.path]} preload="none" aria-label={file.name} />}
            {showTranscripts && file.kind === "audio" && file.transcript && <details><summary>{text("Transcript")}</summary><p>{text(file.transcript)}</p></details>}
          </div>
          {actions ? actions(file) : file.kind === "document" && urls[file.path] && (
            <a className="pp-file-icon-button" href={downloadUrl(urls[file.path], file.name)}
              download={file.name} aria-label={text("Download {name}", { name: file.name })} title={text("Download {name}", { name: file.name })}>
              <Download size={16} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
