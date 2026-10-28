// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const orders=sqliteTable('orders',{id:text('id').primaryKey(),requestId:text('request_id').notNull().unique(),email:text('email').notNull(),token:text('token').notNull(),payload:text('payload').notNull(),createdAt:text('created_at').notNull()});
export const messages=sqliteTable('messages',{id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),message:text('message').notNull(),createdAt:text('created_at').notNull()});
export const subscribers=sqliteTable('subscribers',{email:text('email').primaryKey(),createdAt:text('created_at').notNull()});
