CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('file_upload','ai_analysis','item_edit','bid_created','export') NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`description` text,
	`metadata` json,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bidReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`takeoffId` int NOT NULL,
	`reportName` varchar(255) NOT NULL,
	`totalCost` decimal(12,2) NOT NULL,
	`lineItemCount` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bidReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`fileSize` int NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`uploadedBy` int NOT NULL,
	CONSTRAINT `projectFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','in_progress','completed','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoffLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`takeoffId` int NOT NULL,
	`material` varchar(255) NOT NULL,
	`description` text,
	`quantity` decimal(10,2) NOT NULL,
	`unit` varchar(50) NOT NULL,
	`unitPrice` decimal(10,2),
	`totalPrice` decimal(12,2),
	`notes` text,
	`isEdited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoffLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sourceFileIds` json NOT NULL,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`aiAnalysisResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoffs_id` PRIMARY KEY(`id`)
);
