import type { AuthorisedPerson } from "@/types";

// Deterministic pseudo-random generator so charts look organic yet never change
// between renders (important for a demo that must look identical every time).
export function seededSeries(
  seed: number,
  count: number,
  opts: { base?: number; amp?: number; trend?: number; noise?: number } = {}
): number[] {
  const { base = 50, amp = 20, trend = 0, noise = 6 } = opts;
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const wave = Math.sin((i / count) * Math.PI * 2.4 + seed) * amp;
    const drift = (i / count) * trend;
    const jitter = (rand() - 0.5) * noise;
    out.push(base + wave + drift + jitter);
  }
  return out;
}

// Smooth, mostly-rising follower-style line.
export function risingSeries(seed: number, count: number, from: number, to: number): number[] {
  let s = seed * 4096 + 13;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const eased = from + (to - from) * (t * t * (3 - 2 * t));
    out.push(eased + (rand() - 0.45) * (to - from) * 0.04);
  }
  return out;
}

// ---- Institution dashboard / analytics metric cards -----------------------
export interface Metric {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  seriesSeed: number;
  color: string;
}

export const PERFORMANCE_METRICS: Metric[] = [
  { label: "Total Views", value: "1.9M", delta: "+16%", positive: true, seriesSeed: 3, color: "var(--series-1)" },
  { label: "Engagements", value: "98K", delta: "+12%", positive: true, seriesSeed: 7, color: "var(--series-2)" },
  { label: "Top Reach", value: "512K", delta: "+9%", positive: true, seriesSeed: 11, color: "var(--series-3)" },
  { label: "Downloads", value: "74K", delta: "+21%", positive: true, seriesSeed: 15, color: "var(--series-4)" },
  { label: "Shares", value: "28K", delta: "+14%", positive: true, seriesSeed: 19, color: "var(--series-5)" },
];

export const ANALYTICS_METRICS: Metric[] = [
  ...PERFORMANCE_METRICS,
  { label: "Comments", value: "8.4K", delta: "+11%", positive: true, seriesSeed: 23, color: "var(--series-1)" },
];

export const TOP_COUNTRIES = [
  { code: "GB", name: "United Kingdom", pct: 62 },
  { code: "US", name: "United States", pct: 9 },
  { code: "AU", name: "Australia", pct: 4 },
  { code: "CA", name: "Canada", pct: 3 },
  { code: "IN", name: "India", pct: 3 },
  { code: "XX", name: "Others", pct: 19 },
];

export interface Topic {
  name: string;
  views: string;
  pct: number;
  color: string;
  icon: string;
}

export const TOPICS_PERFORMANCE: Topic[] = [
  { name: "Health & Social Care", views: "1.2M Views", pct: 100, color: "#34d399", icon: "heart" },
  { name: "Economy & Finance", views: "980K Views", pct: 82, color: "#fbbf24", icon: "pound" },
  { name: "Education & Skills", views: "760K Views", pct: 63, color: "#a78bfa", icon: "cap" },
  { name: "Environment & Climate", views: "710K Views", pct: 59, color: "#22d3ee", icon: "leaf" },
  { name: "Transport & Infrastructure", views: "610K Views", pct: 51, color: "#fb923c", icon: "transport" },
];

// ---- Analytics tab specifics (INST-04) ------------------------------------
export const CONTENT_TYPE_PERF = [
  { type: "Announcements", views: "720K", pct: 100, color: "#22c55e" },
  { type: "Publications", views: "540K", pct: 75, color: "#3b82f6" },
  { type: "Consultations", views: "320K", pct: 45, color: "#a855f7" },
  { type: "Statistics & Research", views: "220K", pct: 31, color: "#22d3ee" },
];

export const ENGAGEMENT_BREAKDOWN = [
  { label: "Reactions", value: "45K", pct: 45.9, color: "#3b82f6" },
  { label: "Saves", value: "22K", pct: 22.4, color: "#a855f7" },
  { label: "Shares", value: "18K", pct: 18.4, color: "#22c55e" },
  { label: "Comments", value: "8K", pct: 8.2, color: "#fb923c" },
  { label: "Downloads", value: "6K", pct: 6.1, color: "#22d3ee" },
];

export const GEO_REACH = [
  { name: "United Kingdom", pct: 42 },
  { name: "Europe (Other)", pct: 28 },
  { name: "North America", pct: 15 },
  { name: "Asia", pct: 8 },
  { name: "Other Regions", pct: 7 },
];

export const DEVICE_BREAKDOWN = [
  { label: "Desktop", pct: 52.1, color: "#3b82f6" },
  { label: "Mobile", pct: 40.3, color: "#a855f7" },
  { label: "Tablet", pct: 7.6, color: "#22c55e" },
];

export const CONTENT_THEMES = [
  { name: "Health & Social Care", value: "1.2M", pct: 100, color: "#34d399", icon: "heart" },
  { name: "Economy & Finance", value: "980K", pct: 82, color: "#3b82f6", icon: "pound" },
  { name: "Education & Skills", value: "760K", pct: 63, color: "#a78bfa", icon: "cap" },
  { name: "Environment & Climate", value: "710K", pct: 59, color: "#22c55e", icon: "leaf" },
  { name: "Transport & Infrastructure", value: "610K", pct: 51, color: "#fb923c", icon: "transport" },
];

// ---- Audience tab specifics (INST-05) -------------------------------------
export const AUDIENCE_METRICS: Metric[] = [
  { label: "Total Followers", value: "128,432", delta: "+4,321 (+3.49%)", positive: true, seriesSeed: 2, color: "var(--series-1)" },
  { label: "New Followers", value: "4,321", delta: "+12.6%", positive: true, seriesSeed: 5, color: "var(--series-2)" },
  { label: "Active Followers", value: "28,914", delta: "22.5% of total followers", positive: true, seriesSeed: 8, color: "var(--series-3)" },
  { label: "Returning Followers", value: "21,876", delta: "75.6% of active followers", positive: true, seriesSeed: 12, color: "var(--series-4)" },
  { label: "Unfollows", value: "641", delta: "-8.3%", positive: false, seriesSeed: 16, color: "var(--series-5)" },
];

export const AUDIENCE_ACTIVITY = [
  { label: "Reactions", value: "45,231", icon: "heart" },
  { label: "Comments", value: "18,764", icon: "comment" },
  { label: "Saves", value: "22,314", icon: "bookmark" },
  { label: "Shares", value: "8,452", icon: "share" },
  { label: "Profile Clicks", value: "4,122", icon: "click" },
];

export const TOP_CITIES = [
  { name: "Cardiff, Wales", pct: 18 },
  { name: "London, United Kingdom", pct: 15 },
  { name: "Birmingham, United Kingdom", pct: 7 },
  { name: "Manchester, United Kingdom", pct: 6 },
  { name: "New York, United States", pct: 4 },
];

export const AGE_DISTRIBUTION = [
  { label: "18-24", pct: 8, color: "#a855f7" },
  { label: "25-34", pct: 24, color: "#3b82f6" },
  { label: "35-44", pct: 28, color: "#22d3ee" },
  { label: "45-54", pct: 25, color: "#22c55e" },
  { label: "55-64", pct: 11, color: "#fb923c" },
  { label: "65+", pct: 4, color: "#ec4899" },
];

export const GENDER_SPLIT = [
  { label: "Female", pct: 56.2, color: "#3b82f6" },
  { label: "Male", pct: 42.8, color: "#a855f7" },
  { label: "Other / Prefer not to say", pct: 1.0, color: "#22d3ee" },
];

export const FOLLOWER_DEVICE = [
  { label: "Mobile", pct: 62.1, color: "#3b82f6" },
  { label: "Desktop", pct: 31.4, color: "#a855f7" },
  { label: "Tablet", pct: 6.5, color: "#22c55e" },
];

export const ENGAGEMENT_BY_FOLLOWER = [
  { label: "New Followers", value: "4,321", delta: "12.6%", positive: true, icon: "userplus" },
  { label: "Active Followers", value: "28,914", delta: "22.5%", positive: true, icon: "users" },
  { label: "Highly Engaged", value: "8,742", delta: "6.8%", positive: true, icon: "star" },
  { label: "Occasional", value: "67,231", delta: "52.3%", positive: true, icon: "clock", neutral: true },
  { label: "Passive", value: "23,224", delta: "18.0%", positive: false, icon: "user" },
] as { label: string; value: string; delta: string; positive: boolean; icon: string; neutral?: boolean }[];

// ---- Institution profile (INST-06) authorised people ----------------------
export const AUTHORISED_PEOPLE: AuthorisedPerson[] = [
  { name: "Sarah Evans", email: "sarah.evans@gov.wales", badge: "Owner", access: "Full Access" },
  { name: "James Morgan", email: "james.morgan@gov.wales", badge: "Editor", access: "Full Access" },
  { name: "Elin Hughes", email: "elin.hughes@gov.wales", badge: "Publisher", access: "Publish Access" },
  { name: "Rhys Williams", email: "rhys.williams@gov.wales", badge: "Analyst", access: "Analytics Access" },
];
