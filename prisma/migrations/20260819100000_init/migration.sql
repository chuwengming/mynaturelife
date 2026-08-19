# This file is used by Prisma Migrate. Keep in sync with schema.prisma.
# Generated for Phase 1 without a live database.

CREATE TABLE `processed_events` (
    `webhook_event_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`webhook_event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `users` (
    `line_user_id` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`line_user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `line_user_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `booking_date` DATE NOT NULL,
    `booking_slot` VARCHAR(191) NOT NULL,
    `booking_item` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'confirmed',
    `source_type` VARCHAR(191) NOT NULL,
    `source_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `bookings_line_user_id_idx`(`line_user_id`),
    INDEX `bookings_booking_date_idx`(`booking_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bookings` ADD CONSTRAINT `bookings_line_user_id_fkey` FOREIGN KEY (`line_user_id`) REFERENCES `users`(`line_user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
