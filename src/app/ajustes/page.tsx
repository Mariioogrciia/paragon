import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/forms/ProfileForm";

export default async function AjustesGeneralPage() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!dbUser) redirect("/entrar");

  return <ProfileForm user={dbUser} />;
}
