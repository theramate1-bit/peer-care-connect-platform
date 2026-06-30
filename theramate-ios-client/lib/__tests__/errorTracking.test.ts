/**
 * errorTracking is optional (no DSN in test env) — ensure calls do not throw.
 */
import { captureException, initErrorTracking } from "@/lib/errorTracking";

describe("errorTracking", () => {
  it("initErrorTracking does not throw without DSN", () => {
    expect(() => initErrorTracking()).not.toThrow();
  });

  it("captureException does not throw without DSN", () => {
    expect(() => captureException(new Error("test"))).not.toThrow();
  });

  it("captureException accepts context", () => {
    expect(() =>
      captureException(new Error("ctx"), { screen: "bookings" }),
    ).not.toThrow();
  });
});
