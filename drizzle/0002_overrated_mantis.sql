CREATE TABLE `featureSettings` (
	`key` varchar(64) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featureSettings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','estimator','viewer') NOT NULL DEFAULT 'estimator';