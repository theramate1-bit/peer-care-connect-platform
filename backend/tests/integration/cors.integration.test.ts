import { corsHeaders } from "../../../supabase/functions/_shared/cors";

describe("corsHeaders integration", () => {
  it("allows known origins directly", () => {
    const headers = corsHeaders("https://theramate.co.uk");

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://theramate.co.uk",
    );
    expect(headers["Access-Control-Allow-Methods"]).toContain("POST");
  });

  it("falls back to the default origin for unknown callers", () => {
    const headers = corsHeaders("https://unknown.example.com");

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:3000",
    );
  });

  it("honors ALLOWED_ORIGINS from the environment", () => {
    const denoEnvGet = (global as any).Deno.env.get as jest.Mock;
    denoEnvGet.mockReturnValueOnce(
      "https://custom.example.com,https://other.example.com",
    );

    const headers = corsHeaders("https://custom.example.com");

    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "https://custom.example.com",
    );
  });

  it("returns all CORS headers", () => {
    const headers = corsHeaders("https://theramate.co.uk");

    expect(headers["Access-Control-Allow-Headers"]).toContain("authorization");
    expect(headers["Access-Control-Allow-Headers"]).toContain("content-type");
    expect(headers["Access-Control-Allow-Methods"]).toContain("GET");
    expect(headers["Access-Control-Allow-Credentials"]).toBe("true");
    expect(headers["Access-Control-Max-Age"]).toBe("86400");
  });

  it("allows localhost:5173 for Vite dev", () => {
    const headers = corsHeaders("http://localhost:5173");
    expect(headers["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:5173",
    );
  });
});
