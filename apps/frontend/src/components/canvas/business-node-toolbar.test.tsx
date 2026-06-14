import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { BusinessNodeToolbar } from "./business-node-toolbar";

describe("BusinessNodeToolbar", () => {
  it("groups add-node actions by canvas node family", () => {
    const html = renderToStaticMarkup(<BusinessNodeToolbar onCreate={() => undefined} />);

    expect(html).toContain("Business");
    expect(html).toContain("AI Generation");
    expect(html).toContain("Media Operation");
    expect(html).toContain("Layout / Helper");
    expect(html.indexOf("Business")).toBeLessThan(html.indexOf("AI Generation"));
    expect(html.indexOf("AI Generation")).toBeLessThan(html.indexOf("Media Operation"));
    expect(html).toContain("添加文本节点");
    expect(html).toContain("添加图片节点");
    expect(html).toContain("添加导出包");
    expect(html).toContain("添加分镜框");
  });

  it("disables every grouped create action while busy", () => {
    const html = renderToStaticMarkup(<BusinessNodeToolbar busy onCreate={() => undefined} />);

    expect(html.match(/disabled=""/g)?.length).toBeGreaterThan(0);
  });
});
