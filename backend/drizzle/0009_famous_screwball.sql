CREATE TABLE `vehicleServiceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`residentUserId` int NOT NULL,
	`serviceKind` enum('car','bike') NOT NULL,
	`selectedServices` text NOT NULL,
	`issueDescription` varchar(500) NOT NULL,
	`status` enum('submitted','contacted','closed') NOT NULL DEFAULT 'submitted',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleServiceRequests_id` PRIMARY KEY(`id`)
);
