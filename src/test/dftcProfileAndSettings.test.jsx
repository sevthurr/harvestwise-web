import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DFTCProfile from "../app/dftc/pages/DFTCProfile";
import AdminSystemManagement from "../app/admin/pages/AdminSystemManagement";
import * as AuthContext from "../app/global/contexts/AuthContext";

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("DFTC Profile & User Creation Specifications", () => {
  it("DFTCProfile transfers Position to Work Information, removes Account status, Last login, Phone, and unverified email badge", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: {
        id: "usr-dftc-1",
        first_name: "Maria",
        last_name: "Santos",
        middle_name: "Maria",
        suffix: null,
        email: "dftc@harvestwise.test",
        email_verified_at: null,
        phone: "+639170000001",
        phone_verified_at: null,
        role: "DFTC",
        position: "Data Analyst",
        is_active: true,
        last_login_at: "2026-10-23T23:44:00Z",
      },
    });

    renderWithProviders(<DFTCProfile />);

    // Position is in Work Information, not Personal Information
    const positionElements = screen.getAllByText("Position");
    expect(positionElements.length).toBeGreaterThan(0);
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getAllByText("Maria").length).toBeGreaterThan(0);

    // Work Information has Organization and Position, but NOT Account status or Last login
    expect(screen.getByText("Work Information")).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.queryByText("Account status")).not.toBeInTheDocument();
    expect(screen.queryByText("Last login")).not.toBeInTheDocument();

    // No Phone Number
    expect(screen.queryByText("Phone Number")).not.toBeInTheDocument();
    expect(screen.queryByText("+639170000001")).not.toBeInTheDocument();

    // Email has no "Not verified" badge
    expect(screen.getByText("dftc@harvestwise.test")).toBeInTheDocument();
    expect(screen.queryByText("Not verified")).not.toBeInTheDocument();
  });
});
