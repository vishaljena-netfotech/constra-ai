export function isPdfPlan(fileType: string): boolean {
  return fileType.trim().toLowerCase() === "application/pdf";
}
