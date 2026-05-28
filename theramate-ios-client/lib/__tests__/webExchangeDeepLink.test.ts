import { describe, expect, it } from "@jest/globals";

import { parsePracticeExchangeRequestId } from "@/lib/webExchangeDeepLink";

const REQ = "a1b2c3d4-e5f6-4789-a012-3456789abcde";

describe("parsePracticeExchangeRequestId", () => {
  it("parses query on co.uk", () => {
    expect(
      parsePracticeExchangeRequestId(
        `https://theramate.co.uk/practice/exchange-requests?request=${REQ}`,
      ),
    ).toBe(REQ);
  });

  it("parses query on .com", () => {
    expect(
      parsePracticeExchangeRequestId(
        `https://theramate.com/practice/exchange-requests?request_id=${REQ}`,
      ),
    ).toBe(REQ);
  });

  it("returns null without request param", () => {
    expect(
      parsePracticeExchangeRequestId(
        "https://theramate.co.uk/practice/exchange-requests",
      ),
    ).toBeNull();
  });

  it("returns null for other paths", () => {
    expect(
      parsePracticeExchangeRequestId(
        "https://theramate.co.uk/practice/billing",
      ),
    ).toBeNull();
  });
});
