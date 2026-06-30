import type { Comment, Release } from "@/types";

// The hero release — the Welsh Government announcement that Flow B opens in full.
export const HERO_RELEASE_ID = "wg-new-framework";

// ---------------------------------------------------------------------------
// Individual Home feed (USER-01)
// ---------------------------------------------------------------------------
export const FEED_RELEASES: Release[] = [
  {
    id: HERO_RELEASE_ID,
    institutionSlug: "welsh-government",
    type: "Announcement",
    status: "Published",
    heading: "New Framework for Sustainable Infrastructure Financing",
    subheading:
      "Welsh Government introduces an updated policy framework to mobilise private capital for sustainable infrastructure in Wales.",
    time: "2 hours ago",
    scene: "wind-farm",
    tags: ["Infrastructure", "Policy", "Sustainability"],
    extraTags: 2,
    views: "12.4K",
    comments: "340",
  },
  {
    id: "wb-renewable-subsidies",
    institutionSlug: "world-bank",
    type: "Press Release",
    status: "Published",
    heading: "New Policy on Renewable Energy Subsidies Announced to Accelerate Green Transition",
    subheading:
      "A new comprehensive policy framework aims to significantly increase investment in renewable energy by restructuring subsidy models. The initiative targets a 50% increase in solar and wind capacity by 2030.",
    time: "3 hours ago",
    scene: "city-solar",
    tags: ["Energy", "Policy", "Economics"],
    extraTags: 1,
    views: "8.7K",
    comments: "215",
  },
  {
    id: "ukp-digital-services-act",
    institutionSlug: "uk-parliament",
    type: "Legislation",
    status: "Published",
    heading: "Digital Services Act: Final Draft Approved by House of Lords",
    subheading:
      "The House of Lords has given final approval to the landmark Digital Services Act, setting new standards for online platform accountability and user safety. The bill now awaits Royal Assent before becoming law.",
    time: "5 hours ago",
    scene: "parliament",
    tags: ["Technology", "Legislation", "Digital Rights"],
    views: "15.1K",
    comments: "402",
  },
];

// ---------------------------------------------------------------------------
// Explore feed (USER-02) — institutions the reader does not yet follow
// ---------------------------------------------------------------------------
export const EXPLORE_RELEASES: Release[] = [
  {
    id: "imf-global-outlook",
    institutionSlug: "imf",
    type: "Report",
    status: "Published",
    heading: "Global Economic Outlook – May 2026",
    subheading:
      "The IMF's latest outlook highlights moderate global growth amid persistent inflation risks and policy uncertainty.",
    time: "1 hour ago",
    scene: "skyline",
    tags: ["Economy", "Outlook", "Global Growth"],
    extraTags: 1,
    views: "9.3K",
    comments: "186",
  },
  {
    id: "oecd-employment-outlook",
    institutionSlug: "oecd",
    type: "Publication",
    status: "Published",
    heading: "OECD Employment Outlook 2026",
    subheading:
      "New report examines labour market trends, skills gaps and policy priorities for inclusive and resilient economies.",
    time: "3 hours ago",
    scene: "flags",
    tags: ["Employment", "Labour Market", "Skills"],
    extraTags: 1,
    views: "7.1K",
    comments: "142",
  },
  {
    id: "ecb-interest-rates",
    institutionSlug: "ecb",
    type: "Press Release",
    status: "Published",
    heading: "ECB Keeps Interest Rates Unchanged in May Meeting",
    subheading:
      "The European Central Bank maintains key interest rates, signalling a cautious approach amid mixed economic signals.",
    time: "5 hours ago",
    scene: "ecb",
    tags: ["Monetary Policy", "Interest Rates", "Euro Area"],
    extraTags: 1,
    views: "6.2K",
    comments: "98",
  },
];

// ---------------------------------------------------------------------------
// Saved feed (USER-03)
// ---------------------------------------------------------------------------
export const SAVED_RELEASES: Release[] = [
  FEED_RELEASES[0],
  {
    id: "nrw-climate-resilience",
    institutionSlug: "natural-resources-wales",
    type: "Consultation",
    status: "Published",
    heading: "Consultation on the Draft Climate Resilience Plan for Wales",
    subheading:
      "We are seeking views on the draft Climate Resilience Plan to help Wales adapt to a changing climate and build a stronger, more resilient future.",
    time: "1 day ago",
    scene: "cardiff-bay",
    tags: ["Climate Change", "Environment", "Resilience"],
    views: "8.7K",
    comments: "215",
  },
  {
    id: "phw-labour-market",
    institutionSlug: "public-health-wales",
    type: "Publication",
    status: "Published",
    heading: "Welsh Labour Market Update – May 2024",
    subheading:
      "An overview of the latest labour market trends in Wales, including employment, unemployment and economic inactivity.",
    time: "3 days ago",
    scene: "town",
    tags: ["Labour Market", "Economy", "Employment"],
    views: "6.3K",
    comments: "128",
  },
];

// ---------------------------------------------------------------------------
// Welsh Government public profile (USER-05)
// ---------------------------------------------------------------------------
export const PROFILE_RELEASES: Release[] = [
  {
    id: "wg-global-economic-prospects",
    institutionSlug: "welsh-government",
    type: "Report",
    status: "Published",
    heading: "Global Economic Prospects – June 2024",
    subheading:
      "Global growth is projected to stabilise in 2024–25 amid moderating inflation, resilient investment, and easing financial conditions.",
    time: "2 hours ago",
    publishedDate: "Published 2 hours ago",
    scene: "cardiff-bay",
    tags: ["Economy", "Global Economy", "Development"],
    views: "9.3K",
    comments: "186",
  },
  {
    ...FEED_RELEASES[0],
    time: "1 day ago",
    publishedDate: "Published 1 day ago",
    views: "7.1K",
    comments: "142",
    extraTags: 0,
  },
  {
    id: "wg-poverty-equity",
    institutionSlug: "welsh-government",
    type: "Publication",
    status: "Published",
    heading: "Poverty and Equity Global Database – April 2024 Update",
    subheading:
      "Latest data on poverty rates, income distribution, and shared prosperity across developed and developing economies.",
    time: "3 days ago",
    publishedDate: "Published 3 days ago",
    scene: "town",
    tags: ["Data & Statistics", "Poverty", "Equity"],
    views: "6.4K",
    comments: "98",
  },
];

// ---------------------------------------------------------------------------
// Institution Dashboard (INST-01) — Recent + Top performing
// ---------------------------------------------------------------------------
export const RECENT_RELEASES: Release[] = [
  {
    id: "wg-cabinet-reshuffle",
    institutionSlug: "welsh-government",
    type: "Announcement",
    status: "Published",
    heading: "Cabinet reshuffle: new Ministers appointed",
    subheading: "New appointments announced across key portfolios to strengthen delivery.",
    time: "Published 1 day ago",
    scene: "wind-farm",
    tags: [],
    views: "22K",
    comments: "340",
    engagement: "1.2K",
  },
  {
    id: "wg-sustainable-farming",
    institutionSlug: "welsh-government",
    type: "Consultation",
    status: "Published",
    heading: "Consultation on the draft Sustainable Farming Scheme",
    subheading: "We want your views on proposals to support sustainable farming across Wales.",
    time: "Published 3 days ago",
    scene: "coast",
    tags: [],
    views: "18K",
    comments: "280",
    engagement: "950",
  },
  {
    id: "wg-programme-for-government",
    institutionSlug: "welsh-government",
    type: "Publication",
    status: "Published",
    heading: "Programme for Government 2024–2026",
    subheading: "Our plan for a fairer, greener and more prosperous Wales.",
    time: "Published 5 days ago",
    scene: "parliament",
    tags: [],
    views: "35K",
    comments: "610",
    engagement: "2.1K",
  },
  {
    id: "wg-labour-market-2024",
    institutionSlug: "welsh-government",
    type: "Statistics & Research",
    status: "Published",
    heading: "Welsh labour market update – May 2024",
    subheading: "Latest insights into employment, pay and vacancies across Wales.",
    time: "Published 1 week ago",
    scene: "town",
    tags: [],
    views: "16K",
    comments: "210",
    engagement: "780",
  },
];

export interface TopRelease {
  rank: number;
  heading: string;
  type: Release["type"];
  time: string;
  views: string;
  scene: Release["scene"];
}

export const TOP_RELEASES: TopRelease[] = [
  {
    rank: 1,
    heading: "Cabinet reshuffle: new Ministers appointed",
    type: "Announcement",
    time: "Published 1 day ago",
    views: "22K",
    scene: "wind-farm",
  },
  {
    rank: 2,
    heading: "Programme for Government 2024–2026",
    type: "Publication",
    time: "Published 5 days ago",
    views: "35K",
    scene: "parliament",
  },
  {
    rank: 3,
    heading: "Welsh labour market update – May 2024",
    type: "Statistics & Research",
    time: "Published 1 week ago",
    views: "16K",
    scene: "skyline",
  },
  {
    rank: 4,
    heading: "Consultation on Water Resources (Wales) Bill",
    type: "Consultation",
    time: "Published 2 weeks ago",
    views: "12K",
    scene: "cardiff-bay",
  },
  {
    rank: 5,
    heading: "Welsh Budget 2024: key points",
    type: "Announcement",
    time: "Published 2 weeks ago",
    views: "11K",
    scene: "town",
  },
];

// ---------------------------------------------------------------------------
// Releases management table (INST-03)
// ---------------------------------------------------------------------------
export const TABLE_RELEASES: Release[] = [
  {
    id: "tbl-cabinet",
    institutionSlug: "welsh-government",
    type: "Announcement",
    status: "Published",
    heading: "Cabinet reshuffle: new Ministers appointed",
    subheading: "New appointments announced across key portfolios to strengthen delivery.",
    time: "",
    publishedDate: "12 May 2024",
    publishedTime: "09:30 AM",
    scene: "wind-farm",
    tags: [],
    views: "22K",
    comments: "",
    engagement: "1.2K",
  },
  {
    id: "tbl-farming",
    institutionSlug: "welsh-government",
    type: "Consultation",
    status: "Published",
    heading: "Consultation on the draft Sustainable Farming Scheme",
    subheading: "We want your views on proposals to support sustainable farming across Wales.",
    time: "",
    publishedDate: "9 May 2024",
    publishedTime: "02:15 PM",
    scene: "coast",
    tags: [],
    views: "18K",
    comments: "",
    engagement: "950",
  },
  {
    id: "tbl-programme",
    institutionSlug: "welsh-government",
    type: "Publication",
    status: "Published",
    heading: "Programme for Government 2024–2026",
    subheading: "Our plan for a fairer, greener and more prosperous Wales.",
    time: "",
    publishedDate: "5 May 2024",
    publishedTime: "10:00 AM",
    scene: "parliament",
    tags: [],
    views: "35K",
    comments: "",
    engagement: "2.1K",
  },
  {
    id: "tbl-labour",
    institutionSlug: "welsh-government",
    type: "Statistics & Research",
    status: "Published",
    heading: "Welsh labour market update – May 2024",
    subheading: "Latest insights into employment, pay and vacancies across Wales.",
    time: "",
    publishedDate: "2 May 2024",
    publishedTime: "11:45 AM",
    scene: "town",
    tags: [],
    views: "16K",
    comments: "",
    engagement: "780",
  },
  {
    id: "tbl-water",
    institutionSlug: "welsh-government",
    type: "Consultation",
    status: "Scheduled",
    heading: "Consultation on Water Resources (Wales) Bill",
    subheading: "Help shape legislation to protect and manage Wales' vital water resources.",
    time: "",
    publishedDate: "16 May 2024",
    publishedTime: "09:00 AM",
    scene: "cardiff-bay",
    tags: [],
    views: "",
    comments: "",
    engagement: "",
  },
  {
    id: "tbl-budget",
    institutionSlug: "welsh-government",
    type: "Announcement",
    status: "Draft",
    heading: "Welsh Budget 2024: key points",
    subheading: "Summary of key commitments and investments in Welsh communities.",
    time: "",
    publishedDate: "",
    publishedTime: "",
    scene: "skyline",
    tags: [],
    views: "",
    comments: "",
    engagement: "",
  },
];

// ---------------------------------------------------------------------------
// Full release reading view content (USER-06)
// ---------------------------------------------------------------------------
export const HERO_OVERVIEW =
  "Welsh Government is introducing an updated policy framework designed to attract and mobilise private investment in sustainable infrastructure projects across Wales. The framework aligns with our net zero targets and long-term economic resilience strategy.";

export const HERO_KEY_POINTS = [
  "The framework introduces new financing models to support green infrastructure.",
  "It aims to reduce risk for private investors through blended finance mechanisms.",
  "Priority sectors include renewable energy, public transport, and climate-resilient infrastructure.",
  "The policy supports Wales' net zero target and sustainable economic growth.",
];

export const HERO_SUMMARY =
  "Welsh Government has launched a new policy framework to attract private investment in sustainable infrastructure. It introduces blended finance models, reduces investor risk, and prioritises key sectors like renewable energy, transport, and climate resilience to support Wales' net zero goals and long-term growth.";

// Welsh translation (canned — Translate is a visual demonstration only).
export const HERO_OVERVIEW_CY =
  "Mae Llywodraeth Cymru yn cyflwyno fframwaith polisi diweddaredig sydd wedi'i gynllunio i ddenu a sbarduno buddsoddiad preifat mewn prosiectau seilwaith cynaliadwy ledled Cymru. Mae'r fframwaith yn cyd-fynd â'n targedau sero net a'n strategaeth cydnerthedd economaidd hirdymor.";

export const HERO_KEY_POINTS_CY = [
  "Mae'r fframwaith yn cyflwyno modelau ariannu newydd i gefnogi seilwaith gwyrdd.",
  "Ei nod yw lleihau risg i fuddsoddwyr preifat trwy fecanweithiau cyllid cyfunol.",
  "Mae'r sectorau blaenoriaeth yn cynnwys ynni adnewyddadwy, trafnidiaeth gyhoeddus, a seilwaith cydnerth o ran hinsawdd.",
  "Mae'r polisi yn cefnogi targed sero net Cymru a thwf economaidd cynaliadwy.",
];

export const HERO_SUMMARY_CY =
  "Mae Llywodraeth Cymru wedi lansio fframwaith polisi newydd i ddenu buddsoddiad preifat mewn seilwaith cynaliadwy. Mae'n cyflwyno modelau cyllid cyfunol, yn lleihau risg i fuddsoddwyr, ac yn blaenoriaethu sectorau allweddol fel ynni adnewyddadwy, trafnidiaeth, a chydnerthedd hinsawdd i gefnogi nodau sero net Cymru a thwf hirdymor.";

export const HERO_TITLE_CY =
  "Fframwaith Newydd ar gyfer Ariannu Seilwaith Cynaliadwy";
export const HERO_SUBTITLE_CY =
  "Mae Llywodraeth Cymru yn cyflwyno fframwaith polisi diweddaredig i sbarduno cyfalaf preifat ar gyfer seilwaith cynaliadwy yng Nghymru.";

// Suggested questions + their canned answers for the Ask Anything panel.
export const ASK_ANYTHING: { q: string; a: string }[] = [
  {
    q: "What does this policy mean?",
    a: "In plain terms, the framework sets out how Welsh Government will partner with private investors to fund large, long-term infrastructure — sharing risk through blended finance so that more green projects (energy, transport, flood resilience) can be built without relying solely on public budgets.",
  },
  {
    q: "How will this affect businesses?",
    a: "Businesses gain clearer routes to co-invest in public infrastructure, with defined risk-sharing and a pipeline of priority projects. Construction, clean-energy and engineering firms in particular can expect new procurement and partnership opportunities over the coming years.",
  },
  {
    q: "How does this support Wales' net zero goals?",
    a: "By channelling private capital toward renewable energy, public transport and climate-resilient infrastructure, the framework is designed to accelerate decarbonisation while keeping public finances sustainable — directly supporting Wales' statutory net zero by 2050 commitment.",
  },
];

export const HERO_COMMENTS: Comment[] = [
  {
    id: "c1",
    author: "Dr. Anya Sharma",
    role: "Policy Analyst",
    verified: true,
    body: "This framework is a strong step forward for sustainable growth in Wales.",
    time: "2h ago",
    likes: 18,
  },
  {
    id: "c2",
    author: "David Chen",
    role: "Economist",
    verified: true,
    body: "Encouraging focus on blended finance. Looking forward to more details on implementation.",
    time: "2h ago",
    likes: 12,
  },
];

// Lookup any release across every dataset by id (used by the Full Release route).
const ALL_RELEASES: Release[] = [
  ...FEED_RELEASES,
  ...EXPLORE_RELEASES,
  ...SAVED_RELEASES,
  ...PROFILE_RELEASES,
];

export function findRelease(id: string): Release | undefined {
  return ALL_RELEASES.find((r) => r.id === id);
}
