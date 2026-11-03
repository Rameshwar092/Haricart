CREATE TABLE `communityInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`name` varchar(120),
	`apartmentUnit` varchar(32) NOT NULL,
	`invitedByUserId` int,
	`status` enum('pending','joined','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `communityInvites_phone_unique` UNIQUE(`phone`)
);
