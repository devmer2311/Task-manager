"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield, Users, BarChart3, Upload, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="nav-blur fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sf-pro font-semibold text-gray-900">Dashboard</span>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="apple-button flex items-center gap-2"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Modern Management Platform
            </div>
            <h1 className="text-display text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Streamline Your
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Workflow
              </span>
            </h1>
            <p className="text-body text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              A powerful platform designed to help teams manage tasks, track progress, 
              and collaborate seamlessly. Built with modern technology for maximum efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="apple-button text-lg px-8 py-4"
              >
                Get Started
              </button>
              <button className="apple-button-secondary text-lg px-8 py-4">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-display text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Everything you need
            </h2>
            <p className="text-body text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you manage your team and projects more effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="apple-card p-8 text-center animate-scale-in">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-display text-2xl font-semibold text-gray-900 mb-4">
                Team Management
              </h3>
              <p className="text-body text-gray-600 leading-relaxed">
                Create and manage team members with role-based access control. 
                Keep track of everyone's progress and performance.
              </p>
            </div>

            <div className="apple-card p-8 text-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-display text-2xl font-semibold text-gray-900 mb-4">
                Bulk Operations
              </h3>
              <p className="text-body text-gray-600 leading-relaxed">
                Upload CSV or Excel files to automatically distribute tasks 
                across your team. Save time with intelligent automation.
              </p>
            </div>

            <div className="apple-card p-8 text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-display text-2xl font-semibold text-gray-900 mb-4">
                Analytics & Insights
              </h3>
              <p className="text-body text-gray-600 leading-relaxed">
                Get real-time insights into task completion rates, team performance, 
                and project progress with beautiful visualizations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-display text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-body text-xl text-blue-100 mb-12 max-w-2xl mx-auto">
            Join thousands of teams who trust our platform to manage their workflows efficiently.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="bg-white text-blue-600 hover:bg-gray-50 font-semibold text-lg px-8 py-4 rounded-xl transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg"
          >
            Start Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-sf-pro font-semibold text-gray-900">Dashboard</span>
          </div>
          <p className="text-body text-gray-600">
            © 2024 Dashboard. Built with modern technology for modern teams.
          </p>
        </div>
      </footer>
    </div>
  );
}