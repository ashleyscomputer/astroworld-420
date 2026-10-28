CREATE TABLE `admin_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`username` text PRIMARY KEY NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `app_locks` (
	`name` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`remote_name` text,
	`error` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`product_id` text PRIMARY KEY NOT NULL,
	`half_units` integer DEFAULT 0 NOT NULL,
	`cost_cents` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "stock_nonnegative" CHECK("inventory"."half_units" >= 0),
	CONSTRAINT "cost_nonnegative" CHECK("inventory"."cost_cents" IS NULL OR "inventory"."cost_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`delta_half` integer NOT NULL,
	`reason` text NOT NULL,
	`order_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text NOT NULL,
	`half_units` integer NOT NULL,
	`cost_cents` integer,
	FOREIGN KEY (`order_id`) REFERENCES `sales`(`order_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `inventory`(`product_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "positive_order_units" CHECK("order_lines"."half_units" > 0)
);
--> statement-breakpoint
CREATE INDEX `order_lines_order_idx` ON `order_lines` (`order_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`order_id` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`payment_state` text DEFAULT 'pending' NOT NULL,
	`source` text DEFAULT 'customer' NOT NULL,
	`net_cents` integer NOT NULL,
	`cost_cents` integer,
	`total_cents` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sales_revision_nonnegative" CHECK("sales"."revision" >= 0)
);
--> statement-breakpoint
CREATE TRIGGER reserve_order_stock AFTER INSERT ON order_lines
BEGIN
 UPDATE inventory SET half_units=half_units-NEW.half_units,revision=revision+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE product_id=NEW.product_id AND half_units>=NEW.half_units;
 SELECT CASE WHEN changes()=0 THEN RAISE(ABORT,'INSUFFICIENT_STOCK') END;
 INSERT INTO inventory_movements(id,product_id,delta_half,reason,order_id,created_at) VALUES(lower(hex(randomblob(16))),NEW.product_id,-NEW.half_units,'Order reserved',NEW.order_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER restore_closed_order_stock AFTER UPDATE OF state ON sales
WHEN NEW.state IN ('cancelled','refunded') AND OLD.state NOT IN ('cancelled','refunded')
BEGIN
 UPDATE inventory SET half_units=half_units+(SELECT SUM(l.half_units) FROM order_lines l WHERE l.order_id=NEW.order_id AND l.product_id=inventory.product_id),revision=revision+1,updated_at=NEW.updated_at WHERE product_id IN (SELECT product_id FROM order_lines WHERE order_id=NEW.order_id);
 INSERT INTO inventory_movements(id,product_id,delta_half,reason,order_id,created_at) SELECT lower(hex(randomblob(16))),product_id,SUM(half_units),'Order closed: '||NEW.state,NEW.order_id,NEW.updated_at FROM order_lines WHERE order_id=NEW.order_id GROUP BY product_id;
END;
--> statement-breakpoint
CREATE TRIGGER protect_closed_order BEFORE UPDATE OF state ON sales
WHEN OLD.state IN ('cancelled','refunded') AND NEW.state!=OLD.state
BEGIN
 SELECT RAISE(ABORT,'ORDER_ALREADY_CLOSED');
END;
--> statement-breakpoint
CREATE TRIGGER queue_inventory_export AFTER UPDATE ON inventory
BEGIN
 INSERT INTO erp_jobs(id,kind,entity_id,status,version,updated_at) VALUES('stock:'||NEW.product_id,'stock',NEW.product_id,'pending',NEW.revision,NEW.updated_at) ON CONFLICT(id) DO UPDATE SET status='pending',version=NEW.revision,updated_at=NEW.updated_at,error=NULL;
END;
