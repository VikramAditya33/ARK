import { describe, expect, it } from "vitest";

import { renderFoundationPage } from "./page.js";

describe("ARK web foundation", () => {
  it("renders a recognizable placeholder without configuration", () => {
    const html = renderFoundationPage();

    expect(html).toContain("ARK foundation ready");
    expect(html).toContain("<main>");
  });
});
