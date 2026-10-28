CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`email` text NOT NULL,
	`token` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_id_unique` ON `orders` (`request_id`);--> statement-breakpoint
CREATE TABLE `subscribers` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
