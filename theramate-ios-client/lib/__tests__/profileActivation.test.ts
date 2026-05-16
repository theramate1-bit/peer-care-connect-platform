import {
  calculateProfileActivationStatus,
  hasValidAvailability,
} from "@/lib/profileActivation";

describe("profileActivation", () => {
  it("hasValidAvailability accepts legacy start/end when enabled", () => {
    expect(
      hasValidAvailability({
        monday: { enabled: true, start: "09:00", end: "17:00" },
        tuesday: { enabled: false, start: "09:00", end: "17:00" },
      }),
    ).toBe(true);
  });

  it("hasValidAvailability rejects when no day is enabled with valid hours", () => {
    expect(
      hasValidAvailability({
        monday: { enabled: false, start: "09:00", end: "17:00" },
      }),
    ).toBe(false);
  });

  it("calculateProfileActivationStatus matches 6-check methodology", () => {
    const status = calculateProfileActivationStatus(
      {
        bio: "Hello",
        experience_years: 5,
        location: "London",
      },
      true,
      1,
      1,
      1,
    );
    expect(status.total).toBe(6);
    expect(status.completed).toBe(6);
    expect(status.percentage).toBe(100);
    expect(status.checks.every((c) => c.isComplete)).toBe(true);
  });

  it("qualifications check requires both quals and documents", () => {
    const a = calculateProfileActivationStatus(
      { bio: "x", experience_years: 1, location: "y" },
      true,
      1,
      1,
      0,
    );
    expect(a.checks.find((c) => c.id === "qualifications")?.isComplete).toBe(
      false,
    );
    const b = calculateProfileActivationStatus(
      { bio: "x", experience_years: 1, location: "y" },
      true,
      1,
      1,
      1,
    );
    expect(b.checks.find((c) => c.id === "qualifications")?.isComplete).toBe(
      true,
    );
  });
});
