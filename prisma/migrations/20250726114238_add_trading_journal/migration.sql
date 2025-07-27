-- CreateTable
CREATE TABLE "TradeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ticker" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "tradeDate" DATETIME NOT NULL,
    "entryPrice" REAL,
    "exitPrice" REAL,
    "positionSize" REAL,
    "pnl" REAL,
    "tradeThesis" TEXT,
    "executionQuality" TEXT,
    "lessonsLearned" TEXT,
    "emotionalState" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TradeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objectKey" TEXT NOT NULL,
    "caption" TEXT,
    "imageOrder" INTEGER NOT NULL DEFAULT 0,
    "tradeEntryId" TEXT NOT NULL,
    CONSTRAINT "TradeImage_tradeEntryId_fkey" FOREIGN KEY ("tradeEntryId") REFERENCES "TradeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tagName" TEXT NOT NULL,
    "tagType" TEXT NOT NULL,
    "tradeEntryId" TEXT NOT NULL,
    CONSTRAINT "TradeTag_tradeEntryId_fkey" FOREIGN KEY ("tradeEntryId") REFERENCES "TradeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TradeEntry_userId_idx" ON "TradeEntry"("userId");

-- CreateIndex
CREATE INDEX "TradeEntry_ticker_idx" ON "TradeEntry"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "TradeImage_objectKey_key" ON "TradeImage"("objectKey");

-- CreateIndex
CREATE INDEX "TradeImage_tradeEntryId_idx" ON "TradeImage"("tradeEntryId");

-- CreateIndex
CREATE INDEX "TradeTag_tradeEntryId_idx" ON "TradeTag"("tradeEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeTag_tradeEntryId_tagName_tagType_key" ON "TradeTag"("tradeEntryId", "tagName", "tagType");
