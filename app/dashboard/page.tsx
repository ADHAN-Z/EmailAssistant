// app/dashboard/page.tsx
import { DashboardContent } from "@/components/dashboard/DashboardContent";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { logger } from '@/lib/logger';
import type { SessionUser } from '@/types';
import { Unauthorized } from "@/components/dashboard/Unauthorized";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as SessionUser).id) {
    if (process.env.NODE_ENV === "development") {
      logger.warn("Unauthorized access attempt to dashboard");
    }
    return <Unauthorized />;
  }

  const sessionUser = session.user as SessionUser;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <DashboardHeader />
      <DashboardContent userId={sessionUser.id} />
    </div>
  );
}
