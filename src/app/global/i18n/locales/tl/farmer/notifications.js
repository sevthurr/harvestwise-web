export const notifications = {
  title: "Mga Notipikasyon",
  subtitle: "Manatiling updated sa mga alerto sa pananim, panahon, at galaw ng palengke.",
  mark_as_read: "Markahan bilang nabasa na",
  mark_all_read: "Markahan lahat bilang nabasa na",
  all_caught_up: "Nabasa mo na ang lahat",
  no_notifications: "Walang mga notipikasyon sa ngayon.",
  load_error: "Hindi ma-load ang mga notipikasyon. Subukan muli.",
  tag_urgent: "Urgent",
  tag_attention: "Kailangang Bantayan",
  tag_info: "Impormasyon",
  related_to: "May kaugnayan sa",
  why_received: "Bakit mo ito natanggap",
  details: "Mga Detalye",
  view_details: "Tingnan ang Detalye",
  price_change_label: "pagbabago ng presyo",
  category_price: "Pagbabago ng Presyo",
  category_weather: "Alerto sa Panahon",
  category_harvest: "Pag-aani",
  category_price_update: "Bagong Presyo",
  category_arrival: "Suplay sa Palengke",
  category_production: "Panahon ng Produksyon",
  category_planting: "Payo sa Pagtatanim",
  new_notification: "Bagong Notipikasyon",
  new_notification_body: "Mayroon kang bagong notipikasyon.",

  // Price Change
  price_rose_title: "Tumaas ang presyo ng {commodity}",
  price_rose_body: "Ang pinakahuling presyo sa palengke para sa {commodity} ay {latest} PHP/kg, tumaas mula {prev} PHP/kg.",
  price_rose_general_body: "Tumaas ang pinakahuling presyo sa palengke para sa {commodity}.",
  price_dropped_title: "Bumaba ang presyo ng {commodity}",
  price_dropped_body: "Ang pinakahuling presyo sa palengke para sa {commodity} ay {latest} PHP/kg, bumaba mula {prev} PHP/kg.",
  price_dropped_general_body: "Bumaba ang pinakahuling presyo sa palengke para sa {commodity}.",

  // Price Forecast (Preferred Crops)
  forecast_favorable_title: "Paborableng pagtataya sa presyo para sa {commodity}",
  forecast_favorable_body: "Inaasahan sa {horizon}-araw na forecast na tataas ang presyo ng {commodity} sa {midpoint} PHP/kg (+{pct}%). Paborableng sitwasyon para sa iyong paboritong pananim.",
  forecast_unfavorable_title: "Inaasahang pagbaba ng presyo para sa {commodity}",
  forecast_unfavorable_body: "Inaasahan sa {horizon}-araw na forecast na bababa ang presyo ng {commodity} sa {midpoint} PHP/kg ({pct}%). Bantayan ang takbo ng merkado para sa iyong paboritong pananim.",

  // Filters
  filter_all: "Lahat",
  filter_preferred: "Paboritong Pananim",
  filter_unread: "Hindi pa Nabasa",

  // Price Update
  price_update_title: "Bagong presyo para sa {commodity}",
  price_update_body: "Ang na-update na presyo sa palengke para sa {commodity} ay {price} PHP/kg.",
  price_update_date_body: "Ang na-update na presyo sa palengke para sa {commodity} ay available na simula {date}.",
  price_update_general_body: "Ang na-update na presyo sa palengke para sa {commodity} ay available na ngayon.",

  // Arrival Update
  arrival_high_title: "Mataas na suplay sa palengke para sa {commodity}",
  arrival_high_body: "Ang mga delivery sa DFTC para sa {commodity} ay umabot sa mataas na bolyum ({volume} tons) simula {date}. Ang mataas na suplay ay mahalagang isaalang-alang sa pagpaplano ng pag-aani o pagbenta.",

  // Production Update
  production_high_title: "Panahon ng mataas na produksyon para sa {commodity}",
  production_high_body: "Ayon sa datos ng kasaysayan, ang {quarter} ay karaniwang may mataas na produksyon para sa {commodity}. Isaalang-alang ang dami ng suplay sa pagpaplano ng iyong pagtatanim.",

  // Weather Alert
  weather_alert_title: "Alerto sa panahon ({risk}) para sa {commodity}",
  weather_alert_body: "Ang lagay ng panahon ay nagdudulot ng panganib na {risk} para sa {commodity}.",

  // Harvest Reminder
  harvest_t7_title: "Pag-aani ng {commodity} sa loob ng 7 araw",
  harvest_t7_body: "Ang iyong planong {commodity} ay inaasahang maani sa loob ng 7 araw sa {date}. Ihanda ang kagamitan sa pag-aani at transportasyon sa palengke.",
  harvest_t0_title: "Araw ng pag-aani ng {commodity} ngayon",
  harvest_t0_body: "Ang iyong planong {commodity} ay umabot na sa inaasahang araw ng pag-aani ({date}).",
  harvest_ready_title: "Handa na para sa pag-aani ang {commodity}",
  harvest_ready_body: "Ang iyong planong {commodity} ay inaasahang maani sa {date}.",
  harvest_ready_general_body: "Ang iyong planong {commodity} ay inaasahang maani na sa lalong madaling panahon.",
  harvest_logged_title: "Naitala na ang pag-aani ng {commodity}",
  harvest_logged_body: "Magaling! Naitala na ang pag-aani para sa iyong {commodity}.",

  // Planting Advisory
  planting_recommended_title: "Inirerekomendang itanim: {commodity}",
  planting_recommended_body: "Inirerekomenda nang itanim ang {commodity} base sa magandang lagay ng palengke at panahon.",
  planting_advisory_title: "Payo sa pagtatanim para sa {commodity}",
  planting_open_title: "Bukas na ang panahon ng pagtatanim para sa {commodity}",
  planting_easing_title: "Bumubuti ang kondisyon para sa {commodity}",
  planting_hold_title: "Huwag munang magtanim ng {commodity} sa ngayon",
  planting_advisory_body: "Suriin ang lagay ng palengke at panahon para sa pagtatanim ng {commodity}.",
  planting_suitable_body: "Maganda ang kondisyon para sa {commodity} sa susunod na dalawang linggo.",
  planting_severe_body: "Hindi maganda ang tinatayang kondisyon para sa {commodity}. Isaalang-alang ang pagpapaliban o pagprotekta sa pananim.",
  planting_caution_body: "Alanganin ang tinatayang kondisyon para sa {commodity}. Suriin ang payo bago magtanim.",

  // Risk Labels
  risk_caution: "Kailangang Bantayan",
  risk_severe: "Panganib",
  risk_severe_combined: "Malubhang Panganib - Pinagsamang Panganib",
  risk_favorable: "Paborable",
};
