-- CreateTable
CREATE TABLE "ScannerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "targetDate" DATETIME NOT NULL,
    "volume" TEXT,
    "description" TEXT NOT NULL,
    "setupType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WATCHING',
    "outcomeNotes" TEXT,
    "executionGapNotes" TEXT,
    "priceLevels" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ScannerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScannerEntry_createdById_idx" ON "ScannerEntry"("createdById");

-- CreateIndex
CREATE INDEX "ScannerEntry_targetDate_idx" ON "ScannerEntry"("targetDate");

-- CreateIndex
CREATE INDEX "ScannerEntry_ticker_idx" ON "ScannerEntry"("ticker");
