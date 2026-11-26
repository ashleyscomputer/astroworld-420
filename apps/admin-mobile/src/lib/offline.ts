import * as SQLite from "expo-sqlite";
import type { PendingInventoryOperation, Product } from "../types";

let database: SQLite.SQLiteDatabase | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    database = await SQLite.openDatabaseAsync("astroworld-admin.db");
    await database.execAsync(
      "PRAGMA journal_mode = WAL;" +
      "CREATE TABLE IF NOT EXISTS cached_products (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS pending_inventory_operations (request_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, queued_at TEXT NOT NULL, last_error TEXT);"
    );
  }
  return database;
}

export async function cacheProducts(products: Product[]): Promise<void> {
  const database = await db();
  await database.withTransactionAsync(async () => {
    await database.runAsync("DELETE FROM cached_products");
    for (const product of products) {
      await database.runAsync(
        "INSERT INTO cached_products (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
        product.id,
        JSON.stringify(product),
        new Date().toISOString()
      );
    }
  });
}

export async function getCachedProducts(): Promise<Product[]> {
  const database = await db();
  const rows = await database.getAllAsync<{ payload: string }>(
    "SELECT payload FROM cached_products ORDER BY json_extract(payload,'$.sort_order')"
  );
  return rows.map((row) => JSON.parse(row.payload) as Product);
}

export async function enqueueInventoryOperation(operation: PendingInventoryOperation): Promise<void> {
  const database = await db();
  await database.runAsync(
    "INSERT OR IGNORE INTO pending_inventory_operations (request_id,payload,queued_at,last_error) VALUES (?,?,?,NULL)",
    operation.requestId,
    JSON.stringify(operation),
    operation.queuedAt
  );
}

export async function getPendingInventoryOperations(): Promise<PendingInventoryOperation[]> {
  const database = await db();
  const rows = await database.getAllAsync<{ payload: string; last_error: string | null }>(
    "SELECT payload,last_error FROM pending_inventory_operations ORDER BY queued_at ASC"
  );
  return rows.map((row) => ({
    ...(JSON.parse(row.payload) as PendingInventoryOperation),
    lastError: row.last_error,
  }));
}

export async function markInventoryOperationError(requestId: string, message: string): Promise<void> {
  const database = await db();
  await database.runAsync(
    "UPDATE pending_inventory_operations SET last_error=? WHERE request_id=?",
    message.slice(0, 300),
    requestId
  );
}

export async function removeInventoryOperation(requestId: string): Promise<void> {
  const database = await db();
  await database.runAsync(
    "DELETE FROM pending_inventory_operations WHERE request_id=?",
    requestId
  );
}

export async function pendingInventoryOperationCount(): Promise<number> {
  const database = await db();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT count(*) AS count FROM pending_inventory_operations"
  );
  return Number(row?.count ?? 0);
}
