import { db } from "../src/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Truncating fcm_token and push_subscription...");
  await db.execute(sql`TRUNCATE fcm_token`);
  await db.execute(sql`TRUNCATE push_subscription`);
  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
