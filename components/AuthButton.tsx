'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from './ui/button';
import { ReactNode } from 'react';

interface AuthButtonProps {
  children?: ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function AuthButton({
  children,
  variant = "default",
  size = "default",
  className
}: AuthButtonProps) {
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: '/',  // Redirect to home page after logout
      redirect: true 
    });
  };

  // Show loading state
  if (status === "loading") {
    return (
      <Button variant="outline" size={size} disabled>
        Loading...
      </Button>
    );
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-gray-300">{session.user?.name}</p>
          <p className="text-xs text-gray-400">{session.user?.email}</p>
        </div>
        <Button 
          variant="outline" 
          size={size} 
          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
          onClick={handleSignOut}
        >
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className || "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"}
      onClick={() => signIn('google')}
    >
      {children || 'Sign in with Google'}
    </Button>
  );
}