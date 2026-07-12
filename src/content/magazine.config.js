export const magazine = {
  title: "Pictoreal · Volume 28",

  // Carved into the walls of the well's gate (placeholder — edit freely).
  club: {
    name: "THE PICTOREAL CLUB",
    lines: [
      "PICT's magazine & design collective",
      "Vol. 28 — theme: ANVESHA, the seeking",
      "",
      "· Cover Launch — the unveiling",
      "· Anvesha Art Walk — folk-art exhibit",
      "· Sutradhar Story Night — oral tales",
      "· Design Jam — 24-hour zine sprint",
    ],
    gatePrompt: "Press E to open the gate",
  },

  // The Sutradhar — the "holder of the thread" — narrates the journey.
  sutradhar: {
    welcome: [
      "I am the Sutradhar — the one who holds the thread of every tale.",
      "Welcome, traveller, to Pictoreal, Volume Twenty-Eight.",
      "The eye on our seal sees what others pass by. Tonight, so shall you.",
      "Press E at the gate, and follow me down into the seeing-eye.",
    ],
    descend: [
      "Come — the steps are old, but they hold. Down, into the dark we go.",
      "Let the lamp lead; what it touches will wake and glow.",
    ],
    arrive: [
      "Here is the heart of the eye. Every path around it hides a page.",
      "Wander freely, seeker — uncover them all, and the whole will reveal itself.",
    ],
    closingComplete:
      "Every page uncovered, every thread rejoined.\nWhat was scattered now forms one whole. This is Pictoreal.",
    closingIncomplete: "Pages still wait in the dark. Return, and keep seeking.",
    // hidden lines — spoken only when a seeker discovers the well's secrets
    secrets: {
      poke: "मुझे नहीं, साधक... पन्नों को छुओ। कथा उनमें बसती है।",
      eye: "जिसे तुम खोज रहे हो, साधक... वह भी तुम्हें देख रही है।",
      lotus: "यह कमल हर किसी को नहीं मिलता, साधक। जो खोज की राह में भटकते नहीं, उन्हीं के लिए यह आख़िरी पन्ना खिलता है।",
    },
  },

  // The assembled artwork (2 x 4 = 8 fragments -> 8 readable pages).
  fragments: {
    image: "/art/final-artwork.svg",
    rows: 2,
    cols: 4,
  },

  // Each "tier" is a magazine SECTION containing pages. The journey map lays
  // every page out as a stop along the descent, grouped by section.
  tiers: [
    {
      id: "introduction",
      name: "Introduction",
      section: "Introduction",
      intro: "Every volume begins with a single held breath. Let us begin.",
      palette: { wall: "#1a5c50", bg: "#0d3b33" },
      pages: [
        {
          id: "p01",
          title: "Editor's Note",
          surfaceImage: "/pages/p01-surface.svg",
          hiddenImage: null,
          caption: "From the editorial desk",
          blurb: "Welcome to Volume Twenty-Eight of Pictoreal. This year we look beneath the surface — at the arts, the tongues, and the places history forgot to sign.",
          archiveUrl: null,
          fragmentId: "f01",
        },
      ],
    },
    {
      id: "folk-arts",
      name: "Folk & Tribal Arts",
      section: "Folk & Tribal Arts",
      intro: "Here the walls speak in dots and lines — the oldest hands of India.",
      palette: { wall: "#175048", bg: "#0c332e" },
      pages: [
        {
          id: "p02",
          title: "Warli: The Geometry of Daily Life",
          surfaceImage: "/pages/p02-surface.svg",
          hiddenImage: "/pages/p02-hidden.svg",
          caption: "Maharashtra",
          blurb: "In Warli painting, the whole of village life is told in circles, triangles and lines — dancing, farming, marrying and mourning.",
          archiveUrl: null,
          fragmentId: "f02",
        },
        {
          id: "p03",
          title: "Mithila Tales: Madhubani Today",
          surfaceImage: "/pages/p03-surface.svg",
          hiddenImage: null,
          caption: "Bihar",
          blurb: "Madhubani, or Mithila art, once covered wedding walls in Bihar. Today its fish, peacocks and lotuses travel far beyond them.",
          archiveUrl: null,
          fragmentId: "f03",
        },
        {
          id: "p04",
          title: "Bengal Patua Scrolls",
          surfaceImage: "/pages/p04-surface.svg",
          hiddenImage: "/pages/p04-hidden.svg",
          caption: "West Bengal",
          blurb: "Bengal's Patua scroll-painters unroll their canvases song by song, performing whole epics one hand-painted panel at a time.",
          archiveUrl: null,
          fragmentId: "f04",
        },
      ],
    },
    {
      id: "language",
      name: "Language & Oral Tradition",
      section: "Language & Oral Tradition",
      intro: "Some tongues are fading to silence. Listen closely while they remain.",
      palette: { wall: "#134842", bg: "#0a2c27" },
      pages: [
        {
          id: "p05",
          title: "The Dying Dialects",
          surfaceImage: "/pages/p05-surface.svg",
          hiddenImage: null,
          caption: "Voices at the edge",
          blurb: "Across India a language falls silent every few years. With each one, an entire way of naming the world is lost forever.",
          archiveUrl: null,
          fragmentId: "f05",
        },
        {
          id: "p06",
          title: "Grandmother's Folk Tales",
          surfaceImage: "/pages/p06-surface.svg",
          hiddenImage: "/pages/p06-hidden.svg",
          caption: "Oral traditions",
          blurb: "Before books, grandmothers were the libraries — carrying tales of clever jackals and kind kings from one night to the next.",
          archiveUrl: null,
          fragmentId: "f06",
        },
      ],
    },
    {
      id: "architecture",
      name: "Hidden Architecture",
      section: "Hidden Architecture",
      intro: "The deepest marvels were built downward, into the earth. Descend.",
      palette: { wall: "#0f3d38", bg: "#08231f" },
      pages: [
        {
          id: "p07",
          title: "Stepwells: Cathedrals of Water",
          surfaceImage: "/pages/p07-surface.svg",
          hiddenImage: "/pages/p07-hidden.svg",
          caption: "Gujarat & Rajasthan",
          blurb: "The stepwell, or baoli, is architecture turned inside out — a cathedral dug downward, its beauty hidden below the earth to reach the water.",
          archiveUrl: null,
          fragmentId: "f07",
        },
        {
          id: "p08",
          title: "Regional Crafts, Unsigned",
          surfaceImage: "/pages/p08-surface.svg",
          hiddenImage: null,
          caption: "The unnamed makers",
          blurb: "The finest regional crafts rarely carry a maker's name. This is a note of thanks to the unsigned hands behind them.",
          archiveUrl: null,
          fragmentId: "f08",
        },
      ],
    },
  ],
};

import { validateConfig } from "./validate-config.js";
import { realTiers } from "./real-pages.js";
import { pageBlurbs } from "./page-blurbs.js";

// ---------------------------------------------------------------------------
// THE REAL Pictoreal Vol. 28 (draft 3) — 154 optimized page scans in magazine
// order, replacing every placeholder tier. Each section keeps a language tag
// so read-aloud picks the right voice (en / hi / mr).
// ---------------------------------------------------------------------------
magazine.tiers = realTiers.map((t) => ({
  id: t.id,
  name: t.name,
  section: t.section,
  intro: t.intro,
  palette: { wall: "#12403a", bg: "#082420" },
  pages: t.pages.map((p, i) => ({
    id: `${t.id}-${i + 1}`,
    title: p.title,
    lang: t.lang,
    surfaceImage: `pages/real/${p.file}`,
    hiddenImage: null,
    caption: t.caption,
    // real spoken summary of the page's content (from reading the print)
    blurb: pageBlurbs[p.file] || "",
    archiveUrl: null,
    fragmentId: `${t.id}-f${i + 1}`,
  })),
}));
// 154 pages -> 7 x 22 completion grid
magazine.fragments.rows = 7;
magazine.fragments.cols = 22;


const check = validateConfig(magazine);
if (!check.valid) {
  console.error("magazine.config.js is invalid:", check.errors);
}
