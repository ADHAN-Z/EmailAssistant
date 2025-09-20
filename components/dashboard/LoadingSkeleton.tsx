import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mail, Loader2, CheckCircle, Sparkles, Zap, Brain } from "lucide-react";

interface SyncStatus {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  totalEmails: number;
  processedEmails: number;
  tasksCreated: number;
  emailsFailed?: number;
  lastSync: Date | null;
  error: string | null;
}

interface LoadingSkeletonProps {
  syncStatus: SyncStatus;
}

export function LoadingSkeleton({ syncStatus }: LoadingSkeletonProps) {
  return (
    <div className="space-y-6 relative">
      {/* Floating Particles Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

       {/* Progress Card */}
       <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Mail className="w-5 h-5 text-blue-400" />
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin absolute -top-1 -right-1" />
              </div>
              <h3 className="font-semibold text-white">Processing Your Emails</h3>
            </div>
            <span className="text-sm text-blue-300">
              {syncStatus.processedEmails}/{syncStatus.totalEmails}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{syncStatus.currentStep}</span>
              <span className="text-blue-300">{Math.round(syncStatus.progress)}%</span>
            </div>
            <Progress 
              value={syncStatus.progress} 
              className="h-2 bg-gray-800"
            />
          </div>
          
          <div className="flex justify-between text-xs text-gray-400">
            <span>Tasks Created: {syncStatus.tasksCreated}</span>
            <span>Processing...</span>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Loading Section with Cool Effects */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <Brain className="w-6 h-6 text-primary animate-pulse" />
            <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping" />
          </div>
          <h2 className="text-xl font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent animate-pulse">
            AI is Analyzing Your Tasks...
          </h2>
          <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
        </div>
        
        {/* Floating Action Cards */}
        <div className="grid gap-4">
          {[
            { icon: Mail, label: "Parsing Emails", color: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/40" },
            { icon: Brain, label: "AI Analysis", color: "from-purple-500/20 to-pink-500/20", border: "border-purple-500/40" },
            { icon: Zap, label: "Creating Tasks", color: "from-yellow-500/20 to-orange-500/20", border: "border-yellow-500/40" }
          ].map((item, i) => (
            <FloatingCard key={i} {...item} delay={i * 0.3} />
          ))}
        </div>

        {/* Enhanced Task Skeleton Cards */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <EnhancedTaskSkeleton key={i} delay={i * 0.2} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ✅ Properly typed FloatingCard props
function FloatingCard({
  icon: Icon,
  label,
  color,
  border,
  delay
}: {
  icon: React.ComponentType<{ className?: string }>; // replaced any
  label: string;
  color: string;
  border: string;
  delay: number;
}) {
  return (
    <Card
      className={`bg-gradient-to-r ${color} ${border} relative overflow-hidden animate-float`}
      style={{ animationDelay: `${delay}s` }}
    >
      <CardContent className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icon className="w-5 h-5 text-primary animate-spin" />
            <div className="absolute -inset-1 bg-primary/30 rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium text-white">{label}</span>
          <div className="flex-1" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>

        {/* Animated border glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-shimmer" />
      </CardContent>
    </Card>
  );
}


function EnhancedTaskSkeleton({ delay, index }: { delay: number; index: number }) {
  const gradients = [
    'from-blue-500/30 via-purple-500/30 to-pink-500/30',
    'from-green-500/30 via-teal-500/30 to-blue-500/30',
    'from-orange-500/30 via-red-500/30 to-purple-500/30'
  ];
  
  return (
    <Card 
      className="bg-card/30 border-border/50 relative overflow-hidden group hover:border-primary/50 transition-all duration-500"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradients[index]} opacity-20 animate-pulse`} />
      
      {/* Floating sparkles */}
      <div className="absolute top-2 right-2">
        <Sparkles className="w-4 h-4 text-primary/50 animate-pulse" />
      </div>
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-3 flex-1">
            <div className="relative">
              <div className="h-4 bg-gradient-to-r from-primary/50 to-purple-400/50 rounded animate-shimmer w-3/4" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-right" />
            </div>
            <div className="relative">
              <div className="h-3 bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/50 rounded animate-shimmer w-1/2" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-right delay-300" />
            </div>
          </div>
          <div className="relative">
            <div className="h-6 bg-gradient-to-r from-accent/40 to-accent/60 rounded-full animate-pulse w-16" />
            <div className="absolute -inset-1 bg-accent/20 rounded-full animate-ping" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <div className="relative">
            <div className="h-3 bg-gradient-to-r from-muted/50 to-muted/70 rounded animate-shimmer w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-right delay-500" />
          </div>
          <div className="relative">
            <div className="h-3 bg-gradient-to-r from-muted/40 to-muted/60 rounded animate-shimmer w-4/5" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-slide-right delay-700" />
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="relative">
              <div className="h-3 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded animate-pulse w-24" />
            </div>
            <div className="relative">
              <div className="h-4 bg-gradient-to-r from-primary/40 to-primary/60 rounded animate-pulse w-20" />
              <div className="absolute -inset-0.5 bg-primary/20 rounded animate-ping delay-1000" />
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Card>
  );
}

// Interview Skeleton with enhanced effects
export function InterviewSkeleton() {
  return (
    <Card className="bg-card/40 border-border/50 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 animate-pulse" />
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <div className="relative">
              <div className="h-4 bg-gradient-to-r from-purple-400/50 to-blue-400/50 rounded animate-shimmer w-32" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-purple-400 animate-pulse" />
            </div>
            <div className="h-3 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded animate-pulse w-24" />
          </div>
          <div className="relative">
            <div className="h-6 bg-gradient-to-r from-accent/50 to-accent/70 rounded-full animate-pulse w-20" />
            <div className="absolute -inset-1 bg-accent/20 rounded-full animate-ping" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="space-y-3">
          <div className="h-3 bg-gradient-to-r from-muted/50 to-muted/70 rounded animate-shimmer w-full" />
          <div className="relative">
            <div className="h-8 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded animate-pulse w-full" />
            <Brain className="absolute top-1 right-2 w-4 h-4 text-primary animate-spin" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Success Animation
export function SyncComplete({ tasksCreated }: { tasksCreated: number }) {
  return (
    <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5 animate-pulse" />
      
      <CardContent className="py-8 text-center relative z-10">
        <div className="relative inline-block mb-4">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto animate-bounce" />
          <div className="absolute -inset-2 bg-green-400/20 rounded-full animate-ping" />
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-spin" />
        </div>
        
        <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent mb-3">
          Sync Complete!
        </h3>
        <p className="text-muted-foreground text-lg">
          Successfully processed your emails and created{' '}
          <span className="text-primary font-semibold">{tasksCreated}</span> new tasks.
        </p>
        
        {/* Celebration confetti effect */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded animate-bounce"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
