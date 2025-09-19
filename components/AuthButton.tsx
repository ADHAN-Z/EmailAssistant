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
  const { data: session } = useSession();

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">{session.user?.email}</p>
        <Button variant="outline" size={size} onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      className={className}
      onClick={() => signIn('google')}
    >
      {children || 'Sign in with Google'}
    </Button>
  );
}