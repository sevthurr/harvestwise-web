import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";
import { Step3ProductionCosts } from "../app/farmer/components/recommend/Step3ProductionCosts";
import { Step4ReviewBreakEven } from "../app/farmer/components/recommend/Step4ReviewBreakEven";
import {
  CROP_DURATIONS,
  getCropDuration,
  suggestHarvestDate,
  DEFAULT_ASSESSMENT
} from "../app/farmer/components/recommend/types";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  useLanguage.mockReturnValue({
    langCode: "en",
    effectiveLanguage: "en",
    t: (key, params, fallback) => {
      const res = translate(key, params, "en");
      if (res === key && fallback) return fallback;
      return res || fallback;
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Crop Assessment Updates", () => {
  it("verifies crop durations match Crop_Duration_and_Weather_Requirements.md", () => {
    // Ampalaya: 45–75 DAT; Galaxy: 48–52 DAT
    expect(getCropDuration("ampalaya").daysMin).toBe(45);
    expect(getCropDuration("ampalaya").daysMax).toBe(75);
    expect(getCropDuration("ampalaya", "Galaxy").daysMin).toBe(48);
    expect(getCropDuration("ampalaya", "Galaxy").daysMax).toBe(52);

    // Kalabasa: 85–100 DAT; Suprema: 85 DAT
    expect(getCropDuration("kalabasa").daysMin).toBe(85);
    expect(getCropDuration("kalabasa").daysMax).toBe(100);
    expect(getCropDuration("kalabasa", "Suprema").daysMin).toBe(85);
    expect(getCropDuration("kalabasa", "Suprema").daysMax).toBe(85);

    // Kamatis: 55–65 DAT; Diamante Big: 55–65 DAT
    expect(getCropDuration("kamatis").daysMin).toBe(55);
    expect(getCropDuration("kamatis").daysMax).toBe(65);
    expect(getCropDuration("kamatis", "Diamante Big").daysMin).toBe(55);
    expect(getCropDuration("kamatis", "Diamante Big").daysMax).toBe(65);

    // Pipino: 38–45 DAP; Mega C: 38–45 DAP
    expect(getCropDuration("pipino").daysMin).toBe(38);
    expect(getCropDuration("pipino").daysMax).toBe(45);
    expect(getCropDuration("pipino", "Mega C").daysMin).toBe(38);
    expect(getCropDuration("pipino", "Mega C").daysMax).toBe(45);

    // Talong: 46–50 DAT; Banate King: 46–50 DAT
    expect(getCropDuration("talong").daysMin).toBe(46);
    expect(getCropDuration("talong").daysMax).toBe(50);
    expect(getCropDuration("talong", "Banate King").daysMin).toBe(46);
    expect(getCropDuration("talong", "Banate King").daysMax).toBe(50);

    // Carrots: 90–120 DAE
    expect(getCropDuration("carrots").daysMin).toBe(90);
    expect(getCropDuration("carrots").daysMax).toBe(120);

    // Chinese Pechay: 50–65 days
    expect(getCropDuration("pechay").daysMin).toBe(50);
    expect(getCropDuration("pechay").daysMax).toBe(65);

    // Lettuce Ball: 45–60 DAT
    expect(getCropDuration("lettuce").daysMin).toBe(45);
    expect(getCropDuration("lettuce").daysMax).toBe(60);

    // Repolyo: 55–60 DAT; Wakamini: 55–60 DAT
    expect(getCropDuration("repolyo").daysMin).toBe(55);
    expect(getCropDuration("repolyo").daysMax).toBe(60);
    expect(getCropDuration("repolyo", "Wakamini").daysMin).toBe(55);
    expect(getCropDuration("repolyo", "Wakamini").daysMax).toBe(60);

    // Duration labels should not contain DAT, DAS, DAP, or DAE
    expect(getCropDuration("ampalaya").label).toBe("45–75 days");
    expect(getCropDuration("ampalaya", "Galaxy").label).toBe("48–52 days");
    expect(getCropDuration("kalabasa").label).toBe("85–100 days");
    expect(getCropDuration("kalabasa", "Suprema").label).toBe("85 days");
    expect(getCropDuration("kamatis").label).toBe("55–65 days");
    expect(getCropDuration("kamatis", "Diamante Big").label).toBe("55–65 days");
    expect(getCropDuration("pipino").label).toBe("38–45 days");
    expect(getCropDuration("pipino", "Mega C").label).toBe("38–45 days");
    expect(getCropDuration("talong").label).toBe("46–50 days");
    expect(getCropDuration("talong", "Banate King").label).toBe("46–50 days");
    expect(getCropDuration("carrots").label).toBe("90–120 days");
    expect(getCropDuration("pechay").label).toBe("50–65 days");
    expect(getCropDuration("lettuce").label).toBe("45–60 days");
    expect(getCropDuration("repolyo").label).toBe("55–60 days");
    expect(getCropDuration("repolyo", "Wakamini").label).toBe("55–60 days");
    expect(getCropDuration("atsal").label).toBe("80–100 days");
    expect(getCropDuration("atsal", "Smooth Cayene").label).toBe("90–95 days");
    expect(getCropDuration("atsal", "Sultan").label).toBe("55–60 days");

    // Ensure no DAT, DAS, DAP, DAE in any labels
    Object.values(CROP_DURATIONS).forEach((cd) => {
      expect(cd.label).not.toMatch(/DAT|DAS|DAP|DAE/);
      if (cd.varieties) {
        Object.values(cd.varieties).forEach((vd) => {
          expect(vd.label).not.toMatch(/DAT|DAS|DAP|DAE/);
        });
      }
    });
  });

  it("calculates suggested harvest dates correctly based on variety duration", () => {
    const plantingDate = "2026-10-01";
    // Atsal general (80-100 days): 80 days after 2026-10-01 is 2026-12-20
    const atsalGeneral = suggestHarvestDate(plantingDate, "atsal");
    expect(atsalGeneral.minDate).toBe("2026-12-20");

    // Atsal Sultan (55-60 days): 55 days after 2026-10-01 is 2026-11-25
    const atsalSultan = suggestHarvestDate(plantingDate, "atsal", "Sultan");
    expect(atsalSultan.minDate).toBe("2026-11-25");

    // Atsal Smooth Cayene (90-95 days): 90 days after 2026-10-01 is 2026-12-30
    const atsalCayene = suggestHarvestDate(plantingDate, "atsal", "Smooth Cayene");
    expect(atsalCayene.minDate).toBe("2026-12-30");
  });

  it("verifies DEFAULT_ASSESSMENT has empty string inputs, not prefilled defaults", () => {
    expect(DEFAULT_ASSESSMENT.simpleCost).toBe("");
    expect(DEFAULT_ASSESSMENT.farmgatePrice).toBe("");
    expect(DEFAULT_ASSESSMENT.farmArea).toBe("");
    expect(DEFAULT_ASSESSMENT.harvestQuantity).toBe("");
    expect(DEFAULT_ASSESSMENT.plantingDate).toBe("");
    expect(DEFAULT_ASSESSMENT.harvestDate).toBe("");
  });

  it("verifies farmgate price input is NOT present in Step 3", () => {
    const data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "atsal",
      costMethod: "simple",
      simpleCost: "",
    };
    renderWithProviders(<Step3ProductionCosts data={data} onChange={() => {}} errors={{}} />);

    // Step 3 should have simple cost placeholder
    const simpleCostInput = screen.getByPlaceholderText("e.g. 25200");
    expect(simpleCostInput).toBeDefined();

    // Farmgate price input should NOT exist in Step 3
    expect(screen.queryByPlaceholderText("e.g. 70")).toBeNull();
    expect(screen.queryByLabelText(/Estimated farmgate price|Tantiya sa Presyong Farmgate/i)).toBeNull();
  });

  it("renders farmgate price input in Step 4 before Pagbawi sa Gasto with comparison", () => {
    const data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "atsal",
      variant: "Sultan",
      farmArea: 1000,
      harvestQuantity: 500,
      costMethod: "simple",
      simpleCost: 20000,
      useFarmgate: true,
      farmgatePrice: 70,
    };

    renderWithProviders(
      <Step4ReviewBreakEven
        data={data}
        onChange={() => {}}
        onEditStep={() => {}}
        errors={{}}
      />
    );

    // Farmgate input should exist in Step 4
    const farmgateInput = screen.getByPlaceholderText("e.g. 70");
    expect(farmgateInput).toBeDefined();
    expect(farmgateInput.value).toBe("70");

    // "Cost to recover" / "Pagbawi sa Gasto" / "Break-even" should be present on Step 4
    expect(screen.getByText(/Break-even|Cost to recover|Pagbawi sa Gasto/i)).toBeDefined();
    expect(screen.getByText(/You need to sell/i)).toBeDefined();
  });
});
