import { describe, expect, it } from "vitest";
import { buildTakeoffCsv, takeoffCsvFileName } from "./takeoffExport";

describe("takeoff CSV export", () => {
  it("keeps all review fields and escapes quoted plan notes", () => {
    const csv = buildTakeoffCsv([
      {
        material: "Rebar",
        description: "#5 reinforcing steel",
        quantity: "1200",
        unit: "LF",
        unitPrice: "1.75",
        totalPrice: "2100.00",
        notes: "AI matched \"A-401\" detail",
      },
    ]);

    expect(csv).toContain('"Material","Description","Quantity","Unit","Unit Price","Total","Notes"');
    expect(csv).toContain('"AI matched ""A-401"" detail"');
  });

  it("creates a stable, download-safe takeoff filename", () => {
    expect(takeoffCsvFileName("Level 01 / Concrete Takeoff")).toBe("level-01-concrete-takeoff-takeoff.csv");
  });
});
