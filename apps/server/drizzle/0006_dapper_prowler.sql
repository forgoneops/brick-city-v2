CREATE TABLE `follows` (
	`id` varchar(36) NOT NULL,
	`follower_id` varchar(36) NOT NULL,
	`followed_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follows_unique` UNIQUE(`follower_id`,`followed_id`)
);
--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_follower_id_users_id_fk` FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `follows` ADD CONSTRAINT `follows_followed_id_users_id_fk` FOREIGN KEY (`followed_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;