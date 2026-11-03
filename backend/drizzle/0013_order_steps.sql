ALTER TABLE `orders` MODIFY COLUMN `status` enum('placed','confirmed','out_for_delivery','delivered','packed','cancelled') NOT NULL DEFAULT 'placed';--> statement-breakpoint
ALTER TABLE `orderItems` ADD `itemStatus` enum('ok','out_of_stock') DEFAULT 'ok' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `packedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `cancelReason` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `cancelledByRole` varchar(32);