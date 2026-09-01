CREATE TABLE `tradePackageLibraries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`projectType` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`packages` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tradePackageLibraries_id` PRIMARY KEY(`id`),
	CONSTRAINT `tradePackageLibraries_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `tradePackageLibraryId` int;--> statement-breakpoint
ALTER TABLE `takeoffs` ADD `reviewStatus` enum('pending_review','approved','rejected') DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `takeoffs` ADD `reviewedBy` int;--> statement-breakpoint
ALTER TABLE `takeoffs` ADD `reviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `workspaceNotifications` ADD `status` enum('unread','read','approved','rejected') DEFAULT 'unread' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaceNotifications` ADD `resolvedAt` timestamp;--> statement-breakpoint
CREATE INDEX `tradePackageLibraries_projectType_active_idx` ON `tradePackageLibraries` (`projectType`,`isActive`);--> statement-breakpoint
CREATE INDEX `workspaceNotifications_userId_status_createdAt_idx` ON `workspaceNotifications` (`userId`,`status`,`createdAt`);