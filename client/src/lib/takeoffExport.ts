export type TakeoffExportLine = {
  material: string;
  description?: string | null;
  quantity: string | number;
  unit: string;
  unitPrice?: string | number | null;
  totalPrice?: string | number | null;
  notes?: string | null;
};

const escapeCsvValue = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function buildTakeoffCsv(lineItems: TakeoffExportLine[]) {
  const rows = [
    ["Material", "Description", "Quantity", "Unit", "Unit Price", "Total", "Notes"],
    ...lineItems.map((item) => [
      item.material,
      item.description,
      item.quantity,
      item.unit,
      item.unitPrice ?? "",
      item.totalPrice ?? "",
      item.notes ?? "",
    ]),
  ];
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function takeoffCsvFileName(takeoffName: string) {
  const normalized = takeoffName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `${normalized || "takeoff"}-takeoff.csv`;
}
