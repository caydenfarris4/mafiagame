-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "currentPhase" INTEGER NOT NULL DEFAULT 0,
    "activeVoteRound" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Character" (
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

-- CreateTable
CREATE TABLE "Clue" (
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

-- CreateTable
CREATE TABLE "ClueDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clueId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "foundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClueDiscovery_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "Clue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClueDiscovery_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE UNIQUE INDEX "Character_loginCode_key" ON "Character"("loginCode");

-- CreateIndex
CREATE INDEX "Character_gameId_idx" ON "Character"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Clue_token_key" ON "Clue"("token");

-- CreateIndex
CREATE INDEX "Clue_gameId_idx" ON "Clue"("gameId");

-- CreateIndex
CREATE INDEX "ClueDiscovery_characterId_idx" ON "ClueDiscovery"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClueDiscovery_clueId_characterId_key" ON "ClueDiscovery"("clueId", "characterId");

-- CreateIndex
CREATE INDEX "Announcement_gameId_idx" ON "Announcement"("gameId");

-- CreateIndex
CREATE INDEX "Vote_gameId_idx" ON "Vote"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_gameId_round_voterId_key" ON "Vote"("gameId", "round", "voterId");

