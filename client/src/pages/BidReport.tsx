import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface BidReportProps {
  params: {
    projectId: string;
    reportId: string;
  };
}

export default function BidReport({ params }: BidReportProps) {
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [, navigate] = useLocation();
  const projectId = parseInt(params.projectId);
  const reportId = parseInt(params.reportId);

  // Fetch bid report
  const { data: report, isLoading: reportLoading } =
    trpc.bidReports.getById.useQuery({ reportId });

  // Fetch takeoff line items
  const { data: lineItems = [], isLoading: itemsLoading } =
    trpc.lineItems.list.useQuery(
      { takeoffId: report?.takeoffId || 0 },
      { enabled: !!report }
    );
  const { data: featureSettings = [] } = trpc.features.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const recordExportMutation = trpc.audit.recordExport.useMutation({
    onError: (error) => toast.error(error.message),
  });

  if (authLoading || reportLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !report) {
    return null;
  }

  const features = Object.fromEntries(featureSettings.map((setting) => [setting.key, setting.enabled]));
  const canExport = user?.role !== "viewer" && features.exports !== false;

  const handleExportCSV = () => {
    if (!canExport) {
      toast.error("CSV export is unavailable for this role or workspace.");
      return;
    }
    try {
      // Create CSV content
      const headers = ["Material", "Description", "Quantity", "Unit", "Unit Price", "Total"];
      const rows = lineItems.map((item) => [
        item.material,
        item.description || "",
        item.quantity,
        item.unit,
        item.unitPrice || "",
        item.totalPrice || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && cell.includes(",")
                ? `"${cell}"`
                : cell
            )
            .join(",")
        ),
      ].join("\n");

      // Download
      const element = document.createElement("a");
      element.setAttribute(
        "href",
        "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent)
      );
      element.setAttribute("download", `${report.reportName}.csv`);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      recordExportMutation.mutate({ projectId, takeoffId: report.takeoffId, format: "csv" });
      toast.success("Report exported as CSV");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  const handlePrint = () => {
    if (!canExport) {
      toast.error("Printable export is unavailable for this role or workspace.");
      return;
    }
    window.print();
    recordExportMutation.mutate({ projectId, takeoffId: report.takeoffId, format: "print" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
                {report.reportName}
              </h1>
              <p className="text-slate-600">
                Created {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={!canExport} title={!canExport ? "Export is disabled for your role or workspace" : undefined}>
              <Download className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
            <Button onClick={handleExportCSV} disabled={!canExport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Report Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-sm text-slate-600 uppercase tracking-wide">
              Line Items
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              {report.lineItemCount}
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-slate-600 uppercase tracking-wide">
              Total Cost
            </p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${parseFloat(report.totalCost.toString()).toFixed(2)}
            </p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-slate-600 uppercase tracking-wide">
              Average Item Cost
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2">
              ${report.lineItemCount ? (parseFloat(report.totalCost.toString()) / report.lineItemCount).toFixed(2) : "0.00"}
            </p>
          </Card>
        </div>

        {/* Line Items Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="font-semibold">Material</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">
                    Quantity
                  </TableHead>
                  <TableHead className="font-semibold">Unit</TableHead>
                  <TableHead className="text-right font-semibold">
                    Unit Price
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </TableCell>
                  </TableRow>
                ) : lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">No line items</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {item.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice ? parseFloat(item.unitPrice.toString()).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.totalPrice ? parseFloat(item.totalPrice.toString()).toFixed(2) : "0.00"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer with totals */}
          <div className="border-t bg-slate-50 p-6">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">
                    ${parseFloat(report.totalCost.toString()).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax (0%):</span>
                  <span className="font-medium">$0.00</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">
                    ${parseFloat(report.totalCost.toString()).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Notes */}
        {report.notes && (
          <Card className="p-6 bg-slate-50 border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
            <p className="text-slate-700">{report.notes}</p>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/project/${projectId}`)}
          >
            Back to Project
          </Button>
          <Button onClick={handleExportCSV} disabled={!canExport} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
