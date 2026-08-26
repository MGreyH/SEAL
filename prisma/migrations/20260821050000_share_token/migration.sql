-- AlterTable
ALTER TABLE `documentreference` ADD COLUMN `shareToken` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `DocumentReference_shareToken_key` ON `documentreference`(`shareToken`);
