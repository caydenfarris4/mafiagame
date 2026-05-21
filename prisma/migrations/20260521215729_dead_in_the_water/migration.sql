/*
  Warnings:

  - You are about to drop the column `isAlive` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `isReleased` on the `Clue` table. All the data in the column will be lost.
  - You are about to drop the column `visibility` on the `Clue` table. All the data in the column will be lost.
  - Added the required column `personaName` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Made the column `realName` on table `Character` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `code` to the `Clue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phase` to the `Clue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag` to the `Clue` table without a default value. This is not possible if the table is not empty.
  - Made the column `location` on table `Clue` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "phase" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isScripted" BOOLEAN NOT NULL DEFAULT false,
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Announcement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "accusedName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "personaName" TEXT NOT NULL,
    "realName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "loginCode" TEXT NOT NULL,
    "isGameMaster" BOOLEAN NOT NULL DEFAULT false,
    "prop" TEXT,
    "avatarColor" TEXT,
    "sheet" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("avatarColor", "createdAt", "gameId", "id", "isGameMaster", "loginCode", "realName", "role") SELECT "avatarColor", "createdAt", "gameId", "id", "isGameMaster", "loginCode", "realName", "role" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE UNIQUE INDEX "Character_loginCode_key" ON "Character"("loginCode");
CREATE INDEX "Character_gameId_idx" ON "Character"("gameId");
CREATE TABLE "new_Clue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clue_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Clue" ("content", "createdAt", "gameId", "id", "location", "title", "token") SELECT "content", "createdAt", "gameId", "id", "location", "title", "token" FROM "Clue";
DROP TABLE "Clue";
ALTER TABLE "new_Clue" RENAME TO "Clue";
CREATE UNIQUE INDEX "Clue_token_key" ON "Clue"("token");
CREATE INDEX "Clue_gameId_idx" ON "Clue"("gameId");
CREATE TABLE "new_ClueDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clueId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClueDiscovery_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "Clue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClueDiscovery_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClueDiscovery" ("characterId", "clueId", "foundAt", "id") SELECT "characterId", "clueId", "foundAt", "id" FROM "ClueDiscovery";
DROP TABLE "ClueDiscovery";
ALTER TABLE "new_ClueDiscovery" RENAME TO "ClueDiscovery";
CREATE INDEX "ClueDiscovery_characterId_idx" ON "ClueDiscovery"("characterId");
CREATE UNIQUE INDEX "ClueDiscovery_clueId_characterId_key" ON "ClueDiscovery"("clueId", "characterId");
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "activeVoteRound" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Game" ("createdAt", "id", "name", "status") SELECT "createdAt", "id", "name", "status" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Announcement_gameId_idx" ON "Announcement"("gameId");

-- CreateIndex
CREATE INDEX "Vote_gameId_idx" ON "Vote"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_gameId_round_voterId_key" ON "Vote"("gameId", "round", "voterId");
