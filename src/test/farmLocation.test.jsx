import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { FarmLocationFields } from "../app/global/components/location/FarmLocationFields";
import { NavButtons } from "../app/auth/OnboardingPage";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

describe("FarmLocationFields Component", () => {
  const mockBarangays = [
    { code: "112402001", name: "Buda" },
    { code: "112402002", name: "Marilog" },
    { code: "112402003", name: "Calinan" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (locationState, lang = "en") => {
    useLanguage.mockReturnValue({
      langCode: lang,
      effectiveLanguage: lang,
      t: (key, params, fallback) => {
        const res = translate(key, params, lang);
        if (res === key && fallback) return fallback;
        return res || fallback;
      },
    });

    return render(<FarmLocationFields locationState={locationState} />);
  };

  it("renders the original two-button choice layout side by side", () => {
    const mockState = {
      city: "Davao City",
      district: "",
      barangay: "",
      specificAddress: "",
      locationMode: null,
      isSettled: false,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      requestCurrentPosition: vi.fn(),
      switchMode: vi.fn(),
      resetToChoice: vi.fn(),
    };

    renderComponent(mockState, "en");

    expect(screen.getByRole("button", { name: /use my current location/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enter manually/i })).toBeInTheDocument();
  });

  it("renders Bisaya choice buttons accurately", () => {
    const mockState = {
      city: "Davao City",
      district: "",
      barangay: "",
      specificAddress: "",
      locationMode: null,
      isSettled: false,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      requestCurrentPosition: vi.fn(),
      switchMode: vi.fn(),
      resetToChoice: vi.fn(),
    };

    renderComponent(mockState, "ceb");

    expect(screen.getByRole("button", { name: /gamita ang akong lokasyon karon/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i-mano-mano ug enter/i })).toBeInTheDocument();
  });

  it("renders GPS success view with detailed resolved location rows without forcing manual entry", () => {
    const mockState = {
      city: "Davao City",
      district: "Marilog",
      barangay: "Buda",
      purokSitio: "Purok 3",
      street: "",
      locationMode: "gps",
      isSettled: true,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      switchMode: vi.fn(),
    };

    renderComponent(mockState, "en");

    expect(screen.getByText("Farm location")).toBeInTheDocument();
    expect(screen.getByText("District")).toBeInTheDocument();
    expect(screen.getByText("Marilog")).toBeInTheDocument();
    expect(screen.getByText("Buda")).toBeInTheDocument();
    expect(screen.getByText("Purok 3")).toBeInTheDocument();
    
    // Only one single Edit button, no extra Usba/Change or Save button
    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    expect(editBtn).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /change/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(mockState.switchMode).toHaveBeenCalledWith("manual");

    // Confirm no editable combobox or input fields are rendered in settled view
    expect(screen.queryByPlaceholderText(/purok, sitio/i)).not.toBeInTheDocument();
  });

  it("renders I-edit in Bisaya on the settled location card", () => {
    const mockState = {
      city: "Davao City",
      district: "Agdao",
      barangay: "Agdao",
      purokSitio: "Purok 4",
      street: "Davao-Bukidnon Highway",
      locationMode: "gps",
      isSettled: true,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      switchMode: vi.fn(),
    };

    renderComponent(mockState, "ceb");

    const editBtn = screen.getByRole("button", { name: /^i-edit$/i });
    expect(editBtn).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /usba/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("renders manual entry form with searchable comboboxes for Barangay, District, Purok / Sitio, and Street", () => {
    const mockState = {
      city: "Davao City",
      district: "",
      setDistrict: vi.fn(),
      barangay: "",
      setBarangay: vi.fn(),
      purokSitio: "",
      setPurokSitio: vi.fn(),
      street: "",
      setStreet: vi.fn(),
      locationMode: "manual",
      isSettled: false,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      geocodeManualLocation: vi.fn(),
      requestCurrentPosition: vi.fn(),
    };

    renderComponent(mockState, "en");

    // Barangay combobox
    expect(screen.getByRole("button", { name: /barangay \*/i })).toBeInTheDocument();

    // District combobox
    expect(screen.getByRole("button", { name: /district/i })).toBeInTheDocument();

    // Purok / Sitio combobox
    expect(screen.getByRole("button", { name: /purok \/ sitio/i })).toBeInTheDocument();

    // Street combobox
    expect(screen.getByRole("button", { name: /street/i })).toBeInTheDocument();

    // Option to switch to GPS
    expect(screen.getByRole("button", { name: /use my current location/i })).toBeInTheDocument();
  });

  it("filters barangays to only those under the selected district", () => {
    const mockState = {
      city: "Davao City",
      district: "Tugbok",
      setDistrict: vi.fn(),
      barangay: "",
      setBarangay: vi.fn(),
      purokSitio: "",
      setPurokSitio: vi.fn(),
      street: "",
      setStreet: vi.fn(),
      locationMode: "manual",
      isSettled: false,
      needsBarangaySelection: false,
      barangays: [
        { code: "1", name: "Tacunan" },
        { code: "2", name: "Buda" },
        { code: "3", name: "Tugbok (Pob.)" },
        { code: "4", name: "Calinan (Pob.)" },
      ],
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      geocodeManualLocation: vi.fn(),
      requestCurrentPosition: vi.fn(),
    };

    renderComponent(mockState, "en");

    // Click the barangay combobox trigger to open the options list
    const brgyButton = screen.getByRole("button", { name: /barangay \*/i });
    fireEvent.click(brgyButton);

    // Tacunan and Tugbok (Pob.) belong to Tugbok district and should be visible
    expect(screen.getByText("Tacunan")).toBeInTheDocument();
    expect(screen.getByText("Tugbok (Pob.)")).toBeInTheDocument();

    // Buda (Marilog) and Calinan (Calinan) should NOT be visible under Tugbok
    expect(screen.queryByText("Buda")).not.toBeInTheDocument();
    expect(screen.queryByText("Calinan (Pob.)")).not.toBeInTheDocument();
  });

  it("renders 'Check entered location' button when showCheckButton is true in manual mode", () => {
    const mockGeocode = vi.fn();
    const mockSetIsSettled = vi.fn();
    const mockState = {
      city: "Davao City",
      district: "Poblacion District",
      barangay: "Barangay 4-A (Pob.)",
      purokSitio: "",
      street: "",
      specificAddress: "",
      locationMode: "manual",
      isSettled: false,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: false,
      resolving: false,
      errorType: null,
      requestCurrentPosition: vi.fn(),
      geocodeManualLocation: mockGeocode,
      setIsSettled: mockSetIsSettled,
      switchMode: vi.fn(),
      resetToChoice: vi.fn(),
    };

    useLanguage.mockReturnValue({
      langCode: "en",
      effectiveLanguage: "en",
      t: (key, params, fallback) => fallback || key,
    });

    render(<FarmLocationFields locationState={mockState} showCheckButton={true} />);

    const checkBtn = screen.getByRole("button", { name: /check entered location/i });
    expect(checkBtn).toBeInTheDocument();
    fireEvent.click(checkBtn);
    expect(mockGeocode).toHaveBeenCalled();
  });

  it("shows loading spinner on 'Use my current location' button when gpsLoading is true in manual mode", () => {
    const mockState = {
      city: "Davao City",
      district: "",
      barangay: "",
      purokSitio: "",
      street: "",
      specificAddress: "",
      locationMode: "manual",
      isSettled: false,
      needsBarangaySelection: false,
      barangays: mockBarangays,
      barangaysLoading: false,
      barangaysError: null,
      gpsLoading: true,
      resolving: false,
      errorType: null,
      requestCurrentPosition: vi.fn(),
      geocodeManualLocation: vi.fn(),
      setIsSettled: vi.fn(),
      switchMode: vi.fn(),
      resetToChoice: vi.fn(),
    };

    useLanguage.mockReturnValue({
      langCode: "en",
      effectiveLanguage: "en",
      t: (key, params, fallback) => fallback || key,
    });

    render(<FarmLocationFields locationState={mockState} />);

    const gpsBtn = screen.getByRole("button", { name: /getting location/i });
    expect(gpsBtn).toBeInTheDocument();
    expect(gpsBtn).toBeDisabled();
    expect(gpsBtn.querySelector(".animate-spin")).not.toBeNull();
  });
});

describe("NavButtons Continue Button Behavior", () => {
  it("disabled state disables the button WITHOUT showing any loading spinner", () => {
    const { container } = render(
      <NavButtons
        step={2}
        onContinue={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        disabled={true}
        loading={false}
      />
    );

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
    expect(continueBtn.querySelector(".animate-spin")).toBeNull();
  });

  it("loading state displays spinner only when explicit loading prop is passed", () => {
    render(
      <NavButtons
        step={2}
        onContinue={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        disabled={false}
        loading={true}
      />
    );

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
    expect(continueBtn.querySelector(".animate-spin")).not.toBeNull();
  });

  it("renders custom continueLabel 'I-check ang gi-enter' when passed", () => {
    render(
      <NavButtons
        step={2}
        onContinue={vi.fn()}
        onBack={vi.fn()}
        onSkip={vi.fn()}
        continueLabel="I-check ang gi-enter"
        disabled={false}
        loading={false}
      />
    );

    expect(screen.getByRole("button", { name: /i-check ang gi-enter/i })).toBeInTheDocument();
  });
});
