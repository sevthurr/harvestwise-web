import { describe, it, expect } from "vitest";
import {
  composeImmediateActions,
  composeWeeklyActions,
  composeAdvisoryAction,
} from "../app/farmer/utils/advisoryReasons";
import { t } from "../app/global/i18n";

describe("Farmer action-guidance architecture — backend-driven priority", () => {
  describe("1. Frontend does NOT independently rank analytical factors", () => {
    it("returns safe stage default when actionGuidance is missing, ignoring raw module inputs", () => {
      // Even if raw inputs contain adverse conditions, frontend does not perform independent
      // factor ranking when backend actionGuidance is missing.
      const immediate = composeImmediateActions({
        cropStage: "planning",
        cropName: "Kamatis",
      });
      expect(immediate).toHaveLength(1);
      expect(immediate[0].code).toBe("action_planning_recommended");
      expect(immediate[0].factor).toBe("recommended");
    });

    it("returns safe growing default when actionGuidance is missing in growing stage", () => {
      const immediate = composeImmediateActions({
        cropStage: "growing",
        cropName: "Kamatis",
      });
      expect(immediate).toHaveLength(1);
      expect(immediate[0].code).toBe("action_growing_recommended");
      expect(immediate[0].factor).toBe("recommended");
    });

    it("weekly actions fallback to safe stage maintenance when actionGuidance is missing", () => {
      const weekly = composeWeeklyActions({
        cropStage: "growing",
        cropName: "Kamatis",
      });
      expect(weekly).toHaveLength(3);
      expect(weekly.map((w) => w.key)).toEqual([
        "farmer.monitoring.action_growing_1",
        "farmer.monitoring.action_growing_2",
        "farmer.monitoring.action_growing_3",
      ]);
    });
  });

  describe("2. Frontend follows backend action_guidance order exactly", () => {
    it("renders immediate actions in the exact sequence specified by backend", () => {
      const backendGuidance = {
        immediate_actions: [
          { code: "action_planning_severe_weather", factor: "weather_risk", params: {} },
          { code: "action_planning_price", factor: "price_outlook", params: {} },
        ],
      };

      const immediate = composeImmediateActions({
        cropStage: "planning",
        cropName: "Kamatis",
        actionGuidance: backendGuidance,
      });

      expect(immediate).toHaveLength(2);
      expect(immediate[0].code).toBe("action_planning_severe_weather");
      expect(immediate[0].key).toBe("farmer.actions.monitoring.action_planning_severe_weather");
      expect(immediate[1].code).toBe("action_planning_price");
      expect(immediate[1].key).toBe("farmer.actions.monitoring.action_planning_price");
    });

    it("changing backend action order changes frontend order without recomputation", () => {
      // Backend prioritizes price over weather
      const backendOrderA = {
        immediate_actions: [
          { code: "action_growing_price", factor: "price_outlook", params: {} },
          { code: "action_growing_weather", factor: "weather_risk", params: {} },
        ],
      };
      const resultA = composeImmediateActions({
        cropStage: "growing",
        cropName: "Kamatis",
        actionGuidance: backendOrderA,
      });
      expect(resultA[0].code).toBe("action_growing_price");
      expect(resultA[1].code).toBe("action_growing_weather");

      // Backend inverts order to weather over price
      const backendOrderB = {
        immediate_actions: [
          { code: "action_growing_weather", factor: "weather_risk", params: {} },
          { code: "action_growing_price", factor: "price_outlook", params: {} },
        ],
      };
      const resultB = composeImmediateActions({
        cropStage: "growing",
        cropName: "Kamatis",
        actionGuidance: backendOrderB,
      });
      expect(resultB[0].code).toBe("action_growing_weather");
      expect(resultB[1].code).toBe("action_growing_price");
    });

    it("renders weekly actions in the exact sequence specified by backend", () => {
      const backendGuidance = {
        weekly_actions: [
          { code: "farmer.monitoring.action_growing_1", factor: "weather_risk", params: {} },
          { code: "action_growing_high_arrival", factor: "arrival_pressure", params: {} },
          { code: "farmer.monitoring.action_growing_3", factor: "maintenance", params: {} },
        ],
      };

      const weekly = composeWeeklyActions({
        cropStage: "growing",
        cropName: "Kamatis",
        actionGuidance: backendGuidance,
      });

      expect(weekly).toHaveLength(3);
      expect(weekly[0].code).toBe("farmer.monitoring.action_growing_1");
      expect(weekly[1].code).toBe("action_growing_high_arrival");
      expect(weekly[2].code).toBe("farmer.monitoring.action_growing_3");
    });
  });

  describe("3. Cardinality constraints (max 2 immediate, max 3 weekly)", () => {
    it("caps immediate actions to a maximum of 2 even if backend sends more", () => {
      const backendGuidance = {
        immediate_actions: [
          { code: "action_planning_supply_price", factor: "supply", params: {} },
          { code: "action_planning_price", factor: "price_outlook", params: {} },
          { code: "action_planning_weather", factor: "weather_risk", params: {} },
        ],
      };
      const immediate = composeImmediateActions({
        cropStage: "planning",
        cropName: "Kamatis",
        actionGuidance: backendGuidance,
      });
      expect(immediate).toHaveLength(2);
      expect(immediate[0].code).toBe("action_planning_supply_price");
      expect(immediate[1].code).toBe("action_planning_price");
    });

    it("caps weekly actions to a maximum of 3 even if backend sends more", () => {
      const backendGuidance = {
        weekly_actions: [
          { code: "farmer.monitoring.action_pre_harvest_1", factor: "price_outlook", params: {} },
          { code: "farmer.monitoring.action_pre_harvest_2", factor: "profitability", params: {} },
          { code: "farmer.monitoring.action_pre_harvest_3", factor: "maintenance", params: {} },
          { code: "action_preharvest_weather", factor: "weather_risk", params: {} },
        ],
      };
      const weekly = composeWeeklyActions({
        cropStage: "pre_harvest",
        cropName: "Kamatis",
        actionGuidance: backendGuidance,
      });
      expect(weekly).toHaveLength(3);
    });

    it("composeAdvisoryAction returns the single primary immediate action", () => {
      const backendGuidance = {
        immediate_actions: [
          { code: "action_planning_severe_weather", factor: "weather_risk", params: {} },
          { code: "action_planning_price", factor: "price_outlook", params: {} },
        ],
      };
      const primary = composeAdvisoryAction("avoid_for_now", "planning", {}, "Kamatis", {
        actionGuidance: backendGuidance,
      });
      expect(primary).not.toBeNull();
      expect(primary.code).toBe("action_planning_severe_weather");
    });
  });

  describe("4. Special cycle states (on hold, completed)", () => {
    it("on-hold crops always return the authoritative 3-item on-hold checklist", () => {
      const weekly = composeWeeklyActions({
        cropStage: "growing",
        phaseCode: "on_hold",
        isOnHold: true,
      });
      expect(weekly).toHaveLength(3);
      expect(weekly[0].key).toBe("farmer.monitoring.action_on_hold_1");
      expect(weekly[1].key).toBe("farmer.monitoring.action_on_hold_2");
      expect(weekly[2].key).toBe("farmer.monitoring.action_on_hold_3");
    });

    it("completed crops return the authoritative 3-item completed checklist", () => {
      const weekly = composeWeeklyActions({
        phaseCode: "completed",
      });
      expect(weekly).toHaveLength(3);
      expect(weekly[0].key).toBe("farmer.monitoring.action_completed_1");
      expect(weekly[1].key).toBe("farmer.monitoring.action_completed_2");
      expect(weekly[2].key).toBe("farmer.monitoring.action_completed_3");
    });
  });

  describe("5. Localization resolution across EN, CEB, TL", () => {
    const allActionKeys = [
      // Planning
      "farmer.actions.monitoring.action_planning_severe_weather",
      "farmer.actions.monitoring.action_planning_supply_price",
      "farmer.actions.monitoring.action_planning_profit_price",
      "farmer.actions.monitoring.action_planning_weather",
      "farmer.actions.monitoring.action_planning_profit",
      "farmer.actions.monitoring.action_planning_price",
      "farmer.actions.monitoring.action_planning_high_arrival",
      "farmer.actions.monitoring.action_planning_high_production",
      "farmer.actions.monitoring.action_planning_supply_combined",
      "farmer.actions.monitoring.action_planning_recommended",
      // Growing
      "farmer.actions.monitoring.action_growing_severe_weather",
      "farmer.actions.monitoring.action_growing_supply_price",
      "farmer.actions.monitoring.action_growing_profit_price",
      "farmer.actions.monitoring.action_growing_weather",
      "farmer.actions.monitoring.action_growing_profit",
      "farmer.actions.monitoring.action_growing_price",
      "farmer.actions.monitoring.action_growing_high_arrival",
      "farmer.actions.monitoring.action_growing_high_production",
      "farmer.actions.monitoring.action_growing_recommended",
      // Pre-Harvest
      "farmer.actions.monitoring.action_preharvest_severe_weather",
      "farmer.actions.monitoring.action_preharvest_supply_price",
      "farmer.actions.monitoring.action_preharvest_profit_price",
      "farmer.actions.monitoring.action_preharvest_weather",
      "farmer.actions.monitoring.action_preharvest_profit",
      "farmer.actions.monitoring.action_preharvest_price",
      "farmer.actions.monitoring.action_preharvest_high_arrival",
      "farmer.actions.monitoring.action_preharvest_high_production",
      "farmer.actions.monitoring.action_preharvest_supply_combined",
      "farmer.actions.monitoring.action_preharvest_recommended",
      // Harvest
      "farmer.actions.monitoring.action_harvest_severe_weather",
      "farmer.actions.monitoring.action_harvest_supply_price",
      "farmer.actions.monitoring.action_harvest_profit_price",
      "farmer.actions.monitoring.action_harvest_weather",
      "farmer.actions.monitoring.action_harvest_profit",
      "farmer.actions.monitoring.action_harvest_price",
      "farmer.actions.monitoring.action_harvest_high_arrival",
      "farmer.actions.monitoring.action_harvest_high_production",
      "farmer.actions.monitoring.action_harvest_supply_combined",
      "farmer.actions.monitoring.action_harvest_recommended",
      // Stage maintenance
      "farmer.monitoring.action_planning_1",
      "farmer.monitoring.action_growing_1",
      "farmer.monitoring.action_pre_harvest_1",
      "farmer.monitoring.action_harvested_1",
      "farmer.monitoring.action_on_hold_1",
      "farmer.monitoring.action_completed_1",
    ];

    it("resolves all action codes in English without returning the raw key", () => {
      for (const key of allActionKeys) {
        const text = t(key, { crop_name: "Kamatis" }, "en");
        expect(text).toBeDefined();
        expect(text).not.toBe(key);
        expect(text.length).toBeGreaterThan(5);
      }
    });

    it("resolves all action codes in Cebuano without returning the raw key", () => {
      for (const key of allActionKeys) {
        const text = t(key, { crop_name: "Kamatis" }, "ceb");
        expect(text).toBeDefined();
        expect(text).not.toBe(key);
        expect(text.length).toBeGreaterThan(5);
      }
    });

    it("resolves all action codes in Tagalog/Filipino without returning the raw key", () => {
      for (const key of allActionKeys) {
        const text = t(key, { crop_name: "Kamatis" }, "tl");
        expect(text).toBeDefined();
        expect(text).not.toBe(key);
        expect(text.length).toBeGreaterThan(5);
      }
    });
  });
});
