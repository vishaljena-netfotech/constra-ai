import { useMemo, useState } from "react";
import { BellRing, CheckCircle2, CircleDot, Filter, Inbox, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";

type ProjectOption = { id: number; name: string };
type NotificationStatus = "all" | "unread" | "read" | "approved" | "rejected";

const statusDetails: Record<Exclude<NotificationStatus, "all">, { label: string; className: string; icon: typeof CircleDot }> = {
  unread: { label: "Unread", className: "bg-blue-100 text-blue-800", icon: CircleDot },
  read: { label: "Read", className: "bg-slate-100 text-slate-700", icon: Inbox },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-800", icon: XCircle },
};

export default function NotificationHistory({ projects }: { projects: ProjectOption[] }) {
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus>("all");
  const input = useMemo(() => ({
    limit: 100,
    ...(projectFilter !== "all" ? { projectId: Number(projectFilter) } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  }), [projectFilter, statusFilter]);
  const { data: notifications = [], isLoading, isError } = trpc.notifications.list.useQuery(input);
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><BellRing className="h-5 w-5" /></div>
            <div><CardTitle className="text-lg">Notification history</CardTitle><CardDescription className="mt-1">Review completion alerts and decisions for your estimating work.</CardDescription></div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="sr-only" htmlFor="notification-project-filter">Filter notifications by project</label>
            <select id="notification-project-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
              <option value="all">All projects</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="notification-status-filter">Filter notifications by status</label>
            <select id="notification-status-filter" className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as NotificationStatus)}>
              <option value="all">All review statuses</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="space-y-3 p-5"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          : isError ? <p className="p-5 text-sm text-destructive">Notification history could not be loaded. Try again shortly.</p>
            : notifications.length === 0 ? <div className="p-8 text-center"><Filter className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 font-medium">No notifications match these filters</p><p className="mt-1 text-sm text-muted-foreground">Completed AI takeoffs and your review decisions will appear here.</p></div>
              : <div className="divide-y">{notifications.map((notification) => {
                const status = notification.status as Exclude<NotificationStatus, "all">;
                const detail = statusDetails[status] ?? statusDetails.read;
                const StatusIcon = detail.icon;
                return <div key={notification.id} className="flex gap-3 px-5 py-4"><StatusIcon className={`mt-0.5 h-4 w-4 shrink-0 ${detail.className.split(" ")[1]}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{notification.title}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${detail.className}`}>{detail.label}</span></div><p className="mt-1 text-sm text-muted-foreground">{notification.content}</p><p className="mt-2 text-xs text-muted-foreground">{projectNames.get(notification.projectId) ?? "Associated project"} · {new Date(notification.createdAt).toLocaleString()}</p></div></div>;
              })}</div>}
      </CardContent>
    </Card>
  );
}
