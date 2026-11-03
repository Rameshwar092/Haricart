ALTER TABLE `vehicleServiceRequests` MODIFY COLUMN `serviceKind` enum('electrician','plumber','tuition','fitness','car','bike') NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicleServiceRequests` ADD `phone` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicleServiceRequests` ADD `blockNumber` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `vehicleServiceRequests` ADD `flatNumber` varchar(32) NOT NULL;