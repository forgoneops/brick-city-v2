CREATE TABLE `battle_votes` (
	`id` varchar(36) NOT NULL,
	`battle_id` varchar(36) NOT NULL,
	`submission_user_id` varchar(36) NOT NULL,
	`voter_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battle_votes_id` PRIMARY KEY(`id`),
	CONSTRAINT `battle_votes_unique` UNIQUE(`battle_id`,`voter_id`)
);
--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` varchar(36) NOT NULL,
	`pin_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`),
	CONSTRAINT `check_ins_unique` UNIQUE(`pin_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `forum_categories` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	CONSTRAINT `forum_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `forum_props` (
	`id` varchar(36) NOT NULL,
	`reply_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_props_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_props_unique` UNIQUE(`reply_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `forum_replies` (
	`id` varchar(36) NOT NULL,
	`thread_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`props_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `forum_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forum_threads` (
	`id` varchar(36) NOT NULL,
	`category_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_activity_at` timestamp NOT NULL DEFAULT (now()),
	`is_pinned` boolean NOT NULL DEFAULT false,
	`is_locked` boolean NOT NULL DEFAULT false,
	CONSTRAINT `forum_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_providers` (
	`id` enum('stripe','przelewy24','paypal') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`key_placeholder` varchar(255) NOT NULL DEFAULT 'NOT CONFIGURED',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ranking_scores` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`scope` enum('global','city','category') NOT NULL,
	`scope_key` varchar(128) NOT NULL DEFAULT '',
	`season_id` varchar(36) NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ranking_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `ranking_scores_unique` UNIQUE(`user_id`,`scope`,`scope_key`,`season_id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` varchar(36) NOT NULL,
	`name` varchar(128) NOT NULL,
	`starts_at` timestamp NOT NULL DEFAULT (now()),
	`ends_at` timestamp,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`status` enum('trialing','active','expired','canceled') NOT NULL DEFAULT 'trialing',
	`trial_ends_at` timestamp,
	`current_period_end` timestamp,
	`price_cents` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `type` enum('topup','subscription','spend','refund') DEFAULT 'topup' NOT NULL;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `provider` enum('stripe','przelewy24','paypal');--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `provider_ref` varchar(128);--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD `status` enum('pending','completed','failed') DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE `battle_votes` ADD CONSTRAINT `battle_votes_submission_user_id_users_id_fk` FOREIGN KEY (`submission_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `battle_votes` ADD CONSTRAINT `battle_votes_voter_id_users_id_fk` FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_pin_id_pins_id_fk` FOREIGN KEY (`pin_id`) REFERENCES `pins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `check_ins` ADD CONSTRAINT `check_ins_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_props` ADD CONSTRAINT `forum_props_reply_id_forum_replies_id_fk` FOREIGN KEY (`reply_id`) REFERENCES `forum_replies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_props` ADD CONSTRAINT `forum_props_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_thread_id_forum_threads_id_fk` FOREIGN KEY (`thread_id`) REFERENCES `forum_threads`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_category_id_forum_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `forum_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ranking_scores` ADD CONSTRAINT `ranking_scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;