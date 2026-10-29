CREATE TABLE `agreement_acceptances` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`version` text NOT NULL,
	`document_hash` text NOT NULL,
	`signer_name` text NOT NULL,
	`accepted_at` text NOT NULL,
	`method` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`version`) REFERENCES `agreement_versions`(`version`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `agreement_acceptances_member_idx` ON `agreement_acceptances` (`member_id`);--> statement-breakpoint
CREATE TABLE `agreement_versions` (
	`version` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`document_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`product_id` text PRIMARY KEY NOT NULL,
	`image_url` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `inventory`(`product_id`) ON UPDATE no action ON DELETE no action
);
