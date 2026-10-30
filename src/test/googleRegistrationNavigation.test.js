import { describe, expect, it } from "vitest";
import { getGoogleRegistrationDestination } from "../app/auth/RegisterPage";

describe("Google registration destination", () => {
  it("sends farmers through onboarding", () => {
    expect(getGoogleRegistrationDestination("Farmer")).toBe("/onboarding");
    expect(getGoogleRegistrationDestination()).toBe("/onboarding");
  });

  it("keeps non-farmer accounts on their role home", () => {
    expect(getGoogleRegistrationDestination("DFTC")).toBe("/dftc");
    expect(getGoogleRegistrationDestination("Admin")).toBe("/admin");
  });
});
