export const magazine = {
  title: "Anvesha — The Stepwell of Anvesha",

  sutradhar: {
    closingComplete: "Every fragment surfaced becomes the whole.\nWhat was hidden, you have made visible.",
    closingIncomplete: "There is more to seek above.",
  },

  fragments: {
    image: "/art/final-artwork.svg",
    rows: 1,
    cols: 5,
  },

  tiers: [
    {
      id: "surface",
      name: "The Surface",
      section: "Introduction",
      depth: 0,
      light: 1.0,
      palette: { wall: "#E8C77A", bg: "#2A3A5E" },
      map: [
        "########################",
        "#......................#",
        "#......S.......C.......#",
        "#..........p...........#",
        "#.....................>#",
        "########################",
      ],
      npc: {
        id: "custodian",
        lines: [
          "Welcome, seeker.",
          "What everyone sees is only the surface.",
          "The true stories of Anvesha lie below. Descend, and uncover them.",
        ],
      },
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
      name: "Folk Arts Gallery",
      section: "Folk & Tribal Arts",
      depth: 1,
      light: 0.4,
      palette: { wall: "#D97A2B", bg: "#241A2E" },
      map: [
        "########################",
        "#<....p.......p........#",
        "#......................#",
        "#...C.......h..........#",
        "#.....................>#",
        "########################",
      ],
      npc: {
        id: "patua",
        lines: ["These scrolls once told whole epics, panel by panel."],
      },
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
        {
          id: "p05",
          title: "Chittara: Walls as Canvas",
          surfaceImage: "/pages/p05-surface.svg",
          hiddenImage: null,
          caption: "Karnataka",
          archiveUrl: null,
          fragmentId: "f05",
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
