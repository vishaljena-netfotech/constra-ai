import { useRef, useState } from "react";
import { FileText, Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

type ProjectOption = { id: number; name: string };
type UploadStatus = "uploading" | "success" | "error";
type UploadEntry = {
  id: string;
  name: string;
  size: number;
  status: UploadStatus;
  projectName: string;
  error?: string;
};

interface PlanUploadDropzoneProps {
  projects: ProjectOption[];
  projectId?: number;
  title?: string;
  compact?: boolean;
  onUploadComplete?: () => void;
}

const supportedTypes = ["application/pdf", "image/png", "image/jpeg"];
const maxFileSize = 10 * 1024 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export default function PlanUploadDropzone({
  projects,
  projectId,
  title = "Upload construction plans",
  compact = false,
  onUploadComplete,
}: PlanUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(projectId);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const activeProjectId = projectId ?? selectedProjectId ?? projects[0]?.id;
  const activeProject = projects.find((project) => project.id === activeProjectId);

  const uploadMutation = trpc.files.upload.useMutation();

  const setUploadStatus = (id: string, patch: Partial<UploadEntry>) => {
    setUploads((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  };

  const uploadFiles = async (files: FileList | File[]) => {
    if (!activeProjectId || !activeProject) {
      toast.error("Create or select a project before uploading plans.");
      return;
    }

    for (const file of Array.from(files)) {
      if (!supportedTypes.includes(file.type)) {
        toast.error(`${file.name} is not supported. Upload a PDF, PNG, or JPG.`);
        continue;
      }
      if (file.size > maxFileSize) {
        toast.error(`${file.name} exceeds the 10 MB upload limit.`);
        continue;
      }

      const id = `${file.name}-${file.lastModified}-${crypto.randomUUID()}`;
      setUploads((current) => [
        { id, name: file.name, size: file.size, status: "uploading", projectName: activeProject.name },
        ...current,
      ]);

      try {
        const fileData = await readAsDataUrl(file);
        await uploadMutation.mutateAsync({
          projectId: activeProjectId,
          fileName: file.name,
          fileType: file.type as "application/pdf" | "image/png" | "image/jpeg",
          fileSize: file.size,
          fileData,
        });
        setUploadStatus(id, { status: "success" });
        toast.success(`${file.name} is ready for takeoff analysis.`);
        onUploadComplete?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed.";
        setUploadStatus(id, { status: "error", error: message });
        toast.error(`Could not upload ${file.name}.`);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    void uploadFiles(event.dataTransfer.files);
  };

  const padding = compact ? "p-5" : "p-8";

  return (
    <div className="space-y-3">
      <Card
        className={`${padding} border-2 border-dashed transition-colors ${dragActive ? "border-blue-500 bg-blue-50/70" : "border-slate-200 hover:border-blue-300"}`}
        onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragActive(false); }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => {
            if (event.currentTarget.files) void uploadFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <div className={`flex ${compact ? "flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" : "flex-col items-center text-center"} gap-4`}>
          <div className={compact ? "flex items-start gap-3" : "max-w-md"}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Upload className="h-5 w-5" />
            </span>
            <div className={compact ? "text-left" : "mt-3"}>
              <h2 className="font-semibold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm text-slate-600">Drag in PDF, PNG, or JPG plans. Files are securely stored with the selected project.</p>
            </div>
          </div>
          <div className={`flex ${compact ? "flex-col gap-2 sm:flex-row sm:items-center" : "mt-1 flex-col items-center gap-2 sm:flex-row"}`}>
            {!projectId && (
              <label className="sr-only" htmlFor="upload-project">Project for uploaded plans</label>
            )}
            {!projectId && (
              <select
                id="upload-project"
                aria-label="Project for uploaded plans"
                value={activeProjectId ? String(activeProjectId) : ""}
                onChange={(event) => setSelectedProjectId(Number(event.target.value))}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={projects.length === 0 || uploadMutation.isPending}
              >
                {projects.length === 0 ? <option value="">Create a project first</option> : projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            )}
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={!activeProjectId || uploadMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Select plans
            </Button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">Maximum 10 MB per file. Uploads are limited to the project shown above.</p>
      </Card>

      {uploads.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {uploads.slice(0, 4).map((upload) => (
            <div key={upload.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm">
              {upload.status === "uploading" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" /> : upload.status === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />}
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-slate-800">{upload.name}</p><p className="text-xs text-slate-500">{upload.projectName} · {(upload.size / 1024 / 1024).toFixed(1)} MB</p></div>
              <span className={upload.status === "success" ? "text-emerald-700" : upload.status === "error" ? "text-red-700" : "text-blue-700"}>{upload.status === "success" ? "Ready" : upload.status === "error" ? "Retry" : "Uploading"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
