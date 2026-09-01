export type OnboardingStepContent = {
  title: string;
  description: string;
};

export type OnboardingContent = {
  enabled: boolean;
  label: string;
  description: string;
  steps: OnboardingStepContent[];
};

export const DEFAULT_ONBOARDING_CONTENT: OnboardingContent = {
  enabled: true,
  label: "Estimator walkthrough",
  description: "A practical five-step path from drawings to a review-ready bid.",
  steps: [
    {
      title: "Create your first estimate",
      description: "Set up a project for the drawing set you want to price. You can also start in a guided training workspace.",
    },
    {
      title: "Add the plan set",
      description: "Upload PDF, PNG, or JPG plans to the project file library. Keep each drawing set scoped to its project.",
    },
    {
      title: "Generate a first-pass takeoff",
      description: "Select the plan files to analyze, then let AI extract initial quantities for estimator review.",
    },
    {
      title: "Review, price, and bid",
      description: "Confirm quantities, edit any exceptions, then use the bid view to apply unit costs and export your estimate.",
    },
  ],
};
