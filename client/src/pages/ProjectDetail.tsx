import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  FileText,
  Zap,
  BarChart3,
  Clock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectDetailProps {
  params: {
    projectId: string;
  };
}

export default function ProjectDetail({ params }: ProjectDetailProps) {
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [, navigate] = useLocation();
  const projectId = parseInt(params.projectId);
  const utils = trpc.useUtils();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStatus, setDraftStatus] = useState("draft");
  const [pendingFileDelete, setPendingFileDelete] = useState<{ id: number; name: string } | null>(null);
  const [auditEventType, setAuditEventType] = useState("all");
  const [auditOffset, setAuditOffset] = useState(0);

  // Fetch project details
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
  } = trpc.projects.getById.useQuery({ projectId });

  // Fetch files
  const { data: files = [], isLoading: filesLoading } = trpc.files.list.useQuery(
    { projectId },
    { enabled: Number.isFinite(projectId) }
  );

  // Fetch takeoffs
  const { data: takeoffs = [], isLoading: takeoffsLoading } =
    trpc.takeoffs.list.useQuery({ projectId }, { enabled: Number.isFinite(projectId) });

  // Fetch bid reports
  const { data: bidReports = [], isLoading: bidReportsLoading } =
    trpc.bidReports.list.useQuery({ projectId }, { enabled: Number.isFinite(projectId) });

  // Fetch audit log
  const { data: auditHistory, isLoading: auditLoading } = trpc.audit.getProjectHistory.useQuery(
    {
      projectId,
      limit: 20,
      offset: auditOffset,
      eventType: auditEventType === "all" ? undefined : auditEventType as "file_upload" | "ai_analysis" | "item_edit" | "bid_created" | "export",
    },
    { enabled: Number.isFinite(projectId) }
  );

  const updateProjectMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project details saved");
      setEditOpen(false);
      void utils.projects.getById.invalidate({ projectId });
      void utils.projects.list.invalidate();
      void utils.projects.recentSummaries.invalidate();
      void utils.audit.getProjectHistory.invalidate({ projectId });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteProjectMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      void utils.projects.list.invalidate();
      void utils.projects.recentSummaries.invalidate();
      navigate("/dashboard");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteFileMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("Plan removed from the project");
      setPendingFileDelete(null);
      void utils.files.list.invalidate({ projectId });
      void utils.audit.getProjectHistory.invalidate({ projectId });
      void utils.projects.recentSummaries.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    setAuditOffset(0);
  }, [auditEventType]);

  if (authLoading || projectLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (projectError || !project) {
    return (
      <DashboardLayout>
        <Card className="p-8 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Project not found</h3>
              <p className="text-red-700 text-sm mt-1">
                The project you're looking for doesn't exist or you don't have
                access to it.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="mt-4"
              >
                Back to Projects
              </Button>
            </div>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "text-slate-600 bg-slate-100",
      in_progress: "text-blue-700 bg-blue-100",
      completed: "text-green-700 bg-green-100",
      archived: "text-gray-700 bg-gray-100",
    };
    return colors[status] || colors.draft;
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "file_upload":
        return <FileText className="w-4 h-4" />;
      case "ai_analysis":
        return <Zap className="w-4 h-4" />;
      case "item_edit":
        return <Clock className="w-4 h-4" />;
      case "bid_created":
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const canEdit = (user?.role ?? "user") !== "viewer";
  const auditEntries = auditHistory?.entries ?? [];
  const auditPage = Math.floor(auditOffset / 20) + 1;

  const openEditDialog = () => {
    setDraftName(project.name);
    setDraftDescription(project.description ?? "");
    setDraftStatus(project.status);
    setEditOpen(true);
  };

  const formatEventDetails = (metadata: unknown) => {
    if (!metadata) return null;
    try {
      return typeof metadata === "string" ? JSON.stringify(JSON.parse(metadata), null, 2) : JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-3xl font-bold text-slate-900">
                {project.name}
              </h1>
            </div>
            <p className="text-slate-600 ml-11">
              {project.description || "No description"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit project
                </Button>
                <Button variant="outline" size="sm" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </>
            )}
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
              {project.status.replace("_", " ").charAt(0).toUpperCase() + project.status.replace("_", " ").slice(1)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="files" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100 p-1">
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Files</span>
              <span className="ml-1 text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                {files.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="takeoffs" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Takeoffs</span>
              <span className="ml-1 text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                {takeoffs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="bids" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Bids</span>
              <span className="ml-1 text-xs bg-slate-200 px-2 py-0.5 rounded-full">
                {bidReports.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          {/* Files Tab */}
          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Project Files
              </h2>
              {canEdit ? <Button onClick={() => navigate(`/project/${projectId}/upload`)} className="bg-blue-600 hover:bg-blue-700"><FileText className="w-4 h-4 mr-2" />Upload File</Button> : <span className="text-sm text-slate-500">Viewer access is read-only</span>}
            </div>

            {filesLoading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </Card>
            ) : files.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">No files uploaded yet</p>
                {canEdit && <Button onClick={() => navigate(`/project/${projectId}/upload`)} className="bg-blue-600 hover:bg-blue-700">Upload Plans</Button>}
              </Card>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <Card key={file.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {file.fileType.toUpperCase()} • {(file.fileSize / 1024).toFixed(1)} KB •{" "}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.s3Url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="mr-1.5 h-4 w-4" /> Preview
                        </Button>
                        {canEdit && <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}/new-takeoff`)}>Analyze</Button>}
                        {canEdit && <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${file.fileName}`} onClick={() => setPendingFileDelete({ id: file.id, name: file.fileName })}><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Takeoffs Tab */}
          <TabsContent value="takeoffs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Takeoffs
              </h2>
              {canEdit && <Button onClick={() => navigate(`/project/${projectId}/new-takeoff`)} className="bg-blue-600 hover:bg-blue-700"><Zap className="w-4 h-4 mr-2" />New Takeoff</Button>}
            </div>

            {takeoffsLoading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </Card>
            ) : takeoffs.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-4">
                  No takeoffs yet. Upload files and run AI analysis.
                </p>
                {canEdit && <Button onClick={() => navigate(`/project/${projectId}/new-takeoff`)} className="bg-blue-600 hover:bg-blue-700">Create Takeoff</Button>}
              </Card>
            ) : (
              <div className="space-y-2">
                {takeoffs.map((takeoff) => (
                  <Card
                    key={takeoff.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/project/${projectId}/takeoff/${takeoff.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {takeoff.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Created{" "}
                          {new Date(takeoff.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          takeoff.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : takeoff.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {takeoff.status}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bids Tab */}
          <TabsContent value="bids" className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Bid Reports</h2>

            {bidReportsLoading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </Card>
            ) : bidReports.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  No bid reports yet. Create a takeoff first.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {bidReports.map((bid) => (
                  <Card
                    key={bid.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() =>
                      navigate(`/project/${projectId}/bid/${bid.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {bid.reportName}
                        </p>
                        <p className="text-sm text-slate-600">
                          ${bid.totalCost} • {bid.lineItemCount} items
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(bid.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-900">Activity Log</h2><p className="mt-1 text-sm text-slate-500">Track uploads, AI runs, edits, bids, and exports.</p></div>
              <label className="text-sm font-medium text-slate-600">Event type<select aria-label="Filter activity by event type" value={auditEventType} onChange={(event) => setAuditEventType(event.target.value)} className="ml-2 h-9 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">All activity</option><option value="file_upload">Uploads</option><option value="ai_analysis">AI analysis</option><option value="item_edit">Edits</option><option value="bid_created">Bid reports</option><option value="export">Exports</option></select></label>
            </div>

            {auditLoading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </Card>
            ) : auditEntries.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No activity yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {auditEntries.map((entry) => (
                  <Card key={entry.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
                        {getEventIcon(entry.eventType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {entry.description}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                        {formatEventDetails(entry.metadata) && (
                          <details className="mt-2 text-xs text-slate-500">
                            <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">Event details</summary>
                            <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{formatEventDetails(entry.metadata)}</pre>
                          </details>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {entry.eventType.replace("_", " ")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {auditEntries.length > 0 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-slate-500">Page {auditPage}</p>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={auditOffset === 0} onClick={() => setAuditOffset((current) => Math.max(0, current - 20))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><Button variant="outline" size="sm" disabled={!auditHistory?.hasMore} onClick={() => setAuditOffset((current) => current + 20)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit project</DialogTitle><DialogDescription>Update the project name, context, and bid workflow status.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <label className="block text-sm font-medium text-slate-700">Project name<input value={draftName} onChange={(event) => setDraftName(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="block text-sm font-medium text-slate-700">Description<textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-200 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
              <label className="block text-sm font-medium text-slate-700">Status<select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="draft">Draft</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={!draftName.trim() || updateProjectMutation.isPending} onClick={() => updateProjectMutation.mutate({ projectId, name: draftName.trim(), description: draftDescription.trim(), status: draftStatus as "draft" | "in_progress" | "completed" | "archived" })}>{updateProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save changes</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This permanently removes the project and its estimating records. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteProjectMutation.mutate({ projectId })}>Delete project</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={Boolean(pendingFileDelete)} onOpenChange={(open) => !open && setPendingFileDelete(null)}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove plan file?</AlertDialogTitle><AlertDialogDescription>{pendingFileDelete ? `Remove ${pendingFileDelete.name} from this project?` : ""} This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => pendingFileDelete && deleteFileMutation.mutate({ projectId, fileId: pendingFileDelete.id })}>Remove file</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
