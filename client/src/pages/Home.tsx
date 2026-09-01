import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
  ArrowRight,
  Building2,
  HardHat,
  Landmark,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Navigation is a side effect. Performing it in render causes React's
  // render-phase state update warning when Wouter updates location state.
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CA</span>
            </div>
            <span className="font-semibold text-slate-900">Constra AI</span>
          </div>
          <Button
            onClick={() => startLogin()}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-6">
            <div className="inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <span className="text-sm font-medium text-blue-700">
                AI-Powered Construction Estimating
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              Takeoffs in Minutes,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                Not Hours
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Upload architectural plans. Our AI extracts quantities automatically.
              Review and refine in minutes. Generate bid-ready estimates with
              confidence.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={() => startLogin()}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base font-medium"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 h-12 text-base font-medium border-slate-300"
              >
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-slate-500 pt-4">
              No credit card required. Start estimating immediately.
            </p>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-50 p-8 h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-slate-600 font-medium">
                Plan Analysis Dashboard
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Why Estimators Choose Constra AI
            </h2>
            <p className="text-lg text-slate-600">
              Designed for construction professionals who need speed and accuracy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Lightning Fast
              </h3>
              <p className="text-slate-600">
                Extract quantities from complex drawings in seconds. What used to
                take hours now takes minutes.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Accurate Results
              </h3>
              <p className="text-slate-600">
                AI-powered analysis with human review. Inline editing lets you
                refine results without leaving the platform.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Bid Ready
              </h3>
              <p className="text-slate-600">
                Generate professional cost estimates instantly. Export to CSV or
                PDF for client delivery.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                More Bids, Same Team
              </h3>
              <p className="text-slate-600">
                Submit more competitive bids without hiring. Your team stays
                focused on high-value work.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Complete History
              </h3>
              <p className="text-slate-600">
                Audit trail captures every upload, analysis, and edit. Full
                transparency for compliance.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-8 border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Built for Teams
              </h3>
              <p className="text-slate-600">
                Organize projects by client. Manage files, takeoffs, and bids in
                one secure workspace.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-4 bg-slate-950 text-white">
        <div className="container mx-auto max-w-5xl">
          <div className="max-w-2xl mb-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300 mb-3">
              Built for the work in front of you
            </p>
            <h2 className="text-4xl font-bold tracking-tight">
              A practical estimating workspace for every construction team
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-white/10 bg-white/5 p-7 text-white shadow-none">
              <Building2 className="mb-5 h-6 w-6 text-blue-300" />
              <h3 className="mb-2 text-xl font-semibold">General contractors</h3>
              <p className="text-sm leading-6 text-slate-300">
                Organize plan sets, review quantity assumptions, and prepare a clearer first-pass estimate before bid review.
              </p>
            </Card>
            <Card className="border-white/10 bg-white/5 p-7 text-white shadow-none">
              <HardHat className="mb-5 h-6 w-6 text-blue-300" />
              <h3 className="mb-2 text-xl font-semibold">Specialty trades</h3>
              <p className="text-sm leading-6 text-slate-300">
                Focus on the materials and measurements that matter to your scope, then adjust quantities directly in the takeoff.
              </p>
            </Card>
            <Card className="border-white/10 bg-white/5 p-7 text-white shadow-none">
              <Landmark className="mb-5 h-6 w-6 text-blue-300" />
              <h3 className="mb-2 text-xl font-semibold">Owners & developers</h3>
              <p className="text-sm leading-6 text-slate-300">
                Maintain a traceable view of plan inputs, review changes, and share structured bid information with project teams.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-4xl font-bold text-slate-900 text-center mb-16">
            How It Works
          </h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Upload Plans
                </h3>
                <p className="text-slate-600">
                  Upload PDF, PNG, or JPG architectural drawings. Organize by
                  project for easy reference.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  AI Analysis
                </h3>
                <p className="text-slate-600">
                  Our AI instantly extracts quantities, materials, and dimensions
                  from your plans. Review structured results in seconds.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Review & Refine
                </h3>
                <p className="text-slate-600">
                  Edit line items inline. Add missing items or adjust quantities
                  with confidence. Track all changes.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Generate Bid
                </h3>
                <p className="text-slate-600">
                  Create professional cost estimates. Input unit prices and
                  generate bid-ready reports in one click.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white px-4 py-20" id="pricing">
        <div className="container mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Straightforward starting point
            </p>
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Pricing that follows your estimating workflow
            </h2>
            <p className="text-lg text-slate-600">
              Start with a free workspace, then choose a team plan when your bid volume, controls, and collaboration needs grow.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="flex flex-col border-slate-200 p-7 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Explorer</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Free to start</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                Create a workspace, upload supported plan files, and review AI-generated first-pass quantities before committing to a team rollout.
              </p>
              <Button onClick={() => startLogin()} variant="outline" className="mt-7 border-slate-300">
                Create free workspace
              </Button>
            </Card>

            <Card className="relative flex flex-col border-blue-600 bg-slate-950 p-7 text-white shadow-xl shadow-blue-950/15">
              <span className="absolute right-6 top-6 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                For active teams
              </span>
              <p className="text-sm font-semibold text-blue-200">Team</p>
              <h3 className="mt-2 text-2xl font-bold">Tailored to your bid volume</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">
                Bring projects, takeoff review, bid reporting, and role-based controls into one estimating workspace with a plan scoped to your workflow.
              </p>
              <Button onClick={() => startLogin()} className="mt-7 bg-blue-500 text-white hover:bg-blue-400">
                Set up a team workspace
              </Button>
            </Card>

            <Card className="flex flex-col border-slate-200 p-7 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">Enterprise</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">Built around your controls</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">
                For organizations that need rollout planning, structured permissions, and an estimating process designed around their operating standards.
              </p>
              <Button onClick={() => startLogin()} variant="outline" className="mt-7 border-slate-300">
                Discuss enterprise access
              </Button>
            </Card>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Team and enterprise terms are configured around project volume and workspace requirements.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center text-white">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Estimating?
            </h2>
            <p className="text-lg text-blue-100 mb-8">
              Join construction teams already saving hours on every project.
            </p>
            <Button
              onClick={() => startLogin()}
              size="lg"
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 h-12 text-base font-medium"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4">
        <div className="container mx-auto text-center text-slate-600 text-sm">
          <p>© 2026 Constra AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
