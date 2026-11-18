import type { ReleaseAsset, ReleaseExtras } from "@/types";

export const RELEASE_FILES_BUCKET = "release-files";
export const MAX_CATEGORIES = 8;
const MB = 1024 * 1024;

export const releaseFileTypes = {
  jpg: ["image", "image/jpeg", 10, "JPEG"],
  jpeg: ["image", "image/jpeg", 10, "JPEG"],
  png: ["image", "image/png", 10, "PNG"],
  webp: ["image", "image/webp", 10, "WebP"],
  mp4: ["video", "video/mp4", 50, "MP4"],
  mov: ["video", "video/quicktime", 50, "MOV"],
  mp3: ["audio", "audio/mpeg", 20, "MP3"],
  m4a: ["audio", "audio/mp4", 20, "M4A"],
  wav: ["audio", "audio/wav", 20, "WAV"],
  webm: ["audio", "audio/webm", 20, "WebM"],
  ogg: ["audio", "audio/ogg", 20, "OGG"],
  pdf: ["document", "application/pdf", 20, "PDF"],
  doc: ["document", "application/msword", 20, "Word"],
  docx: ["document", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 20, "Word"],
  xls: ["document", "application/vnd.ms-excel", 20, "Excel"],
  xlsx: ["document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 20, "Excel"],
  csv: ["document", "text/csv", 20, "CSV"],
  odt: ["document", "application/vnd.oasis.opendocument.text", 20, "ODF"],
  ods: ["document", "application/vnd.oasis.opendocument.spreadsheet", 20, "ODF"],
  odp: ["document", "application/vnd.oasis.opendocument.presentation", 20, "ODF"],
} as const;

export type FileExtension = keyof typeof releaseFileTypes;
export type FileGroup = "media" | "audio" | "documents";
export type EditableAsset = ReleaseAsset & { file?: File; localUrl?: string };
export const fileGroups: { [group in FileGroup]: { limit: number; accept: string; kinds: ReleaseAsset["kind"][] } } = {
  media: { limit: 8, accept: ".jpg,.jpeg,.png,.webp,.mp4,.mov", kinds: ["image", "video"] },
  audio: { limit: 3, accept: ".mp3,.m4a,.wav", kinds: ["audio"] },
  documents: { limit: 10, accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.odt,.ods,.odp", kinds: ["document"] },
};

export function fileExtension(name: string): FileExtension | undefined {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return undefined;
  const ext = name.slice(dot + 1).toLowerCase();
  return Object.prototype.hasOwnProperty.call(releaseFileTypes, ext) ? ext as FileExtension : undefined;
}

export function assetFromFile(file: File, group: FileGroup): EditableAsset {
  const extension = fileExtension(file.name);
  if (!extension) throw new Error(`Unsupported file: ${file.name}`);
  const format = releaseFileTypes[extension];
  if (!fileGroups[group].kinds.includes(format[0])) throw new Error(`Unsupported file: ${file.name}`);
  if (file.size === 0 || file.size > format[2] * MB) throw new Error(`${file.name} must be between 1 byte and ${format[2]} MB.`);
  const stem = file.name.slice(0, -(extension.length + 1)).trim().slice(0, 175);
  return {
    path: `${crypto.randomUUID()}.${extension}`,
    name: `${stem || "File"}.${extension}`,
    kind: format[0],
    bytes: file.size,
    file,
    localUrl: URL.createObjectURL(file),
  };
}

export function formatAsset(asset: ReleaseAsset): string {
  const ext = fileExtension(asset.path);
  const format = ext ? releaseFileTypes[ext][3] : "File";
  const size = asset.bytes >= MB ? `${Number((asset.bytes / MB).toFixed(1))} MB` : `${Math.max(1, Math.round(asset.bytes / 1024))} KB`;
  return `${format} · ${size}`;
}

export function readReleaseExtras(value: unknown, slug: string, id: string): ReleaseExtras | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { categories, files } = value as Record<string, unknown>;
  if (!Array.isArray(categories) || !Array.isArray(files)) return null;
  const prefix = `${slug}/${id}/`;
  return {
    categories: categories.filter((category): category is string => typeof category === "string" && category.trim().length > 0 && category.length <= 40).slice(0, MAX_CATEGORIES),
    files: files.filter((raw): raw is ReleaseAsset => {
      if (!raw || typeof raw !== "object") return false;
      const { path, name, kind, bytes, alt, transcript } = raw;
      if (typeof path !== "string" || !path.startsWith(prefix) || !/^[0-9a-f-]{36}\.[a-z0-9]+$/.test(path.slice(prefix.length))) return false;
      const ext = fileExtension(path);
      return Boolean(ext && releaseFileTypes[ext][0] === kind && Number.isInteger(bytes) && bytes > 0 && bytes <= releaseFileTypes[ext][2] * MB
        && typeof name === "string" && name.trim().length > 0 && name.length <= 180
        && (alt === undefined || typeof alt === "string") && (transcript === undefined || typeof transcript === "string"));
    }).slice(0, 21),
  };
}
