import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { CommodityIllustration } from "../../../global/components/shared/CommodityIllustrations";
import {
  WEATHER_SUITABILITY_CODES,
  normalizeWeatherSuitability,
} from "../../utils/farmerCodes";
import { useLanguage } from "../../../global/contexts/LanguageContext";

export const RISK_CFG = {
  [WEATHER_SUITABILITY_CODES.SUITABLE]: {
    Icon: CheckCircle2,
    color: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Suitable",
  },
  [WEATHER_SUITABILITY_CODES.CAUTION]: {
    Icon: AlertTriangle,
    color: "text-amber-700",
    dot: "bg-amber-400",
    label: "Caution",
  },
  [WEATHER_SUITABILITY_CODES.SEVERE]: {
    Icon: AlertOctagon,
    color: "text-red-600",
    dot: "bg-red-500",
    label: "Severe",
  },
};

export function formatCropAdvisory(crop, lang = "ceb", t) {
  const cropName = crop.crop_name || "Tanom";
  const rawHeadline = crop.headline || "";
  const rawWhy = crop.crop_sensitivity || "";
  const lowerHeadline = rawHeadline.toLowerCase();
  const riskCode = normalizeWeatherSuitability(crop.risk_level);

  // 1. Localize Status
  const statusLabel = t("common.status", {}, "Status");
  const statusVal = t(
    "farmer.factors.weather.status_monitoring",
    {},
    lang === "ceb" ? "Pagbantay" : lang === "tl" ? "Binabantayan" : "Monitoring"
  );

  // 2. Localize Date Range
  const dateRange = t(
    "farmer.factors.weather.next_7_days",
    {},
    lang === "ceb" ? "Sunod 7 ka Adlaw" : lang === "tl" ? "Susunod na 7 Araw" : "Next 7 Days"
  );

  // 3. Localize Headline & Why
  let localizedHeadline = rawHeadline;
  let localizedWhy = rawWhy;

  if (lowerHeadline.includes("temperature") || lowerHeadline.includes(">30") || lowerHeadline.includes("heat") || lowerHeadline.includes(">24") || lowerHeadline.includes(">20")) {
    const tempMatch = rawHeadline.match(/([><=]?\s*\d+°?C?)/i);
    const tempVal = tempMatch ? tempMatch[1] : ">30°C";
    if (lang === "ceb") {
      localizedHeadline = `Ang gitagnang temperatura alang sa ${cropName} kay ${tempVal}`;
      localizedWhy = `Pahimangno: Ang gitagnang temperatura alang sa ${cropName} kay ${tempVal}.`;
    } else if (lang === "tl") {
      localizedHeadline = `Ang tinatayang temperatura para sa ${cropName} ay ${tempVal}`;
      localizedWhy = `Babala: Ang tinatayang temperatura para sa ${cropName} ay ${tempVal}.`;
    } else {
      localizedHeadline = `Forecast temperature for ${cropName} is ${tempVal}`;
      localizedWhy = `Caution: Forecast temperature for ${cropName} is ${tempVal}.`;
    }
  } else if (lowerHeadline.includes("wind")) {
    const windMatch = rawHeadline.match(/(\d+\.?\d*)\s*km\/h/i);
    const windVal = windMatch ? `${windMatch[1]} km/h` : "kusog";
    if (lang === "ceb") {
      localizedHeadline = `Ang hangin posibleng moabot og ${windVal} alang sa ${cropName}`;
      localizedWhy = `Pahimangno: Kusog nga hangin (${windVal}) ang gitagna alang sa ${cropName}.`;
    } else if (lang === "tl") {
      localizedHeadline = `Ang hangin ay maaaring umabot sa ${windVal} para sa ${cropName}`;
      localizedWhy = `Babala: Malakas na hangin (${windVal}) ang tinataya para sa ${cropName}.`;
    } else {
      localizedHeadline = `Wind may reach ${windVal} for ${cropName}`;
      localizedWhy = `Caution: Strong wind (${windVal}) forecast for ${cropName}.`;
    }
  } else if (lowerHeadline.includes("humid") || lowerHeadline.includes("humidity")) {
    if (lang === "ceb") {
      localizedHeadline = `Taas nga kaumog sa hangin ang gitagna alang sa ${cropName}`;
      localizedWhy = `Pahimangno: Taas nga kaumog ang nasinati alang sa ${cropName}; bantayi ang agup-op.`;
    } else if (lang === "tl") {
      localizedHeadline = `Mataas na halumigmig ang tinataya para sa ${cropName}`;
      localizedWhy = `Babala: Mataas na halumigmig para sa ${cropName}; bantayan ang mga sakit.`;
    } else {
      localizedHeadline = `Prolonged high humidity is forecast for ${cropName}`;
      localizedWhy = `Caution: High humidity forecast for ${cropName}; monitor foliar disease.`;
    }
  } else if (riskCode === WEATHER_SUITABILITY_CODES.SEVERE || lowerHeadline.includes("severe") || lowerHeadline.includes("storm") || lowerHeadline.includes("delikado")) {
    if (lang === "ceb") {
      localizedHeadline = `Taas ang risk sa panahon alang sa ${cropName}`;
      localizedWhy = `Pahimangno: Peligro sa kusog nga ulan o grabeng panahon ang gitagna alang sa ${cropName}.`;
    } else if (lang === "tl") {
      localizedHeadline = `Mataas ang panganib sa panahon para sa ${cropName}`;
      localizedWhy = `Babala: Panganib sa malakas na ulan o masamang panahon ang tinataya para sa ${cropName}.`;
    } else {
      localizedHeadline = `Severe weather risk for ${cropName}`;
      localizedWhy = `Caution: Adverse weather conditions forecast for ${cropName}.`;
    }
  } else if (riskCode === WEATHER_SUITABILITY_CODES.CAUTION || lowerHeadline.includes("caution") || lowerHeadline.includes("bantayan")) {
    if (lang === "ceb") {
      localizedHeadline = `Kinahanglan bantayan ang panahon alang sa ${cropName}`;
      localizedWhy = `Pahimangno: Naay mga timailhan sa panahon nga angay bantayan alang sa ${cropName}.`;
    } else if (lang === "tl") {
      localizedHeadline = `Kailangang bantayan ang panahon para sa ${cropName}`;
      localizedWhy = `Babala: May mga kondisyon ng panahon na dapat bantayan para sa ${cropName}.`;
    } else {
      localizedHeadline = `Caution: Monitor weather conditions for ${cropName}`;
      localizedWhy = `Caution: Weather conditions need close monitoring for ${cropName}.`;
    }
  } else if (riskCode === WEATHER_SUITABILITY_CODES.SUITABLE || lowerHeadline.includes("suitable") || lowerHeadline.includes("paborable")) {
    if (lang === "ceb") {
      localizedHeadline = `Paborable ang kahimtang sa panahon alang sa ${cropName}`;
      localizedWhy = `Maayo ang klima ug temperatura para sa maayong pagtubo sa ${cropName}.`;
    } else if (lang === "tl") {
      localizedHeadline = `Maganda ang kondisyon ng panahon para sa ${cropName}`;
      localizedWhy = `Paborable ang klima at temperatura para sa paglaki ng ${cropName}.`;
    } else {
      localizedHeadline = `Favorable weather conditions for ${cropName}`;
      localizedWhy = `Favorable climate and temperature for the healthy growth of ${cropName}.`;
    }
  }

  // 4. 2-3 Realistic Recommended Actions
  let localizedActions = [];
  const lowerCrop = cropName.toLowerCase();

  if (lowerHeadline.includes("temperature") || lowerHeadline.includes(">30") || lowerHeadline.includes("heat") || lowerHeadline.includes(">24") || lowerHeadline.includes(">20")) {
    if (lowerCrop.includes("ampalaya") || lowerCrop.includes("pipino") || lowerCrop.includes("kalabasa")) {
      localizedActions.push(
        lang === "ceb"
          ? "Panalipdi ang mga baging ug balag batok sa kainit ug siguroha ang igo nga kaumog sa yuta."
          : lang === "tl"
          ? "Protektahan ang mga baging at balag mula sa init at panatilihin ang sapat na halumigmig sa lupa."
          : "Protect vines and trellises from heat stress and maintain adequate root-zone moisture."
      );
    } else if (lowerCrop.includes("atsal") || lowerCrop.includes("kamatis") || lowerCrop.includes("talong")) {
      localizedActions.push(
        lang === "ceb"
          ? "Panalipdi ang mga bulak ug nag-unang bunga batok sa kainit aron dili mangahulog o madaot ang pagpamunga."
          : lang === "tl"
          ? "Protektahan ang mga bulaklak at murang bunga mula sa init upang hindi malaglag o mapinsala ang pamumunga."
          : "Protect flowers and emerging fruit set from heat stress to preserve fruit set."
      );
    } else if (lowerCrop.includes("pechay") || lowerCrop.includes("lettuce") || lowerCrop.includes("repolyo")) {
      localizedActions.push(
        lang === "ceb"
          ? "Gamiti og temporaryong shade net (tabon) ug gaan nga pagbisbis aron malikayan ang pag-init ug sayo nga pagpamulak (bolting)."
          : lang === "tl"
          ? "Maglagay ng shade net at bahagyang diligan upang maiwasan ang sobrang init at maagang pamumulaklak (bolting)."
          : "Install temporary shade netting and apply light misting to prevent heat scorch and premature bolting."
      );
    } else {
      localizedActions.push(
        lang === "ceb"
          ? "Panalipdi ang mga gamot ug unod gikan sa kainit ug pabilina ang regular nga kaumog sa yuta."
          : lang === "tl"
          ? "Protektahan ang mga ugat at laman mula sa init at panatilihin ang regular na halumigmig sa lupa."
          : "Protect root zones from heat stress and maintain uniform soil moisture."
      );
    }

    localizedActions.push(
      lang === "ceb"
        ? "Bisbisi kanunay sa sayong kabuntagon o hapon aron mapugngan ang paspas nga pagkaalisngaw sa tubig sa yuta."
        : lang === "tl"
        ? "Diligan tuwing madaling araw o dapithapon upang maiwasan ang mabilis na pagsingaw ng tubig sa lupa."
        : "Irrigate during early mornings or late afternoons to minimize evaporation and maintain root-zone moisture."
    );

    localizedActions.push(
      lang === "ceb"
        ? "Ibutang og mulch (uhot sa humay o uga nga dahon) sa palibot sa punoan aron magpabiling bugnaw ang mga ugat."
        : lang === "tl"
        ? "Maglagay ng mulch (dayami o tuyong dahon) sa paligid ng puno upang mapanatiling malamig ang mga ugat."
        : "Apply organic mulch (rice straw or dried leaves) around plant bases to buffer root temperature and retain moisture."
    );
  } else if (lowerHeadline.includes("wind")) {
    localizedActions.push(
      lang === "ceb"
        ? "Palig-una ang mga balag, tukod, ug mga koral batok sa kusog nga huyop sa hangin."
        : lang === "tl"
        ? "Patibayin ang mga balag, tukod, at suporta laban sa malakas na hangin."
        : "Reinforce trellises, stakes, and windbreaks to minimize mechanical wind damage."
    );
    localizedActions.push(
      lang === "ceb"
        ? "Ihigot og maayo ang mga nag-unang baging ug sanga gamit ang humok nga higot."
        : lang === "tl"
        ? "Itali nang maayos ang mga pangunahing baging at sanga gamit ang malambot na tali."
        : "Secure main vines and lateral branches with soft ties to support frames."
    );
    localizedActions.push(
      lang === "ceb"
        ? "Hawanig daan ang mga agianan sa tubig sa umahan agig pagpangandam sa kusog nga ulan nga moduyog sa hangin."
        : lang === "tl"
        ? "Linisin ang mga daluyan ng tubig sa bukid bilang paghahanda sa ulan na kasama ng hangin."
        : "Clear runoff drainage ditches in anticipation of heavy rainfall accompanying winds."
    );
  } else if (lowerHeadline.includes("humid") || lowerHeadline.includes("humidity")) {
    localizedActions.push(
      lang === "ceb"
        ? "Hawanig tarong ang mga kanal ug drainage aron dali mohubas ang tubig ug dili magpundo sa gamot."
        : lang === "tl"
        ? "Linisin ang mga kanal at padaluyan ng tubig upang mabilis humupa ang tubig at hindi mababad ang ugat."
        : "Deepen and clear field drainage furrows to prevent water stagnation around root zones."
    );
    localizedActions.push(
      lang === "ceb"
        ? "Tangtanga ang mga nadaot o tigulang nga dahon sa ubos aron moarang-arang ang sirkulasyon sa hangin."
        : lang === "tl"
        ? "Tanggalin ang mga lumang dahon sa ibaba upang mapahusay ang sirkulasyon ng hangin sa taniman."
        : "Prune decaying or overcrowded lower leaves to improve canopy ventilation and reduce leaf wetness."
    );
    localizedActions.push(
      lang === "ceb"
        ? "Susiha kanunay ang mga dahon kon dunay timailhan sa agup-op (mildew) o bacterial spot, ug likayi ang pagbisbis sa gabii."
        : lang === "tl"
        ? "Suriing mabuti ang mga dahon para sa senyales ng amag (mildew) o bacterial spot, at iwasan ang pagdidilig sa gabi."
        : "Inspect foliage closely for signs of downy mildew or fungal spot, avoiding evening overhead watering."
    );
  } else {
    const rawActions = crop.recommended_actions && crop.recommended_actions.length > 0
      ? crop.recommended_actions
      : [];

    const translatedActions = rawActions.map((act) => {
      const lower = String(act).toLowerCase();
      if (lower.includes("drainage") && lower.includes("moisture")) {
        return lang === "ceb"
          ? "Bantayi kanunay ang kaumog sa yuta ug drainage sa umahan."
          : lang === "tl"
          ? "Bantayan palagi ang halumigmig ng lupa at drainage sa sakahan."
          : "Monitor field drainage and moisture.";
      }
      if (lower.includes("clear") && lower.includes("drainage")) {
        return lang === "ceb"
          ? "Hawanig tarong ang kanal sa dili pa magtanom."
          : lang === "tl"
          ? "Linisin nang maayos ang kanal bago magtanim."
          : "Clear drainage before planting.";
      }
      if (lower.includes("avoid") && lower.includes("rain")) {
        return lang === "ceb"
          ? "Likayi ang pagtanom panahon sa kusog nga ulan."
          : lang === "tl"
          ? "Iwasang magtanim kapag malakas ang ulan."
          : "Avoid planting during strong rain.";
      }
      return act;
    });

    if (translatedActions.length >= 2) {
      localizedActions = translatedActions;
    } else {
      localizedActions = [
        lang === "ceb"
          ? "Bantayi kanunay ang kaumog sa yuta ug kahimtang sa panahon sa umahan."
          : lang === "tl"
          ? "Bantayan palagi ang halumigmig ng lupa at kondisyon ng panahon sa bukid."
          : "Monitor field moisture and weather conditions regularly.",
        lang === "ceb"
          ? "Siguroha nga limpyo ang mga kanal aron malikayan ang pagpundo sa tubig."
          : lang === "tl"
          ? "Siguruhing malinis ang mga kanal upang maiwasan ang pagkaipon ng tubig."
          : "Ensure drainage canals remain free of debris to prevent water accumulation.",
        lang === "ceb"
          ? "Susiha ang mga tanom alang sa sayong timailhan sa kapit-os sa panahon."
          : lang === "tl"
          ? "Suriin ang mga pananim para sa maagang senyales ng stress sa panahon."
          : "Inspect crops for early signs of temperature or moisture stress.",
      ];
    }
  }

  return {
    statusLabel,
    statusVal,
    dateRange,
    headline: localizedHeadline,
    actions: localizedActions,
    why: localizedWhy,
  };
}

export const CropWeatherCard = ({ crop, isHighlighted }) => {
  const { t, effectiveLanguage, langCode } = useLanguage();
  const currentLang = effectiveLanguage || langCode || "ceb";
  const riskCode = normalizeWeatherSuitability(crop.risk_level);
  const rc = riskCode ? (RISK_CFG[riskCode] || RISK_CFG[WEATHER_SUITABILITY_CODES.SUITABLE]) : null;
  const RiskIcon = rc?.Icon;
  const displayName = crop.variety ? `${crop.crop_name} (${crop.variety})` : crop.crop_name;

  const advisory = formatCropAdvisory(crop, currentLang, t);

  return (
    <div
      id={`crop-weather-${crop.crop_id}`}
      className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] overflow-hidden transition-all duration-700 ease-out ${
        isHighlighted
          ? "bg-emerald-50/70 border-[var(--hw-neutral-200)]"
          : "border-[var(--hw-neutral-200)]"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <CommodityIllustration commodityId={crop.crop_id} className="w-9 h-9 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{displayName}</p>
          <p className="text-[12px] text-[var(--hw-neutral-900)]">
            {advisory.statusLabel}: {advisory.statusVal}
          </p>
          {rc && (
            <div className={`flex items-start gap-1.5 mt-1 ${rc.color}`}>
              {RiskIcon && <RiskIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              <p className="text-[13px] font-semibold leading-snug">{advisory.headline}</p>
            </div>
          )}
          <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{advisory.dateRange}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-3 space-y-1.5">
        <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide mb-2">
          {t("farmer.factors.weather.recommended_actions_title", {}, "Recommended actions")}
        </p>
        {advisory.actions.map((action, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--hw-neutral-900)] flex-shrink-0 mt-1.5" />
            <p className="text-[13px] text-[var(--hw-neutral-900)] leading-snug">{action}</p>
          </div>
        ))}
      </div>

      {/* Why */}
      {advisory.why && (
        <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
          <p className="text-[12px] text-[var(--hw-neutral-900)] italic">"{advisory.why}"</p>
        </div>
      )}
    </div>
  );
};

export default CropWeatherCard;
