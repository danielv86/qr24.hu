-- DropIndex
DROP INDEX `admin_sessions_admin_id_fkey` ON `admin_sessions`;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verification_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN `email_verification_code_hash` CHAR(64) NULL,
    ADD COLUMN `email_verification_expires_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_sent_at` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_accounts` ADD CONSTRAINT `oauth_accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynamic_qr_codes` ADD CONSTRAINT `dynamic_qr_codes_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynamic_qr_scans` ADD CONSTRAINT `dynamic_qr_scans_qr_id_fkey` FOREIGN KEY (`qr_id`) REFERENCES `dynamic_qr_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scan_events` ADD CONSTRAINT `scan_events_qr_id_fkey` FOREIGN KEY (`qr_id`) REFERENCES `dynamic_qr_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_qr_id_fkey` FOREIGN KEY (`qr_id`) REFERENCES `dynamic_qr_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_domains` ADD CONSTRAINT `custom_domains_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- A megerősítés bevezetése előtt létrehozott fiókok ne veszítsék el a hozzáférésüket.
UPDATE `users` SET `email_verified` = 1 WHERE `email_verified` = 0;
