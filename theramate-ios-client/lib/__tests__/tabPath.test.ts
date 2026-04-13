import { tabPath } from "@/lib/tabPath";

describe("tabPath", () => {
  it("returns grouped tab root for empty path (client)", () => {
    expect(tabPath("/(tabs)", "")).toBe("/(tabs)");
  });

  it("returns grouped ptabs root for empty path (practitioner)", () => {
    expect(tabPath("/(practitioner)/(ptabs)", "")).toBe(
      "/(practitioner)/(ptabs)",
    );
  });

  it("uses public paths under client tabs", () => {
    expect(tabPath("/(tabs)", "bookings/1")).toBe("/bookings/1");
    expect(tabPath("/(tabs)", "profile/settings")).toBe("/profile/settings");
    expect(tabPath("/(tabs)", "/explore/x")).toBe("/explore/x");
  });

  it("prefixes practitioner-only stack segments", () => {
    expect(tabPath("/(practitioner)/(ptabs)", "billing")).toBe(
      "/(practitioner)/billing",
    );
    expect(tabPath("/(practitioner)/(ptabs)", "exchange")).toBe(
      "/(practitioner)/exchange",
    );
  });

  it("uses public paths for routes inside practitioner tabs", () => {
    expect(tabPath("/(practitioner)/(ptabs)", "schedule")).toBe("/schedule");
    expect(tabPath("/(practitioner)/(ptabs)", "clients/x")).toBe("/clients/x");
    expect(tabPath("/(practitioner)/(ptabs)", "bookings/1")).toBe("/bookings/1");
  });
});
