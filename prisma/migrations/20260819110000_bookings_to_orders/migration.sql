-- Rename the booking table to orders and reshape it for tofu-curd quantities.

RENAME TABLE `bookings` TO `orders`;

ALTER TABLE `orders` DROP FOREIGN KEY `bookings_line_user_id_fkey`;

ALTER TABLE `orders` RENAME INDEX `bookings_line_user_id_idx` TO `orders_line_user_id_idx`;
ALTER TABLE `orders` RENAME INDEX `bookings_booking_date_idx` TO `orders_order_date_idx`;

ALTER TABLE `orders`
    DROP COLUMN `booking_slot`,
    CHANGE COLUMN `booking_date` `order_date` DATE NOT NULL,
    CHANGE COLUMN `booking_item` `order_item` VARCHAR(191) NOT NULL,
    ADD COLUMN `plain_qty` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `spicy_qty` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `address` TEXT NULL;

ALTER TABLE `orders` ADD CONSTRAINT `orders_line_user_id_fkey` FOREIGN KEY (`line_user_id`) REFERENCES `users`(`line_user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
