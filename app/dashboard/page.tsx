import AuthButton from "@/components/AuthButton";
import { Badge } from "@/components/ui/badge";
import SyncButton from "@/components/SyncButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSession } from "next-auth";

export default async function DashboardPage() {
  const session = await getServerSession(); // We can get the session on the server!

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Task Dashboard</h1>
          <p className="text-muted-foreground">Smart email-to-task extraction with interview prep</p>
        </div>
        <SyncButton />
        <AuthButton />
      </header>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Today's Priority Tasks</h2>
          {/* Placeholder for tasks list */}
          <div className="bg-[#1C1C1C] p-6 rounded-lg">
            <p>Task list will go here...</p>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Interview Prep</h2>
          {/* Placeholder for interviews */}
          <div className="bg-[#1C1C1C] p-6 rounded-lg">
            <p>Interview prep cards will go here...</p>
          </div>
        </div>
      </main>
    </div>
  );
}