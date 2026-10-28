CREATE TABLE `firebase_identities` (
	`uid` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `firebase_identities_member_id_unique` ON `firebase_identities` (`member_id`);