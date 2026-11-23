CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`actorRole` varchar(32),
	`action` varchar(64) NOT NULL,
	`targetUserId` int,
	`orderId` int,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`deliveryUserId` int,
	`previousDeliveryUserId` int,
	`assignedByUserId` int NOT NULL,
	`action` enum('assigned','reassigned','unassigned') NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deliveryAssignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deliveryPartners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`notes` varchar(500),
	`createdByUserId` int NOT NULL,
	`activatedByUserId` int,
	`activatedAt` timestamp,
	`statusReason` varchar(255),
	`statusChangedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveryPartners_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveryPartners_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `deliveryPartners_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveryStatus` enum('assigned','accepted','picked_up','out_for_delivery','delivered');--> statement-breakpoint
ALTER TABLE `orders` ADD `assignedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `pickedUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','pending','suspended','deactivated') DEFAULT 'active' NOT NULL;--> statement-breakpoint
UPDATE `orders` SET `deliveryStatus` = 'delivered' WHERE `deliveryUserId` IS NOT NULL AND `status` = 'delivered';--> statement-breakpoint
UPDATE `orders` SET `deliveryStatus` = 'out_for_delivery' WHERE `deliveryUserId` IS NOT NULL AND `status` = 'out_for_delivery';--> statement-breakpoint
UPDATE `orders` SET `deliveryStatus` = 'assigned' WHERE `deliveryUserId` IS NOT NULL AND `status` IN ('placed', 'confirmed', 'packed');