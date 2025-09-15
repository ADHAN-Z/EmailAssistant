import AuthButton from "@/components/AuthButton";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-24">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold">TaskFlow Prep</h1>
        <p className="text-muted-foreground">
          Your smart email-to-task dashboard.
        </p>
        <AuthButton />
      </div>
    </main>
  );
}
