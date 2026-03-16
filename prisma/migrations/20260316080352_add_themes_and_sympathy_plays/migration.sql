-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Theme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThemeTicker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SYMPATHY',
    "float" TEXT,
    "volume" TEXT,
    "marketCap" TEXT,
    "priceAtAdd" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "themeId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    CONSTRAINT "ThemeTicker_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ThemeTicker_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- CreateIndex
CREATE INDEX "Theme_createdById_idx" ON "Theme"("createdById");

-- CreateIndex
CREATE INDEX "Theme_status_idx" ON "Theme"("status");

-- CreateIndex
CREATE INDEX "ThemeTicker_themeId_idx" ON "ThemeTicker"("themeId");

-- CreateIndex
CREATE INDEX "ThemeTicker_ticker_idx" ON "ThemeTicker"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeTicker_themeId_ticker_key" ON "ThemeTicker"("themeId", "ticker");
