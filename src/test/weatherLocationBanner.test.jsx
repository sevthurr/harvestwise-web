import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WeatherLocationBanner } from "../app/farmer/components/shared/WeatherLocationBanner";
import * as AuthContextModule from "../app/global/contexts/AuthContext";
import * as LanguageContextModule from "../app/global/contexts/LanguageContext";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
    langCode: "en",
  }),
}));

describe("WeatherLocationBanner", () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  const renderBanner = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WeatherLocationBanner />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it("does NOT render when user profile has barangay set", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({ user: null });
    queryClient.setQueryData(["farmer", "profile"], {
      barangay: "Buda",
      city: "Davao City",
      latitude: null,
      longitude: null,
    });

    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does NOT render when user profile has location_name set", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({ user: null });
    queryClient.setQueryData(["farmer", "profile"], {
      location_name: "Purok 5, Calinan",
      city: "Davao City",
    });

    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does NOT render when user profile has coordinates set", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({ user: null });
    queryClient.setQueryData(["farmer", "profile"], {
      latitude: 7.07,
      longitude: 125.6,
    });

    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does NOT render when AuthContext user has location set", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: { barangay: "Toril" },
    });
    queryClient.setQueryData(["farmer", "profile"], null);

    renderBanner();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders when user has NO location set and profile is loaded", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({ user: null });
    queryClient.setQueryData(["farmer", "profile"], {
      first_name: "Juan",
      last_name: "Dela Cruz",
      city: "Davao City",
      barangay: null,
      district: null,
      purok_sitio: null,
      street: null,
      location_name: null,
      latitude: null,
      longitude: null,
    });

    renderBanner();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/Enter farm location/i)).toBeInTheDocument();
  });

  it("hides when dismiss button is clicked", () => {
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({ user: null });
    queryClient.setQueryData(["farmer", "profile"], {
      city: "Davao City",
      barangay: null,
      latitude: null,
      longitude: null,
    });

    renderBanner();
    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(sessionStorage.getItem("hw_dismissed_weather_location_banner")).toBe("true");
  });
});
