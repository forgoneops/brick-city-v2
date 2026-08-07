CREATE TABLE `battle_submissions` (
	`id` varchar(36) NOT NULL,
	`battle_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`image_url` varchar(2048) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `battle_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `battle_submissions_unique` UNIQUE(`battle_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `battles` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('upcoming','active','closed') NOT NULL DEFAULT 'upcoming',
	`closes_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `battle_submissions` ADD CONSTRAINT `battle_submissions_battle_id_battles_id_fk` FOREIGN KEY (`battle_id`) REFERENCES `battles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `battle_submissions` ADD CONSTRAINT `battle_submissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;