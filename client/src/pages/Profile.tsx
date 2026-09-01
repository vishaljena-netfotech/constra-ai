import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, UserRound } from "lucide-react";

const roleCopy = {
  admin: "Full workspace administration, member-role management, and capability configuration.",
  estimator: "Create and edit projects, plans, takeoffs, bids, and exports within the workspace.",
  user: "Create and edit projects, plans, takeoffs, bids, and exports within the workspace.",
  viewer: "Review projects, drawings, takeoffs, and bid information in read-only mode.",
} as const;

const roleLabels = {
  admin: "Administrator",
  estimator: "Estimator",
  user: "Estimator",
  viewer: "Viewer",
} as const;

export default function Profile() {
  const { user } = useAuth();
  const role = (user?.role ?? "viewer") as keyof typeof roleLabels;
  const initials = user?.name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <DashboardLayout>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-2">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <UserRound className="h-4 w-4 text-primary" />
            Account
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Profile & access</h1>
          <p className="max-w-2xl text-muted-foreground">
            Review the identity and workspace permissions associated with your Constra AI account.
          </p>
        </header>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-14 w-14 border bg-primary/5">
              <AvatarFallback className="text-base font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-xl">{user?.name || "Constra AI user"}</CardTitle>
              <CardDescription className="mt-1 truncate">{user?.email || "No email available"}</CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0 capitalize">
              {roleLabels[role]}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-5 border-t pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sign-in method</p>
              <p className="mt-1.5 font-medium capitalize">{user?.loginMethod || "Workspace authentication"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace role</p>
              <div className="mt-1.5 flex items-center gap-2 font-medium">
                {role === "admin" && <ShieldCheck className="h-4 w-4 text-primary" />}
                {roleLabels[role]}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">What you can do</CardTitle>
            <CardDescription>
              Permissions are managed by workspace administrators and apply throughout project, takeoff, and report workflows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
              {roleCopy[role]}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
