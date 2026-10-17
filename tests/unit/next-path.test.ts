// @vitest-environment node
import { describe, expect, test } from "vitest";
import { loginPathWithNext, safeNextPath } from "@/features/auth/next-path";

describe("safeNextPath", () => {
  test.each(["/stories/x/2", "/stories?page=2", "/dashboard", "/"])("accepts %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  test.each([
    ["absolute URL", "https://evil.com"],
    ["protocol-relative URL", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["empty string", ""],
    ["tab that browsers strip", "/\t/evil.com"],
    ["newline that browsers strip", "/\n/evil.com"],
    ["userinfo", "/user@evil.com"],
    ["colon in path", "/a:b"],
    ["no leading slash", "stories/x"],
    ["too long", `/${"a".repeat(600)}`],
  ])("rejects %s", (_name, value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });

  test.each([null, undefined, 42, {}])("rejects non-string %s", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});

describe("loginPathWithNext", () => {
  test("encodes a safe path", () => {
    expect(loginPathWithNext("/stories/x/2")).toBe("/login?next=%2Fstories%2Fx%2F2");
  });

  test("drops an unsafe or default path", () => {
    expect(loginPathWithNext("//evil.com")).toBe("/login");
    expect(loginPathWithNext("/dashboard")).toBe("/login");
  });
});
