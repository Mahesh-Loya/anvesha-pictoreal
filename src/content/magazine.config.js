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

// ---------------------------------------------------------------------------
// PROTOTYPE dummy pages (English / Hindi / Marathi).
//
// Placeholder text so we can walk ~200 pages and test the read-aloud voice in
// each language (browser TTS picks a matching voice; ElevenLabs, once wired,
// reads them all). Delete this whole block and restore fragments rows/cols
// when the real magazine content lands.
// ---------------------------------------------------------------------------
const DUMMY_LANGS = [
  {
    key: "en",
    tierId: "sample-en",
    section: "Sample Pages — English",
    intro: "A run of placeholder pages in English — dummy text for testing.",
    title: "Sample Page",
    caption: "English · placeholder",
    palette: { wall: "#12403a", bg: "#082420" },
    sentences: [
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi.",
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
      "Curabitur pretium tincidunt lacus, gravida malesuada libero fermentum.",
      "Nam ornare accumsan ante, sollicitudin suscipit magna vulputate eget.",
      "Vivamus fermentum semper porta, nunc diam velit adipiscing sapien.",
      "Aenean commodo ligula eget dolor, cum sociis natoque penatibus magnis.",
      "Donec quam felis, ultricies nec, pellentesque eu, pretium quis sem.",
    ],
  },
  {
    key: "hi",
    tierId: "sample-hi",
    section: "नमूना पृष्ठ — हिन्दी",
    intro: "हिन्दी में कुछ नमूना पृष्ठ — केवल परीक्षण के लिए रखा गया पाठ।",
    title: "नमूना पृष्ठ",
    caption: "हिन्दी · नमूना",
    palette: { wall: "#153f4a", bg: "#0a232a" },
    sentences: [
      "यह एक नमूना पाठ है जो केवल परीक्षण के लिए लिखा गया है।",
      "अन्वेषा का अर्थ है खोज, और यह पत्रिका उसी भावना को समर्पित है।",
      "शब्दों की यह धारा अभी अस्थायी है और बाद में बदल दी जाएगी।",
      "प्राचीन कथाएँ पीढ़ी दर पीढ़ी मौखिक रूप से आगे बढ़ती रहीं।",
      "कला और भाषा मिलकर किसी समाज की आत्मा को दर्शाती हैं।",
      "इस पृष्ठ पर लिखा पाठ आवाज़ परीक्षण के लिए उपयोग किया जा रहा है।",
      "दीपक की रोशनी में हर छिपी हुई बात धीरे-धीरे प्रकट होती है।",
      "यह वाक्य केवल उदाहरण के तौर पर यहाँ रखा गया है।",
      "सूत्रधार हर कहानी का धागा अपने हाथ में थामे रहता है।",
      "खोज की यह यात्रा अंधकार से प्रकाश की ओर ले जाती है।",
    ],
  },
  {
    key: "mr",
    tierId: "sample-mr",
    section: "नमुना पाने — मराठी",
    intro: "मराठीतील काही नमुना पाने — फक्त चाचणीसाठी ठेवलेला मजकूर.",
    title: "नमुना पान",
    caption: "मराठी · नमुना",
    palette: { wall: "#123d44", bg: "#082226" },
    sentences: [
      "हा एक नमुना मजकूर आहे जो केवळ चाचणीसाठी लिहिला आहे.",
      "अन्वेषा म्हणजे शोध, आणि हे मासिक त्याच भावनेला समर्पित आहे.",
      "हा शब्दप्रवाह सध्या तात्पुरता आहे आणि नंतर बदलला जाईल.",
      "प्राचीन कथा पिढ्यानपिढ्या मौखिक रूपाने पुढे जात राहिल्या.",
      "कला आणि भाषा मिळून समाजाचा आत्मा दर्शवतात.",
      "या पानावरील मजकूर आवाज चाचणीसाठी वापरला जात आहे.",
      "दिव्याच्या प्रकाशात प्रत्येक लपलेली गोष्ट हळूहळू उघड होते.",
      "हे वाक्य फक्त उदाहरण म्हणून येथे ठेवले आहे.",
      "सूत्रधार प्रत्येक कथेचा धागा आपल्या हातात धरून ठेवतो.",
      "शोधाचा हा प्रवास अंधारातून प्रकाशाकडे घेऊन जातो.",
    ],
  },
];

const PER_LANG = 64; // 3 x 64 = 192 dummy + 8 curated = 200 pages total

function dummyBlurb(sentences, n) {
  const out = [];
  for (let k = 0; k < 4; k++) out.push(sentences[(n * 3 + k) % sentences.length]);
  return out.join(" ");
}
function dummyPlaceholder(num, label, bg) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='900'>` +
    `<rect width='640' height='900' fill='${bg}'/>` +
    `<rect x='26' y='26' width='588' height='848' fill='none' stroke='#e9dcc2' stroke-width='4'/>` +
    `<text x='320' y='330' font-family='Georgia, serif' font-size='150' fill='#f4ece0' text-anchor='middle'>${num}</text>` +
    `<text x='320' y='450' font-family='Georgia, serif' font-size='42' fill='#fcde5a' text-anchor='middle'>${label}</text>` +
    `<text x='320' y='520' font-family='sans-serif' font-size='26' fill='#cbb68a' text-anchor='middle'>Pictoreal · Vol. 28</text>` +
    `</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

for (const L of DUMMY_LANGS) {
  const pages = [];
  for (let i = 0; i < PER_LANG; i++) {
    const tag = `${L.key}${String(i + 1).padStart(3, "0")}`;
    pages.push({
      id: `sp-${tag}`,
      title: `${L.title} ${i + 1}`,
      lang: L.key,
      surfaceImage: dummyPlaceholder(i + 1, L.caption, L.palette.bg),
      hiddenImage: null,
      caption: L.caption,
      blurb: dummyBlurb(L.sentences, i),
      archiveUrl: null,
      fragmentId: `sf-${tag}`,
    });
  }
  magazine.tiers.push({
    id: L.tierId,
    name: L.section,
    section: L.section,
    intro: L.intro,
    palette: L.palette,
    pages,
  });
}

// keep validation happy: rows * cols must equal the new total page count
magazine.fragments.rows = 10;
magazine.fragments.cols = 20;

const check = validateConfig(magazine);
if (!check.valid) {
  console.error("magazine.config.js is invalid:", check.errors);
}
