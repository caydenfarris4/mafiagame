// The character bank.
//
// 25 designated characters (GDD section 11). Each has a gendered name pair
// (female / male), an archetype, a `background` (from the roster doc), and a
// `personality` + `relationshipWithRichard` inferred from the archetype. The
// remaining narrative fields — alibi, secret — drive the private sheets and are
// left as empty TODOs to be authored per character.
//
// `candor` (0..1) is how forthcoming the character is when read aloud; tuned a
// little per archetype below (the Gossip blabs, the Secret Keeper clams up).
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
    personality: `Tender and openly emotional, wearing every feeling on the surface. Tears come easily — and so does warmth.`,
    relationshipWithRichard: `Richard’s romantic partner. The two were devoted to each other.`,
    candor: 0.7,
  }),
  character("sparks", "Scarlett Sparks", "Samson Sparks", "The Rekindled Flame", {
    background: `An old flame who reconnected with Richard recently. The relationship was back on — but still unresolved.`,
    personality: `Warm, flirtatious and a touch nostalgic. Quick to laugh, slow to admit when something is wrong.`,
    relationshipWithRichard: `An old flame of Richard’s, recently rekindled.`,
    candor: 0.5,
  }),
  character("warden", "Wilma Warden", "Walter Warden", "The Unrequited One", {
    background: `Has loved Richard for years from a distance. He never knew, or never let on that he did.`,
    personality: `Quiet and watchful, careful with every word. Keeps deep feelings buried under perfect politeness.`,
    relationshipWithRichard: `A longtime friend of Richard’s who admired him from afar.`,
    candor: 0.25,
  }),
  character("bridgeburn", "Bella Bridgeburn", "Benson Bridgeburn", "The Estranged Relative", {
    background: `Family, but hadn’t spoken to Richard in years after a falling out. Came tonight for an uneasy reconciliation.`,
    personality: `Reserved and a little defensive — guarded, but trying. Old wounds sit close to the surface.`,
    relationshipWithRichard: `Richard’s estranged relative, here to mend a years-old rift.`,
    candor: 0.3,
  }),
  character("grieves", "Gloria Grieves", "Gideon Grieves", "The Disappointed Parent Figure", {
    background: `Raised or mentored Richard and never stopped voicing disappointment in who he became.`,
    personality: `Stern and exacting, quick to lecture. Real affection hides behind a habit of criticism.`,
    relationshipWithRichard: `A parental figure who raised and mentored Richard.`,
    candor: 0.45,
  }),
  character("wrathmore", "Whitney Wrathmore", "Winston Wrathmore", "The Bitter Ex", {
    background: `A former partner who never got over the breakup — and never let anyone forget it.`,
    personality: `Sharp-tongued and dramatic, forever dredging up the past. Thin-skinned beneath all the bravado.`,
    relationshipWithRichard: `Richard’s former partner. The breakup was anything but clean.`,
    candor: 0.5,
  }),
  character("castaway", "Clara Castaway", "Caleb Castaway", "The Jealous Sibling", {
    background: `Spent a lifetime living in Richard’s shadow and resents every advantage he ever had.`,
    personality: `Competitive and prickly, always keeping score. The humor has a real edge of resentment to it.`,
    relationshipWithRichard: `Richard’s sibling — and lifelong rival for attention.`,
    candor: 0.35,
  }),
  character("victors", "Vivienne Victors", "Vance Victors", "The Rival", {
    background: `Competed with Richard for years — professionally, socially, sometimes romantically — and never quite came out on top.`,
    personality: `Ambitious and smooth, always performing. Congenial on the surface, quietly calculating underneath.`,
    relationshipWithRichard: `A longtime rival of Richard’s, in everything that mattered.`,
    candor: 0.3,
  }),
  character("scornwell", "Sidney Scornwell", "Samuel Scornwell", "The Skeptic", {
    background: `Never trusted Richard’s charm for a second, and isn’t shy about saying “I told you so.”`,
    personality: `Dry, cynical and blunt. Trusts no one’s version of events — and says exactly that.`,
    relationshipWithRichard: `An acquaintance who never bought Richard’s charming act.`,
    candor: 0.6,
  }),
  character("revere", "Rachel Revere", "Rodney Revere", "The True Believer", {
    background: `Idolizes Richard completely and refuses to hear a single bad word about him — even now.`,
    personality: `Earnest and loyal to a fault, leaping to Richard’s defense. Sweetly, stubbornly naive.`,
    relationshipWithRichard: `A devoted friend and admirer of Richard’s.`,
    candor: 0.4,
  }),
  character("steadfast", "Sage Steadfast", "Spencer Steadfast", "The Loyal Best Friend", {
    background: `Richard’s ride-or-die. Would do anything for him, no questions asked.`,
    personality: `Steady, dependable and fiercely protective. Calm under pressure when everyone else frays.`,
    relationshipWithRichard: `Richard’s best friend, through thick and thin.`,
    candor: 0.4,
  }),
  character("vanguard", "Veronica Vanguard", "Vincent Vanguard", "The Protective Eldest", {
    background: `Self-appointed guardian of Richard for years. Carries crushing guilt that they couldn’t protect him this time.`,
    personality: `Serious and responsible, the one who takes charge. Quietly carries the weight of everyone else.`,
    relationshipWithRichard: `Richard’s protective elder — the family’s self-appointed guardian.`,
    candor: 0.45,
  }),
  character("harmony", "Hannah Harmony", "Henry Harmony", "The Peacemaker", {
    background: `Hates conflict and always steps in to smooth things over before they escalate.`,
    personality: `Gentle, diplomatic and conciliatory, forever defusing the room. Deeply uncomfortable with confrontation.`,
    relationshipWithRichard: `A mutual friend who held Richard’s circle together.`,
    candor: 0.5,
  }),
  character("zealot", "Zoe Zealot", "Zeke Zealot", "The Sycophant", {
    background: `Obsessed with Richard in an unsettling way — knows every detail of his life, like a fan who’s followed him for years.`,
    personality: `Eager and over-attentive, unsettlingly enthusiastic. Hangs on every word and remembers all of them.`,
    relationshipWithRichard: `A devoted follower who orbited every corner of Richard’s life.`,
    candor: 0.55,
  }),
  character("windfall", "Willa Windfall", "Wesley Windfall", "The Heir", {
    background: `Not Richard’s child, but positioned to receive a windfall from his death — and well aware of it.`,
    personality: `Polished and a little entitled, smooth whenever money comes up. Careful not to look too pleased.`,
    relationshipWithRichard: `A beneficiary set to inherit from Richard — though no relation by blood.`,
    candor: 0.3,
  }),
  character("broker", "Bianca Broker", "Brett Broker", "The Business Partner", {
    background: `Financially entangled with Richard in ways no one else knew about.`,
    personality: `Composed and professional, playing every card close. Deflects hard questions with jargon and ease.`,
    relationshipWithRichard: `Richard’s business partner.`,
    candor: 0.3,
  }),
  character("ransom", "Rosie Ransom", "Rudy Ransom", "The Blackmailee", {
    background: `Richard had something on them. No one knows what — only that he used it.`,
    personality: `Tense and evasive, quick to change the subject. Jumpy the moment the questions get specific.`,
    relationshipWithRichard: `An associate Richard quietly held leverage over.`,
    candor: 0.2,
  }),
  character("chirper", "Chelsea Chirper", "Chester Chirper", "The Gossip", {
    background: `Snoops and pries into everyone’s business in secret, then can’t wait to tell.`,
    personality: `Chatty and nosy, positively delighted by drama. Never met a secret they could actually keep.`,
    relationshipWithRichard: `A social acquaintance always tangled up in Richard’s business.`,
    candor: 0.8,
  }),
  character("levy", "Loretta Levy", "Luther Levy", "The Debtor", {
    background: `Owed Richard something significant. No one’s sure if it was money, a favor, or worse.`,
    personality: `Anxious and ingratiating, prone to over-explaining. Tries far too hard to seem perfectly fine.`,
    relationshipWithRichard: `Someone who owed Richard a significant debt.`,
    candor: 0.3,
  }),
  character("tattle", "Tessa Tattle", "Tucker Tattle", "The Whistleblower", {
    background: `Knew something damaging about Richard and was threatening to expose it.`,
    personality: `Principled and intense, with a righteous streak. Blunt about the truth, whatever it costs.`,
    relationshipWithRichard: `A colleague who knew too much about what Richard was hiding.`,
    candor: 0.6,
  }),
  character("locke", "Lydia Locke", "Lyle Locke", "The Secret Keeper", {
    background: `Private and closed-off, holding a secret no one else knows — and has no intention of sharing.`,
    personality: `Reserved, careful and hard to read. Answers questions with questions and gives nothing away.`,
    relationshipWithRichard: `A close confidant of Richard’s, trusted with his secrets.`,
    candor: 0.15,
  }),
  character("entangle", "Eva Entangle", "Evan Entangle", "The Reluctant Accomplice", {
    background: `Got pulled into something for Richard they never wanted any part of.`,
    personality: `Conflicted and uneasy, hesitating before every answer. Torn between loyalty and a guilty conscience.`,
    relationshipWithRichard: `An associate Richard drew into something they never wanted.`,
    candor: 0.3,
  }),
  character("wilde", "Waverly Wilde", "Weston Wilde", "The Wild Card", {
    background: `Unpredictable. No one’s even sure how they knew Richard — or if they’re really related at all.`,
    personality: `Erratic and playful, impossible to pin down. Says outrageous things with a grin and means who-knows-what.`,
    relationshipWithRichard: `An unclear connection to Richard — even they won’t quite say.`,
    candor: 0.4,
  }),
  character("fringe", "Fiona Fringe", "Felix Fringe", "The Party Stranger", {
    background: `Barely knew Richard. Came as someone else’s plus-one and never quite explained why they stayed.`,
    personality: `Aloof, noncommittal and a little mysterious. Watches the room far more than they speak.`,
    relationshipWithRichard: `A near-stranger to Richard, here as someone else’s guest.`,
    candor: 0.35,
  }),
  character("hunt", "Hazel Hunt", "Hudson Hunt", "The Scene Kid", {
    background: `Treating the whole thing like their personal true crime podcast — a little too excited to be here.`,
    personality: `Giddy and morbidly curious, with zero tact. Treats the whole tragedy like a thrilling episode.`,
    relationshipWithRichard: `A casual acquaintance of Richard’s, thrilled to be at a real crime scene.`,
    candor: 0.7,
  }),
];
