-- CreateTable
CREATE TABLE "NewsAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "newsItemId" TEXT NOT NULL,
    "watchId" TEXT,
    "watchLabel" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "NewsAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NewsAlert_newsItemId_fkey" FOREIGN KEY ("newsItemId") REFERENCES "NewsItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NewsAlert_userId_firedAt_idx" ON "NewsAlert"("userId", "firedAt");

-- CreateIndex
CREATE INDEX "NewsAlert_userId_readAt_idx" ON "NewsAlert"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsAlert_userId_newsItemId_key" ON "NewsAlert"("userId", "newsItemId");
