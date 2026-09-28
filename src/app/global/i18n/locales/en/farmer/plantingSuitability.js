export const plantingSuitability = {
  "no_data": "No planting data",
  "no_data_desc": "We don't have planting data for this crop yet.",
  "sow_by": "Sow by {date}",
  "sow_on": "Sow on {date}",
  "sow_between": "Sow {from}–{to}",
  "window_opens": "Window opens {date}",
  "suitable_days": "{good} of {total} forecast days look suitable",
  "no_recommendations": "No planting recommendations available right now.",
  "notes_toggle": "Data notes ({count})",

  // weather_risk_level CHECK constraint values
  "risk": {
    "suitable": "Weather looks good",
    "caution": "Weather needs watching",
    "severe": "Weather is a problem"
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.notes.<code>
  "notes": {
    "no_district": "Your farm district is not set, so no local forecast could be matched. Planting suitability is unavailable until your profile records a district.",
    "no_forecast": "No {days}-day forecast is available for {location}, so no crop can be assessed.",
    "no_rules": "No planting data for: {names}. These are not ranked.",
    "no_duration": "No duration recorded for: {names}. Planting windows omitted.",
    "partial_rules": "Partial rule coverage for: {names}. Only the covered risk groups were evaluated."
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.excluded.<code>
  "excluded": {
    "no_rules": "No planting data — this crop has no weather rules.",
    "window_closed": "The sowing window for the {month} harvest closed on {end}.",
    "no_forecast_covers_window": "No forecast covers this crop's sowing window yet.",
    "no_duration": "No planting data — this crop has no duration recorded.",
    "no_data_ranked": "No planting data — excluded from rankings."
  }
};
