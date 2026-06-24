import { describe, expect, it } from "vitest";
import { decodeBase64ToText, encodeTextToBase64 } from "./encoding";

describe("base64 text encoding", () => {
  it("round-trips UTF-8 including non-ASCII", () => {
    const text = "# Héllo 世界 — café";
    expect(decodeBase64ToText(encodeTextToBase64(text))).toBe(text);
  });

  it("decodes base64 that contains newlines (GitHub wraps content)", () => {
    const wrapped = `${encodeTextToBase64("line one\nline two")}`.replace(
      /(.{4})/g,
      "$1\n",
    );
    expect(decodeBase64ToText(wrapped)).toBe("line one\nline two");
  });
});
