export const magazine = {
  title: "Pictoreal · Volume 28",

  // The Sutradhar — the "holder of the thread" — narrates the journey.
  sutradhar: {
    welcome: [
      "I am the Sutradhar — the one who holds the thread of every tale.",
      "Welcome, traveller, to Pictoreal, Volume Twenty-Eight.",
      "The eye on our seal sees what others pass by. Tonight, so shall you.",
      "Follow the thread of light. Each glowing stop hides a page to uncover.",
    ],
    closingComplete:
      "Every page uncovered, every thread rejoined.\nWhat was scattered now forms one whole. This is Pictoreal.",
    closingIncomplete: "Pages still wait in the dark. Return, and keep seeking.",
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
          archiveUrl: null,
          fragmentId: "f02",
        },
        {
          id: "p03",
          title: "Mithila Tales: Madhubani Today",
          surfaceImage: "/pages/p03-surface.svg",
          hiddenImage: null,
          caption: "Bihar",
          archiveUrl: null,
          fragmentId: "f03",
        },
        {
          id: "p04",
          title: "Bengal Patua Scrolls",
          surfaceImage: "/pages/p04-surface.svg",
          hiddenImage: "/pages/p04-hidden.svg",
          caption: "West Bengal",
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
          archiveUrl: null,
          fragmentId: "f05",
        },
        {
          id: "p06",
          title: "Grandmother's Folk Tales",
          surfaceImage: "/pages/p06-surface.svg",
          hiddenImage: "/pages/p06-hidden.svg",
          caption: "Oral traditions",
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
          archiveUrl: null,
          fragmentId: "f07",
        },
        {
          id: "p08",
          title: "Regional Crafts, Unsigned",
          surfaceImage: "/pages/p08-surface.svg",
          hiddenImage: null,
          caption: "The unnamed makers",
          archiveUrl: null,
          fragmentId: "f08",
        },
      ],
    },
  ],
};

import { validateConfig } from "./validate-config.js";

const check = validateConfig(magazine);
if (!check.valid) {
  console.error("magazine.config.js is invalid:", check.errors);
}
