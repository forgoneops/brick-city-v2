ALTER TABLE `battle_votes` MODIFY COLUMN `created_at` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `check_ins` MODIFY COLUMN `created_at` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `photos` MODIFY COLUMN `created_at` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `props` MODIFY COLUMN `created_at` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `seasons` MODIFY COLUMN `starts_at` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `seasons` MODIFY COLUMN `ends_at` timestamp(3);