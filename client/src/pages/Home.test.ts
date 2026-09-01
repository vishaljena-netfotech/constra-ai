import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const homePagePath = new URL("./Home.tsx", import.meta.url);

describe("Home authentication redirect", () => {
  it("moves authenticated navigation into a React effect", async () => {
    const source = await readFile(homePagePath, "utf8");

    expect(source).toContain('import { useEffect } from "react";');
    expect(source).toContain("useEffect(() => {");
    expect(source).toContain('navigate("/dashboard", { replace: true });');
    expect(source).not.toMatch(
      /if \(isAuthenticated && user\) \{\s*navigate\("\/dashboard"\)/,
    );
  });
});
