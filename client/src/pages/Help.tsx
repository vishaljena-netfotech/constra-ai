import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileDown, ScanLine, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";

const workflowSteps = [
  {
    icon: UploadCloud,
    title: "1. Create a project and add plans",
    description: "Start a project, then upload PDF, PNG, or JPG drawings to its secure project file library.",
    action: "Open projects",
    path: "/dashboard",
  },
  {
    icon: ScanLine,
    title: "2. Generate a first-pass takeoff",
    description: "Select a plan set and run AI analysis to extract material quantities for estimator review.",
    action: "Review projects",
    path: "/dashboard",
  },
  {
    icon: FileDown,
    title: "3. Review, edit, and export",
    description: "Correct AI quantities inline, generate a bid report, then export a CSV or printable schedule when enabled.",
    action: "View takeoffs",
    path: "/dashboard",
  },
];

export default function Help() {
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  if (loading || !isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-sm sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Constra AI guide</p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight">From drawings to a review-ready estimate</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">Constra AI prepares the first pass so estimators can focus on reviewing scope, correcting quantities, and getting bids out faster.</p>
            </div>
            <Button onClick={() => navigate("/dashboard")} className="bg-white text-slate-950 hover:bg-slate-100">Go to projects <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-950">Estimating workflow</h2>
            <p className="mt-1 text-sm text-slate-500">Use this sequence for a traceable first-pass estimate.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <Card key={step.title} className="flex flex-col p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><step.icon className="h-5 w-5" /></div>
                <h3 className="mt-5 font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{step.description}</p>
                <Button variant="ghost" className="mt-4 w-fit px-0 text-blue-700 hover:bg-transparent hover:text-blue-800" onClick={() => navigate(step.path)}>{step.action}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="p-6 shadow-sm">
            <div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><UsersRound className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-950">Roles and access</h2><p className="mt-0.5 text-sm text-slate-500">Each role has a clear responsibility in the estimating workflow.</p></div></div>
            <div className="mt-5 divide-y rounded-xl border border-slate-100">
              <div className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]"><p className="font-medium text-slate-900">Administrator</p><p className="text-sm leading-6 text-slate-600">Manages workspace members, configuration toggles, and all estimating actions.</p></div>
              <div className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]"><p className="font-medium text-slate-900">Estimator</p><p className="text-sm leading-6 text-slate-600">Creates projects, uploads plans, reviews takeoffs, and generates or exports bids when features are enabled.</p></div>
              <div className="grid gap-1 p-4 sm:grid-cols-[140px_1fr]"><p className="font-medium text-slate-900">Viewer</p><p className="text-sm leading-6 text-slate-600">Reviews projects, quantities, and reports without modifying estimating records.</p></div>
            </div>
          </Card>
          <Card className="border-blue-100 bg-blue-50/50 p-6 shadow-sm">
            <div className="rounded-xl bg-white p-2.5 text-blue-700 shadow-sm"><ShieldCheck className="h-5 w-5" /></div>
            <h2 className="mt-5 font-semibold text-slate-950">Workspace controls</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Administrators can turn plan uploads, AI takeoffs, bid reports, and exports on or off without changing the workflow code.</p>
            <Button variant="outline" className="mt-5" onClick={() => navigate("/admin/settings")}>Open administration</Button>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
