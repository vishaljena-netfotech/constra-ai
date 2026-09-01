CREATE TABLE `onboardingSettings` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`label` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`steps` json NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboardingSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaceNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`takeoffId` int,
	`type` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workspaceNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workspaceNotifications_userId_createdAt_idx` ON `workspaceNotifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `workspaceNotifications_projectId_idx` ON `workspaceNotifications` (`projectId`);