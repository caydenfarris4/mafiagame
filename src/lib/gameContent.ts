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
    open: [
      "Entryway",
      "Kitchen",
      "Living room",
      "Dining area",
      "Patio",
      "Dock",
      "Gazebo",
      "Bottom floor",
    ],
    locked: ["All bedrooms", "Primary suite"],
  },
  {
    n: 3,
    name: "The Investigation",
    durationMin: 40,
    blurb:
      "Bedrooms and Richard's guest room open up. The workhorse phase — secrets start coming out.",
    open: [
      "All bedrooms",
      "Richard's guest room",
      "Entryway",
      "Kitchen",
      "Living room",
      "Dining area",
      "Patio",
      "Dock",
      "Gazebo",
      "Bottom floor",
    ],
    locked: ["Primary suite"],
  },
  {
    n: 4,
    name: "The Unmasking",
    durationMin: 30,
    blurb:
      "The primary suite is open. Search anywhere. The case is about to break.",
    open: ["Everywhere — including the primary suite"],
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

// Shared with every player on their "The Last Night" tab. Alexander's reconstructed
// timeline. Sections render as heading + body (newlines preserved).
export const LAST_NIGHT: { heading: string; body: string }[] = [
  {
    heading: "From Alexander, house manager",
    body: "Compiled Sunday morning between 7:42 AM and 9:30 AM, based on my photographs, my notes, and brief conversations at breakfast. I have flagged the gaps where my observation is incomplete. Where two of you remember the same moment differently, I've written both. — A.",
  },
  {
    heading: "Friday evening (for context)",
    body: "6:00 PM — Mr. Crookshank arrives alone in the silver sedan. Solomon in his cage, the leather portfolio, a case of glass-bottle root beer, and the notarized envelope, which he set on the dining room sideboard “where everyone could see it.”\n7:30 PM — Family dinner. Gifts at the table: orange blossom water for Catherine; a leather-bound book of poems, privately, for Eden after dinner. Beau's “Beau Thats Hot” pitch is mocked. Hank invokes the “no politics in this house” rule.\n10:30 PM — Lights out for most. Solomon on his perch in the gazebo overnight.",
  },
  {
    heading: "Saturday — morning & afternoon",
    body: "8:00 AM — Breakfast. Mr. Crookshank had two root beers and complained the lake was “shaped wrong.”\n10 AM–1 PM — Lake activities. Sebastian and Hank took the speedboat. Vivi and Catherine on the deck. Beau, Levi, Cody, Eden played volleyball. Bella in the kitchen with me.\n1:00 PM — Lunch on the patio. Mr. Crookshank ate two sandwiches and disappeared into the guest room until 3.\n~2:15 PM — Gap. I was on the south lawn. I do not know who was in the main house. Cody was “around” upstairs. Eden was “reading.” Beau says he napped on the patio chair, but it didn't look slept-in.\n3:00 PM — Mr. Crookshank reappears and pulls Vivi aside privately in the den. Vivi told me he was “telling her how proud he was of her.”\n3:30 PM — Vivi walks alone to the boathouse. She is there about two hours. Sebastian joins her at some point — I didn't see when. Both back at the house by 5.\n5:30 PM — Bella comes up from the gazebo upset, says she “needs ten minutes.” She later said it was a call with her boss. (Note: the gazebo landline shows no calls placed 5–6 PM. I'm only noting it.)",
  },
  {
    heading: "Saturday — evening",
    body: "6:00 PM — Mocktail hour on the patio.\n7:00 PM — Gap. Mr. Crookshank went to the gazebo “alone.” Bella now says she was with him about ten minutes.\n7:30 PM — Dinner. A toast about “this lovely family that has so generously claimed me.” Hank did not laugh.\n8:00 PM — Hank and Mr. Crookshank leave the table within five minutes of each other. I saw Hank walking toward the gazebo. At 8:30 Mr. Crookshank returned with a small tear in his green tweed jacket — “caught it on a nail.”\n9:00 PM — Bonfire lit. Catherine tending; Hank joined.\n9:30–9:45 PM — Gap in the main house. Catherine “looking for a notebook in the den.” Eden says she was in the games room with Beau; Beau says he was on the patio. They can't both be right.\n10:00 PM — Mr. Crookshank discovers his root beer case missing. Shouts about it.\n10 PM–12:30 AM — Levi, by his account, “on the porch with me looking at the stars.” (Privately: I covered for him. I didn't know what for.)\n11:00 PM — Hank and Catherine move to the patio sofa. I have a photo at 11:08 — holding hands, not looking at each other.\n11:15 PM — Eden “went to change shoes,” back at 11:25.\n11:30 PM — Vivi gathers everyone for “one last s'more” and launches a long, detailed Broadway story. (Hank told me at breakfast it was the same story she told at Christmas. He was certain.)\n11:30 PM — Mr. Crookshank walks alone to the dock: “I need ten minutes to rehearse. Don't let anyone interrupt.” The dock was out of my sightline.\n11:35 PM — Group photo at the bonfire: Hank, Catherine, Vivi, Beau, Eden, Bella. Sebastian is not in it — he'd “stepped outside for some air.”\n11:50 PM — Sebastian returns and sits by Vivi. (Note: I found no cigarette ash on the patio or deck.)\n11:55 PM — Vivi excused herself upstairs; back at 12:02 AM, “needed a glass of water.”\n11:59 PM — Fireworks (auto-launch; Cody set the timer).\nMidnight — Mr. Crookshank never came to the dock for the reveal. By 12:30 everyone went inside.",
  },
  {
    heading: "Sunday morning",
    body: "7:42 AM — I found Mr. Crookshank in the shallows beside the dock. The brass cleat at the end of the dock was missing; the bolts still in the wood. His leather portfolio was open in the gazebo. The notarized envelope was gone. Solomon was screaming.\n8:30 AM — Dr. Langford: time of death between 11:30 PM and midnight.\n9:30 AM — This document.",
  },
  {
    heading: "Things I cannot account for",
    body: "1. The 2–3 PM window upstairs.\n2. The 7 PM gazebo period — two different stories.\n3. The 8 PM tear in the green tweed jacket. “A nail” is possible. So is a person.\n4. The 9:30 PM gap — Eden and Beau can't both be right.\n5. The 11:30–11:50 dock period. The most important gap. Sebastian was not at the bonfire during those twenty minutes. I make no accusation. I note the fact.\n6. The 11:55 PM trip upstairs by Vivi. The primary suite has a balcony overlooking the dock.\n7. Solomon. He repeats things. He is an unreliable witness — but he was at the dock end of the property all night.",
  },
];
