CREATE TABLE `mediaFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storageKey` varchar(191) NOT NULL,
	`mimeType` varchar(64) NOT NULL,
	`sizeBytes` int NOT NULL,
	`data` mediumblob NOT NULL,
	`uploadedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mediaFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `mediaFiles_storageKey_unique` UNIQUE(`storageKey`)
);
