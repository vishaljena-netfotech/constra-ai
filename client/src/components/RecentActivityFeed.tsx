import { useLocation } from "wouter";
import { Activity, ArrowUpRight, Clock3, Download, FileText, FileUp, PencilLine, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const eventVisuals = {
  file_upload: { label: "File update", icon: FileUp, color: "bg-sky-100 text-sky-700" },
  ai_analysis: { label: "AI takeoff", icon: Sparkles, color: "bg-violet-100 text-violet-700" },
  item_edit: { label: "Review update", icon: PencilLine, color: "bg-amber-100 text-amber-700" },
  bid_created: { label: "Bid created", icon: FileText, color: "bg-emerald-100 text-emerald-700" },
  export: { label: "Export", icon: Download, color: "bg-slate-100 text-slate-700" },
} as const;

type RecentActivityFeedProps = { enabled: boolean };

export default function RecentActivityFeed({ enabled }: RecentActivityFeedProps) {
  const [, navigate] = useLocation();
  const { data: activities = [], isLoading, isError } = trpc.audit.recent.useQuery({ limit: 8 }, { enabled });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Recent activity</h2>
          <p className="mt-0.5 text-sm text-slate-500">The latest plan, takeoff, review, and bid updates you can access.</p>
        </div>
        <Activity className="h-5 w-5 text-blue-600" />
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5 animate-pulse" aria-label="Loading recent activity">
          {[1, 2, 3].map((index) => <div key={index} className="h-14 rounded-xl bg-slate-100" />)}
        </div>
      ) : isError ? (
        <div className="px-5 py-8 text-sm text-slate-500">Recent activity could not be loaded. Refresh the page to try again.</div>
      ) : activities.length === 0 ? (
        <div className="px-5 py-9 text-center">
          <Clock3 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-800">Updates will appear here</p>
          <p className="mt-1 text-sm text-slate-500">Create a project, add plans, or review a takeoff to build your activity trail.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {activities.map((entry) => {
            const visual = eventVisuals[entry.eventType];
            const Icon = visual.icon;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/project/${entry.projectId}`)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.color}`}><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-slate-900">{entry.projectName}</span>
                      <span className="text-xs font-medium text-slate-400">{visual.label}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-slate-600">{entry.description || "Project activity updated"}</span>
                  </span>
                  <span className="hidden shrink-0 text-right text-xs text-slate-500 sm:block">
                    {new Date(entry.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {activities.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <Button variant="ghost" size="sm" className="px-0 text-blue-700 hover:bg-transparent hover:text-blue-800" onClick={() => navigate(`/project/${activities[0].projectId}`)}>
            Open latest project <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
