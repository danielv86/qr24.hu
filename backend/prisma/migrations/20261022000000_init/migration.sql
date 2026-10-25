-- CreateTable
CREATE TABLE `admin_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
    `failed_attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `token_hash` CHAR(64) NOT NULL,
    `admin_id` INTEGER UNSIGNED NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_token_hash_key`(`token_hash`),
    INDEX `admin_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dynamic_qr_codes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(16) NOT NULL,
    `target_url` VARCHAR(2048) NOT NULL,
    `title` VARCHAR(120) NULL,
    `owner_ref` VARCHAR(64) NULL,
    `edit_token_hash` CHAR(64) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `scans` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `last_scan_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dynamic_qr_codes_public_id_key`(`public_id`),
    INDEX `dynamic_qr_codes_is_active_created_at_idx`(`is_active`, `created_at`),
    INDEX `dynamic_qr_codes_owner_ref_idx`(`owner_ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dynamic_qr_scans` (
    `qr_id` BIGINT UNSIGNED NOT NULL,
    `day` DATE NOT NULL,
    `scans` INTEGER UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (`qr_id`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `setting_key` VARCHAR(64) NOT NULL,
    `setting_value` LONGTEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`setting_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seo_overrides` (
    `path` VARCHAR(120) NOT NULL,
    `title` VARCHAR(70) NOT NULL DEFAULT '',
    `description` VARCHAR(180) NOT NULL DEFAULT '',
    `noindex` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`path`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_limits` (
    `key_hash` CHAR(64) NOT NULL,
    `window_start` BIGINT UNSIGNED NOT NULL,
    `hits` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rate_limits_window_start_idx`(`window_start`),
    PRIMARY KEY (`key_hash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dynamic_qr_scans` ADD CONSTRAINT `dynamic_qr_scans_qr_id_fkey` FOREIGN KEY (`qr_id`) REFERENCES `dynamic_qr_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
