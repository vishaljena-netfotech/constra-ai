import { describe, expect, it } from "vitest";
import { isPdfPlan } from "./planAnalysisUtils";

describe("isPdfPlan", () => {
  it("recognizes uploaded PDF drawings regardless of casing or whitespace", () => {
    expect(isPdfPlan("application/pdf")).toBe(true);
    expect(isPdfPlan(" Application/PDF ")).toBe(true);
  });

  it("keeps raster plan drawings on the image-analysis path", () => {
    expect(isPdfPlan("image/png")).toBe(false);
    expect(isPdfPlan("image/jpeg")).toBe(false);
  });
});
