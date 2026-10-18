export const plantingSuitability = {
  "no_data": "Walang datos ng pagtatanom",
  "no_data_desc": "Wala pa kaming datos ng pagtatanom para sa panatelong ito.",
  "sow_by": "Magtanim bago mag- Petsa {date}",
  "sow_on": "Magtanim sa {date}",
  "sow_between": "Magtanim {from}–{to}",
  "window_opens": "Bubukas ang panahon ng pagtatanom sa {date}",
  "suitable_days": "{good} sa {total} na araw ng panahon ang angkop",
  "no_recommendations": "Walang mga mungkahing pananim sa ngayon.",
  "notes_toggle": "Mga tala ng datos ({count})",

  // weather_risk_level CHECK constraint values
  "risk": {
    "suitable": "Maganda ang panahon",
    "caution": "Dapat bantayan ang panahon",
    "severe": "May problema ang panahon"
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.notes.<code>
  "notes": {
    "no_district": "Wala pang nakatakda ng distrito ng iyong bukid, kaya walang lokal na forecast na nahanap. Hindi pa available ang planting suitability hangga't walang nakatala na distrito sa iyong profile.",
    "no_forecast": "Walang {days}-araw na forecast para sa {location}, kaya walang pananim na masusuri.",
    "no_rules": "Walang datos ng pagtatanom para sa: {names}. Hindi ito niraranking.",
    "no_duration": "Walang naitalang duration para sa: {names}. Walang planting window.",
    "partial_rules": "Bahagyang saklaw ng panuntunan para sa: {names}. Tanging ang saklaw na risk group ang sinusuri."
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.excluded.<code>
  "excluded": {
    "no_rules": "Walang datos ng pagtatanom — walang patakaran sa panahon ang panatelong ito.",
    "window_closed": "Nakatapos na ang panahon ng pagtatanom para sa ani sa {month}, noong {end}.",
    "no_forecast_covers_window": "Wala pang forecast na saklaw ang panahon ng pagtatanom ng panatelong ito.",
    "no_duration": "Walang datos ng pagtatanom — walang naitalang duration ang panatelong ito.",
    "no_data_ranked": "Walang datos ng pagtatanom — hindi isinama sa ranking."
  }
};
