// The character bank.
//
// 25 designated characters (GDD section 11). Each has a gendered name pair
// (female / male) and an archetype, filled in below. The narrative fields —
// background, personality, relationshipWithRichard, alibi, secret — drive the
// introductions (read aloud on the TV) and the private character sheets; they
// are left as empty TODOs to be authored per character.
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
  character("longheart", "Lauren Longheart", "Liam Longheart", "The Grieving Lover"),
  character("sparks", "Scarlett Sparks", "Samson Sparks", "The Rekindled Flame"),
  character("warden", "Wilma Warden", "Walter Warden", "The Unrequited One"),
  character("bridgeburn", "Bella Bridgeburn", "Benson Bridgeburn", "The Estranged Relative"),
  character("grieves", "Gloria Grieves", "Gideon Grieves", "The Disappointed Parent Figure"),
  character("wrathmore", "Whitney Wrathmore", "Winston Wrathmore", "The Bitter Ex"),
  character("castaway", "Clara Castaway", "Caleb Castaway", "The Jealous Sibling"),
  character("victors", "Vivienne Victors", "Vance Victors", "The Rival"),
  character("scornwell", "Sidney Scornwell", "Samuel Scornwell", "The Skeptic"),
  character("revere", "Rachel Revere", "Rodney Revere", "The True Believer"),
  character("steadfast", "Sage Steadfast", "Spencer Steadfast", "The Loyal Best Friend"),
  character("vanguard", "Veronica Vanguard", "Vincent Vanguard", "The Protective Eldest"),
  character("harmony", "Hannah Harmony", "Henry Harmony", "The Peacemaker"),
  character("zealot", "Zoe Zealot", "Zeke Zealot", "The Sycophant"),
  character("windfall", "Willa Windfall", "Wesley Windfall", "The Heir"),
  character("broker", "Bianca Broker", "Brett Broker", "The Business Partner"),
  character("ransom", "Rosie Ransom", "Rudy Ransom", "The Blackmailee"),
  character("chirper", "Chelsea Chirper", "Chester Chirper", "The Gossip"),
  character("levy", "Loretta Levy", "Luther Levy", "The Debtor"),
  character("tattle", "Tessa Tattle", "Tucker Tattle", "The Whistleblower"),
  character("locke", "Lydia Locke", "Lyle Locke", "The Secret Keeper"),
  character("entangle", "Eva Entangle", "Evan Entangle", "The Reluctant Accomplice"),
  character("wilde", "Waverly Wilde", "Weston Wilde", "The Wild Card"),
  character("fringe", "Fiona Fringe", "Felix Fringe", "The Party Stranger"),
  character("hunt", "Hazel Hunt", "Hudson Hunt", "The Scene Kid"),
];
