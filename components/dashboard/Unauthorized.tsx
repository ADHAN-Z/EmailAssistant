import { Card, CardContent } from "@/components/ui/card";
import { Lock, Mail, Shield } from "lucide-react";
import AuthButton from "../AuthButton";

export function Unauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/50 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse"></div>
            <div className="relative bg-primary/10 rounded-full p-4 border border-primary/20">
              <Lock className="w-8 h-8 text-primary mx-auto" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Access Required
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Please sign in to access your productivity dashboard and manage your tasks.
            </p>
          </div>

          {/* Features Preview */}
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 text-primary" />
              <span>Email analysis & task extraction</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-primary" />
              <span>Secure dashboard & data sync</span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-3">
            <AuthButton/>
            <p className="text-xs text-muted-foreground">
              Get started with your personalized productivity workspace
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}