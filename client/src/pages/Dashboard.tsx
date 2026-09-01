import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import EstimatorOnboarding from "@/components/EstimatorOnboarding";
import PlanUploadDropzone from "@/components/PlanUploadDropzone";
import RecentActivityFeed from "@/components/RecentActivityFeed";
import NotificationHistory from "@/components/NotificationHistory";
import { trpc } from "@/lib/trpc";
import { DEFAULT_ONBOARDING_CONTENT } from "@shared/onboarding";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Folder, Clock, ArrowUpRight, ClipboardCheck, FileUp, LockKeyhole, Search, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Dashboard() {
  const { isAuthenticated, loading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [, navigate] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSampleOpen, setIsSampleOpen] = useState(false);
  const [selectedSampleLibraryId, setSelectedSampleLibraryId] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("all");

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading, refetch } = trpc.projects.list.useQuery();
  const {
    data: recentProjects = [],
    isLoading: summariesLoading,
    refetch: refetchRecentProjects,
  } = trpc.projects.recentSummaries.useQuery(undefined, { enabled: isAuthenticated });
  const { data: featureSettings = [] } = trpc.features.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: onboardingSettings } = trpc.onboarding.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: activeTradeLibraries = [], isLoading: tradeLibrariesLoading } = trpc.tradePackageLibraries.listActive.useQuery(undefined, { enabled: isAuthenticated && user?.role !== "viewer" });
  const featureEnabled = (key: string) => featureSettings.find((setting) => setting.key === key)?.enabled ?? true;
  const isViewer = user?.role === "viewer";
  const isEstimator = user?.role === "estimator";
  const onboardingContent = onboardingSettings ?? DEFAULT_ONBOARDING_CONTENT;
  const canCreateProjects = !isViewer;
  const canUploadPlans = !isViewer && featureEnabled("plan_uploads");
  const filteredProjects = projects.filter((project) => {
    const matchesQuery = [project.name, project.description || ""].some((value) =>
      value.toLowerCase().includes(projectQuery.trim().toLowerCase()),
    );
    return matchesQuery && (projectStatus === "all" || project.status === projectStatus);
  });

  useEffect(() => {
    if (isSampleOpen && !selectedSampleLibraryId && activeTradeLibraries[0]) {
      setSelectedSampleLibraryId(String(activeTradeLibraries[0].id));
    }
  }, [activeTradeLibraries, isSampleOpen, selectedSampleLibraryId]);

  // Create project mutation
  const createProjectMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully");
      setProjectName("");
      setProjectDescription("");
      setIsCreateOpen(false);
      refetch();
      refetchRecentProjects();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const createSampleProjectMutation = trpc.projects.createSample.useMutation({
    onSuccess: (sampleProject) => {
      toast.success("Sample training project is ready");
      refetch();
      refetchRecentProjects();
      setIsSampleOpen(false);
      navigate(`/project/${sampleProject.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Unable to create a sample project");
    },
  });

  if (loading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    createProjectMutation.mutate({
      name: projectName,
      description: projectDescription || undefined,
    });
  };

  const openPlanUpload = () => {
    document.getElementById("plan-upload")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const openSampleChooser = () => {
    setSelectedSampleLibraryId((current) => current || String(activeTradeLibraries[0]?.id ?? ""));
    setIsSampleOpen(true);
  };

  const startSampleProject = () => {
    const libraryId = Number(selectedSampleLibraryId);
    if (!Number.isInteger(libraryId) || libraryId <= 0) {
      toast.error("Choose an active trade-package library first.");
      return;
    }
    createSampleProjectMutation.mutate({ libraryId });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: "bg-slate-100", text: "text-slate-700", label: "Draft" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
      completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
      archived: { bg: "bg-gray-100", text: "text-gray-700", label: "Archived" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <p className="text-slate-600 mt-1">
              Manage your construction estimating projects
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCreateProjects && (
              <Button
                variant="outline"
                onClick={openSampleChooser}
                disabled={createSampleProjectMutation.isPending || tradeLibrariesLoading}
                className="hidden border-blue-200 bg-white text-blue-700 hover:bg-blue-50 sm:inline-flex"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {createSampleProjectMutation.isPending ? "Starting…" : "Try sample plan"}
              </Button>
            )}
            <Dialog open={isSampleOpen} onOpenChange={setIsSampleOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Start a training sample project</DialogTitle>
                  <DialogDescription>Choose a project type to copy its trade-package library into a clearly labeled training workspace. Verify every package against drawings before bidding.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sample-trade-library">Project-type library</Label>
                    <select id="sample-trade-library" className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm" value={selectedSampleLibraryId} onChange={(event) => setSelectedSampleLibraryId(event.target.value)} disabled={tradeLibrariesLoading || createSampleProjectMutation.isPending}>
                      {activeTradeLibraries.map((library) => <option key={library.id} value={library.id}>{library.projectType} · {library.name} ({library.packages.length} packages)</option>)}
                    </select>
                  </div>
                  {activeTradeLibraries.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No active trade-package libraries are currently available. Ask a workspace administrator to activate one.</p> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Training packages are illustrative only. They are not AI-extracted quantities or a client-ready bid.</p>}
                  <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsSampleOpen(false)} disabled={createSampleProjectMutation.isPending}>Cancel</Button><Button onClick={startSampleProject} disabled={tradeLibrariesLoading || activeTradeLibraries.length === 0 || createSampleProjectMutation.isPending}>{createSampleProjectMutation.isPending ? "Starting…" : "Create training project"}</Button></div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={!canCreateProjects} title={isViewer ? "Viewer accounts can review projects but cannot create them." : undefined}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isViewer ? "Viewer access" : "New Project"}
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Start a new estimating project. You can add files and generate
                  takeoffs once created.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="e.g., Downtown Office Building"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Optional: Add project details, location, or notes"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={createProjectMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <EstimatorOnboarding
          content={{ ...onboardingContent, enabled: isEstimator && onboardingContent.enabled }}
          onCreateProject={() => setIsCreateOpen(true)}
          onCreateSample={openSampleChooser}
          onOpenUpload={openPlanUpload}
        />

        {canUploadPlans ? (
          <div id="plan-upload">
            <PlanUploadDropzone
              projects={projects.map((project) => ({ id: project.id, name: project.name }))}
              compact
              onUploadComplete={() => {
                refetch();
                refetchRecentProjects();
              }}
            />
          </div>
        ) : (
          <Card className="flex items-center gap-4 border-dashed bg-muted/30 p-5">
            <div className="rounded-xl bg-background p-2.5 shadow-sm"><LockKeyhole className="h-5 w-5 text-muted-foreground" /></div>
            <div>
              <p className="font-semibold">Plan uploads are unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">{isViewer ? "Your viewer role is read-only. Ask an administrator or estimator to upload drawings." : "An administrator has temporarily disabled plan uploads for this workspace."}</p>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent projects</h2>
              <p className="mt-0.5 text-sm text-slate-500">Monitor AI takeoff progress and extracted plan quantities.</p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
          </div>
          {summariesLoading ? (
            <div className="space-y-3 p-5 animate-pulse">
              <div className="h-10 rounded bg-slate-100" />
              <div className="h-10 rounded bg-slate-100" />
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <FileUp className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-800">Start with a project and its plans</p>
              <p className="mt-1 text-sm text-slate-500">Your latest AI takeoff status and quantities will appear here.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 sm:hidden">
                {recentProjects.map((summary) => {
                  const takeoffStatus = summary.latestTakeoff?.status;
                  const statusClass = takeoffStatus === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : takeoffStatus === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : takeoffStatus === "failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-700";
                  return (
                    <button key={summary.project.id} onClick={() => navigate(`/project/${summary.project.id}`)} className="w-full rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{summary.project.name}</p><p className="mt-1 truncate text-xs text-slate-500">{summary.latestTakeoff?.name || "No analysis created"}</p></div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-blue-600" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div><p className="text-slate-500">Takeoff status</p><span className={`mt-1 inline-flex rounded-full px-2 py-1 font-semibold ${statusClass}`}>{takeoffStatus ? takeoffStatus.replace("_", " ") : "Not started"}</span></div>
                        <div><p className="text-slate-500">Quantities</p><p className="mt-1 font-medium leading-5 text-slate-700">{summary.quantitySummary}</p><p className="mt-1 text-slate-500">Updated {new Date(summary.lastModified).toLocaleDateString()}</p></div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="pl-5 font-semibold">Project</TableHead>
                    <TableHead className="font-semibold">Takeoff status</TableHead>
                    <TableHead className="font-semibold">Extracted quantities</TableHead>
                    <TableHead className="font-semibold">Last modified</TableHead>
                    <TableHead className="w-12 pr-5"><span className="sr-only">Open project</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProjects.map((summary) => {
                    const takeoffStatus = summary.latestTakeoff?.status;
                    const statusClass = takeoffStatus === "completed"
                      ? "bg-emerald-100 text-emerald-800"
                      : takeoffStatus === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : takeoffStatus === "failed"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700";
                    return (
                      <TableRow key={summary.project.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/project/${summary.project.id}`)}>
                        <TableCell className="pl-5"><div><p className="font-medium text-slate-900">{summary.project.name}</p><p className="max-w-[18rem] truncate text-xs text-slate-500">{summary.latestTakeoff?.name || "No analysis created"}</p></div></TableCell>
                        <TableCell><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{takeoffStatus ? takeoffStatus.replace("_", " ") : "Not started"}</span></TableCell>
                        <TableCell><p className="text-sm text-slate-700">{summary.quantitySummary}</p></TableCell>
                        <TableCell className="text-sm text-slate-600">{new Date(summary.lastModified).toLocaleDateString()}</TableCell>
                        <TableCell className="pr-5"><Button variant="ghost" size="icon" aria-label={`Open ${summary.project.name}`} onClick={(event) => { event.stopPropagation(); navigate(summary.latestTakeoff ? `/project/${summary.project.id}/takeoff/${summary.latestTakeoff.id}` : `/project/${summary.project.id}`); }}><ArrowUpRight className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </Card>

        <RecentActivityFeed enabled={isAuthenticated} />

        <NotificationHistory projects={projects.map((project) => ({ id: project.id, name: project.name }))} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">All projects</h2>
            <p className="mt-0.5 text-sm text-slate-500">{filteredProjects.length} of {projects.length} shown</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search projects"
                value={projectQuery}
                onChange={(event) => setProjectQuery(event.target.value)}
                placeholder="Search projects"
                className="h-9 pl-9"
              />
            </div>
            <select
              aria-label="Filter projects by status"
              value={projectStatus}
              onChange={(event) => setProjectStatus(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-slate-700 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Projects Grid */}
        {projectsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-2/3 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                <div className="h-4 bg-slate-100 rounded w-4/5" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Folder className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No projects yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create your first project to start uploading plans and generating
              takeoffs.
            </p>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!canCreateProjects}
              title={isViewer ? "Viewer accounts can review projects but cannot create them." : undefined}
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isViewer ? "Viewer access" : "Create Project"}
            </Button>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <Search className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-900">No matching projects</h3>
            <p className="mt-1 text-sm text-slate-500">Adjust the search or status filter to find a different project.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setProjectQuery(""); setProjectStatus("all"); }}>Clear filters</Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <Folder className="w-8 h-8 text-blue-600 group-hover:text-blue-700" />
                  {getStatusBadge(project.status)}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {project.name}
                </h3>

                {project.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center text-xs text-slate-500 pt-4 border-t border-slate-100">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
