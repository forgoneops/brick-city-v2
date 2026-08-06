CREATE TABLE `chat_messages` (
	`id` varchar(36) NOT NULL,
	`channel` varchar(96) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`body` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;