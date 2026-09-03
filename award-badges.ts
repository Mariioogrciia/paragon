import { db } from './src/db/index.js';
import { users, userBadges } from './src/db/schema.js';

async function awardBadges() {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    console.log("No users found.");
    process.exit(1);
  }
  
  const user = allUsers[0];
  console.log("Found user:", user.handle);
  
  await db.insert(userBadges).values([
    { userId: user.id, badgeId: 'first_blood' },
    { userId: user.id, badgeId: 'cazador' },
    { userId: user.id, badgeId: 'madrugador' }
  ]).onConflictDoNothing();
  
  console.log("Badges awarded!");
  process.exit(0);
}

awardBadges().catch(console.error);
