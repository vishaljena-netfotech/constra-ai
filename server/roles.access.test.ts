import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "admin" | "user" | "estimator" | "viewer"): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "role-test-user",
      name: "Role Test User",
      email: "role-test@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("role-based access", () => {
  it("blocks viewer accounts from creating estimating projects", async () => {
    const caller = appRouter.createCaller(createContext("viewer"));

    await expect(caller.projects.create({ name: "Read-only project" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Your viewer role allows review access only.",
    });
  });

  it("blocks non-administrators from modifying workspace capability settings", async () => {
    const caller = appRouter.createCaller(createContext("estimator"));

    await expect(
      caller.configuration.updateFeature({ key: "ai_takeoffs", enabled: false }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("blocks viewer accounts from recording takeoff exports", async () => {
    const caller = appRouter.createCaller(createContext("viewer"));

    await expect(
      caller.audit.recordExport({ projectId: 1, takeoffId: 1, format: "csv" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Your viewer role allows review access only.",
    });
  });
});
