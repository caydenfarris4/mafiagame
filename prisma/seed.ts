import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function token() {
  return randomBytes(9).toString("base64url");
}

async function main() {
  // Fresh start for local development.
  await prisma.clueDiscovery.deleteMany();
  await prisma.clue.deleteMany();
  await prisma.character.deleteMany();
  await prisma.game.deleteMany();

  const game = await prisma.game.create({
    data: { name: "Murder at Campus Home", status: "LOBBY" },
  });

  await prisma.character.createMany({
    data: [
      {
        gameId: game.id,
        name: "The Host",
        realName: "Game Master",
        role: "CIVILIAN",
        loginCode: "GM-MASTER",
        isGameMaster: true,
        avatarColor: "#c9a24b",
      },
      {
        gameId: game.id,
        name: "Scarlet",
        realName: "Player 1",
        role: "MAFIA",
        loginCode: "SCARLET-1",
        avatarColor: "#b3122a",
      },
      {
        gameId: game.id,
        name: "Mustard",
        realName: "Player 2",
        role: "CIVILIAN",
        loginCode: "MUSTARD-2",
        avatarColor: "#c9a24b",
      },
      {
        gameId: game.id,
        name: "Plum",
        realName: "Player 3",
        role: "DETECTIVE",
        loginCode: "PLUM-3",
        avatarColor: "#6b3fa0",
      },
      {
        gameId: game.id,
        name: "Green",
        realName: "Player 4",
        role: "CIVILIAN",
        loginCode: "GREEN-4",
        avatarColor: "#2f9e44",
      },
    ],
  });

  await prisma.clue.createMany({
    data: [
      {
        gameId: game.id,
        title: "A torn photograph",
        content:
          "Half of a photo, found behind the painting. A figure in a red coat stands by the lake at midnight.",
        location: "Behind the living-room painting",
        visibility: "SECRET",
        token: token(),
      },
      {
        gameId: game.id,
        title: "The kitchen receipt",
        content:
          "A grocery receipt timestamped 11:58 PM — someone was awake far later than they claimed.",
        location: "Inside the kitchen drawer",
        visibility: "SECRET",
        token: token(),
      },
      {
        gameId: game.id,
        title: "The muddy boot print",
        content:
          "A size-11 boot print on the back porch, still damp. It points toward the garden shed.",
        location: "Back porch",
        visibility: "SECRET",
        token: token(),
      },
      {
        gameId: game.id,
        title: "ANNOUNCEMENT: The power goes out",
        content:
          "At 9:00 PM the lights will flicker and die for sixty seconds. No one is safe in the dark.",
        location: "Hallway breaker box",
        visibility: "PUBLIC",
        token: token(),
      },
      {
        gameId: game.id,
        title: "ANNOUNCEMENT: A body is found",
        content:
          "A guest has been discovered in the study. The investigation begins now — gather and accuse.",
        location: "Study door",
        visibility: "PUBLIC",
        token: token(),
      },
    ],
  });

  const codes = await prisma.character.findMany({
    where: { gameId: game.id },
    select: { name: true, loginCode: true, isGameMaster: true },
    orderBy: { isGameMaster: "desc" },
  });

  console.log(`\nSeeded "${game.name}". Login codes:`);
  for (const c of codes) {
    console.log(`  ${c.isGameMaster ? "[GM]" : "    "} ${c.name.padEnd(10)} ${c.loginCode}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
