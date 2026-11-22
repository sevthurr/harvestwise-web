import { describe, expect, it } from "vitest";
import { t } from "../app/global/i18n/index.js";

describe("PWA install prompt translations", () => {
  it.each([
    ["ceb", "I-install ang HarvestWise App", "I-install"],
    ["tl", "I-install ang HarvestWise App", "I-install"],
    ["en", "Install HarvestWise App", "Install"],
  ])("translates the install prompt for %s", (lang, title, button) => {
    expect(t("farmer.navigation.install_prompt_title", {}, lang)).toBe(title);
    expect(t("farmer.navigation.install_button", {}, lang)).toBe(button);
  });
});
