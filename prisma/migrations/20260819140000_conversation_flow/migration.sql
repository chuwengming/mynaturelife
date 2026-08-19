-- Conversation flow state for cancel / amend order dialogues.

ALTER TABLE `conversations` ADD COLUMN `flow_json` TEXT NULL;
