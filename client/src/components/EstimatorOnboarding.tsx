import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { OnboardingContent } from "@shared/onboarding";

const DISMISSED_KEY = "constra-estimator-onboarding-dismissed:v1";

type EstimatorOnboardingProps = {
  content: OnboardingContent;
  onCreateProject: () => void;
  onCreateSample: () => void;
  onOpenUpload: () => void;
};

const actionLabels = ["Create project", "Open plan upload", "Review project workflow", "Finish onboarding", "Finish onboarding", "Finish onboarding"];

export default function EstimatorOnboarding({ content, onCreateProject, onCreateSample, onOpenUpload }: EstimatorOnboardingProps) {
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const enabled = content.enabled;
  const steps = content.steps.map((step, index) => ({ ...step, primaryLabel: actionLabels[index] ?? "Finish onboarding" }));
  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const visible = enabled && !dismissed;

  useEffect(() => {
    if (!enabled) return;
    setDismissed(window.localStorage.getItem(DISMISSED_KEY) === "true");
  }, [enabled]);

  const completion = useMemo(() => `${stepIndex + 1} of ${steps.length}`, [stepIndex]);

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const restart = () => {
    window.localStorage.removeItem(DISMISSED_KEY);
    setStepIndex(0);
    setDismissed(false);
  };

  if (!enabled) return null;

  if (!visible) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={restart} className="text-slate-600 hover:text-slate-950">
          <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
          Restart estimator walkthrough
        </Button>
      </div>
    );
  }

  const handlePrimary = () => {
    if (stepIndex === 0) {
      onCreateProject();
      return;
    }
    if (stepIndex === 1) {
      onOpenUpload();
      return;
    }
    if (isLastStep) {
      dismiss();
      return;
    }
    setStepIndex((index) => index + 1);
  };

  return (
    <Card data-testid="estimator-onboarding" className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 shadow-sm">
      <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-blue-100/70 blur-2xl" aria-hidden="true" />
      <div className="relative grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          {isLastStep ? <CheckCircle2 className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
        </div>
        <div>
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <span>{content.label}</span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 tracking-normal">Step {completion}</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{step.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{step.description}</p>
          {stepIndex === 0 && <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{content.description}</p>}
          <div className="mt-4 flex gap-1.5" aria-label={`Walkthrough progress: ${completion}`}>
            {steps.map((item, index) => (
              <span key={item.title} className={`h-1.5 w-8 rounded-full ${index <= stepIndex ? "bg-blue-600" : "bg-blue-100"}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {stepIndex === 0 && (
            <Button variant="outline" onClick={onCreateSample} className="border-blue-200 bg-white text-blue-700 hover:bg-blue-50">
              Try a sample project
            </Button>
          )}
          {stepIndex > 0 && !isLastStep && (
            <Button variant="ghost" size="sm" onClick={() => setStepIndex((index) => index - 1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <Button onClick={handlePrimary} className="bg-blue-600 hover:bg-blue-700">
            {step.primaryLabel}
            {!isLastStep && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-950" onClick={dismiss} aria-label="Skip estimator walkthrough">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
