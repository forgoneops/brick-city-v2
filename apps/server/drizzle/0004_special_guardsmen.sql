CREATE TABLE `cms_pages` (
	`slug` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`published` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cms_pages_slug` PRIMARY KEY(`slug`)
);
