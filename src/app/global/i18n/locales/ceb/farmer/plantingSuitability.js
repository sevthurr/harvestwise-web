export const plantingSuitability = {
  "no_data": "Walay datos sa pagtanom",
  "no_data_desc": "Wala pa kami og datos sa pagtanom para sa niini nga tanom.",
  "sow_by": "Tanoma sa wala pa paagi sa {date}",
  "sow_on": "Tanoma sa {date}",
  "sow_between": "Tanoma {from}–{to}",
  "window_opens": "Mug--open ang bintana sa {date}",
  "suitable_days": "{good} sa {total} ka adlaw sa panagtakdan nga maayo",
  "no_recommendations": "Walay rekomenda nga tanom karon.",
  "notes_toggle": "Mga nota sa datos ({count})",

  // weather_risk_level CHECK constraint values
  "risk": {
    "suitable": "Maayo ang panahon",
    "caution": "Kinahanglan bantayi ang panahon",
    "severe": "Problema ang panahon"
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.notes.<code>
  "notes": {
    "no_district": "Wala pa set ang imong distrito saUma, mao nga wala nga lokal nga forecast nga naa. Dili pa available ang planting suitability hangtong mahimong adlawa sa imong profile ang distrito.",
    "no_forecast": "Wala nga {days}-adlaw nga forecast alang sa {location}, mao nga wala nga matanom nga ma-assess.",
    "no_rules": "Walay datos sa pagtanom para sa: {names}. Dili niini nga gi-rank.",
    "no_duration": "Walay gitakda nga duration para sa: {names}. Wala nga planting window.",
    "partial_rules": "Partial nga rule coverage para sa: {names}. Gigi-evaluate lang ang mga covered risk group."
  },

  // Server LocalizedRef codes: farmer.plantingSuitability.excluded.<code>
  "excluded": {
    "no_rules": "Walay datos sa pagtanom — walay weather rules niini nga tanom.",
    "window_closed": "Naugtana na ang sowing window para sa ani sa {month}, sa {end}.",
    "no_forecast_covers_window": "Wala pa nga forecast nga nakaabot sa sowing window niini nga tanom.",
    "no_duration": "Walay datos sa pagtanom — walay gitakda nga duration niini nga tanom.",
    "no_data_ranked": "Walay datos sa pagtanom — gipili gikan sa ranking."
  }
};
