-- Conversation state for AI consultation: smalltalk turn counting and recent history.

CREATE TABLE `conversations` (
    `conversation_key` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `smalltalk_turns` INTEGER NOT NULL DEFAULT 0,
    `last_intent` VARCHAR(191) NULL,
    `closed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`conversation_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_key` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `intent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_messages_conversation_key_created_at_idx`(`conversation_key`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_conversation_key_fkey` FOREIGN KEY (`conversation_key`) REFERENCES `conversations`(`conversation_key`) ON DELETE CASCADE ON UPDATE CASCADE;
