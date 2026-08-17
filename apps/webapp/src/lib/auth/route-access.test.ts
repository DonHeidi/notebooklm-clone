import { describe, expect, test } from "bun:test";
import { isPublicPath, redirectTarget } from "./route-access";

describe("isPublicPath", () => {
  test("auth screens are public", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/signup")).toBe(true);
  });

  test("app routes are protected", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/notebooks/123")).toBe(false);
  });

  test("prefix does not leak beyond a path segment", () => {
    expect(isPublicPath("/login-help")).toBe(false);
    expect(isPublicPath("/signup2")).toBe(false);
  });
});

describe("redirectTarget", () => {
  test("unauthenticated protected request goes to /login", () => {
    expect(redirectTarget("/", false)).toBe("/login");
    expect(redirectTarget("/notebooks/abc", false)).toBe("/login");
  });

  test("unauthenticated auth screen passes through", () => {
    expect(redirectTarget("/login", false)).toBeNull();
    expect(redirectTarget("/signup", false)).toBeNull();
  });

  test("authenticated auth screen goes to library", () => {
    expect(redirectTarget("/login", true)).toBe("/");
    expect(redirectTarget("/signup", true)).toBe("/");
  });

  test("authenticated app request passes through", () => {
    expect(redirectTarget("/", true)).toBeNull();
    expect(redirectTarget("/notebooks/abc", true)).toBeNull();
  });
});
