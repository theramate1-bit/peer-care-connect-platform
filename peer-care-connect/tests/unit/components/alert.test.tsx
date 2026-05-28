import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

describe("Alert", () => {
  it("exports the expected alert building blocks", () => {
    expect(Alert).toBeDefined();
    expect(AlertTitle).toBeDefined();
    expect(AlertDescription).toBeDefined();
  });

  it("preserves display names for debugging and snapshots", () => {
    expect(Alert.displayName).toBe("Alert");
    expect(AlertTitle.displayName).toBe("AlertTitle");
    expect(AlertDescription.displayName).toBe("AlertDescription");
  });
});
