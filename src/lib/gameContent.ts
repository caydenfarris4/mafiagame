// Static "Dead in the Water" content that isn't per-game state: the phase
// definitions (room access / search permits) and the shared Last Night timeline
// every player can read. Game-specific data (characters, clues) lives in the DB.

export type Phase = {
  n: number;
  name: string;
  durationMin: number | null;
  blurb: string;
  open: string[];
  locked: string[];
};

export const PHASES: Phase[] = [
  {
    n: 0,
    name: "Arrival",
    durationMin: 15,
    blurb:
      "Read your dossier. Alexander will gather everyone in the living room to begin.",
    open: ["Living room"],
    locked: ["Everything else"],
  },
  {
    n: 1,
    name: "The Discovery",
    durationMin: 15,
    blurb:
      "No searching yet. Alexander reveals what was found this morning. Read your sheet and size everyone up.",
    open: ["Living room"],
    locked: ["Everything else"],
  },
  {
    n: 2,
    name: "First Suspicions",
    durationMin: 30,
    blurb:
      "Search, then share. Each discussion round you must reveal one clue you found — you choose which.",
    open: ["Living room", "Dining room", "Kitchen", "Outside"],
    locked: ["Downstairs", "Gazebo", "Guest bedrooms", "Balcony", "Master suite"],
  },
  {
    n: 3,
    name: "The Investigation",
    durationMin: 40,
    blurb:
      "The guest bedrooms, the gazebo, and downstairs open up. The workhorse phase — secrets start coming out.",
    open: [
      "Living room",
      "Dining room",
      "Kitchen",
      "Outside",
      "Downstairs",
      "Gazebo",
      "Guest bedrooms",
    ],
    locked: ["Balcony", "Master suite"],
  },
  {
    n: 4,
    name: "The Unmasking",
    durationMin: 30,
    blurb:
      "The master suite and balcony open up. Search anywhere. The case is about to break.",
    open: [
      "Living room",
      "Dining room",
      "Kitchen",
      "Outside",
      "Downstairs",
      "Gazebo",
      "Guest bedrooms",
      "Balcony",
      "Master suite",
    ],
    locked: [],
  },
  {
    n: 5,
    name: "The Architect",
    durationMin: 15,
    blurb:
      "Everywhere is open, including personal belongings where authorized. You thought it was over.",
    open: ["Everywhere, including personal belongings (where authorized)"],
    locked: [],
  },
  {
    n: 6,
    name: "Closing Toast",
    durationMin: 10,
    blurb: "Out of character. Thank everyone. Take the dock photo.",
    open: ["Everywhere"],
    locked: [],
  },
];

export function getPhase(n: number): Phase {
  return PHASES.find((p) => p.n === n) ?? PHASES[0];
}

// The "found in" room shown to players: the location text up to the dash, with
// any parenthetical and trailing punctuation stripped. The full location string
// is the GM's placement note and is never sent to players.
export function clueRoom(location: string): string {
  return location
    .split("—")[0]
    .replace(/\(.*?\)/g, "")
    .replace(/[.\s]+$/, "")
    .trim();
}

// Evidence photos for the scripted murder-investigation reveals, keyed by the
// announcement title. Files live in public/evidence/ and the <img> hides itself
// if a file is missing, so this is safe to ship before the photos are uploaded.
const REVEAL_IMAGES: Record<string, string> = {
  "Phase 1 — The body": "/evidence/body.webp",
  "Phase 1 — The cleat is missing": "/evidence/cleat-missing.webp",
  "Phase 1 — The portfolio": "/evidence/portfolio.webp",
  "Phase 2 — The cleat recovered": "/evidence/cleat-recovered.webp",
};

export function revealImage(title: string): string | null {
  return REVEAL_IMAGES[title] ?? null;
}

// Shared with every player on their "The Last Night" tab. Alexander's reconstructed
// timeline. Sections render as heading + body (newlines preserved).
export const LAST_NIGHT: { heading: string; body: string }[] = [
  {
    heading: "From Alexander, house manager",
    body: "A general account of the weekend, put together Sunday morning from my own notes and a few words at breakfast. It is not a minute-by-minute record, and I've kept it broad on purpose — people came and went all weekend, and I won't pretend to know more than I do. The details are for the family to work out together. — A.",
  },
  {
    heading: "Friday",
    body: "Mr. Crookshank arrived in the evening and joined the family for dinner. There were gifts, a few toasts, and the usual back-and-forth at the table. The house settled in for the night not long after.",
  },
  {
    heading: "Saturday — daytime",
    body: "A full day around the lake — time out on the water, games on the lawn, lunch on the patio. Mr. Crookshank kept to himself for stretches of the afternoon. People drifted between the house, the grounds, the gazebo, and the dock throughout the day.",
  },
  {
    heading: "Saturday — evening",
    body: "Mocktails and dinner, then a bonfire that ran late into the night. The group came and went between the fire, the house, and the grounds; it was dark and I wasn't watching any one person in particular. Late in the evening Mr. Crookshank stepped away on his own.",
  },
  {
    heading: "Sunday morning",
    body: "I found Mr. Crookshank near the dock early Sunday morning. Dr. Langford places the time of death late Saturday night. Everything beyond that is what we are here to work out together.",
  },
];

// GM-only opening briefing, shown on the game master's dashboard during Phases
// 0–1. The `readAloud` sections are Alexander's script to read to the table; the
// others are staging notes for the GM. Players never see this.
export const GM_INTRO: { heading: string; body: string; readAloud?: boolean }[] = [
  {
    heading: "Before you begin",
    body: "Admit every guest on the Access tab and make sure each person is holding their own phone. Gather everyone, then read the lines below aloud as Alexander, the house manager. When you're done, advance to Phase 2 to open the house for searching.",
  },
  {
    heading: "The setup — read aloud",
    readAloud: true,
    body: "Thank you all for coming to the lake house this weekend. As you know, our guest was Mr. Richard Crookshank — the family's long-lost relation. This morning I found him in the shallows beside the dock. He is dead. Dr. Langford says it happened late last night, between half past eleven and midnight. And this was no accident: the brass cleat at the end of the dock has been torn loose and is missing, the notarized envelope he carried all weekend is gone, and Solomon has not stopped screaming since dawn.",
  },
  {
    heading: "Why we're all here — read aloud",
    readAloud: true,
    body: "Here is the hard truth. Every one of you had your own history with Richard, and every one of you is keeping something this weekend. We are going to search this house together, room by room, as the morning goes on. Some of you will be hunting for clues to clear your name — to prove you didn't do this. Others, I suspect, will be looking to point the rest of us in the wrong direction. When you find something, you decide: show it to the family, or keep it to yourself. By the end of the morning, we will know who killed Richard Crookshank.",
  },
  {
    heading: "Running the game",
    body: "Each phase you open unlocks more of the house. Players scan a clue's QR tag (or type the printed code) to log it. “Announce” clues post to the house feed for everyone; “Keep” clues stay private until the finder shares them. Fire the scripted reveals and Solomon lines from this dashboard at the right moments, and open the accusation ballots in Phases 4 and 5.",
  },
];

// Scene-setting establishing photos shown on the GM's opening briefing (GM-only).
// Served from public/evidence/; each <img> hides itself if its file is missing.
export const GM_INTRO_IMAGES: { src: string; caption: string }[] = [
  { src: "/evidence/property.webp", caption: "The Gig Harbor property" },
  { src: "/evidence/dock.webp", caption: "The dock at dawn" },
];
