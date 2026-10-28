// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,check,index} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const orders=sqliteTable('orders',{id:text('id').primaryKey(),requestId:text('request_id').notNull().unique(),email:text('email').notNull(),token:text('token').notNull(),payload:text('payload').notNull(),createdAt:text('created_at').notNull()});
export const messages=sqliteTable('messages',{id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),message:text('message').notNull(),createdAt:text('created_at').notNull()});
export const subscribers=sqliteTable('subscribers',{email:text('email').primaryKey(),createdAt:text('created_at').notNull()});
export const inventory=sqliteTable('inventory',{
 productId:text('product_id').primaryKey(),halfUnits:integer('half_units').notNull().default(0),costCents:integer('cost_cents'),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull(),
},t=>[check('stock_nonnegative',sql`${t.halfUnits} >= 0`),check('cost_nonnegative',sql`${t.costCents} IS NULL OR ${t.costCents} >= 0`)]);
export const sales=sqliteTable('sales',{
 orderId:text('order_id').primaryKey().references(()=>orders.id),state:text('state').notNull().default('pending'),paymentState:text('payment_state').notNull().default('pending'),source:text('source').notNull().default('customer'),netCents:integer('net_cents').notNull(),costCents:integer('cost_cents'),totalCents:integer('total_cents').notNull(),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull(),
},t=>[check('sales_revision_nonnegative',sql`${t.revision} >= 0`)]);
export const orderLines=sqliteTable('order_lines',{
 id:text('id').primaryKey(),orderId:text('order_id').notNull().references(()=>sales.orderId),productId:text('product_id').notNull().references(()=>inventory.productId),halfUnits:integer('half_units').notNull(),costCents:integer('cost_cents'),
},t=>[check('positive_order_units',sql`${t.halfUnits} > 0`),index('order_lines_order_idx').on(t.orderId)]);
export const movements=sqliteTable('inventory_movements',{
 id:text('id').primaryKey(),productId:text('product_id').notNull(),deltaHalf:integer('delta_half').notNull(),reason:text('reason').notNull(),orderId:text('order_id'),createdAt:text('created_at').notNull(),
});
export const adminUsers=sqliteTable('admin_users',{username:text('username').primaryKey(),salt:text('salt').notNull(),passwordHash:text('password_hash').notNull()});
export const adminSessions=sqliteTable('admin_sessions',{hash:text('hash').primaryKey(),username:text('username').notNull(),expires:integer('expires').notNull()});
export const loginAttempts=sqliteTable('login_attempts',{key:text('key').primaryKey(),count:integer('count').notNull(),resetAt:integer('reset_at').notNull()});
export const erpJobs=sqliteTable('erp_jobs',{id:text('id').primaryKey(),kind:text('kind').notNull(),entityId:text('entity_id').notNull(),status:text('status').notNull().default('pending'),remoteName:text('remote_name'),error:text('error'),attempts:integer('attempts').notNull().default(0),version:integer('version').notNull().default(0),updatedAt:text('updated_at').notNull()});
export const appLocks=sqliteTable('app_locks',{name:text('name').primaryKey(),token:text('token').notNull(),expires:integer('expires').notNull()});
