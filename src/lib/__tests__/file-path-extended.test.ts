/**
 * Extended file path sanitizer tests
 */
import {
  sanitizeFileName,
  sanitizePathSegment,
  buildSafePath,
  validatePathWithinBase,
} from "@/lib/file-path-sanitizer";

describe("file-path extended", () => {
  describe("sanitizeFileName", () => {
    it.each([[""], [null], [undefined]])("returns unnamed-file for %s", (input) => {
      expect(sanitizeFileName(input as any)).toBe("unnamed-file");
    });
  });

  describe("buildSafePath", () => {
    it.each([
      [["a", "b"], "file.txt", "a/b/file.txt"],
      [["user", "123"], "doc.pdf", "user/123/doc.pdf"],
    ])("joins %p + %s = %s", (segments, filename, expected) => {
      expect(buildSafePath(segments, filename)).toBe(expected);
    });
  });

  describe("validatePathWithinBase", () => {
    it("returns true for simple path", () => {
      expect(validatePathWithinBase("a/b/c")).toBe(true);
    });
  });
});
