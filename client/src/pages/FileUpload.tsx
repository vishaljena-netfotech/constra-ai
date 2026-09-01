import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import PlanUploadDropzone from "@/components/PlanUploadDropzone";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  params: { projectId: string };
}

export default function FileUpload({ params }: FileUploadProps) {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const projectId = Number(params.projectId);
  const { data: project, isLoading: projectLoading } = trpc.projects.getById.useQuery({ projectId });
  const filesQuery = trpc.files.list.useQuery({ projectId }, { enabled: Boolean(project) });

  if (authLoading || projectLoading) {
    return <DashboardLayout><div className="flex h-96 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div></DashboardLayout>;
  }
  if (!isAuthenticated || !project) return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to project" onClick={() => navigate(`/project/${projectId}`)}><ArrowLeft className="h-4 w-4" /></Button>
          <div><h1 className="text-2xl font-bold text-slate-950">Upload plans</h1><p className="mt-1 text-slate-600">{project.name}</p></div>
        </div>
        <PlanUploadDropzone projects={[{ id: project.id, name: project.name }]} projectId={project.id} title="Add drawings for AI takeoff" onUploadComplete={() => void filesQuery.refetch()} />
        {filesQuery.data && filesQuery.data.length > 0 && <Button variant="outline" onClick={() => navigate(`/project/${projectId}/new-takeoff`)}>Continue to AI takeoff</Button>}
      </div>
    </DashboardLayout>
  );
}
