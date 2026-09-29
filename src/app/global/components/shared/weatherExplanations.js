/**
 * Weather explanations helper for HarvestWise.
 * Provides conversational explanations of temperature, rainfall, and crop/field suitability
 * in conversational Bisaya/Cebuano (ceb), Tagalog (tl), and English (en).
 */

export const COMMODITY_WEATHER_PROFILES = {
  ampalaya: {
    name: "Ampalaya",
    suitTempMin: 22,
    suitTempMax: 30,
    sevTempMin: 5,
    sevTempMax: 39,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 28.8,
  },
  atsal: {
    name: "Atsal",
    suitTempMin: 17,
    suitTempMax: 30,
    sevTempMin: 0,
    sevTempMax: 42,
    cautRain: 15,
    sevRain: 30,
    cautHum: 85,
    sevWind: 28.8,
  },
  carrots: {
    name: "Carrots",
    suitTempMin: 15,
    suitTempMax: 21,
    sevTempMin: -1.2,
    sevTempMax: 35,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 30,
  },
  pechay: {
    name: "Chinese Pechay",
    suitTempMin: 13,
    suitTempMax: 20,
    sevTempMin: -0.6,
    sevTempMax: 25,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 54,
  },
  kalabasa: {
    name: "Kalabasa",
    suitTempMin: 18,
    suitTempMax: 30,
    sevTempMin: 0,
    sevTempMax: 35,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 28.8,
  },
  kamatis: {
    name: "Kamatis",
    suitTempMin: 21,
    suitTempMax: 24,
    sevTempMin: 0,
    sevTempMax: 40,
    cautRain: 15,
    sevRain: 30,
    cautHum: 85,
    sevWind: 39.6,
  },
  lettuce: {
    name: "Lettuce",
    suitTempMin: 18,
    suitTempMax: 22,
    sevTempMin: 0,
    sevTempMax: 33,
    cautRain: 15,
    sevRain: 30,
    cautHum: 95,
    sevWind: 54,
  },
  pipino: {
    name: "Pipino",
    suitTempMin: 18,
    suitTempMax: 30,
    sevTempMin: 0,
    sevTempMax: 38,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 32.4,
  },
  repolyo: {
    name: "Repolyo",
    suitTempMin: 15,
    suitTempMax: 20,
    sevTempMin: 0,
    sevTempMax: 25,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 54,
  },
  talong: {
    name: "Talong",
    suitTempMin: 20,
    suitTempMax: 30,
    sevTempMin: 5,
    sevTempMax: 38,
    cautRain: 15,
    sevRain: 30,
    cautHum: 90,
    sevWind: 28.8,
  },
};

const DEFAULT_PROFILE = {
  name: "Vegetable",
  suitTempMin: 20,
  suitTempMax: 30,
  sevTempMin: 5,
  sevTempMax: 36,
  cautRain: 15,
  sevRain: 30,
  cautHum: 90,
  sevWind: 28.8,
};

export function getCommodityProfile(commodityName) {
  if (!commodityName) return null;
  const s = String(commodityName).toLowerCase();
  if (s.includes("ampalaya") || s.includes("bitter")) return COMMODITY_WEATHER_PROFILES.ampalaya;
  if (s.includes("atsal") || s.includes("bell pepper") || s.includes("pepper")) return COMMODITY_WEATHER_PROFILES.atsal;
  if (s.includes("carrot")) return COMMODITY_WEATHER_PROFILES.carrots;
  if (s.includes("pechay") || s.includes("wongbok")) return COMMODITY_WEATHER_PROFILES.pechay;
  if (s.includes("kalabasa") || s.includes("squash")) return COMMODITY_WEATHER_PROFILES.kalabasa;
  if (s.includes("kamatis") || s.includes("tomato")) return COMMODITY_WEATHER_PROFILES.kamatis;
  if (s.includes("lettuce")) return COMMODITY_WEATHER_PROFILES.lettuce;
  if (s.includes("pipino") || s.includes("cucumber")) return COMMODITY_WEATHER_PROFILES.pipino;
  if (s.includes("repolyo") || s.includes("cabbage")) return COMMODITY_WEATHER_PROFILES.repolyo;
  if (s.includes("talong") || s.includes("eggplant")) return COMMODITY_WEATHER_PROFILES.talong;
  return DEFAULT_PROFILE;
}

export function evaluateSuitability(day, commodityName) {
  const rain = Number(day.rainfallMm ?? day.rainfall_mm ?? 0);
  const tMax = Number(day.tempMax ?? day.temp_max ?? 28);
  const tMin = Number(day.tempMin ?? day.temp_min ?? 22);
  const wind = Number(day.windSpeed ?? day.wind_speed_max_kmh ?? 0);
  const hum = Number(day.humidity ?? day.humidity_pct ?? 75);

  const cfg = getCommodityProfile(commodityName) || DEFAULT_PROFILE;

  const isSevere =
    rain >= cfg.sevRain ||
    tMax >= cfg.sevTempMax ||
    tMin <= cfg.sevTempMin ||
    wind > cfg.sevWind;

  if (isSevere) return "Severe";

  const isCaution =
    rain >= cfg.cautRain ||
    tMax > cfg.suitTempMax ||
    tMin < cfg.suitTempMin ||
    hum >= cfg.cautHum;

  if (isCaution) return "Caution";

  return "Suitable";
}

/**
 * Determine temperature suitability category for a given day.
 * Returns "Suitable", "Caution", or "Severe".
 */
export function getTemperatureStatus(day, commodityName = null) {
  const tMax = Number(day?.tempMax ?? 28);
  const tMin = Number(day?.tempMin ?? 22);
  const cfg = getCommodityProfile(commodityName);
  if (cfg && commodityName) {
    if (tMax >= cfg.sevTempMax || tMin <= cfg.sevTempMin) return "Severe";
    if (tMax > cfg.suitTempMax || tMin < cfg.suitTempMin) return "Caution";
    return "Suitable";
  }
  if (tMax >= 36 || tMin < 18) return "Severe";
  if (tMax >= 32 || tMin < 20) return "Caution";
  return "Suitable";
}

/**
 * Determine rainfall suitability category for a given day.
 * Returns "Suitable", "Caution", or "Severe".
 */
export function getRainfallStatus(day, commodityName = null) {
  const mm = Number(day?.rainfallMm ?? 0);
  const cfg = getCommodityProfile(commodityName);
  if (cfg && commodityName) {
    if (mm >= cfg.sevRain) return "Severe";
    if (mm >= cfg.cautRain) return "Caution";
    return "Suitable";
  }
  if (mm >= 30) return "Severe";
  if (mm >= 15) return "Caution";
  return "Suitable";
}

/**
 * Color classes strictly following:
 * Suitable: Green
 * Caution: Yellow
 * Severe: Red
 */
export function getSuitabilityColor(status) {
  if (status === "Severe") return "text-red-600";
  if (status === "Caution") return "text-yellow-500";
  return "text-emerald-600";
}

/**
 * Conversational explanation of rainfall in mm.
 */
export function explainRainfall(rainfallMm, rainPct, lang = "ceb") {
  const mm = Number(rainfallMm ?? 0);

  if (mm === 0) {
    if (lang === "ceb") {
      return "Walay ulan karong adlawa (0.0 mm). Maayo kaayo kini para sa pagpamala og abot, pag-spray batok peste, ug pag-andam sa yuta.";
    }
    if (lang === "tl") {
      return "Walang inaasahang ulan (0.0 mm). Tamang-tama ito para sa pagpapatuyo ng ani, pag-spray laban sa peste, at paghahanda ng lupa.";
    }
    return "Dry conditions with 0.0 mm rainfall. Favorable for harvesting, sun-drying crops, pest spraying, and land preparation.";
  }

  if (mm <= 5.0) {
    if (lang === "ceb") {
      return `Adunay gamay nga taligsik o hinay nga ulan (${mm.toFixed(1)} mm). Makatabang kini sa kaumog sa yuta ug kasagaran dili makadaot o makabanlas sa abono.`;
    }
    if (lang === "tl") {
      return `May mahinang ambon o ulan (${mm.toFixed(1)} mm). Nakatutulong sa halumigmig ng lupa nang hindi nagdudulot ng baha o pagkaagnas ng abono.`;
    }
    return `Light rain or passing drizzle (${mm.toFixed(1)} mm). Provides gentle soil moisture without causing waterlogging or fertilizer runoff.`;
  }

  if (mm <= 15.0) {
    if (lang === "ceb") {
      return `Kasarangang ulan (${mm.toFixed(1)} mm). Igo ang tubig para sa mga tanom, pero siguroha nga limpyo ug hapsay ang mga kanal aron dili magpundo ang tubig.`;
    }
    if (lang === "tl") {
      return `Katamtamang ulan (${mm.toFixed(1)} mm). Sapat para sa tubig ng mga pananim, ngunit siguraduhing malinis ang mga kanal upang maiwasan ang pagbaha.`;
    }
    return `Moderate rainfall (${mm.toFixed(1)} mm). Meets crop watering needs, but ensure field drainage canals are unobstructed to avoid standing water.`;
  }

  // mm > 15.0
  if (lang === "ceb") {
    return `Kusog nga ulan (${mm.toFixed(1)} mm). Taas ang risgo sa pagbaha ug pagkadaut sa mga gamot. Likayi una ang pag-abono ug susiha dayon ang drainage sa kaumahan.`;
  }
  if (lang === "tl") {
    return `Malakas na pag-ulan (${mm.toFixed(1)} mm). Mataas ang banta ng pagbabaha at pagkababad ng ugat. Ipagpaliban muna ang pagpapataba at linisin agad ang drainage.`;
  }
  return `Heavy rainfall (${mm.toFixed(1)} mm). Elevated risk of waterlogging and root damage. Postpone fertilizer application and clear field drainage immediately.`;
}

/**
 * Conversational explanation of temperature in Celsius.
 */
export function explainTemperature(tempMax, tempMin, commodityName = null, lang = "ceb") {
  const tMax = Math.round(Number(tempMax ?? 28));
  const tMin = Math.round(Number(tempMin ?? 22));
  const cfg = getCommodityProfile(commodityName);

  if (cfg && commodityName) {
    const isOptimal = tMax <= cfg.suitTempMax && tMin >= cfg.suitTempMin;
    const isHot = tMax > cfg.suitTempMax;
    const isCold = tMin < cfg.suitTempMin;

    if (isOptimal) {
      if (lang === "ceb") {
        return `Ang kainit nga moabot sa ${tMax}°C ug kabugnaw sa gabii nga ${tMin}°C sakto kaayo sa kinahanglanon sa ${commodityName} (${cfg.suitTempMin}–${cfg.suitTempMax}°C) para sa paspas ug himsog nga pagtubo.`;
      }
      if (lang === "tl") {
        return `Ang init na aabot sa ${tMax}°C at lamig sa gabi na ${tMin}°C ay angkop na angkop sa kailangan ng ${commodityName} (${cfg.suitTempMin}–${cfg.suitTempMax}°C) para sa mabilis at malusog na paglaki.`;
      }
      return `Daytime high of ${tMax}°C and night low of ${tMin}°C fall within the ideal range (${cfg.suitTempMin}–${cfg.suitTempMax}°C) for ${commodityName}.`;
    }

    if (isHot) {
      if (lang === "ceb") {
        return `Ang kainit nga moabot og ${tMax}°C medyo taas kaysa gusto sa ${commodityName} (hangtod ${cfg.suitTempMax}°C). Patubigi og sayo sa buntag aron dili ma-stress o malaya ang mga dahon.`;
      }
      if (lang === "tl") {
        return `Ang init na aabot sa ${tMax}°C ay mas mataas sa nais ng ${commodityName} (hanggang ${cfg.suitTempMax}°C). Diligan nang maaga sa umaga upang hindi ma-stress ang pananim.`;
      }
      return `Peak temperature of ${tMax}°C exceeds the ideal threshold (${cfg.suitTempMax}°C) for ${commodityName}. Provide early morning irrigation to mitigate thermal stress.`;
    }

    if (isCold) {
      if (lang === "ceb") {
        return `Ang kabugnaw sa gabii (${tMin}°C) ubos kaysa gusto sa ${commodityName} (labing minus ${cfg.suitTempMin}°C). Posibleng mohinay gamay ang pagpamulak o pagtubo sa tanom.`;
      }
      if (lang === "tl") {
        return `Ang lamig sa gabi (${tMin}°C) ay mas mababa sa kailangan ng ${commodityName} (kahit ${cfg.suitTempMin}°C). Maaaring bumagal nang kaunti ang pamumulaklak o paglaki.`;
      }
      return `Nighttime temperature of ${tMin}°C drops below the preferred minimum (${cfg.suitTempMin}°C) for ${commodityName}, which may slightly slow vegetative growth.`;
    }
  }

  // General scenario (No commodity specified)
  if (tMax >= 32) {
    if (lang === "ceb") {
      return `Init kaayo ang panahon nga moabot sa ${tMax}°C sa udto (gabii ${tMin}°C). Himoa ang pagpatubig ug bug-at nga trabaho sa sayong buntag o hapon aron makalikay sa sobrang init.`;
    }
    if (lang === "tl") {
      return `Mataas ang init na aabot sa ${tMax}°C sa tanghali (gabi ${tMin}°C). Magpatubig at tapusin ang mabibigat na gawain sa bukid nang maaga sa umaga o hapon upang makaiwas sa matinding sikat ng araw.`;
    }
    return `High heat conditions reaching ${tMax}°C during the day (${tMin}°C at night). Conduct heavy field operations and irrigation in the early morning or late afternoon.`;
  }

  if (tMax >= 26) {
    if (lang === "ceb") {
      return `Kasarangang kainit nga ${tMax}°C sa udto ug hayahay nga ${tMin}°C sa gabii. Maayo ug komportable kining panahona para sa naandang mga trabaho sa umahan.`;
    }
    if (lang === "tl") {
      return `Katamtamang init na ${tMax}°C sa araw at preskong ${tMin}°C sa gabi. Magandang kondisyon para sa regular na mga gawain sa sakahan.`;
    }
    return `Moderate daytime high of ${tMax}°C and pleasant night temperature of ${tMin}°C. Excellent weather for standard agricultural tasks.`;
  }

  if (lang === "ceb") {
    return `Medyo mabugnaw nga panahon (${tMax}°C / ${tMin}°C). Hayahay ang pagtrabaho sa kaumahan ug dili daling mauga ang kaumog sa yuta.`;
  }
  if (lang === "tl") {
    return `Malamig-lamig na panahon (${tMax}°C / ${tMin}°C). Komportableng magtrabaho sa bukid at hindi mabilis matuyo ang lupa.`;
  }
  return `Cool conditions with daytime temperatures at ${tMax}°C and night at ${tMin}°C. Retains soil moisture well with comfortable field working conditions.`;
}

/**
 * Conversational farming guidance and field outlook.
 */
export function explainGuidance(day, commodityName = null, suitability = null, lang = "ceb") {
  const mm = Number(day.rainfallMm ?? day.rainfall_mm ?? 0);
  const hum = Number(day.humidity ?? day.humidity_pct ?? 0);
  const wind = Number(day.windSpeed ?? day.wind_speed_max_kmh ?? 0);

  if (commodityName) {
    const s = suitability || evaluateSuitability(day, commodityName);
    if (s === "Suitable") {
      if (lang === "ceb") {
        return `Maayo (Suitable): Walay nakitang risgo sa panahon para sa ${commodityName}. Paborable ang kondisyon sa pagpatubo, pag-abono, ug pag-atiman.`;
      }
      if (lang === "tl") {
        return `Maganda (Suitable): Walang nakitang banta sa panahon para sa ${commodityName}. Paborable ang kondisyon sa pagpapatubo, pagpapataba, at pag-aalaga.`;
      }
      return `Suitable: Favorable weather conditions across all monitored parameters for ${commodityName}. Supports normal vegetative growth and field management.`;
    }
    if (s === "Caution") {
      if (lang === "ceb") {
        return `Kinahanglan Bantayan (Caution): Naay pipila ka kondisyon (ulan o kainit) nga kinahanglang bantayan para sa ${commodityName}. Siguroha ang husto nga kanal ug regular nga pag-monitor sa tanom.`;
      }
      if (lang === "tl") {
        return `Kailangang Bantayan (Caution): May ilang kondisyon (ulan o init) na dapat bantayan para sa ${commodityName}. Siguraduhing maayos ang daloy ng tubig at regular na subaybayan ang pananim.`;
      }
      return `Caution: Certain weather indicators exceed optimal bounds for ${commodityName}. Monitor soil saturation, irrigation schedule, and pest/disease activity.`;
    }
    // Severe
    if (lang === "ceb") {
      return `Taas ang Risgo (Severe): Taas ang risgo sa grabeng ulan o kainit nga posibleng makadaot sa ${commodityName}. Paghimo dayon og lakang sama sa paghawan sa mga kanal aron dili malapukan ang tanom.`;
    }
    if (lang === "tl") {
      return `Mataas ang Panganib (Severe): Mataas ang banta ng matinding ulan o init na maaaring makapinsala sa ${commodityName}. Magsagawa agad ng proteksyon tulad ng paglilinis ng drainage.`;
    }
    return `Severe: Adverse weather thresholds triggered for ${commodityName}. Implement field protective measures to prevent root rot, blossom drop, or physical damage.`;
  }

  // General field outlook (no commodity)
  if (lang === "ceb") {
    let text = mm > 5
      ? "Basa ang yuta tungod sa ulan. Siguroha nga hapsay ang mga kanal aron dili magpundo ang tubig sa tanoman."
      : "Maayo ang panahon para sa pag-ani, pag-spray, ug naandang pagtrabaho sa uma.";
    if (hum >= 85) text += " Taas ang kaumog sa hangin, susiha ang mga dahon batok sa agup-op o fungi.";
    if (wind >= 25) text += " Kusog ang hangin, susiha ang mga balag o tuldok sa tanom.";
    return text;
  }

  if (lang === "tl") {
    let text = mm > 5
      ? "Basa ang lupa dulot ng ulan. Siguraduhing hindi babahain ang taniman at malinis ang mga kanal."
      : "Magandang panahon para sa pag-aani, pag-spray, at pangkalahatang gawain sa bukid.";
    if (hum >= 85) text += " Mataas ang halumigmig, bantayan ang mga dahon laban sa fungal disease.";
    if (wind >= 25) text += " Malakas ang hangin, tiyaking matatag ang mga balag at suporta ng pananim.";
    return text;
  }

  let text = mm > 5
    ? "Wet soil conditions expected. Ensure drainage ways are open to prevent standing water."
    : "Clear conditions favorable for harvesting, field spraying, and daily farm maintenance.";
  if (hum >= 85) text += " Elevated humidity; monitor crops for foliar fungal risks.";
  if (wind >= 25) text += " Gusty winds; check trellising and plant supports.";
  return text;
}
