/**
 * ErrorType mapping matrix tests
 */
import { ErrorType, getErrorType } from "@/lib/error-handling";

describe("getErrorType matrix", () => {
  const codeToType: [string, ErrorType][] = [
    ["NETWORK_ERROR", ErrorType.NETWORK],
    ["ECONNREFUSED", ErrorType.NETWORK],
    ["PGRST116", ErrorType.NOT_FOUND],
    ["23505", ErrorType.NOT_FOUND],
    ["invalid_credentials", ErrorType.AUTHENTICATION],
    ["42501", ErrorType.AUTHORIZATION],
    ["23502", ErrorType.VALIDATION],
  ];

  it.each(codeToType)("code %s -> %s", (code, expected) => {
    expect(getErrorType({ code })).toBe(expected);
  });
  it("ETIMEDOUT -> NETWORK", () => {
    expect(getErrorType({ code: "ETIMEDOUT" })).toBe(ErrorType.NETWORK);
  });
  it("token_expired -> AUTHENTICATION", () => {
    expect(getErrorType({ code: "token_expired" })).toBe(ErrorType.AUTHENTICATION);
  });
});
