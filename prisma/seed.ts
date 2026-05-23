import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { randomBytes } from "node:crypto";

const adapter = new PrismaLibSQL({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

const token = () => randomBytes(9).toString("base64url");
const sheet = (sections: { heading: string; body: string }[]) =>
  JSON.stringify(sections);

// ─────────────────────────────────────────────────────────────────────────────
// Characters (9 players + Alexander the GM). sheet = private character dossier.
// ─────────────────────────────────────────────────────────────────────────────
const characters = [
  {
    sortOrder: 1,
    personaName: "Hank Whitfield",
    realName: "Daniel",
    role: "SINNER",
    loginCode: "HANK-01",
    avatarColor: "#a8741f",
    prop: "A bolo tie. Wear it.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 56. Self-made commercial real estate. You grew up on a ranch; your father was a hard man who never gave you a dime. You have a mild temper that flashes when pushed, and a famous “no politics in this house” rule you defend at any provocation. You are the patriarch of the Whitfield family." },
      { heading: "Your relationship to Richard", body: "Richard claims to be your 10th step half-brother. You've never been able to verify it. He's been sending letters and bizarre gifts (an engraved lobster fork, a nautical chart of Gig Harbor) for a year. You agreed to host because Catherine wanted to “for the kids.” You don't trust him and you don't want his money." },
      { heading: "Where you were Saturday night", body: "Bonfire from 9 PM. With Catherine on the patio between 11 and 12. You did NOT go to the dock." },
      { heading: "Your secret", body: "At 8 PM in the gazebo, you and Richard had a private confrontation. He mocked your father, the ranch, your “self-made man” story. You shoved him into a stack of life jackets. He laughed. You walked out — and tore a small scrap of fabric from his green tweed jacket as you grabbed him. It's folded inside the inner pocket of your coat in the entryway closet. Solomon watched the whole thing. You've told no one, not even Catherine, because it makes you look guilty." },
      { heading: "What you don't know", body: "Anything about the actual murder." },
      { heading: "How to play it", body: "Mortified. You'll be the loudest voice redirecting suspicion early — that's your tell, but the family reads it as the temper. When Solomon screeches your gazebo words in Phase 2, you confess. Until then, deny." },
    ]),
  },
  {
    sortOrder: 2,
    personaName: "Catherine Whitfield",
    realName: "Nicole",
    role: "SINNER",
    loginCode: "CATHERINE-02",
    avatarColor: "#7b6cae",
    prop: "A silk scarf and a small notebook with a pen tucked in the spine.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 51. Loving, traditional, organized to a fault. You write — three published books on naturopathic medicine, herbal remedies, and the spiritual life. Your fourth book has been a secret." },
      { heading: "Your relationship to Richard", body: "You found his letters charming at first and convinced Hank to host “for the kids.” You've been polite while quietly horrified by his theatrical cruelty." },
      { heading: "Where you were Saturday night", body: "Tended the bonfire from 9 PM with brief trips inside. With Hank on the patio between 11 and 12." },
      { heading: "Your secret", body: "You've been writing a tell-all family memoir for three years — Things My Mother Knew — with uncomfortable truths about every Whitfield. You sent a draft to a publisher in March. Friday you discovered Richard had obtained a copy and hinted at it at dinner. You panicked. At 9:30 PM Saturday you slipped into his guest room, took the draft, and burned every page in the bonfire." },
      { heading: "What you're hiding", body: "Nothing physical — you destroyed it. But a single charred page survived in the cooled fire pit ash." },
      { heading: "How to play it", body: "Composed and loving. When the burned page is found in Phase 3, you confess. Frame it as protecting the family, not deceiving them." },
    ]),
  },
  {
    sortOrder: 3,
    personaName: "Vivienne “Vivi” Hawthorne",
    realName: "Sophia",
    role: "ACCOMPLICE",
    loginCode: "VIVI-03",
    avatarColor: "#b3122a",
    prop: "Oversized black sunglasses (worn indoors as a Princess bit) and a single theater playbill.",
    sheet: sheet([
      { heading: "PRIVATE — read this alone", body: "This dossier contains the full plan. Do not let anyone see your screen." },
      { heading: "Who you are", body: "You are 26. The Princess of the Whitfield family — only daughter, loved by everyone. You live in NYC. Your PR job is glamorous and unfulfilling. You love theater, food, singing, and being adored. You're married to Sebastian." },
      { heading: "Your relationship to Richard", body: "He doted on you — his “Princess.” For a year you'd written him secretly, asking for help to leave PR for theater. Saturday at 3 PM he pulled you aside and told you he was leaving everything to TURD — the Tortoise Urgent Rescue Division. He thought you'd be proud. You smiled. You said you were." },
      { heading: "Your secret — you and Sebastian planned the murder together", body: "You walked back to the boathouse, found Sebastian, and told him about TURD. Within two hours you had a plan: he would do it, you would distract. You wrote “11:35 — go” on a note and gave it to him." },
      { heading: "The night", body: "Just before 11:30 you slipped to the primary suite balcony with opera binoculars to make sure the dock was empty, then left them on the loveseat (you never came back for them). At 11:30 you launched a Broadway story you'd told before — the same one from last Christmas dinner — to fill exactly the time Sebastian needed. At 11:55 you went upstairs, balled up a sticky note that said “breathe. it's done.” into the master bathroom trash, and came back at 12:02." },
      { heading: "What you must lie about", body: "Whether Richard told you anything Saturday afternoon. Whether you saw anything from upstairs. Whether the “11:35 — go” note is your handwriting. The Christmas story." },
      { heading: "How to play it / your break", body: "Charming, devastated, deflective. When Sebastian is unmasked in Phase 4, perform horror — admit nothing. In Phase 5, when the Christmas-story detail surfaces, you have ten seconds. Alexander will guide you. Your final confession is heavy: you are not asking forgiveness, you are explaining." },
    ]),
  },
  {
    sortOrder: 4,
    personaName: "Sebastian Hawthorne",
    realName: "Jaymon",
    role: "KILLER",
    loginCode: "SEBASTIAN-04",
    avatarColor: "#1c4f7a",
    prop: "A clip-on tie and a navy blazer (the GM plants the envelope in the inside pocket before guests arrive).",
    sheet: sheet([
      { heading: "PRIVATE — read this alone", body: "This dossier identifies you as the killer. Do not let anyone see your screen." },
      { heading: "Who you are", body: "You are 30. Smart, calculating, sarcastic, hard to read. MBA-bound — six figures in loans for an Ivy program in the fall. You want Wall Street. You enjoy strategy games and the taste of certainty." },
      { heading: "Your relationship to Richard", body: "Outwardly cordial; privately you saw him as your route into real money. You and Vivi had been quietly drowning in NYC for a year — lease, MBA debt, a private-placement deposit — all sized to an inheritance you assumed was coming." },
      { heading: "Where you were Saturday night", body: "“Stepped outside for some air,” 11:30–11:50 PM. A twenty-minute “smoke break.”" },
      { heading: "Your secret — you killed him", body: "Saturday afternoon Vivi found you in the boathouse with the news about TURD. You planned together over two hours. At 11:35 you walked to the dock, took the loose cleat, swung once. Richard fell, struck the piling, went into the shallows. You threw the cleat in the lake, took the notarized envelope, and returned to the bonfire at 11:50." },
      { heading: "What you're hiding", body: "The notarized envelope is folded in the inside pocket of your navy blazer (on the back of your breakfast chair — you couldn't move it). The “11:35 — go” note from Vivi is behind it. Your inheritance-vs-debt ledger is in a Monopoly box on the bottom floor. The dock-layout diagram you drew Friday is taped behind the orca mural." },
      { heading: "What you must lie about", body: "The smoke break (you needed air). The envelope (you don't know where it is). The diagram (never seen it). The ledger (just normal expense tracking)." },
      { heading: "How to play it / your break", body: "Cool, dry, slightly above it. Click your pen when nervous — leave that tell in. Smug in Phase 2, uneasy in Phase 3. You break in Phase 4: when Cody's photo lands, you can deny once, not twice. Confess short and clean. Do NOT implicate Vivi — you take the fall alone." },
    ]),
  },
  {
    sortOrder: 5,
    personaName: "Isabelle “Bella” Reyes",
    realName: "Samantha",
    role: "SINNER",
    loginCode: "BELLA-05",
    avatarColor: "#2f9e44",
    prop: "A lanyard with an “International Schools Initiative” badge and a clipboard with non-profit forms.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 25. You work for a humanitarian non-profit that builds schools and teaches English abroad. Sweet, tough, you fight for yourself. You're engaged to Alexander — but here you're a guest, not a Whitfield, still working on feeling like one of them." },
      { heading: "Your relationship to Richard", body: "He met you at a Whitfield Christmas two years ago and promised your non-profit a $250,000 donation for a Cambodia school. He invited you up this weekend “to lock in the details.”" },
      { heading: "Where you were Saturday night", body: "Helping in the kitchen with s'mores and mocktails 9–10:30. Bonfire 10:30 onward." },
      { heading: "Your secret", body: "Saturday afternoon you discovered Richard had been stringing you along — the donation was never coming. You confronted him alone in the gazebo at 7 PM. He laughed at you. You walked out fuming." },
      { heading: "What you're hiding", body: "Nothing physical — just the fight. You're terrified the gazebo confrontation makes you look like the murderer." },
      { heading: "How to play it", body: "Tense, defensive, sharper than usual. When the torn guestbook page surfaces in Phase 3, you confess. Frame it as a fight, not a threat." },
    ]),
  },
  {
    sortOrder: 6,
    personaName: "Beau Whitfield",
    realName: "Colin",
    role: "SINNER",
    loginCode: "BEAU-06",
    avatarColor: "#d9772b",
    prop: "A gym sweatband headband and a frosted plastic shaker bottle.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 22. The middle child. Fiery red hair. Currently obsessed with the gym (the obsession changes every few months — last year, spoon rings; before that, your never-launched merch line “Beau Thats Hot”). Loud, funny, never a dull moment." },
      { heading: "Your relationship to Richard", body: "Friday night you pitched him on investing in a “Beau Thats Hot” relaunch. He laughed in your face — said your idea had “the marketing instincts of a teen with a TikTok addiction.” You smiled and said “respect the honesty.”" },
      { heading: "Where you were Saturday night", body: "Bonfire and patio. Tossing a football with Cody and Levi 9–10. You walked off briefly at 10 PM to “use the bathroom.”" },
      { heading: "Your secret", body: "At 10 PM, instead of the bathroom, you stole Richard's entire case of glass-bottle root beer from the kitchen and hid it under the second blue kayak on the patio. You drank one. You wanted to watch his face when he found it gone. Solomon witnessed the theft — hence “WHERE'S MY ROOT BEER!”" },
      { heading: "How to play it", body: "Performatively unbothered. Crack jokes. When the empty bottle surfaces in Phase 3, deny. When the case is found, confess — the room will laugh. You're not in real trouble." },
    ]),
  },
  {
    sortOrder: 7,
    personaName: "Eden Hartley",
    realName: "Emma",
    role: "SINNER",
    loginCode: "EDEN-07",
    avatarColor: "#c14d8a",
    prop: "A small flower hair clip or a satin dance ribbon tied around your wrist.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 22. Beau's longtime girlfriend. You teach dance to children. The sweetest person any of these people have met. The Whitfields have taken you in as one of their own." },
      { heading: "Your relationship to Richard", body: "Most of the family resented him; you felt sorry for him. Friday he gave you a leather-bound book of his late mother's poems and said you reminded him of her. Friday night he privately told you he was including your grandparents in his will — $50,000 each. You were moved to tears and told no one, especially not Beau." },
      { heading: "Where you were Saturday night", body: "Board games on the bottom floor 8–10. Bonfire 10 onward." },
      { heading: "Your secret", body: "Saturday you started to suspect Richard was toying with you. At 9 PM you went to his guest room to verify. You opened the leather portfolio. There was no mention of your grandparents — only a sheet that said “$60M → TURD (final)” in his hand. He had lied to you, using your grandparents to manipulate you. You took the book of poems, left a thank-you note as cover, rearranged a photo frame, and walked out. You've known the truth about TURD since 9 PM and told no one." },
      { heading: "How to play it", body: "Sweet, loyal, quietly hurt but holding it in. PHASE 3: when the thank-you note is found, confess ONLY the surface — you went to thank him for the book. Do NOT reveal the TURD paper yet. PHASE 4: after Cody shows his photo, step forward: “I saw it too. At nine, in his room. He told me Friday he was leaving something to my grandparents. I went to verify. He had lied to me.”" },
    ]),
  },
  {
    sortOrder: 8,
    personaName: "Levi Whitfield",
    realName: "Luke",
    role: "SINNER",
    loginCode: "LEVI-08",
    avatarColor: "#2f8f8c",
    prop: "A cheap bucket hat and a single golf glove. AirPods optional.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 18, just graduated, headed to BYU. Bleached hair, thrifted clothes, AirPods in one ear. You play golf and you're very good. You act uninterested but secretly work hard. You somehow have rich friends with three-tier houseboats." },
      { heading: "Your relationship to Richard", body: "Tepid. You found him weird. You were mostly on your phone all weekend." },
      { heading: "Where you were Saturday night (official version)", body: "On the porch with Alexander 10 PM–12:30 AM, “looking at the stars.” Alexander has agreed to confirm this." },
      { heading: "Your secret", body: "You weren't on the porch. You were on Wyatt's family's three-tier houseboat playing late-night cards (chips, not money — this is important, NOT money) with five rich friends. You snuck out at 10 and back at 12:30. Alexander covered for you without knowing where you went." },
      { heading: "What you're hiding", body: "The boarding ticket from Lake Saunders Houseboat Marina is under your mattress. Your phone has time-stamped photos of you at the houseboat at 11:35 PM — when the murder happened." },
      { heading: "How to play it", body: "Performatively bored. When the boarding ticket is found in Phase 3, confess — and keep clarifying chips, not money, three or four times, as a comedic beat. Then realize being off-property looks bad, and show the photos to prove you were elsewhere during the murder." },
    ]),
  },
  {
    sortOrder: 9,
    personaName: "Cody Whitfield",
    realName: "Ben",
    role: "SINNER",
    loginCode: "CODY-09",
    avatarColor: "#b5462f",
    prop: "A small football to toss and a backwards baseball cap. Keep your phone on you the whole game.",
    sheet: sheet([
      { heading: "Who you are", body: "You are 14. The youngest. Red hair. You play tackle football and love it. You act unbothered like teenagers do (“whatever”). You sometimes feel the family forgets you — you don't admit this." },
      { heading: "Your relationship to Richard", body: "You thought he was funny. He talked to you like an adult at dinner. He told you Friday that you reminded him of himself at your age." },
      { heading: "Where you were Saturday night", body: "Bonfire and patio. In bed by 11:30. You missed the murder." },
      { heading: "Your secret", body: "Saturday around 2:15 PM you snuck into Richard's guest room out of curiosity, opened the leather portfolio, and saw a paper that said “$60M → TURD (final)” in his handwriting. You took a photo on your phone. You didn't know what TURD was. You told no one. (The GM will help you take this photo for real before the game.)" },
      { heading: "Your big moment", body: "You are the hero of this game. Quiet-hero. Hold the secret all morning; don't volunteer anything. In PHASE 4, Alexander will turn to you and ask: “Cody. Anything you've been holding onto?” That's your cue. Pull out the phone. Show the photo. Sebastian is unmasked because of you. Be patient. Be a teenager. When Alexander looks at you, you deliver." },
    ]),
  },
  {
    sortOrder: 10,
    personaName: "Alexander",
    realName: "Alex",
    role: "GM",
    loginCode: "GM-ALEX",
    isGameMaster: true,
    avatarColor: "#c9a24b",
    prop: "A clipboard with the weekend schedule, a ring of keys, and an “ALEXANDER · HOUSE MANAGER” name tag. Full Clue-butler energy.",
    sheet: sheet([
      { heading: "You are the Game Master", body: "You play Alexander, the Whitfields' lake house manager of four years. You are the omniscient narrator: you hold every clue, walk the family from phase to phase, voice Solomon, fire the auto-reveals, enforce the soft-locks, and guide Cody to the hero turn. You are not a suspect and have no secret." },
      { heading: "Use the GM dashboard", body: "Advance the phase to unlock rooms and search permits. Watch the live discovery feed. Fire scripted reveals and Solomon lines into the players' feed. Open the Phase 4 and Phase 5 ballots and read the tallies. Everything you need is on your dashboard." },
      { heading: "Your only line of fiction", body: "In Phase 3, when Levi confesses to sneaking out, confirm: “He asked me to cover for him. I did. I didn't know where he was actually going. I'm sorry.”" },
    ]),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Clues (hidden cards). tag ANNOUNCE auto-broadcasts when found; KEEP is private.
// ─────────────────────────────────────────────────────────────────────────────
const clues = [
  // Phase 2
  { code: "2-1", phase: 2, tag: "ANNOUNCE", title: "A torn corner of paper", location: "Living room — taped behind the framed nautical chart of Gig Harbor (cove circled in red).", content: "A torn piece of paper. That's Richard's handwriting… and who is “her”?" },
  { code: "2-2", phase: 2, tag: "KEEP", title: "A scrap of green tweed", location: "Entryway — inside the inner pocket of Hank's jacket in the coat closet.", content: "A scrap of dark green tweed, torn at the edges. Wasn't Richard wearing a jacket like this?" },
  { code: "2-3", phase: 2, tag: "KEEP", title: "Letter from Richard's attorney", location: "Kitchen — behind the cookbooks on the open shelves.", content: "A letter from Richard's attorney. He changed the trust — recently. “This version replaces all prior.”" },
  { code: "2-4", phase: 2, tag: "ANNOUNCE", title: "Evidence photo: a footprint", location: "Patio — under the upturned blue kayak.", content: "A damp footprint on the patio stones, pointed at the dock. Looks like a men's shoe. Could be anyone's. Could be." },
  { code: "2-5", phase: 2, tag: "KEEP", title: "Richard's “Final List”", location: "Living room — folded inside the small plant pot, between soil and liner.", content: "Richard's “Final List.” Every name struck through but one — and that one's smudged past reading." },
  { code: "2-6", phase: 2, tag: "KEEP", title: "A grocery receipt", location: "Kitchen — in the freezer, taped to the bottom of the ice cream tub.", content: "Richard's grocery run. Birdseed, his root beer, lobster forks… and a tortoise figurine. Why a tortoise?" },
  { code: "2-7", phase: 2, tag: "KEEP", title: "A balled-up cocktail napkin", location: "Dining area — taped under the bench with the decorative lanterns.", content: "A balled-up napkin. Plane tickets, reservations — all crossed out. “GONE.” Whose writing is this?" },
  // Phase 3
  { code: "3-1", phase: 3, tag: "ANNOUNCE", title: "A burned page of manuscript", location: "Patio — in the bonfire pit, in the cooled ash.", content: "A page that didn't finish burning. “…her revenge wrapped in a memoir.” Someone wanted this gone." },
  { code: "3-2", phase: 3, tag: "ANNOUNCE", title: "A thank-you note", location: "Richard's guest room — on the desk, under a paperweight.", content: "A thank-you note, signed only “E.H.” So Eden was in his room too." },
  { code: "3-3", phase: 3, tag: "KEEP", title: "Saturday itinerary", location: "Richard's guest room — inside the leather portfolio (now empty of the envelope).", content: "Richard's itinerary. Penciled into the 3 PM slot: “Pull V aside. Tell her about T.” Tell her what?" },
  { code: "3-4", phase: 3, tag: "KEEP", title: "An opened letter to Vivienne", location: "Richard's guest room — top dresser drawer, under folded socks.", content: "An opened letter to Vivi. “My answer is no.” He'd already turned her down." },
  { code: "3-5", phase: 3, tag: "KEEP", title: "An empty root beer bottle", location: "Patio — in the recycling bin under newspapers.", content: "An empty root beer bottle, wiped clean. Richard never let anyone near his stash." },
  { code: "3-6", phase: 3, tag: "ANNOUNCE", title: "A torn guestbook page", location: "Gazebo — under the cushion of the wicker chair where Solomon's perch sits.", content: "A torn page from the guestbook. Bella, asking Richard for something. “The kids in Cambodia need this.”" },
  { code: "3-7", phase: 3, tag: "KEEP", title: "A marina boarding ticket", location: "Levi's bedroom — under the mattress.", content: "A boarding ticket. Lake Saunders Marina, checked in 9:48 PM. Someone wasn't where they said they were." },
  { code: "3-8", phase: 3, tag: "ANNOUNCE", title: "A hand-drawn dock diagram", location: "Bottom floor — taped behind the orca mural (peel it forward).", content: "A diagram of the dock. Times marked, an arrow drawn toward the water. This wasn't a fall. Someone planned it." },
  { code: "3-9", phase: 3, tag: "KEEP", title: "The missing root beer case", location: "Patio — under the second blue kayak.", content: "Richard's missing case of root beer, hidden under a kayak. Five bottles left. Who took it?" },
  { code: "3-10", phase: 3, tag: "KEEP", title: "A handwritten ledger", location: "Bottom floor games area — inside a Monopoly box, between the rules booklet and lid.", content: "A ledger in small, careful handwriting. Inheritance weighed against debt. Someone was counting on that money." },
  // Phase 4
  { code: "4-1", phase: 4, tag: "ANNOUNCE", title: "The notarized will", location: "Dining area — inside the inner pocket of Sebastian's navy blazer on his breakfast chair.", content: "A notarized envelope, hidden in a blazer pocket. The will. “I leave the entirety of my estate — Crookshank Inns, every property, the house, all of it — to TURD: the Tortoise Urgent Rescue Division.” Everything. To the tortoises. Not the family." },
  { code: "4-2", phase: 4, tag: "KEEP", title: "A scrap: “11:35 — go”", location: "Sebastian and Vivi's room — folded inside the nightstand drawer.", content: "A scrap of paper: “11:35 — go.” That's Vivi's handwriting." },
  { code: "4-3", phase: 4, tag: "ANNOUNCE", title: "Opera binoculars", location: "Primary suite balcony — propped between the loveseat cushions.", content: "Opera binoculars on the balcony loveseat. The lens is still warm. Someone stood up here, watching the dock." },
  { code: "4-4", phase: 4, tag: "KEEP", title: "A sticky note", location: "Master bathroom of the primary suite — in the trash, under tissues.", content: "A sticky note, balled up in the trash. Smoothed out, it reads: “breathe. it's done.” Done… what?" },
  { code: "4-5", phase: 4, tag: "KEEP", title: "The 11:35 bonfire photo", location: "Bottom floor — under the rim of the ping pong table, kitchen-side.", content: "This is from the bonfire last night… everyone gathered round the fire. But something seems off." },
  // Phase 5
  { code: "5-1", phase: 5, tag: "ANNOUNCE", title: "Vivi's draft letter", location: "Vivi's overnight bag (retrieved in Phase 5 when Hank authorizes the search).", content: "A letter in Vivi's hand, never sent. “Then I'll have to find another way.” …another way." },
];

// ─────────────────────────────────────────────────────────────────────────────
// Scripted announcements: the GM's pushable library (auto-reveals + Solomon).
// ─────────────────────────────────────────────────────────────────────────────
const announcements = [
  { kind: "AUTO_REVEAL", phase: 1, sortOrder: 1, title: "Phase 1 — The body", body: "I found Mr. Crookshank in the shallows beside the dock at 7:42 this morning. I've called Dr. Langford — he confirms time of death between 11:30 last night and midnight." },
  { kind: "AUTO_REVEAL", phase: 1, sortOrder: 2, title: "Phase 1 — The cleat is missing", body: "The brass dock cleat at the end of the dock is missing. The bolts are still in the wood. It looks like someone pulled it free." },
  { kind: "AUTO_REVEAL", phase: 1, sortOrder: 3, title: "Phase 1 — The portfolio", body: "His leather portfolio was found open in the gazebo. The notarized envelope he'd been carrying all weekend is gone." },
  { kind: "AUTO_REVEAL", phase: 1, sortOrder: 4, title: "Phase 1 — Solomon", body: "Solomon was on his perch in the gazebo. He has been… vocal." },
  { kind: "AUTO_REVEAL", phase: 2, sortOrder: 5, title: "Phase 2 — The cleat recovered", body: "Levi was good enough to dive for it this morning. The cleat was eight feet down, twelve feet off the dock. There's dried blood on the underside. Dr. Langford is comparing it to the wound." },
  { kind: "AUTO_REVEAL", phase: 3, sortOrder: 6, title: "Phase 3 — The photo timeline", body: "Here are my time-stamped photos from Saturday night. The 11:35 bonfire photo shows six people. Sebastian is not in it. “Sebastian — where were you in this photo?”" },
  { kind: "AUTO_REVEAL", phase: 4, sortOrder: 7, title: "Phase 4 — The smoke-break receipt", body: "Sebastian, you said you stepped out for a smoke at 11:30. I saw you come back in at 11:50. That's a twenty-minute cigarette." },
  { kind: "AUTO_REVEAL", phase: 5, sortOrder: 8, title: "Phase 5 — The Christmas story", body: "Hank — did Vivi's bonfire story sound familiar to you? You told me at breakfast you'd heard it before. At Christmas. Word for word. That was a twenty-minute story. Sebastian's smoke break was twenty minutes long." },
  { kind: "SOLOMON", phase: 0, sortOrder: 20, title: "Solomon", body: "WHERE'S MY ROOT BEER!" },
  { kind: "SOLOMON", phase: 2, sortOrder: 21, title: "Solomon (Hank's gazebo line)", body: "Don't… don't you talk about her like that…" },
  { kind: "SOLOMON", phase: 3, sortOrder: 22, title: "Solomon (rattles Vivi)", body: "PRINCESS, PRINCESS, PRINCESS" },
  { kind: "SOLOMON", phase: 4, sortOrder: 23, title: "Solomon (after TURD)", body: "Sixty MILLION dollars!" },
  { kind: "SOLOMON", phase: 4, sortOrder: 24, title: "Solomon (TURD)", body: "TURD! TURD! TURD!" },
  { kind: "SOLOMON", phase: 4, sortOrder: 25, title: "Solomon (back at Sebastian)", body: "Step outside for some air" },
  { kind: "SOLOMON", phase: 5, sortOrder: 26, title: "Solomon (save for the end)", body: "Breathe. It's done." },
];

async function main() {
  await prisma.vote.deleteMany();
  await prisma.clueDiscovery.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.clue.deleteMany();
  await prisma.character.deleteMany();
  await prisma.game.deleteMany();

  const game = await prisma.game.create({
    data: { name: "Dead in the Water", status: "SETUP", currentPhase: 0 },
  });

  for (const c of characters) {
    await prisma.character.create({ data: { ...c, gameId: game.id } });
  }

  for (const c of clues) {
    await prisma.clue.create({ data: { ...c, gameId: game.id, token: token() } });
  }

  for (const a of announcements) {
    await prisma.announcement.create({
      data: { ...a, gameId: game.id, isScripted: true, isReleased: false },
    });
  }

  const roster = await prisma.character.findMany({
    where: { gameId: game.id },
    orderBy: { sortOrder: "asc" },
    select: { personaName: true, realName: true, role: true, loginCode: true },
  });

  console.log(`\nSeeded "${game.name}". Logins:`);
  for (const r of roster) {
    console.log(
      `  ${r.loginCode.padEnd(14)} ${r.personaName.padEnd(26)} ${r.realName.padEnd(8)} ${r.role}`,
    );
  }
  console.log(`\n${clues.length} clues, ${announcements.length} scripted reveals.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
