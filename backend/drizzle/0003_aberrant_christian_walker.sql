CREATE TABLE `exchangeRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`status` enum('requested','approved','rejected','completed') NOT NULL DEFAULT 'requested',
	`resolutionNote` varchar(500),
	`reviewedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exchangeRequests_id` PRIMARY KEY(`id`)
);
