// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,check,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
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
export const members=sqliteTable('members',{id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),phone:text('phone').notNull(),salt:text('salt').notNull(),passwordHash:text('password_hash').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull(),requestedPlan:text('requested_plan'),membershipFeeCents:integer('membership_fee_cents')});
export const memberSessions=sqliteTable('member_sessions',{hash:text('hash').primaryKey(),memberId:text('member_id').notNull().references(()=>members.id),expires:integer('expires').notNull()});
export const memberPasses=sqliteTable('member_passes',{hash:text('hash').primaryKey(),memberId:text('member_id').notNull().references(()=>members.id),expires:integer('expires').notNull()});
export const memberOrders=sqliteTable('member_orders',{orderId:text('order_id').primaryKey().references(()=>orders.id),memberId:text('member_id').notNull().references(()=>members.id)},t=>[index('member_orders_member_idx').on(t.memberId)]);
export const firebaseIdentities=sqliteTable('firebase_identities',{uid:text('uid').primaryKey(),memberId:text('member_id').notNull().unique().references(()=>members.id),createdAt:text('created_at').notNull()});
export const staffAccounts=sqliteTable('staff_accounts',{username:text('username').primaryKey().references(()=>adminUsers.username),role:text('role').notNull().default('staff'),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull()});
export const staffAudit=sqliteTable('staff_audit_events',{id:text('id').primaryKey(),actor:text('actor').notNull(),action:text('action').notNull(),target:text('target').notNull(),createdAt:text('created_at').notNull()});
export const memberEntitlements=sqliteTable('member_entitlements',{memberId:text('member_id').primaryKey().references(()=>members.id),plan:text('plan').notNull(),startsAt:text('starts_at').notNull(),expiresAt:text('expires_at').notNull(),approvedBy:text('approved_by').notNull()});
export const agreementVersions=sqliteTable('agreement_versions',{version:text('version').primaryKey(),title:text('title').notNull(),body:text('body').notNull(),documentHash:text('document_hash').notNull(),createdAt:text('created_at').notNull()});
export const agreementAcceptances=sqliteTable('agreement_acceptances',{id:text('id').primaryKey(),memberId:text('member_id').notNull().references(()=>members.id),version:text('version').notNull().references(()=>agreementVersions.version),documentHash:text('document_hash').notNull(),signerName:text('signer_name').notNull(),acceptedAt:text('accepted_at').notNull(),method:text('method').notNull()},t=>[index('agreement_acceptances_member_idx').on(t.memberId)]);
export const catalogProducts=sqliteTable('catalog_products',{
 id:text('id').primaryKey(),slug:text('slug').notNull(),name:text('name').notNull(),priceCents:integer('price_cents').notNull(),secondGramCents:integer('second_gram_cents').notNull(),thirdGramCents:integer('third_gram_cents').notNull(),glowColor:text('glow_color').notNull(),accent:text('accent').notNull(),shortDescription:text('short_description').notNull(),longDescription:text('long_description').notNull(),productNumber:text('product_number').notNull(),active:integer('active').notNull().default(1),revision:integer('revision').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[check('catalog_products_price_nonnegative',sql`${t.priceCents} >= 0`),check('catalog_products_second_nonnegative',sql`${t.secondGramCents} >= 0`),check('catalog_products_third_nonnegative',sql`${t.thirdGramCents} >= 0`),check('catalog_products_active_boolean',sql`${t.active} IN (0,1)`),check('catalog_products_revision_nonnegative',sql`${t.revision} >= 0`),index('catalog_products_active_idx').on(t.active),uniqueIndex('catalog_products_slug_unique').on(t.slug)]);
export const productMedia=sqliteTable('product_media',{productId:text('product_id').primaryKey().references(()=>inventory.productId),imageUrl:text('image_url').notNull(),revision:integer('revision').notNull().default(0),updatedAt:text('updated_at').notNull()});
