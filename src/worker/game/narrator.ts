// The Narrator (a Detective) — the lines spoken aloud on the TV.
//
// Produced as plain strings and pushed to the TV, which reads them with the
// browser's Web Speech API (no audio files, no token). Templated from game
// context so they always use *designated character names* (GDD section 2).
//
// Each helper returns a list of "beats": short sentences the TV speaks one
// after another, so pacing and captions line up.

import type { DeathLocation, TimeOfDeath } from "./models";

export const VICTIM = "Richard";

export function opening(
  hasAccomplice: boolean,
  location: DeathLocation,
  time: TimeOfDeath,
): string[] {
  const beats = [
    "Good evening. I am the detective assigned to this case, and I am afraid the news is not good.",
    `${VICTIM} is dead.`,
    `He was found at ${location.name.toLowerCase()}, sometime around ${time.name.toLowerCase()}.`,
    "Every single person in this room had a reason to want him gone. A motive. Each of you.",
    "But only one of you acted on it.",
  ];
  if (hasAccomplice) {
    beats.push("And given the circumstances, I believe two people worked together to carry out this murder.");
  }
  beats.push("Before anyone says a word, read your character sheet. Privately. Then we begin.");
  return beats;
}

export function rulesExplainer(mingleMinutes: number): string[] {
  return [
    "Here is how this will go.",
    "We play three rounds. Each round has four parts.",
    "First, the clue drop. I will reveal three pieces of evidence.",
    `Then the mingle phase. You will have ${mingleMinutes} minutes to move, talk, and accuse in private.`,
    "Then a hotseat vote. You will choose, on your phones, who to interrogate.",
    "Then the interrogation itself. Open floor. Anyone may ask anything.",
    "That loop repeats three times.",
    "Once per game, if every innocent agrees, you may call an emergency vote.",
    "If you are innocent, help me find the murderer.",
    "If you are the murderer — go unnoticed, and get away with it.",
  ];
}

export function clueDropIntro(roundNumber: number, tampered: boolean): string[] {
  if (tampered) {
    return [
      `Round ${roundNumber}. New evidence.`,
      "But something is wrong.",
      "The culprit has tampered with the evidence. One clue has been replaced.",
      "Three pieces. Here is the first.",
    ];
  }
  return [`Round ${roundNumber}. Three new pieces of evidence.`, "Listen carefully. Here is the first."];
}

export function clueReveal(index: number, text: string): string[] {
  const ordinals = ["The first.", "The second.", "And the last."];
  const label = index < ordinals.length ? ordinals[index] : `Clue ${index + 1}.`;
  return [label, text];
}

export function hotseatResult(name: string | null): string[] {
  if (name === null) return ["No majority. No one takes the hotseat this round. We move on."];
  return [`The room has spoken. ${name}, take the hotseat.`];
}

export function banBlocked(name: string): string[] {
  return [
    `The culprit has blocked ${name} from interrogation.`,
    `You will vote again — and this time, ${name} is off the table.`,
  ];
}

export function banWasted(attempted: string, actual: string): string[] {
  return [
    `The culprit attempted to block ${attempted}, but the group voted for ${actual}.`,
    `${actual}, take the hotseat.`,
  ];
}

export function finalVoteOpen(): string[] {
  return [
    "The police have arrived.",
    "It's time. Who should they arrest?",
    "You have sixty seconds. Place your tokens. You may change them until the clock runs out.",
  ];
}

export function reveal(murderer: string, accomplice: string | null, innocentsWon: boolean): string[] {
  const beats: string[] = [innocentsWon ? "You got it right." : "I'm afraid you got it wrong."];
  if (accomplice) beats.push(`${murderer} killed ${VICTIM}. And ${accomplice} helped cover it up.`);
  else beats.push(`${murderer} killed ${VICTIM}.`);
  beats.push(innocentsWon ? "Justice, for once, is served. The case is closed." : "And tonight, the killer walks free.");
  return beats;
}
