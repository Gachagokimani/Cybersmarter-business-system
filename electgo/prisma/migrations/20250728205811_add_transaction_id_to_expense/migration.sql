/*
  Warnings:

  - You are about to drop the column `transactionId` on the `Expense` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "item" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "date" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Expense" ("amount", "category", "createdAt", "date", "id", "item", "quantity", "updatedAt") SELECT "amount", "category", "createdAt", "date", "id", "item", "quantity", "updatedAt" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
