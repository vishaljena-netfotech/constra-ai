import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, estimatorProcedure, publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createProject,
  getProjectsByUserId,
  getWorkspaceProjects,
  getRecentProjectSummaries,
  getWorkspaceRecentProjectSummaries,
  getProjectById,
  updateProject,
  deleteProject,
  createProjectFile,
  getProjectFilesByProjectId,
  getProjectFileById,
  deleteProjectFile,
  createTakeoff,
  getTakeoffsByProjectId,
  getTakeoffById,
  updateTakeoff,
  deleteTakeoff,
  createTakeoffLineItem,
  getTakeoffLineItemsByTakeoffId,
  getTakeoffLineItemById,
  updateTakeoffLineItem,
  deleteTakeoffLineItem,
  createBidReport,
  getBidReportsByProjectId,
  getBidReportById,
  deleteBidReport,
  logAuditEvent,
  getRecentDashboardActivity,
  getAuditLogByProjectId,
  getAuditLogPage,
  getFeatureSettings,
  isFeatureEnabled,
  upsertFeatureSetting,
  getOnboardingSettings,
  upsertOnboardingSettings,
  ensureDefaultTradePackageLibraries,
  getTradePackageLibraries,
  getTradePackageLibraryById,
  createTradePackageLibrary,
  updateTradePackageLibrary,
  createWorkspaceNotification,
  getWorkspaceNotificationsByUserId,
  getWorkspaceNotificationByIdForUser,
  markWorkspaceNotificationRead,
  resolveWorkspaceNotification,
  getUsersForAdministration,
  updateUserRole,
  type FeatureKey,
} from "./db";
import { storagePut, storageGet, storageGetSignedUrl } from "./storage";
import { invokeLLM, type Message } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { isPdfPlan } from "./planAnalysisUtils";

// ============================================================================
// HELPERS: Project authorization
// ============================================================================

async function verifyProjectOwnership(projectId: number, userId: number) {
  const project = await getProjectById(projectId);
  if (!project || project.userId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project",
    });
  }
  return project;
}

async function verifyProjectReadAccess(
  projectId: number,
  user: { id: number; role: "admin" | "user" | "estimator" | "viewer" },
) {
  const project = await getProjectById(projectId);
  const mayReadWorkspace = user.role === "admin" || user.role === "viewer";
  if (!project || (project.userId !== user.id && !mayReadWorkspace)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project",
    });
  }
  return project;
}

async function requireFeature(key: FeatureKey) {
  if (!(await isFeatureEnabled(key))) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This capability has been disabled by your administrator.",
    });
  }
}

function getInsertedId(result: unknown, entityName: string) {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = Number(
    header && typeof header === "object" ? (header as { insertId?: unknown }).insertId : undefined,
  );

  if (!Number.isSafeInteger(insertId) || insertId <= 0) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Could not create ${entityName}.`,
    });
  }

  return insertId;
}

// ============================================================================
// PROJECTS ROUTER
// ============================================================================

const projectsRouter = router({
  create: estimatorProcedure
    .input(
      z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createProject({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        status: "draft",
      });

      const projectId = getInsertedId(result, "project");

      // Log audit event
      await logAuditEvent({
        projectId: projectId,
        userId: ctx.user.id,
        eventType: "file_upload", // Using file_upload as a proxy for project creation
        entityType: "project",
        entityId: projectId,
        description: `Project created: ${input.name}`,
      });

      return { id: projectId };
    }),

  createSample: estimatorProcedure
    .input(z.object({ libraryId: z.number().int().positive().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
    await ensureDefaultTradePackageLibraries();
    const activeLibraries = await getTradePackageLibraries(true);
    const library = input?.libraryId
      ? activeLibraries.find((candidate) => candidate.id === input.libraryId)
      : activeLibraries.find((candidate) => candidate.projectType === "Commercial tenant improvement") ?? activeLibraries[0];
    if (!library) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active trade-package library is available for a training project." });
    }

    const name = `Sample plan · ${library.projectType}`;
    const description = `${library.description} Replace all training quantities with drawing-derived values before using the project for a bid.`;
    const result = await createProject({
      userId: ctx.user.id,
      name,
      description,
      tradePackageLibraryId: library.id,
      status: "draft",
    });
    const projectId = getInsertedId(result, "sample project");
    const takeoffResult = await createTakeoff({
      projectId,
      name: `Training ${library.projectType} trade-package takeoff`,
      description: "Illustrative trade packages only — verify every quantity from the project drawings.",
      sourceFileIds: [],
      status: "completed",
      aiAnalysisResult: { source: "trade_package_library", trainingOnly: true, libraryId: library.id, projectType: library.projectType, tradePackageCount: library.packages.length },
    });
    const takeoffId = getInsertedId(takeoffResult, "sample takeoff");

    for (const tradePackage of library.packages) {
      await createTakeoffLineItem({
        takeoffId,
        material: tradePackage.trade,
        description: tradePackage.description,
        quantity: "1.00",
        unit: tradePackage.unit,
        notes: tradePackage.guidance,
        isEdited: false,
      });
    }

    await logAuditEvent({
      projectId,
      userId: ctx.user.id,
      eventType: "file_upload",
      entityType: "project",
      entityId: projectId,
      description: `Sample-plan training project created with ${library.packages.length} trade packages`,
      metadata: { source: "trade_package_library", trainingOnly: true, takeoffId, libraryId: library.id, projectType: library.projectType, tradePackages: library.packages.map((tradePackage) => tradePackage.trade) },
    });

    return { id: projectId, name, takeoffId, tradePackageCount: library.packages.length, libraryId: library.id, projectType: library.projectType };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user.role === "admin" || ctx.user.role === "viewer"
      ? await getWorkspaceProjects()
      : await getProjectsByUserId(ctx.user.id);
  }),

  recentSummaries: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user.role === "admin" || ctx.user.role === "viewer"
      ? await getWorkspaceRecentProjectSummaries()
      : await getRecentProjectSummaries(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectReadAccess(input.projectId, ctx.user);
      return await getProjectById(input.projectId);
    }),

  update: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["draft", "in_progress", "completed", "archived"])
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await verifyProjectOwnership(input.projectId, ctx.user.id);

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;

      await updateProject(input.projectId, updateData);

      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "project",
        entityId: input.projectId,
        description: `Project updated`,
        metadata: {
          oldValues: {
            name: project.name,
            description: project.description,
            status: project.status,
          },
          newValues: updateData,
        },
      });

      return { success: true };
    }),

  delete: estimatorProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await verifyProjectOwnership(input.projectId, ctx.user.id);
      await deleteProject(input.projectId);

      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "project",
        entityId: input.projectId,
        description: `Project deleted`,
        metadata: {
          oldValues: {
            name: project.name,
            description: project.description,
            status: project.status,
          },
          newValues: { deleted: true },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// FILES ROUTER
// ============================================================================

const filesRouter = router({
  upload: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string().min(1).max(255),
        fileType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
        fileSize: z.number().int().positive().max(10 * 1024 * 1024),
        fileData: z.string().min(1).max(14_500_000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("plan_uploads");
      await verifyProjectOwnership(input.projectId, ctx.user.id);

      const dataUrlMatch = input.fileData.match(
        /^data:(application\/pdf|image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/
      );
      if (!dataUrlMatch || dataUrlMatch[1] !== input.fileType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The uploaded file type is not supported.",
        });
      }

      const fileBytes = Buffer.from(dataUrlMatch[2].replace(/\s/g, ""), "base64");
      if (fileBytes.length === 0 || fileBytes.length > 10 * 1024 * 1024) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "Plans must be 10 MB or smaller.",
        });
      }
      if (fileBytes.length !== input.fileSize) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The uploaded file size could not be verified.",
        });
      }

      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
      const s3Key = `projects/${input.projectId}/${Date.now()}-${safeFileName}`;
      const storedFile = await storagePut(s3Key, fileBytes, input.fileType);
      const result = await createProjectFile({
        projectId: input.projectId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        s3Key: storedFile.key,
        s3Url: storedFile.url,
        uploadedBy: ctx.user.id,
      });
      const fileId = getInsertedId(result, "project file");

      await updateProject(input.projectId, {});
      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "file_upload",
        entityType: "projectFile",
        entityId: fileId,
        description: `File uploaded: ${input.fileName}`,
        metadata: {
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
        },
      });

      return { id: fileId, s3Url: storedFile.url };
    }),

  // Generate presigned URL for upload
  getUploadUrl: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("plan_uploads");
      await verifyProjectOwnership(input.projectId, ctx.user.id);

      // Generate S3 key: projects/{projectId}/{timestamp}-{fileName}
      const timestamp = Date.now();
      const s3Key = `projects/${input.projectId}/${timestamp}-${input.fileName}`;

        // Get presigned upload URL (using storage helper)
        const uploadUrl = await storageGet(s3Key);

      return { s3Key, uploadUrl: uploadUrl.url };
    }),

  // Record file metadata after successful upload
  recordUpload: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        s3Key: z.string(),
        s3Url: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("plan_uploads");
      await verifyProjectOwnership(input.projectId, ctx.user.id);

      const result = await createProjectFile({
        projectId: input.projectId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        s3Key: input.s3Key,
        s3Url: input.s3Url,
        uploadedBy: ctx.user.id,
      });

      const fileId = getInsertedId(result, "project file");

      // Log audit event
      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "file_upload",
        entityType: "projectFile",
        entityId: fileId,
        description: `File uploaded: ${input.fileName}`,
        metadata: {
          fileName: input.fileName,
          fileSize: input.fileSize,
          fileType: input.fileType,
        },
      });

      return { id: fileId };
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectReadAccess(input.projectId, ctx.user);
      return await getProjectFilesByProjectId(input.projectId);
    }),

  delete: estimatorProcedure
    .input(z.object({ projectId: z.number(), fileId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await verifyProjectOwnership(input.projectId, ctx.user.id);
      const file = await getProjectFileById(input.fileId);

      if (!file || file.projectId !== input.projectId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      await deleteProjectFile(input.fileId);

      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "file_upload",
        entityType: "projectFile",
        entityId: input.fileId,
        description: `File deleted: ${file.fileName}`,
        metadata: {
          oldValues: {
            fileName: file.fileName,
            fileSize: file.fileSize,
            fileType: file.fileType,
          },
          newValues: { deleted: true },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// TAKEOFFS ROUTER
// ============================================================================

const takeoffsRouter = router({
  // Trigger AI analysis on selected files
  analyzeFiles: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        fileIds: z.array(z.number()).min(1),
        takeoffName: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("ai_takeoffs");
      await verifyProjectOwnership(input.projectId, ctx.user.id);

      // Verify all files belong to the project
      const files = await getProjectFilesByProjectId(input.projectId);
      const fileMap = new Map(files.map((f) => [f.id, f]));

      for (const fileId of input.fileIds) {
        if (!fileMap.has(fileId)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `File ${fileId} not found in project`,
          });
        }
      }

      // Create takeoff record
      const result = await createTakeoff({
        projectId: input.projectId,
        name: input.takeoffName,
        sourceFileIds: input.fileIds,
        status: "pending",
      });

      const takeoffId = getInsertedId(result, "takeoff");

      // Log audit event
      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "ai_analysis",
        entityType: "takeoff",
        entityId: takeoffId,
        description: `AI analysis started on ${input.fileIds.length} file(s)`,
        metadata: { fileIds: input.fileIds },
      });

      // Build signed inputs and ask a vision-capable model for a constrained result.
      // The stored application URL is intended for the browser, while the model needs
      // a short-lived S3 URL it can retrieve directly.
      try {
        const prompt = `You are a construction estimating expert. Analyze the provided architectural plans/drawings and extract all quantities, materials, and dimensions. 
        
Return a JSON array with objects containing:
- material: string (e.g., "Concrete", "Steel Rebar")
- description: string (additional details)
- quantity: number
- unit: string (e.g., "cubic yards", "linear feet", "each")
- notes: string (confidence level or source location on drawing)

Focus on structural elements, MEP systems, and finishes. Be thorough and precise. If the drawing does not provide a reliable quantity, do not invent one.`;

        const drawingInputs = await Promise.all(
          input.fileIds.map(async (fileId) => {
            const file = fileMap.get(fileId)!;
            const signedUrl = await storageGetSignedUrl(file.s3Key);
            const type = file.fileType.toLowerCase();

            if (isPdfPlan(type)) {
              return {
                type: "file_url" as const,
                file_url: { url: signedUrl, mime_type: "application/pdf" as const },
              };
            }

            return {
              type: "image_url" as const,
              image_url: { url: signedUrl, detail: "high" as const },
            };
          })
        );

        const messages: Message[] = [
          {
            role: "system",
            content: "You return only the requested structured construction takeoff data.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...drawingInputs,
            ],
          },
        ];

        const result = await invokeLLM({
          messages,
          model: "gpt-5",
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "construction_takeoff",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        material: { type: "string" },
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unit: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["material", "description", "quantity", "unit", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        });

        const analysisResult = result.choices[0]?.message.content || "";

        if (typeof analysisResult !== "string") {
          throw new Error("AI analysis returned an unsupported response format");
        }

        const parsed = JSON.parse(analysisResult) as {
          items?: Array<{
            material: string;
            description: string;
            quantity: number;
            unit: string;
            notes: string;
          }>;
        };
        const lineItems = Array.isArray(parsed.items) ? parsed.items : [];

        // Create line items in database
        for (const item of lineItems) {
          await createTakeoffLineItem({
            takeoffId: takeoffId,
            material: item.material || "Unknown",
            description: item.description,
            quantity: (Number(item.quantity) || 0).toString() as any,
            unit: item.unit || "each",
            notes: item.notes,
            isEdited: false,
          });
        }

        // Update takeoff status to completed
        await updateTakeoff(takeoffId, {
          status: "completed",
          aiAnalysisResult: {
            lineItemCount: lineItems.length,
            sourceFileIds: input.fileIds,
          },
        });

        await logAuditEvent({
          projectId: input.projectId,
          userId: ctx.user.id,
          eventType: "ai_analysis",
          entityType: "takeoff",
          entityId: takeoffId,
          description: `AI analysis completed with ${lineItems.length} extracted line item(s)`,
          metadata: { fileIds: input.fileIds, lineItemCount: lineItems.length, status: "completed" },
        });

        await createWorkspaceNotification({
          userId: ctx.user.id,
          projectId: input.projectId,
          takeoffId,
          type: "takeoff_completed",
          title: "AI takeoff ready for review",
          content: `${input.takeoffName} is ready with ${lineItems.length} extracted line item${lineItems.length === 1 ? "" : "s"}.`,
        });
        void notifyOwner({
          title: "AI takeoff completed",
          content: `${ctx.user.name || "An estimator"} completed ${input.takeoffName} with ${lineItems.length} extracted line item${lineItems.length === 1 ? "" : "s"}.`,
        }).catch((error) => console.warn("[Notification] Completion alert could not be sent:", error));

        return { takeoffId, lineItemCount: lineItems.length };
      } catch (error) {
        console.error("AI analysis failed:", error);
        await updateTakeoff(takeoffId, { status: "failed" });
        await logAuditEvent({
          projectId: input.projectId,
          userId: ctx.user.id,
          eventType: "ai_analysis",
          entityType: "takeoff",
          entityId: takeoffId,
          description: "AI analysis failed",
          metadata: { fileIds: input.fileIds, status: "failed" },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI analysis failed",
        });
      }
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectReadAccess(input.projectId, ctx.user);
      return await getTakeoffsByProjectId(input.projectId);
    }),

  getById: protectedProcedure
    .input(z.object({ takeoffId: z.number() }))
    .query(async ({ ctx, input }) => {
      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }
      await verifyProjectReadAccess(takeoff.projectId, ctx.user);
      return takeoff;
    }),

  delete: estimatorProcedure
    .input(z.object({ takeoffId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }
      await verifyProjectOwnership(takeoff.projectId, ctx.user.id);

      await deleteTakeoff(input.takeoffId);

      await logAuditEvent({
        projectId: takeoff.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "takeoff",
        entityId: input.takeoffId,
        description: `Takeoff deleted: ${takeoff.name}`,
        metadata: {
          oldValues: { name: takeoff.name, status: takeoff.status },
          newValues: { deleted: true },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// LINE ITEMS ROUTER
// ============================================================================

const lineItemsRouter = router({
  list: protectedProcedure
    .input(z.object({ takeoffId: z.number() }))
    .query(async ({ ctx, input }) => {
      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }
      await verifyProjectReadAccess(takeoff.projectId, ctx.user);
      return await getTakeoffLineItemsByTakeoffId(input.takeoffId);
    }),

  update: estimatorProcedure
    .input(
      z.object({
        itemId: z.number(),
        material: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        unitPrice: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await getTakeoffLineItemById(input.itemId);
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Line item not found",
        });
      }

      const takeoff = await getTakeoffById(item.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }

      await verifyProjectOwnership(takeoff.projectId, ctx.user.id);

      // Calculate totalPrice if quantity and unitPrice are provided
      const updateData: any = { isEdited: true };
      if (input.material !== undefined) updateData.material = input.material;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.quantity !== undefined) updateData.quantity = input.quantity;
      if (input.unit !== undefined) updateData.unit = input.unit;
      if (input.unitPrice !== undefined) updateData.unitPrice = input.unitPrice.toString() as any;
      if (input.notes !== undefined) updateData.notes = input.notes;

      if (
        input.quantity !== undefined &&
        input.unitPrice !== undefined
      ) {
        updateData.totalPrice = (input.quantity * input.unitPrice).toString();
      } else if (input.quantity !== undefined && item.unitPrice) {
        updateData.totalPrice = (input.quantity * Number(item.unitPrice)).toString();
      } else if (input.unitPrice !== undefined && item.quantity) {
        updateData.totalPrice = (Number(item.quantity) * input.unitPrice).toString();
      }

      await updateTakeoffLineItem(input.itemId, updateData);

      await logAuditEvent({
        projectId: takeoff.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "takeoffLineItem",
        entityId: input.itemId,
        description: `Line item edited: ${input.material || item.material}`,
        metadata: {
          oldValues: {
            material: item.material,
            quantity: item.quantity,
            unit: item.unit,
          },
          newValues: updateData,
        },
      });

      return { success: true };
    }),

  create: estimatorProcedure
    .input(
      z.object({
        takeoffId: z.number(),
        material: z.string(),
        description: z.string().optional(),
        quantity: z.number(),
        unit: z.string(),
        unitPrice: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }
      await verifyProjectOwnership(takeoff.projectId, ctx.user.id);

      const totalPrice =
        input.unitPrice !== undefined
          ? (input.quantity * input.unitPrice).toString()
          : undefined;

      const result = await createTakeoffLineItem({
        takeoffId: input.takeoffId,
        material: input.material,
        description: input.description,
        quantity: input.quantity.toString() as any,
        unit: input.unit,
        unitPrice: input.unitPrice ? input.unitPrice.toString() as any : undefined,
        totalPrice: totalPrice as any,
        isEdited: true,
      });

      const itemId = getInsertedId(result, "takeoff line item");

      await logAuditEvent({
        projectId: takeoff.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "takeoffLineItem",
        entityId: itemId,
        description: `Line item created: ${input.material}`,
        metadata: {
          oldValues: null,
          newValues: {
            material: input.material,
            description: input.description,
            quantity: input.quantity,
            unit: input.unit,
            unitPrice: input.unitPrice,
          },
        },
      });

      return { id: itemId };
    }),

  delete: estimatorProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getTakeoffLineItemById(input.itemId);
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Line item not found",
        });
      }

      const takeoff = await getTakeoffById(item.takeoffId);
      if (!takeoff) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }

      await verifyProjectOwnership(takeoff.projectId, ctx.user.id);
      await deleteTakeoffLineItem(input.itemId);

      await logAuditEvent({
        projectId: takeoff.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "takeoffLineItem",
        entityId: input.itemId,
        description: `Line item deleted: ${item.material}`,
        metadata: {
          oldValues: {
            material: item.material,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
          },
          newValues: { deleted: true },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// BID REPORTS ROUTER
// ============================================================================

const bidReportsRouter = router({
  generate: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        takeoffId: z.number(),
        reportName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("bid_reports");
      await verifyProjectOwnership(input.projectId, ctx.user.id);

      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff || takeoff.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }

      const lineItems = await getTakeoffLineItemsByTakeoffId(input.takeoffId);
      const totalCost = lineItems.reduce(
        (sum, item) => sum + (item.totalPrice ? Number(item.totalPrice) : 0),
        0
      );

      const result = await createBidReport({
        projectId: input.projectId,
        takeoffId: input.takeoffId,
        reportName: input.reportName,
        totalCost: totalCost.toString() as any,
        lineItemCount: lineItems.length,
      });

      const reportId = getInsertedId(result, "bid report");

      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "bid_created",
        entityType: "bidReport",
        entityId: reportId,
        description: `Bid report generated: ${input.reportName}`,
        metadata: { totalCost: totalCost.toString(), lineItemCount: lineItems.length },
      });

      return { id: reportId };
    }),

  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectReadAccess(input.projectId, ctx.user);
      return await getBidReportsByProjectId(input.projectId);
    }),

  getById: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const report = await getBidReportById(input.reportId);
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid report not found",
        });
      }
      await verifyProjectReadAccess(report.projectId, ctx.user);
      return report;
    }),

  delete: estimatorProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const report = await getBidReportById(input.reportId);
      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bid report not found",
        });
      }
      await verifyProjectOwnership(report.projectId, ctx.user.id);

      await deleteBidReport(input.reportId);

      await logAuditEvent({
        projectId: report.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "bidReport",
        entityId: input.reportId,
        description: `Bid report deleted: ${report.reportName}`,
        metadata: {
          oldValues: {
            reportName: report.reportName,
            totalCost: report.totalCost,
            lineItemCount: report.lineItemCount,
          },
          newValues: { deleted: true },
        },
      });

      return { success: true };
    }),
});

// ============================================================================
// AUDIT LOG ROUTER
// ============================================================================

const auditRouter = router({
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(8) }).optional())
    .query(async ({ ctx, input }) => {
      const includeWorkspace = ctx.user.role === "admin" || ctx.user.role === "viewer";
      return getRecentDashboardActivity(ctx.user.id, includeWorkspace, input?.limit ?? 8);
    }),

  getProjectHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
        eventType: z.enum(["file_upload", "ai_analysis", "item_edit", "bid_created", "export"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectReadAccess(input.projectId, ctx.user);
      const records = await getAuditLogPage(input.projectId, {
        eventType: input.eventType,
        limit: input.limit,
        offset: input.offset,
      });
      return {
        entries: records.slice(0, input.limit),
        hasMore: records.length > input.limit,
      };
    }),

  recordExport: estimatorProcedure
    .input(
      z.object({
        projectId: z.number(),
        takeoffId: z.number(),
        format: z.enum(["csv", "print"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await requireFeature("exports");
      await verifyProjectOwnership(input.projectId, ctx.user.id);
      const takeoff = await getTakeoffById(input.takeoffId);
      if (!takeoff || takeoff.projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Takeoff not found" });
      }

      await logAuditEvent({
        projectId: input.projectId,
        userId: ctx.user.id,
        eventType: "export",
        entityType: "takeoff",
        entityId: input.takeoffId,
        description: `Takeoff exported as ${input.format.toUpperCase()}`,
        metadata: { format: input.format },
      });
      return { success: true };
    }),
});

// ============================================================================
// MAIN APP ROUTER
// ============================================================================

const featureKeySchema = z.enum(["plan_uploads", "ai_takeoffs", "bid_reports", "exports"]);
const onboardingStepSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
});
const tradePackageSchema = z.object({
  trade: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  unit: z.string().trim().min(1).max(50),
  guidance: z.string().trim().min(1).max(500),
});
const tradePackageLibraryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  projectType: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1000),
  packages: z.array(tradePackageSchema).min(1).max(20),
  isActive: z.boolean(),
});

const configurationRouter = router({
  list: adminProcedure.query(async () => getFeatureSettings()),

  users: adminProcedure.query(async () => getUsersForAdministration()),

  updateFeature: adminProcedure
    .input(z.object({ key: featureKeySchema, enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await upsertFeatureSetting({
        key: input.key,
        enabled: input.enabled,
        updatedBy: ctx.user.id,
      });
      return { success: true };
    }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "estimator", "viewer"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Administrators cannot remove their own administrator access.",
        });
      }
      await updateUserRole(input.userId, input.role);
      return { success: true };
    }),
});

const featuresRouter = router({
  list: protectedProcedure.query(async () => getFeatureSettings()),
});

const onboardingRouter = router({
  get: protectedProcedure.query(async () => getOnboardingSettings()),

  update: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        label: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(500),
        steps: z.array(onboardingStepSchema).min(2).max(6),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await upsertOnboardingSettings({ ...input, updatedBy: ctx.user.id });
      return { success: true };
  }),
});

const tradePackageLibrariesRouter = router({
  listActive: protectedProcedure.query(async () => {
    await ensureDefaultTradePackageLibraries();
    return getTradePackageLibraries(true);
  }),

  list: adminProcedure.query(async () => {
    await ensureDefaultTradePackageLibraries();
    return getTradePackageLibraries();
  }),

  create: adminProcedure.input(tradePackageLibraryInputSchema).mutation(async ({ ctx, input }) => {
    const result = await createTradePackageLibrary({ ...input, createdBy: ctx.user.id });
    return { id: getInsertedId(result, "trade-package library") };
  }),

  update: adminProcedure
    .input(z.object({ libraryId: z.number().int().positive(), library: tradePackageLibraryInputSchema }))
    .mutation(async ({ input }) => {
      const library = await getTradePackageLibraryById(input.libraryId);
      if (!library) throw new TRPCError({ code: "NOT_FOUND", message: "Trade-package library not found." });
      await updateTradePackageLibrary(input.libraryId, input.library);
      return { success: true };
    }),
});

const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(12), projectId: z.number().int().positive().optional(), status: z.enum(["unread", "read", "approved", "rejected"]).optional() }).optional())
    .query(async ({ ctx, input }) => getWorkspaceNotificationsByUserId(ctx.user.id, input ?? { limit: 12 })),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markWorkspaceNotificationRead(input.notificationId, ctx.user.id);
      return { success: true };
    }),

  resolveTakeoff: estimatorProcedure
    .input(z.object({ notificationId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]) }))
    .mutation(async ({ ctx, input }) => {
      const notification = await getWorkspaceNotificationByIdForUser(input.notificationId, ctx.user.id);
      if (!notification || notification.type !== "takeoff_completed" || !notification.takeoffId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "A completed AI takeoff alert was not found." });
      }
      await verifyProjectOwnership(notification.projectId, ctx.user.id);
      const takeoff = await getTakeoffById(notification.takeoffId);
      if (!takeoff || takeoff.projectId !== notification.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The alert's takeoff is no longer available." });
      }
      if (notification.status === input.decision) return { success: true, status: input.decision, takeoffId: takeoff.id };
      if (notification.status === "approved" || notification.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This takeoff alert has already been resolved." });
      }

      const reviewedAt = new Date();
      await updateTakeoff(takeoff.id, { reviewStatus: input.decision, reviewedBy: ctx.user.id, reviewedAt });
      await resolveWorkspaceNotification(notification.id, ctx.user.id, input.decision);
      await logAuditEvent({
        projectId: notification.projectId,
        userId: ctx.user.id,
        eventType: "item_edit",
        entityType: "takeoff",
        entityId: takeoff.id,
        description: `AI takeoff ${input.decision} from completion alert`,
        metadata: { notificationId: notification.id, reviewStatus: input.decision, source: "completion_alert" },
      });
      return { success: true, status: input.decision, takeoffId: takeoff.id };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  projects: projectsRouter,
  files: filesRouter,
  takeoffs: takeoffsRouter,
  lineItems: lineItemsRouter,
  bidReports: bidReportsRouter,
  audit: auditRouter,
  configuration: configurationRouter,
  features: featuresRouter,
  onboarding: onboardingRouter,
  tradePackageLibraries: tradePackageLibrariesRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
