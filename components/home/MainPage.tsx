'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Target, Brain, CheckCircle, ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { useSession } from 'next-auth/react';
import Link from "next/link";
import AuthButton from "@/components/AuthButton";

export default function MainPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const features = [
    {
      icon: Mail,
      title: "Smart Email Processing",
      description: "AI automatically extracts actionable tasks from your emails, filtering noise from important work.",
      color: "text-primary"
    },
    {
      icon: Target,
      title: "Priority Intelligence",
      description: "Smart ranking based on deadlines, sender importance, and urgency keywords.",
      color: "text-priority-high"
    },
    {
      icon: Brain,
      title: "Interview Prep AI",
      description: "Auto-detects interviews and generates tailored questions based on role and company.",
      color: "text-interview-technical"
    },
    {
      icon: Calendar,
      title: "Calendar Integration", 
      description: "Automatically schedules prep time and syncs with your Google Calendar.",
      color: "text-interview-behavioral"
    }
  ];

  const benefits = [
    "Never miss important deadlines buried in email",
    "Focus on what matters with AI-powered priority ranking",
    "Ace interviews with personalized preparation",
    "Clean visual dashboard instead of cluttered inbox"
  ];

  const stats = [
    { value: "90%", label: "Faster Task Processing" },
    { value: "3x", label: "Better Interview Success" },
    { value: "60min", label: "Daily Time Saved" },
    { value: "Zero", label: "Missed Deadlines" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-interview-technical bg-clip-text text-transparent">
                TaskFlow AI
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    View Dashboard
                  </Button>
                </Link>
              ) : (
                <AuthButton />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Zap className="w-4 h-4 mr-2" />
            AI-Powered Task Management
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-interview-technical bg-clip-text text-transparent">
            Transform Your Email
            <br />
            Into Actionable Tasks
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Stop drowning in emails. Let AI extract what matters, prioritize your work, 
            and prepare you for career success with intelligent task management and interview prep.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-primary to-interview-technical text-primary-foreground px-8 py-3">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <AuthButton 
                variant="default" 
                size="lg" 
                className="bg-gradient-to-r from-primary to-interview-technical text-primary-foreground px-8 py-3"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </AuthButton>
            )}
            <Button variant="outline" size="lg" className="px-8 py-3">
              Watch Demo
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Intelligent Features That
            <span className="bg-gradient-to-r from-primary to-interview-technical bg-clip-text text-transparent"> Work For You</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI doesn&apos;t just organize—it understands context, prioritizes intelligently, and helps you succeed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-to-br from-card to-card/60 border-border/50 hover:border-border transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <feature.icon className={`w-6 h-6 mr-3 ${feature.color}`} />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-br from-card/30 to-primary/5 py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose TaskFlow AI?
              </h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="w-6 h-6 text-primary mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-interview-technical">
                      Go to Dashboard
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <AuthButton 
                    variant="default" 
                    size="lg" 
                    className="bg-gradient-to-r from-primary to-interview-technical"
                  >
                    Start Your Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </AuthButton>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <Card className="bg-gradient-to-br from-card to-card/80">
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <Shield className="w-5 h-5 text-primary mr-2" />
                    <h3 className="font-semibold">Privacy First</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your emails stay secure with enterprise-grade encryption and zero data retention.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/80">
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <Clock className="w-5 h-5 text-interview-technical mr-2" />
                    <h3 className="font-semibold">Instant Setup</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect your email in under 2 minutes and start seeing organized tasks immediately.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-card to-card/80">
                <CardContent className="p-6">
                  <div className="flex items-center mb-3">
                    <Brain className="w-5 h-5 text-priority-high mr-2" />
                    <h3 className="font-semibold">Learns Your Style</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI adapts to your work patterns and gets smarter with every interaction.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your
            <span className="bg-gradient-to-r from-primary to-interview-technical bg-clip-text text-transparent"> Productivity?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of professionals who&apos;ve revolutionized their workflow with AI-powered task management.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-primary to-interview-technical px-8 py-3">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <AuthButton 
                variant="default" 
                size="lg" 
                className="bg-gradient-to-r from-primary to-interview-technical px-8 py-3"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </AuthButton>
            )}
            <Button variant="outline" size="lg" className="px-8 py-3">
              Schedule a Demo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-interview-technical bg-clip-text text-transparent">
                TaskFlow AI
              </h3>
              <p className="text-sm text-muted-foreground">Smart task management for the modern professional</p>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}