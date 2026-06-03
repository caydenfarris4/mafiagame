// The character bank — INTENTIONALLY EMPTY.
//
// The GDD calls for a bank of 20–25 designated characters. That content is
// authored separately, so this file ships the *type and an empty array* only.
// Until you add entries the engine falls back to clearly-labelled placeholder
// suspects, so the whole game still runs.
//
// To add characters: push objects into CHARACTER_BANK below. Each needs the
// fields in the `Character` type (see ../models.ts). Example:
//
//   {
//     key: "marcus_vale",
//     nameMale: "Marcus Vale",
//     nameFemale: "Marcia Vale",
//     archetype: "The Business Partner",
//     background: "Co-founded the firm with Richard two decades ago.",
//     personality: "Polished, controlled, allergic to a straight answer.",
//     relationshipWithRichard: "Business partners — lately, rivals.",
//     alibi: "Says he was on a call in the study all evening.",
//     secret: "Richard was about to buy him out for pennies.",
//     candor: 0.4,
//   },

import type { Character } from "../models";

export const CHARACTER_BANK: Character[] = [
  // Add authored characters here.
];
