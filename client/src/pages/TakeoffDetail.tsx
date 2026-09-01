import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { buildTakeoffCsv, takeoffCsvFileName } from "@/lib/takeoffExport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  BarChart3,
  Download,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface TakeoffDetailProps {
  params: {
    projectId: string;
    takeoffId: string;
  };
}

export default function TakeoffDetail({ params }: TakeoffDetailProps) {
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [, navigate] = useLocation();
  const projectId = parseInt(params.projectId);
  const takeoffId = parseInt(params.takeoffId);

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    material: "",
    description: "",
    quantity: "",
    unit: "",
    unitPrice: "",
  });

  // Fetch takeoff
  const { data: takeoff, isLoading: takeoffLoading } =
    trpc.takeoffs.getById.useQuery({ takeoffId });

  // Fetch line items
  const { data: lineItems = [], refetch: refetchLineItems } =
    trpc.lineItems.list.useQuery({ takeoffId }, { enabled: !!takeoff });
  const { data: featureSettings = [] } = trpc.features.list.useQuery(undefined, { enabled: isAuthenticated });
  const featureEnabled = (key: string) => featureSettings.find((setting) => setting.key === key)?.enabled ?? true;
  const isViewer = user?.role === "viewer";
  const canExport = !isViewer && featureEnabled("exports");
  const canGenerateBid = !isViewer && featureEnabled("bid_reports");

  // Update line item mutation
  const updateItemMutation = trpc.lineItems.update.useMutation({
    onSuccess: () => {
      toast.success("Line item updated");
      setEditingItemId(null);
      refetchLineItems();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update line item");
    },
  });

  // Delete line item mutation
  const deleteItemMutation = trpc.lineItems.delete.useMutation({
    onSuccess: () => {
      toast.success("Line item deleted");
      refetchLineItems();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete line item");
    },
  });

  // Create line item mutation
  const createItemMutation = trpc.lineItems.create.useMutation({
    onSuccess: () => {
      toast.success("Line item added");
      setIsAddOpen(false);
      setNewItem({
        material: "",
        description: "",
        quantity: "",
        unit: "",
        unitPrice: "",
      });
      refetchLineItems();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add line item");
    },
  });

  const recordExportMutation = trpc.audit.recordExport.useMutation();

  if (authLoading || takeoffLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !takeoff) {
    return null;
  }

  const handleEditStart = (item: any) => {
    if (isViewer) {
      toast.error("Your viewer role is read-only.");
      return;
    }
    setEditingItemId(item.id);
    setEditValues({
      material: item.material,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      notes: item.notes,
    });
  };

  const handleEditSave = (itemId: number) => {
    updateItemMutation.mutate({
      itemId,
      ...editValues,
      quantity: editValues.quantity ? parseFloat(editValues.quantity) : undefined,
      unitPrice: editValues.unitPrice
        ? parseFloat(editValues.unitPrice)
        : undefined,
    });
  };

  const handleAddItem = () => {
    if (isViewer) {
      toast.error("Your viewer role is read-only.");
      return;
    }
    if (!newItem.material.trim()) {
      toast.error("Material is required");
      return;
    }

    createItemMutation.mutate({
      takeoffId,
      material: newItem.material,
      description: newItem.description || undefined,
      quantity: parseFloat(newItem.quantity) || 0,
      unit: newItem.unit || "each",
      unitPrice: newItem.unitPrice ? parseFloat(newItem.unitPrice) : undefined,
    });
  };

  const totalCost = lineItems.reduce((sum, item) => {
    const price = item.totalPrice ? parseFloat(item.totalPrice.toString()) : 0;
    return sum + price;
  }, 0);
  const editedItemCount = lineItems.filter((item) => item.isEdited).length;

  const handleExportCsv = () => {
    if (!canExport) {
      toast.error(isViewer ? "Your viewer role is read-only." : "Exports are currently disabled by an administrator.");
      return;
    }
    const csv = buildTakeoffCsv(lineItems);
    const downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = takeoffCsvFileName(takeoff.name);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
    recordExportMutation.mutate({ projectId, takeoffId, format: "csv" });
    toast.success("Takeoff CSV exported");
  };

  const handlePrint = () => {
    if (!canExport) {
      toast.error(isViewer ? "Your viewer role is read-only." : "Exports are currently disabled by an administrator.");
      return;
    }
    recordExportMutation.mutate({ projectId, takeoffId, format: "print" });
    window.print();
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
                {takeoff.name}
              </h1>
              <p className="text-slate-600">
                {lineItems.length} items • Total: ${totalCost.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                AI-generated first pass{editedItemCount > 0 ? ` • ${editedItemCount} estimator-reviewed` : " • Ready for estimator review"}
              </p>
              {takeoff.reviewStatus === "approved" && <p className="mt-1 text-xs font-semibold text-emerald-700">Approved from the completion alert</p>}
              {takeoff.reviewStatus === "rejected" && <p className="mt-1 text-xs font-semibold text-rose-700">Rejected from the completion alert — revise before pricing</p>}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleExportCsv} disabled={lineItems.length === 0 || !canExport} title={!canExport ? "Exports are unavailable for your current access level or configuration." : undefined}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={lineItems.length === 0 || !canExport} title={!canExport ? "Exports are unavailable for your current access level or configuration." : undefined}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={isViewer} title={isViewer ? "Viewer accounts can review quantities but cannot edit them." : undefined}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isViewer ? "Read only" : "Add Item"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Line Item</DialogTitle>
                  <DialogDescription>
                    Manually add a line item to this takeoff
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="material">Material *</Label>
                    <Input
                      id="material"
                      placeholder="e.g., Concrete"
                      value={newItem.material}
                      onChange={(e) =>
                        setNewItem({ ...newItem, material: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional details"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                      className="mt-1 resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="0"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({ ...newItem, quantity: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unit">Unit *</Label>
                      <Input
                        id="unit"
                        placeholder="e.g., cubic yards"
                        value={newItem.unit}
                        onChange={(e) =>
                          setNewItem({ ...newItem, unit: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="unitPrice">Unit Price</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      placeholder="0.00"
                      value={newItem.unitPrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, unitPrice: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddItem}
                      disabled={createItemMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createItemMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={() =>
                navigate(
                  `/project/${projectId}/bid/new?takeoffId=${takeoffId}`
                )
              }
              className="bg-green-600 hover:bg-green-700"
              disabled={!canGenerateBid}
              title={!canGenerateBid ? "Bid reports are unavailable for your current access level or configuration." : undefined}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Bid
            </Button>
          </div>
        </div>

        {/* Line Items Table */}
        <Card className="overflow-hidden">
          {lineItems.length === 0 ? (
            <div className="p-12 text-center border-b">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">No line items yet</p>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" disabled={isViewer}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isViewer ? "Read only" : "Add Item"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Line Item</DialogTitle>
                    <DialogDescription>
                      Manually add a line item to this takeoff
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="material-empty">Material *</Label>
                      <Input
                        id="material-empty"
                        placeholder="e.g., Concrete"
                        value={newItem.material}
                        onChange={(e) =>
                          setNewItem({ ...newItem, material: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description-empty">Description</Label>
                      <Textarea
                        id="description-empty"
                        placeholder="Additional details"
                        value={newItem.description}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            description: e.target.value,
                          })
                        }
                        className="mt-1 resize-none"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity-empty">Quantity *</Label>
                        <Input
                          id="quantity-empty"
                          type="number"
                          placeholder="0"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              quantity: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="unit-empty">Unit *</Label>
                        <Input
                          id="unit-empty"
                          placeholder="e.g., cubic yards"
                          value={newItem.unit}
                          onChange={(e) =>
                            setNewItem({ ...newItem, unit: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="unitPrice-empty">Unit Price</Label>
                      <Input
                        id="unitPrice-empty"
                        type="number"
                        placeholder="0.00"
                        value={newItem.unitPrice}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            unitPrice: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddItem}
                        disabled={createItemMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {createItemMutation.isPending ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
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
                    <TableHead className="font-semibold">Review notes</TableHead>
                    <TableHead className="text-right font-semibold">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      Total
                    </TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={
                        editingItemId === item.id ? "bg-blue-50" : undefined
                      }
                    >
                      <TableCell>
                        {editingItemId === item.id ? (
                          <Input
                            value={editValues.material}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                material: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <div className="flex min-w-36 items-center gap-2">
                            <span
                              className={isViewer ? undefined : "cursor-pointer hover:text-blue-600"}
                              onClick={() => !isViewer && handleEditStart(item)}
                            >
                              {item.material}
                            </span>
                            <Badge variant={item.isEdited ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                              {item.isEdited ? "Reviewed" : "AI"}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItemId === item.id ? (
                          <Input
                            value={editValues.description || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                description: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-slate-600 text-sm">
                            {item.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingItemId === item.id ? (
                          <Input
                            type="number"
                            value={editValues.quantity}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                quantity: e.target.value,
                              })
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          <span
                            className={isViewer ? undefined : "cursor-pointer hover:text-blue-600"}
                            onClick={() => !isViewer && handleEditStart(item)}
                          >
                            {item.quantity}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingItemId === item.id ? (
                          <Input
                            value={editValues.unit}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                unit: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="text-slate-600 text-sm">
                            {item.unit}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-44 max-w-64">
                        {editingItemId === item.id ? (
                          <Input
                            value={editValues.notes || ""}
                            onChange={(e) =>
                              setEditValues({ ...editValues, notes: e.target.value })
                            }
                            className="h-8"
                            placeholder="Source or confidence note"
                          />
                        ) : (
                          <span className="text-sm text-slate-500">{item.notes || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingItemId === item.id ? (
                          <Input
                            type="number"
                            value={editValues.unitPrice || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                unitPrice: e.target.value,
                              })
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          <span className="text-slate-600 text-sm">
                            ${item.unitPrice || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.totalPrice ? parseFloat(item.totalPrice.toString()).toFixed(2) : "0.00"}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingItemId === item.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingItemId(null)}
                              className="h-7"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleEditSave(item.id)}
                              disabled={updateItemMutation.isPending}
                              className="h-7 bg-blue-600 hover:bg-blue-700"
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              deleteItemMutation.mutate({ itemId: item.id })
                            }
                            disabled={deleteItemMutation.isPending || isViewer}
                            title={isViewer ? "Viewer accounts cannot delete line items." : undefined}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer with totals */}
          <div className="border-t bg-slate-50 p-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium">${totalCost.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-base font-semibold">
                  <span>Total:</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
