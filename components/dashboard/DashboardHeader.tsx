// components/dashboard/DashboardHeader.tsx
'use client';
import { useRouter } from 'next/navigation';
import AuthButton from "@/components/AuthButton";

export function DashboardHeader() {
  const router = useRouter();

  const handleTitleClick = () => {
    router.push('/');
  };

  return (
    <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={handleTitleClick}>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
              TaskFlow AI
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <AuthButton />
          </div>
        </div>
      </div>
    </div>
  );
}