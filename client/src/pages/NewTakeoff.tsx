import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface NewTakeoffProps {
  params: {
    projectId: string;
  };
}

export default function NewTakeoff({ params }: NewTakeoffProps) {
  const { isAuthenticated, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [, navigate] = useLocation();
  const projectId = parseInt(params.projectId);
  const utils = trpc.useUtils();

  const [takeoffName, setTakeoffName] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  // Fetch project
  const { data: project } = trpc.projects.getById.useQuery({ projectId });

  // Fetch files
  const { data: files = [], isLoading: filesLoading } = trpc.files.list.useQuery(
    { projectId },
    { enabled: !!project }
  );

  // Analyze files mutation
  const analyzeFilesMutation = trpc.takeoffs.analyzeFiles.useMutation({
    onSuccess: (data) => {
      toast.success(`Takeoff created with ${data.lineItemCount} line items`);
      void utils.notifications.list.invalidate();
      navigate(`/project/${projectId}/takeoff/${data.takeoffId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to analyze files");
    },
  });

  if (authLoading) {
    return <DashboardLayout>Loading...</DashboardLayout>;
  }

  if (!isAuthenticated || !project) {
    return null;
  }

  const handleAnalyze = async () => {
    if (!takeoffName.trim()) {
      toast.error("Takeoff name is required");
      return;
    }

    if (selectedFileIds.length === 0) {
      toast.error("Select at least one file");
      return;
    }

    analyzeFilesMutation.mutate({
      projectId,
      fileIds: selectedFileIds,
      takeoffName,
    });
  };

  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/project/${projectId}`)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Create Takeoff
            </h1>
            <p className="text-slate-600">{project.name}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Takeoff Name */}
            <Card className="p-6">
              <Label htmlFor="takeoff-name" className="text-base font-semibold">
                Takeoff Name
              </Label>
              <Input
                id="takeoff-name"
                placeholder="e.g., Structural Steel Takeoff"
                value={takeoffName}
                onChange={(e) => setTakeoffName(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-2">
                Give this takeoff a descriptive name for easy reference
              </p>
            </Card>

            {/* File Selection */}
            <Card className="p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Select Plans to Analyze
              </h2>

              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 mb-4">No files uploaded yet</p>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/project/${projectId}/upload`)}
                  >
                    Upload Files
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <label
                      key={file.id}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={selectedFileIds.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(file.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      {selectedFileIds.includes(file.id) && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 mt-4">
                Select one or more files. The AI will analyze all selected plans
                and extract quantities.
              </p>
            </Card>

            {/* Info Box */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  i
                </div>
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">AI Analysis Process</p>
                  <p>
                    Our AI will analyze your plans and extract quantities,
                    materials, and dimensions. You'll be able to review and edit
                    all results before finalizing.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar Summary */}
          <div>
            <Card className="p-6 sticky top-20">
              <h3 className="font-semibold text-slate-900 mb-4">Summary</h3>

              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">
                    Takeoff Name
                  </p>
                  <p className="font-medium text-slate-900 mt-1">
                    {takeoffName || "Not set"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 uppercase tracking-wide">
                    Files Selected
                  </p>
                  <p className="font-medium text-slate-900 mt-1">
                    {selectedFileIds.length} of {files.length}
                  </p>
                </div>

                {selectedFileIds.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide">
                      Selected Files
                    </p>
                    <ul className="mt-2 space-y-1">
                      {selectedFileIds.map((id) => {
                        const file = files.find((f) => f.id === id);
                        return (
                          <li
                            key={id}
                            className="text-sm text-slate-700 truncate"
                          >
                            • {file?.fileName}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={
                  analyzeFilesMutation.isPending ||
                  !takeoffName.trim() ||
                  selectedFileIds.length === 0
                }
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {analyzeFilesMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Start AI Analysis"
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate(`/project/${projectId}`)}
                className="w-full mt-2"
              >
                Cancel
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
