// Domain types shared by the data-backed Presspaper application.

export type StandardReleaseType =
  | "Announcement"
  | "Consultation"
  | "Publication"
  | "Statistics & Research"
  | "Report"
  | "Press Release"
  | "Legislation";

export type ReleaseStatus =
  | "Published"
  | "Scheduled"
  | "Draft"
  | "Awaiting Review"
  | "Archived";

export type MediaScene =
  | "wind-farm"
  | "city-solar"
  | "parliament"
  | "coast"
  | "cardiff-bay"
  | "town"
  | "skyline"
  | "flags"
  | "ecb"
  | "imf";

export interface Institution {
  slug: string;
  name: string;
  category: string;
  verified: boolean;
  /** Brand colour used for the monogram emblem. */
  color: string;
  /** Optional second brand colour. */
  color2?: string;
  /** Visual emblem style for the InstitutionMark component. */
  mark: "generic";
  location?: string;
  website?: string;
  description?: string;
  avatarUrl?: string;
}

export interface Release {
  id: string;
  institutionSlug: string;
  /** Canonical attribution supplied by the database release row. */
  institutionName?: string;
  /** Verification state supplied by the database release view. */
  institutionVerified?: boolean;
  type: string;
  status: ReleaseStatus;
  heading: string;
  subheading: string;
  /** Relative time label as shown in the mockups, e.g. "2 hours ago". */
  time: string;
  /** Absolute publish date for table views, e.g. "12 May 2024". */
  publishedDate?: string;
  publishedTime?: string;
  scene: MediaScene;
  tags: string[];
  /** Extra tag count rendered as "+N". */
  extraTags?: number;
  views: string;
  comments: string;
  engagement?: string;
  /** Full body content (sanitized rich HTML or plain text, when present). */
  body?: string | null;
  /** Marks a release created recently (rendered with a subtle "New" pill). */
  isNew?: boolean;
  revisionCount?: number;
  lastEditedAt?: string | null;
  /** Timestamp used for ordering and realtime buffering. */
  createdAt?: number;
  /** Supporting documents displayed with the release. */
  extras?: ReleaseExtras;
}

export interface ReleaseAsset {
  path: string;
  name: string;
  kind: "image" | "video" | "audio" | "document";
  bytes: number;
  alt?: string;
  transcript?: string;
}

export interface ReleaseExtras {
  categories: string[];
  files: ReleaseAsset[];
}

export interface Comment {
  id: string;
  author: string;
  role: string;
  verified: boolean;
  body: string;
  time: string;
  likes: number;
}

export interface AuthorisedPerson {
  name: string;
  email: string;
  badge: "Owner" | "Editor" | "Publisher" | "Analyst";
  access: string;
}
