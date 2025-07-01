/*
  Warnings:

  - You are about to drop the column `imageId` on the `Message` table. All the data in the column will be lost.
  - Added the required column `messageId` to the `ChatImage` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "contentType" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "messageId" TEXT NOT NULL,
    CONSTRAINT "ChatImage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ChatImage" ("altText", "contentType", "createdAt", "id", "objectKey", "updatedAt") SELECT "altText", "contentType", "createdAt", "id", "objectKey", "updatedAt" FROM "ChatImage";
DROP TABLE "ChatImage";
ALTER TABLE "new_ChatImage" RENAME TO "ChatImage";
CREATE UNIQUE INDEX "ChatImage_objectKey_key" ON "ChatImage"("objectKey");
CREATE UNIQUE INDEX "ChatImage_messageId_key" ON "ChatImage"("messageId");
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    "roomId" TEXT NOT NULL,
    "replyToId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "isDeleted", "replyToId", "roomId", "updatedAt", "userId") SELECT "content", "createdAt", "id", "isDeleted", "replyToId", "roomId", "updatedAt", "userId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_userId_idx" ON "Message"("userId");
CREATE INDEX "Message_roomId_idx" ON "Message"("roomId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
