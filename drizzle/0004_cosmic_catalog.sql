CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer NOT NULL,
	`glow_color` text NOT NULL,
	`accent` text NOT NULL,
	`short_description` text NOT NULL,
	`long_description` text NOT NULL,
	`image` text NOT NULL,
	`product_number` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "products_price_nonnegative" CHECK("products"."price_cents" >= 0),
	CONSTRAINT "products_active_boolean" CHECK("products"."active" IN (0,1)),
	CONSTRAINT "product_revision_nonnegative" CHECK("products"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
