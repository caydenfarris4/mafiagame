// The character bank.
//
// 25 designated characters (GDD section 11). Each has a gendered name pair
// (female / male), an archetype, and a `background` (the archetype description
// from the roster doc). The remaining narrative fields — personality,
// relationshipWithRichard, alibi, secret — drive the introductions and private
// sheets and are left as empty TODOs to be authored per character.
//
// `candor` (0..1) is how forthcoming the character is when read aloud; tune per
// character once the narrative is written. Defaults to 0.3 here.
//
// See ../models.ts for the full `Character` type.

import type { Character } from "../models";

// Small helper so each entry reads as just its content. The female name is
// listed first in the roster, the male name second.
function character(
  key: string,
  nameFemale: string,
  nameMale: string,
  archetype: string,
  narrative: Partial<Pick<Character, "background" | "personality" | "relationshipWithRichard" | "alibi" | "secret" | "candor">> = {},
): Character {
  return {
    key,
    nameFemale,
    nameMale,
    archetype,
    background: narrative.background ?? "",
    personality: narrative.personality ?? "",
    relationshipWithRichard: narrative.relationshipWithRichard ?? "",
    alibi: narrative.alibi ?? "",
    secret: narrative.secret ?? "",
    candor: narrative.candor ?? 0.3,
  };
}

export const CHARACTER_BANK: Character[] = [
  character("longheart", "Lauren Longheart", "Liam Longheart", "The Grieving Lover", {
    background: `Richard’s romantic partner, devastated by his death — the most openly emotional person in the house.`,
  }),
  character("sparks", "Scarlett Sparks", "Samson Sparks", "The Rekindled Flame", {
    background: `An old flame who reconnected with Richard recently. The relationship was back on — but still unresolved.`,
  }),
  character("warden", "Wilma Warden", "Walter Warden", "The Unrequited One", {
    background: `Has loved Richard for years from a distance. He never knew, or never let on that he did.`,
  }),
  character("bridgeburn", "Bella Bridgeburn", "Benson Bridgeburn", "The Estranged Relative", {
    background: `Family, but hadn’t spoken to Richard in years after a falling out. Came tonight for an uneasy reconciliation.`,
  }),
  character("grieves", "Gloria Grieves", "Gideon Grieves", "The Disappointed Parent Figure", {
    background: `Raised or mentored Richard and never stopped voicing disappointment in who he became.`,
  }),
  character("wrathmore", "Whitney Wrathmore", "Winston Wrathmore", "The Bitter Ex", {
    background: `A former partner who never got over the breakup — and never let anyone forget it.`,
  }),
  character("castaway", "Clara Castaway", "Caleb Castaway", "The Jealous Sibling", {
    background: `Spent a lifetime living in Richard’s shadow and resents every advantage he ever had.`,
  }),
  character("victors", "Vivienne Victors", "Vance Victors", "The Rival", {
    background: `Competed with Richard for years — professionally, socially, sometimes romantically — and never quite came out on top.`,
  }),
  character("scornwell", "Sidney Scornwell", "Samuel Scornwell", "The Skeptic", {
    background: `Never trusted Richard’s charm for a second, and isn’t shy about saying “I told you so.”`,
  }),
  character("revere", "Rachel Revere", "Rodney Revere", "The True Believer", {
    background: `Idolizes Richard completely and refuses to hear a single bad word about him — even now.`,
  }),
  character("steadfast", "Sage Steadfast", "Spencer Steadfast", "The Loyal Best Friend", {
    background: `Richard’s ride-or-die. Would do anything for him, no questions asked.`,
  }),
  character("vanguard", "Veronica Vanguard", "Vincent Vanguard", "The Protective Eldest", {
    background: `Self-appointed guardian of Richard for years. Carries crushing guilt that they couldn’t protect him this time.`,
  }),
  character("harmony", "Hannah Harmony", "Henry Harmony", "The Peacemaker", {
    background: `Hates conflict and always steps in to smooth things over before they escalate.`,
  }),
  character("zealot", "Zoe Zealot", "Zeke Zealot", "The Sycophant", {
    background: `Obsessed with Richard in an unsettling way — knows every detail of his life, like a fan who’s followed him for years.`,
  }),
  character("windfall", "Willa Windfall", "Wesley Windfall", "The Heir", {
    background: `Not Richard’s child, but positioned to receive a windfall from his death — and well aware of it.`,
  }),
  character("broker", "Bianca Broker", "Brett Broker", "The Business Partner", {
    background: `Financially entangled with Richard in ways no one else knew about.`,
  }),
  character("ransom", "Rosie Ransom", "Rudy Ransom", "The Blackmailee", {
    background: `Richard had something on them. No one knows what — only that he used it.`,
  }),
  character("chirper", "Chelsea Chirper", "Chester Chirper", "The Gossip", {
    background: `Snoops and pries into everyone’s business in secret, then can’t wait to tell.`,
  }),
  character("levy", "Loretta Levy", "Luther Levy", "The Debtor", {
    background: `Owed Richard something significant. No one’s sure if it was money, a favor, or worse.`,
  }),
  character("tattle", "Tessa Tattle", "Tucker Tattle", "The Whistleblower", {
    background: `Knew something damaging about Richard and was threatening to expose it.`,
  }),
  character("locke", "Lydia Locke", "Lyle Locke", "The Secret Keeper", {
    background: `Private and closed-off, holding a secret no one else knows — and has no intention of sharing.`,
  }),
  character("entangle", "Eva Entangle", "Evan Entangle", "The Reluctant Accomplice", {
    background: `Got pulled into something for Richard they never wanted any part of.`,
  }),
  character("wilde", "Waverly Wilde", "Weston Wilde", "The Wild Card", {
    background: `Unpredictable. No one’s even sure how they knew Richard — or if they’re really related at all.`,
  }),
  character("fringe", "Fiona Fringe", "Felix Fringe", "The Party Stranger", {
    background: `Barely knew Richard. Came as someone else’s plus-one and never quite explained why they stayed.`,
  }),
  character("hunt", "Hazel Hunt", "Hudson Hunt", "The Scene Kid", {
    background: `Treating the whole thing like their personal true crime podcast — a little too excited to be here.`,
  }),
];
