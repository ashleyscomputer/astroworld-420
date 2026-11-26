import * as SQLite from "expo-sqlite";
import type {Product,QueuedSale} from "../types";

let database:SQLite.SQLiteDatabase|null=null;
async function db():Promise<SQLite.SQLiteDatabase>{
  if(!database){
    database=await SQLite.openDatabaseAsync("astroworld-admin.db");
    await database.execAsync(
      "PRAGMA journal_mode = WAL;"+
      "CREATE TABLE IF NOT EXISTS cached_products (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);"+
      "CREATE TABLE IF NOT EXISTS pending_sales (request_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, queued_at TEXT NOT NULL, last_error TEXT);"
    );
  }
  return database;
}
export async function cacheProducts(products:Product[]):Promise<void>{
  const database=await db();
  await database.withTransactionAsync(async()=>{
    await database.runAsync("DELETE FROM cached_products");
    for(const product of products){
      await database.runAsync(
        "INSERT INTO cached_products (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
        product.id,JSON.stringify(product),new Date().toISOString()
      );
    }
  });
}
export async function getCachedProducts():Promise<Product[]>{
  const database=await db();
  const rows=await database.getAllAsync<{payload:string}>(
    "SELECT payload FROM cached_products ORDER BY json_extract(payload,'$.sort_order')"
  );
  return rows.map(row=>JSON.parse(row.payload) as Product);
}
export async function enqueueSale(sale:QueuedSale):Promise<void>{
  const database=await db();
  await database.runAsync(
    "INSERT OR IGNORE INTO pending_sales (request_id,payload,queued_at,last_error) VALUES (?,?,?,NULL)",
    sale.requestId,JSON.stringify(sale),sale.queuedAt
  );
}
export async function getPendingSales():Promise<QueuedSale[]>{
  const database=await db();
  const rows=await database.getAllAsync<{payload:string;last_error:string|null}>(
    "SELECT payload,last_error FROM pending_sales ORDER BY queued_at ASC"
  );
  return rows.map(row=>({...JSON.parse(row.payload) as QueuedSale,lastError:row.last_error}));
}
export async function markPendingSaleError(requestId:string,message:string):Promise<void>{
  const database=await db();
  await database.runAsync("UPDATE pending_sales SET last_error=? WHERE request_id=?",message.slice(0,300),requestId);
}
export async function removePendingSale(requestId:string):Promise<void>{
  const database=await db();
  await database.runAsync("DELETE FROM pending_sales WHERE request_id=?",requestId);
}
export async function pendingSaleCount():Promise<number>{
  const database=await db();
  const row=await database.getFirstAsync<{count:number}>("SELECT count(*) AS count FROM pending_sales");
  return Number(row?.count??0);
}