CREATE TABLE `catalog_products` (
 `id` text PRIMARY KEY NOT NULL,
 `slug` text NOT NULL,
 `name` text NOT NULL,
 `price_cents` integer NOT NULL,
 `second_gram_cents` integer NOT NULL,
 `third_gram_cents` integer NOT NULL,
 `glow_color` text NOT NULL,
 `accent` text NOT NULL,
 `short_description` text NOT NULL,
 `long_description` text NOT NULL,
 `product_number` text NOT NULL,
 `active` integer DEFAULT 1 NOT NULL,
 `revision` integer DEFAULT 0 NOT NULL,
 `created_at` text NOT NULL,
 `updated_at` text NOT NULL,
 CONSTRAINT "catalog_products_price_nonnegative" CHECK("catalog_products"."price_cents" >= 0),
 CONSTRAINT "catalog_products_second_nonnegative" CHECK("catalog_products"."second_gram_cents" >= 0),
 CONSTRAINT "catalog_products_third_nonnegative" CHECK("catalog_products"."third_gram_cents" >= 0),
 CONSTRAINT "catalog_products_active_boolean" CHECK("catalog_products"."active" IN (0,1)),
 CONSTRAINT "catalog_products_revision_nonnegative" CHECK("catalog_products"."revision" >= 0)
);
--> statement-breakpoint
CREATE INDEX `catalog_products_active_idx` ON `catalog_products` (`active`);
--> statement-breakpoint
CREATE UNIQUE INDEX `catalog_products_slug_unique` ON `catalog_products` (`slug`);
