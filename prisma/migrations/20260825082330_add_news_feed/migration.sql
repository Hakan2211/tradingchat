-- CreateTable
CREATE TABLE "NewsFeed" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tier" TEXT,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pollIntervalSec" INTEGER NOT NULL DEFAULT 20,
    "userAgent" TEXT,
    "lastPolledAt" DATETIME,
    "lastItemAt" DATETIME,
    "lastError" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedKey" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" DATETIME NOT NULL,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catalyst" TEXT NOT NULL DEFAULT 'OTHER',
    "score" INTEGER NOT NULL DEFAULT 0,
    "formType" TEXT,
    "haltReason" TEXT,
    "alsoSeenOn" TEXT,
    "raw" TEXT,
    CONSTRAINT "NewsItem_feedKey_fkey" FOREIGN KEY ("feedKey") REFERENCES "NewsFeed" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsTicker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "newsItemId" TEXT NOT NULL,
    CONSTRAINT "NewsTicker_newsItemId_fkey" FOREIGN KEY ("newsItemId") REFERENCES "NewsItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NewsWatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'My alerts',
    "tickers" TEXT,
    "catalysts" TEXT,
    "minScore" INTEGER NOT NULL DEFAULT 0,
    "sound" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NewsWatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SymbolUniverse" (
    "ticker" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "cik" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "NewsFeed_enabled_idx" ON "NewsFeed"("enabled");

-- CreateIndex
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsItem_dedupeKey_idx" ON "NewsItem"("dedupeKey");

-- CreateIndex
CREATE INDEX "NewsItem_catalyst_idx" ON "NewsItem"("catalyst");

-- CreateIndex
CREATE UNIQUE INDEX "NewsItem_feedKey_externalId_key" ON "NewsItem"("feedKey", "externalId");

-- CreateIndex
CREATE INDEX "NewsTicker_ticker_idx" ON "NewsTicker"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "NewsTicker_newsItemId_ticker_key" ON "NewsTicker"("newsItemId", "ticker");

-- CreateIndex
CREATE INDEX "NewsWatch_userId_idx" ON "NewsWatch"("userId");

-- CreateIndex
CREATE INDEX "SymbolUniverse_cik_idx" ON "SymbolUniverse"("cik");
