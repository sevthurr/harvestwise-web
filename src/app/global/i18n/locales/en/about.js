export const about = {
  title: "About HarvestWise",
  meta: "Decision-Support & Crop Planning System",
  intro_p1: "HarvestWise is a decision-support and crop planning system developed as a Bachelor of Science in Information Technology Capstone Project at the University of Mindanao. It is designed for vegetable farmers and authorized agricultural personnel in Davao City to support more informed planting, monitoring, harvesting, and market-planning decisions.",
  intro_p2: "HarvestWise does not replace the judgment and experience of farmers or official agricultural and weather advisories. It provides additional information that users may consider when making farming decisions.",
  sections: {
    purpose: {
      title: "Our Purpose",
      p1: "HarvestWise was developed to help address problems such as uncoordinated planting schedules, vegetable oversupply, changing market prices, production risk, and limited access to timely decision-support information.",
      p2: "The system combines market, production, weather, and farmer-specific information so that a farmer can better understand the possible conditions surrounding a crop before planting and throughout its production cycle."
    },
    provides: {
      title: "What HarvestWise Provides",
      p1: "For farmers, HarvestWise provides crop planning tools, crop-stage monitoring, production-cost tracking, break-even calculations, price information, short-term price forecasts, localized weather information, and crop planting advisories.",
      factors_intro: "The system evaluates five main advisory factors:",
      factor_1: "1. Price Outlook",
      factor_2: "2. DFTC Arrival Pressure",
      factor_3: "3. Historical Seasonal Production",
      factor_4: "4. Weather Risk",
      factor_5: "5. Profitability or Break-Even Feasibility",
      p2: "The importance of these factors may change depending on the crop's current lifecycle stage and the reliability and availability of the underlying data.",
      p3: "The resulting advisory helps explain whether current conditions support planting, require additional caution, or suggest waiting and reassessing the available information."
    },
    price_market: {
      title: "Price and Market Information",
      p1: "HarvestWise supports short-term Price Outlook horizons of 7, 14, 21, and 28 days.",
      p2: "For each supported horizon, the estimated future price is compared with the average price from the corresponding previous period. For example, a 14-day forecast is compared with the average price from the previous 14 days.",
      p3: "DFTC arrival information is also used to help describe current market supply pressure."
    },
    weather: {
      title: "Weather Information",
      p1: "Farmer-personalized weather information may use the saved coordinates of the farmer's farm to obtain a localized forecast.",
      p2: "Weather Risk in the advisory engine currently evaluates crop-specific temperature, humidity, and wind conditions.",
      p3: "Rainfall information and rain probability may be shown to farmers for awareness and planning, but rainfall does not currently change the Weather Risk classification itself.",
      p4: "During a live personalized weather request, the farmer's saved farm coordinates may be sent to Open-Meteo to retrieve the forecast."
    },
    crops: {
      title: "Current Crop Scope",
      p1: "HarvestWise currently focuses on selected high-priority vegetable commodities, including:",
      list: "Ampalaya, Atsal, Carrots, Chinese Pechay, Kalabasa, Kamatis, Lettuce, Pipino, Repolyo, and Talong.",
      p2: "Available varieties depend on the commodity records configured in the system."
    },
    tech_data: {
      title: "Technology and Data",
      p1: "HarvestWise uses deterministic business rules, crop-specific thresholds, historical datasets, statistical analysis, and pre-trained XGBoost price forecasting models.",
      p2: "HarvestWise does not use a generative AI system or large language model to produce Farmer advisories at runtime.",
      p3: "The system also relies on data and services that may include DFTC market records, agricultural production data, Open-Meteo, OpenStreetMap/Nominatim, and Philippine Standard Geographic Code data."
    },
    limitations: {
      title: "Important Limitations",
      p1: "Forecasts and advisories are estimates and decision-support information, not guarantees.",
      p2: "Actual prices, harvest outcomes, weather conditions, crop performance, supply, and profitability may differ from system estimates because of events that the system cannot predict or control.",
      p3: "Farmers remain responsible for their final planting, production, harvesting, financing, and selling decisions.",
      p4: "For severe weather, emergencies, or official agricultural instructions, users should also follow advisories issued by the appropriate government authorities."
    },
    academic: {
      title: "Academic Project",
      p1: "HarvestWise was developed as a Bachelor of Science in Information Technology Capstone Project at the University of Mindanao.",
      p2: "Its purpose includes academic research, system development, evaluation, and the exploration of practical digital decision-support tools for agriculture.",
      p3: "This description should not be interpreted as a representation that HarvestWise is an official government agricultural service or an official commercial service of the University of Mindanao."
    },
    contact: {
      title: "Contact",
      intro: "For questions, technical concerns, privacy requests, or feedback regarding HarvestWise:",
      email_label: "Email",
      email: "harvestwise.app@gmail.com",
      address_label: "Address",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines"
    }
  }
};
