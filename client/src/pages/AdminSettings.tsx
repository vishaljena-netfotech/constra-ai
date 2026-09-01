import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { DEFAULT_ONBOARDING_CONTENT, type OnboardingContent } from "@shared/onboarding";
import { type TradePackageDefinition } from "@shared/tradeLibraries";
import {
  Bot,
  Download,
  FileUp,
  LibraryBig,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

const FEATURE_DETAILS = {
  plan_uploads: {
    title: "Plan uploads",
    description: "Allow estimators to upload PDF and image drawings into project file libraries.",
    icon: FileUp,
  },
  ai_takeoffs: {
    title: "AI takeoff analysis",
    description: "Allow selected plan sets to be submitted for AI quantity extraction.",
    icon: Bot,
  },
  bid_reports: {
    title: "Bid reports",
    description: "Allow estimators to generate first-pass cost summaries from reviewed quantities.",
    icon: ReceiptText,
  },
  exports: {
    title: "CSV and print exports",
    description: "Allow takeoff reviewers to download or print a structured quantity schedule.",
    icon: Download,
  },
} as const;

const roleStyles = {
  admin: "bg-primary/10 text-primary border-primary/20",
  estimator: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  user: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  viewer: "bg-slate-500/10 text-slate-700 border-slate-500/20",
} as const;

const roleLabels = { admin: "Administrator", estimator: "Estimator", user: "Estimator", viewer: "Viewer" } as const;
type TradeLibraryDraft = {
  name: string;
  projectType: string;
  description: string;
  packages: TradePackageDefinition[];
  isActive: boolean;
};

const EMPTY_TRADE_LIBRARY: TradeLibraryDraft = {
  name: "",
  projectType: "",
  description: "",
  isActive: true,
  packages: [{ trade: "General conditions", description: "Define the package scope", unit: "scope", guidance: "Training package only. Verify against drawings before bidding." }],
};

export default function AdminSettings() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const settingsQuery = trpc.configuration.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const usersQuery = trpc.configuration.users.useQuery(undefined, { enabled: user?.role === "admin" });
  const onboardingQuery = trpc.onboarding.get.useQuery(undefined, { enabled: user?.role === "admin" });
  const tradeLibrariesQuery = trpc.tradePackageLibraries.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingContent>(DEFAULT_ONBOARDING_CONTENT);
  const onboardingDraftRef = useRef<OnboardingContent>(DEFAULT_ONBOARDING_CONTENT);
  const [selectedTradeLibraryId, setSelectedTradeLibraryId] = useState<number | null>(null);
  const [tradeLibraryDraft, setTradeLibraryDraft] = useState<TradeLibraryDraft>(EMPTY_TRADE_LIBRARY);

  const replaceOnboardingDraft = (next: OnboardingContent) => {
    onboardingDraftRef.current = next;
    setOnboardingDraft(next);
  };

  const updateOnboardingDraft = (updater: (current: OnboardingContent) => OnboardingContent) => {
    replaceOnboardingDraft(updater(onboardingDraftRef.current));
  };

  useEffect(() => {
    if (!onboardingQuery.data) return;
    replaceOnboardingDraft({
      enabled: onboardingQuery.data.enabled,
      label: onboardingQuery.data.label,
      description: onboardingQuery.data.description,
      steps: onboardingQuery.data.steps,
    });
  }, [onboardingQuery.data]);

  useEffect(() => {
    const libraries = tradeLibrariesQuery.data;
    if (!libraries?.length) return;
    const selected = libraries.find((library) => library.id === selectedTradeLibraryId) ?? libraries[0];
    setSelectedTradeLibraryId(selected.id);
    setTradeLibraryDraft({
      name: selected.name,
      projectType: selected.projectType,
      description: selected.description,
      packages: selected.packages,
      isActive: selected.isActive,
    });
  }, [tradeLibrariesQuery.data]);

  const updateFeature = trpc.configuration.updateFeature.useMutation({
    onSuccess: (_, variables) => {
      toast.success(`${FEATURE_DETAILS[variables.key].title} ${variables.enabled ? "enabled" : "disabled"}`);
      void utils.configuration.list.invalidate();
      void utils.features.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateUserRole = trpc.configuration.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Account role updated");
      void utils.configuration.users.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateOnboarding = trpc.onboarding.update.useMutation({
    onSuccess: () => {
      toast.success("Estimator walkthrough updated");
      void utils.onboarding.get.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const saveTradeLibrary = trpc.tradePackageLibraries.update.useMutation({
    onSuccess: () => {
      toast.success("Trade-package library updated");
      void utils.tradePackageLibraries.list.invalidate();
      void utils.tradePackageLibraries.listActive.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTradeLibrary = trpc.tradePackageLibraries.create.useMutation({
    onSuccess: (result) => {
      toast.success("Trade-package library created");
      setSelectedTradeLibraryId(result.id);
      void utils.tradePackageLibraries.list.invalidate();
      void utils.tradePackageLibraries.listActive.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateOnboardingStep = (index: number, field: "title" | "description", value: string) => {
    updateOnboardingDraft((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? { ...step, [field]: value } : step)),
    }));
  };

  const selectTradeLibrary = (libraryId: number) => {
    const library = tradeLibrariesQuery.data?.find((candidate) => candidate.id === libraryId);
    if (!library) return;
    setSelectedTradeLibraryId(library.id);
    setTradeLibraryDraft({ name: library.name, projectType: library.projectType, description: library.description, packages: library.packages, isActive: library.isActive });
  };

  const updateTradePackage = (index: number, field: keyof TradePackageDefinition, value: string) => {
    setTradeLibraryDraft((current) => ({
      ...current,
      packages: current.packages.map((tradePackage, packageIndex) => packageIndex === index ? { ...tradePackage, [field]: value } : tradePackage),
    }));
  };

  const saveCurrentTradeLibrary = () => {
    if (selectedTradeLibraryId) saveTradeLibrary.mutate({ libraryId: selectedTradeLibraryId, library: tradeLibraryDraft });
    else createTradeLibrary.mutate(tradeLibraryDraft);
  };

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [loading, setLocation, user]);

  if (loading || !user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-5xl space-y-5 pt-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-44 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-8 pb-12">
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-7 text-white shadow-xl sm:px-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                <ShieldCheck className="h-4 w-4" /> Workspace controls
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Configure which estimating capabilities are available and maintain clear access levels for every account.
              </p>
            </div>
            <Badge className="w-fit border-blue-300/30 bg-blue-400/15 px-3 py-1 text-blue-100 hover:bg-blue-400/15">Administrator access</Badge>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Settings2 className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-lg">Product capabilities</CardTitle>
                  <CardDescription>Toggle features on or off without changing the estimating workflow code.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {settingsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-32" key={index} />)
                : settingsQuery.data?.map((setting) => {
                    const detail = FEATURE_DETAILS[setting.key as keyof typeof FEATURE_DETAILS];
                    const Icon = detail.icon;
                    return (
                      <div key={setting.key} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="rounded-lg bg-muted p-2 text-foreground"><Icon className="h-4 w-4" /></div>
                          <Switch
                            checked={setting.enabled}
                            disabled={updateFeature.isPending}
                            aria-label={`Toggle ${detail.title}`}
                            onCheckedChange={(enabled) => updateFeature.mutate({ key: setting.key as keyof typeof FEATURE_DETAILS, enabled })}
                          />
                        </div>
                        <h2 className="mt-4 font-semibold">{detail.title}</h2>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">{detail.description}</p>
                        <p className="mt-3 text-xs font-medium text-muted-foreground">{setting.enabled ? "Available to estimators" : "Currently restricted"}</p>
                      </div>
                    );
                  })}
            </CardContent>
          </Card>

          <Card className="bg-muted/35">
            <CardHeader>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background shadow-sm"><UsersRound className="h-5 w-5 text-primary" /></div>
              <CardTitle className="pt-2 text-lg">Role guide</CardTitle>
              <CardDescription>Use the least privilege needed for each account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div><p className="font-semibold">Administrator</p><p className="mt-1 text-muted-foreground">Manages people, settings, and all estimating work.</p></div>
              <div><p className="font-semibold">Estimator</p><p className="mt-1 text-muted-foreground">Creates projects, reviews takeoffs, and exports reports.</p></div>
              <div><p className="font-semibold">Viewer</p><p className="mt-1 text-muted-foreground">Reviews projects and quantities without changing records.</p></div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader className="border-b pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-lg">Estimator walkthrough content</CardTitle>
                  <CardDescription className="mt-1">Tailor the guidance that first-time estimators see without changing workflow actions or access controls.</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{onboardingDraft.enabled ? "Visible to estimators" : "Hidden"}</span>
                <Switch
                  checked={onboardingDraft.enabled}
                  disabled={onboardingQuery.isLoading || updateOnboarding.isPending}
                  aria-label="Toggle estimator walkthrough"
                  onCheckedChange={(enabled) => updateOnboardingDraft((current) => ({ ...current, enabled }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium" htmlFor="onboarding-label">Walkthrough label</label>
                <Input id="onboarding-label" className="mt-1.5" maxLength={80} disabled={onboardingQuery.isLoading || updateOnboarding.isPending} value={onboardingDraft.label} onChange={(event) => updateOnboardingDraft((current) => ({ ...current, label: event.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="onboarding-description">Supporting guidance</label>
                <Input id="onboarding-description" className="mt-1.5" maxLength={500} disabled={onboardingQuery.isLoading || updateOnboarding.isPending} value={onboardingDraft.description} onChange={(event) => updateOnboardingDraft((current) => ({ ...current, description: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {onboardingDraft.steps.map((step, index) => (
                <div key={`${index}-${step.title}`} className="rounded-xl border bg-muted/20 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Step {index + 1}</p>
                  <label className="text-sm font-medium" htmlFor={`onboarding-step-title-${index}`}>Title</label>
                  <Input id={`onboarding-step-title-${index}`} className="mt-1.5" maxLength={100} disabled={onboardingQuery.isLoading || updateOnboarding.isPending} value={step.title} onChange={(event) => updateOnboardingStep(index, "title", event.target.value)} />
                  <label className="mt-3 block text-sm font-medium" htmlFor={`onboarding-step-description-${index}`}>Guidance</label>
                  <Textarea id={`onboarding-step-description-${index}`} className="mt-1.5 min-h-20 resize-y" maxLength={500} disabled={onboardingQuery.isLoading || updateOnboarding.isPending} value={step.description} onChange={(event) => updateOnboardingStep(index, "description", event.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t pt-4">
              <Button
                onClick={() => updateOnboarding.mutate(onboardingDraftRef.current)}
                disabled={onboardingQuery.isLoading || updateOnboarding.isPending || onboardingDraft.steps.some((step) => !step.title.trim() || !step.description.trim()) || !onboardingDraft.label.trim() || !onboardingDraft.description.trim()}
              >
                {updateOnboarding.isPending ? "Saving walkthrough…" : "Save walkthrough"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><LibraryBig className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-lg">Project-type trade libraries</CardTitle>
                  <CardDescription className="mt-1">Configure the training trade packages estimators can apply when starting a sample project.</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedTradeLibraryId(null);
                  setTradeLibraryDraft({ ...EMPTY_TRADE_LIBRARY, packages: EMPTY_TRADE_LIBRARY.packages.map((tradePackage) => ({ ...tradePackage })) });
                }}
                disabled={tradeLibrariesQuery.isLoading || saveTradeLibrary.isPending || createTradeLibrary.isPending}
              >
                <Plus className="mr-2 h-4 w-4" /> New library
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {tradeLibrariesQuery.isLoading ? (
              <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-52 w-full" /></div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="text-sm font-medium" htmlFor="trade-library-select">Configured library</label>
                    <select id="trade-library-select" className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 text-sm" value={selectedTradeLibraryId ?? "new"} onChange={(event) => event.target.value === "new" ? undefined : selectTradeLibrary(Number(event.target.value))}>
                      {tradeLibrariesQuery.data?.map((library) => <option key={library.id} value={library.id}>{library.projectType} · {library.name}{library.isActive ? "" : " (inactive)"}</option>)}
                      {selectedTradeLibraryId === null && <option value="new">New library draft</option>}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pb-1"><Switch checked={tradeLibraryDraft.isActive} aria-label="Toggle trade library availability" onCheckedChange={(isActive) => setTradeLibraryDraft((current) => ({ ...current, isActive }))} /><span className="text-sm font-medium">{tradeLibraryDraft.isActive ? "Available to estimators" : "Inactive"}</span></div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className="text-sm font-medium" htmlFor="trade-library-name">Library name</label><Input id="trade-library-name" className="mt-1.5" maxLength={120} value={tradeLibraryDraft.name} onChange={(event) => setTradeLibraryDraft((current) => ({ ...current, name: event.target.value }))} /></div>
                  <div><label className="text-sm font-medium" htmlFor="trade-library-project-type">Project type</label><Input id="trade-library-project-type" className="mt-1.5" maxLength={80} placeholder="e.g., Ground-up multifamily" value={tradeLibraryDraft.projectType} onChange={(event) => setTradeLibraryDraft((current) => ({ ...current, projectType: event.target.value }))} /></div>
                </div>
                <div><label className="text-sm font-medium" htmlFor="trade-library-description">Training context</label><Textarea id="trade-library-description" className="mt-1.5 min-h-20 resize-y" maxLength={1000} value={tradeLibraryDraft.description} onChange={(event) => setTradeLibraryDraft((current) => ({ ...current, description: event.target.value }))} /></div>

                <div className="border-t pt-5">
                  <div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold">Trade packages</h3><p className="mt-1 text-sm text-muted-foreground">These training-only packages are copied into a new sample project and never overwrite it later.</p></div><Badge variant="secondary">{tradeLibraryDraft.packages.length}/20 packages</Badge></div>
                  <div className="mt-4 space-y-3">
                    {tradeLibraryDraft.packages.map((tradePackage, index) => (
                      <div key={`${index}-${tradePackage.trade}`} className="rounded-xl border bg-muted/20 p-4">
                        <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Package {index + 1}</p><Button variant="ghost" size="icon" aria-label={`Remove package ${index + 1}`} disabled={tradeLibraryDraft.packages.length === 1} onClick={() => setTradeLibraryDraft((current) => ({ ...current, packages: current.packages.filter((_, packageIndex) => packageIndex !== index) }))}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></div>
                        <div className="grid gap-3 md:grid-cols-2"><div><label className="text-sm font-medium" htmlFor={`trade-package-name-${index}`}>Trade</label><Input id={`trade-package-name-${index}`} className="mt-1" maxLength={120} value={tradePackage.trade} onChange={(event) => updateTradePackage(index, "trade", event.target.value)} /></div><div><label className="text-sm font-medium" htmlFor={`trade-package-unit-${index}`}>Unit</label><Input id={`trade-package-unit-${index}`} className="mt-1" maxLength={50} value={tradePackage.unit} onChange={(event) => updateTradePackage(index, "unit", event.target.value)} /></div></div>
                        <div className="mt-3"><label className="text-sm font-medium" htmlFor={`trade-package-description-${index}`}>Scope description</label><Textarea id={`trade-package-description-${index}`} className="mt-1 min-h-16 resize-y" maxLength={500} value={tradePackage.description} onChange={(event) => updateTradePackage(index, "description", event.target.value)} /></div>
                        <div className="mt-3"><label className="text-sm font-medium" htmlFor={`trade-package-guidance-${index}`}>Training guidance</label><Textarea id={`trade-package-guidance-${index}`} className="mt-1 min-h-16 resize-y" maxLength={500} value={tradePackage.guidance} onChange={(event) => updateTradePackage(index, "guidance", event.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-4" disabled={tradeLibraryDraft.packages.length >= 20} onClick={() => setTradeLibraryDraft((current) => ({ ...current, packages: [...current.packages, { trade: "", description: "", unit: "scope", guidance: "Training package only. Verify against drawings before bidding." }] }))}><Plus className="mr-2 h-4 w-4" /> Add package</Button>
                </div>

                <div className="flex justify-end border-t pt-4"><Button onClick={saveCurrentTradeLibrary} disabled={saveTradeLibrary.isPending || createTradeLibrary.isPending || !tradeLibraryDraft.name.trim() || !tradeLibraryDraft.projectType.trim() || !tradeLibraryDraft.description.trim() || tradeLibraryDraft.packages.some((tradePackage) => !tradePackage.trade.trim() || !tradePackage.description.trim() || !tradePackage.unit.trim() || !tradePackage.guidance.trim())}>{saveTradeLibrary.isPending || createTradeLibrary.isPending ? "Saving library…" : selectedTradeLibraryId ? "Save library" : "Create library"}</Button></div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b pb-5">
            <div>
              <CardTitle className="text-lg">Workspace access</CardTitle>
              <CardDescription className="mt-1">Assign a role that matches each person’s responsibility in the bid workflow.</CardDescription>
            </div>
            <Badge variant="secondary">{usersQuery.data?.length ?? 0} accounts</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-sm">
                <thead className="bg-muted/45 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  <tr><th className="px-6 py-3">Member</th><th className="px-6 py-3">Last active</th><th className="px-6 py-3">Access role</th></tr>
                </thead>
                <tbody className="divide-y">
                  {usersQuery.isLoading
                    ? Array.from({ length: 3 }).map((_, index) => <tr key={index}><td className="px-6 py-4" colSpan={3}><Skeleton className="h-6 w-full" /></td></tr>)
                    : usersQuery.data?.map((member) => (
                        <tr key={member.id} className="transition-colors hover:bg-muted/30">
                          <td className="px-6 py-4"><p className="font-medium">{member.name || "Unnamed account"}{member.id === user.id && <span className="ml-2 text-xs font-normal text-muted-foreground">You</span>}</p><p className="mt-0.5 text-xs text-muted-foreground">{member.email || "No email address"}</p></td>
                          <td className="px-6 py-4 text-muted-foreground">{new Date(member.lastSignedIn).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <label className="sr-only" htmlFor={`role-${member.id}`}>Role for {member.name || member.email}</label>
                            <select
                              id={`role-${member.id}`}
                              className="h-9 rounded-md border bg-background px-2.5 text-sm font-medium outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                              value={member.role}
                              disabled={updateUserRole.isPending || member.id === user.id}
                              onChange={(event) => updateUserRole.mutate({ userId: member.id, role: event.target.value as "admin" | "estimator" | "viewer" | "user" })}
                            >
                              <option value="admin">Administrator</option>
                              <option value="estimator">Estimator</option>
                              <option value="viewer">Viewer</option>
                              {member.role === "user" && <option value="user">Estimator (legacy)</option>}
                            </select>
                            <Badge variant="outline" className={`ml-2 border ${roleStyles[member.role as keyof typeof roleStyles]}`}>{roleLabels[member.role as keyof typeof roleLabels]}</Badge>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
