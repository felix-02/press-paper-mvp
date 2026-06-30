// Domain types for the Presspaper demonstration prototype.
// All content is static; these types describe its shape.

export type ReleaseType =
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
  /** Short Welsh / secondary line shown under some logos. */
  subName?: string;
  category: string;
  verified: boolean;
  /** Brand colour used for the monogram emblem. */
  color: string;
  /** Optional second brand colour. */
  color2?: string;
  /** Visual emblem style for the InstitutionMark component. */
  mark:
    | "welsh-dragon"
    | "cardiff"
    | "swansea"
    | "newport"
    | "university"
    | "world-bank"
    | "parliament"
    | "united-nations"
    | "eu"
    | "nhs"
    | "natural-resources"
    | "qualifications"
    | "estyn"
    | "imf"
    | "oecd"
    | "ecb"
    | "generic";
  location?: string;
  website?: string;
}

export interface Release {
  id: string;
  institutionSlug: string;
  type: ReleaseType;
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
  /** Full body content (HTML from the publish editor, when present). */
  body?: string | null;
  /** Marks a release the user created during Flow A (rendered with a subtle "New" pill). */
  isNew?: boolean;
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
