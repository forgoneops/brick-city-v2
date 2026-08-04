CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`photo_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(128) NOT NULL DEFAULT '',
	`type` varchar(64) NOT NULL DEFAULT 'jam',
	`date` timestamp NOT NULL,
	`status` enum('pending','live','rejected') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invite_redemptions` (
	`id` varchar(36) NOT NULL,
	`invite_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`redeemed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`max_uses` int NOT NULL DEFAULT 1,
	`used_count` int NOT NULL DEFAULT 0,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`category` enum('piece','throw-up','tag','character','stencil','other') NOT NULL,
	`city` varchar(128) NOT NULL DEFAULT '',
	`image_url` varchar(512) NOT NULL,
	`thumb_url` varchar(512) NOT NULL,
	`props_count` int NOT NULL DEFAULT 0,
	`status` enum('live','flagged','removed') NOT NULL DEFAULT 'live',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pins` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(128) NOT NULL DEFAULT '',
	`type` enum('legal wall','spot','hall of fame','event') NOT NULL,
	`lat` double NOT NULL,
	`lng` double NOT NULL,
	`status` enum('pending','live','rejected') NOT NULL DEFAULT 'pending',
	`members_only` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL DEFAULT 'dispatch',
	`body` text NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`published_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `props` (
	`id` varchar(36) NOT NULL,
	`photo_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `props_id` PRIMARY KEY(`id`),
	CONSTRAINT `props_photo_user_unique` UNIQUE(`photo_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` varchar(36) NOT NULL,
	`target_type` enum('photo','pin','comment','user') NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`reporter_id` varchar(36),
	`reason` text NOT NULL,
	`ai_flag` boolean NOT NULL DEFAULT false,
	`status` enum('open','resolved','dismissed') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_content` (
	`key` varchar(128) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_content_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`nick` varchar(64) NOT NULL,
	`role` enum('user','moderator','admin') NOT NULL DEFAULT 'user',
	`wallet_balance_cents` int NOT NULL DEFAULT 0,
	`trial_ends_at` timestamp,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_nick_unique` UNIQUE(`nick`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`amount_cents` int NOT NULL,
	`reason` varchar(128) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_photo_id_photos_id_fk` FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_redemptions` ADD CONSTRAINT `invite_redemptions_invite_id_invites_id_fk` FOREIGN KEY (`invite_id`) REFERENCES `invites`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invite_redemptions` ADD CONSTRAINT `invite_redemptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invites` ADD CONSTRAINT `invites_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `photos` ADD CONSTRAINT `photos_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pins` ADD CONSTRAINT `pins_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `props` ADD CONSTRAINT `props_photo_id_photos_id_fk` FOREIGN KEY (`photo_id`) REFERENCES `photos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `props` ADD CONSTRAINT `props_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_id_users_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;