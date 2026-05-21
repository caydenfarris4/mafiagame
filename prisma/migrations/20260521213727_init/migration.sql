-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "realName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CIVILIAN',
    "loginCode" TEXT NOT NULL,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "isGameMaster" BOOLEAN NOT NULL DEFAULT false,
    "avatarColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Character_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Clue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "location" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'SECRET',
    "isReleased" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clue_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClueDiscovery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clueId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "foundAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClueDiscovery_clueId_fkey" FOREIGN KEY ("clueId") REFERENCES "Clue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClueDiscovery_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
