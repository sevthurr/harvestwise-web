export const about = {
  title: "Tungkol sa HarvestWise",
  meta: "Decision-Support at Crop Planning System",
  intro_p1: "Ang HarvestWise ay isang decision-support at crop planning system na binuo bilang Bachelor of Science in Information Technology Capstone Project sa University of Mindanao. Dinisenyo ito para sa mga nagtatanim ng gulay at mga awtorisadong agricultural personnel sa Davao City upang makatulong sa mas maayos na pagdedesisyon sa pagtatanim, pagmonitor ng pananim, pag-aani, at pagpaplano sa pagbebenta.",
  intro_p2: "Hindi pinapalitan ng HarvestWise ang karanasan at sariling pagpapasya ng magsasaka, at hindi rin ito kapalit ng opisyal na agricultural o weather advisories. Nagbibigay lamang ang sistema ng karagdagang impormasyon na maaaring isaalang-alang sa paggawa ng desisyon.",
  sections: {
    purpose: {
      title: "Layunin Namin",
      p1: "Binuo ang HarvestWise upang makatulong sa mga problemang tulad ng hindi koordinadong iskedyul ng pagtatanim, sobrang suplay ng gulay, pabago-bagong presyo sa palengke, panganib sa produksyon, at kakulangan ng napapanahong impormasyon para sa pagdedesisyon.",
      p2: "Pinagsasama ng sistema ang impormasyon tungkol sa presyo at palengke, produksyon, panahon, at datos na ibinibigay ng magsasaka upang mas maunawaan ang posibleng kalagayan ng isang pananim bago magtanim at habang nagpapatuloy ang crop cycle."
    },
    provides: {
      title: "Ano ang Ibinibigay ng HarvestWise",
      p1: "Para sa mga magsasaka, nagbibigay ang HarvestWise ng crop planning, crop-stage monitoring, pagtatala ng gastos sa produksyon, break-even calculation, impormasyon sa presyo, short-term price forecast, lokal na impormasyon sa panahon, at crop planting advisory.",
      factors_intro: "Limang pangunahing factor ang sinusuri ng advisory:",
      factor_1: "1. Price Outlook",
      factor_2: "2. DFTC Arrival Pressure",
      factor_3: "3. Historical Seasonal Production",
      factor_4: "4. Weather Risk",
      factor_5: "5. Profitability o Break-Even Feasibility",
      p2: "Maaaring magbago ang bigat o kahalagahan ng bawat factor depende sa kasalukuyang stage ng pananim at sa kalidad, pagiging kumpleto, at availability ng datos.",
      p3: "Tinutulungan ng advisory ang magsasaka na maunawaan kung sinusuportahan ba ng kasalukuyang kondisyon ang pagtatanim, kung kailangan ng dagdag na pag-iingat, o kung mas mabuting maghintay at suriin muli ang impormasyon."
    },
    price_market: {
      title: "Presyo at Impormasyon sa Palengke",
      p1: "May short-term Price Outlook ang HarvestWise para sa 7, 14, 21, at 28 araw.",
      p2: "Sa bawat supported horizon, inihahambing ang tinatayang presyo sa hinaharap sa karaniwang presyo para sa katumbas na nakaraang panahon. Halimbawa, ang 14-day forecast ay inihahambing sa karaniwang presyo ng nakaraang 14 araw.",
      p3: "Ginagamit din ang DFTC arrival information upang makatulong sa pag-unawa sa kasalukuyang pressure ng suplay sa palengke."
    },
    weather: {
      title: "Impormasyon sa Panahon",
      p1: "Para sa personalized weather information, maaaring gamitin ng HarvestWise ang naka-save na coordinates ng bukid upang makakuha ng mas lokal na forecast.",
      p2: "Sa kasalukuyan, sinusuri ng Weather Risk sa advisory engine ang crop-specific na temperature, humidity, at wind conditions.",
      p3: "Maaaring ipakita ang rainfall at posibilidad ng ulan para sa kaalaman at pagpaplano ng magsasaka, ngunit hindi nito kasalukuyang binabago ang mismong Weather Risk classification.",
      p4: "Kapag humihiling ng live personalized weather forecast, maaaring ipadala ang coordinates ng bukid sa Open-Meteo upang makuha ang forecast."
    },
    crops: {
      title: "Kasalukuyang Saklaw ng Pananim",
      p1: "Sa kasalukuyan, nakatuon ang HarvestWise sa piling high-priority vegetable commodities tulad ng:",
      list: "Ampalaya, Atsal, Carrots, Chinese Pechay, Kalabasa, Kamatis, Lettuce, Pipino, Repolyo, at Talong.",
      p2: "Nakadepende sa commodity records na naka-configure sa sistema ang available na variety."
    },
    tech_data: {
      title: "Teknolohiya at Data",
      p1: "Gumagamit ang HarvestWise ng deterministic business rules, crop-specific thresholds, historical datasets, statistical analysis, at pre-trained XGBoost price forecasting models.",
      p2: "Walay generative AI o large language model na gumagawa ng Farmer advisory habang ginagamit ang sistema.",
      p3: "Umaasa rin ang sistema sa datos at mga serbisyong maaaring kabilang ang DFTC market records, agricultural production data, Open-Meteo, OpenStreetMap/Nominatim, at Philippine Standard Geographic Code data."
    },
    limitations: {
      title: "Mahahalagang Limitasyon",
      p1: "Ang mga forecast at advisory ay mga pagtataya at impormasyon para makatulong sa pagdedesisyon. Hindi garantiya ang mga ito ng anumang resulta.",
      p2: "Maaaring maiba ang aktuwal na presyo, ani, kondisyon ng panahon, performance ng pananim, suplay, at kita sa estimate ng sistema dahil sa mga pangyayaring hindi kayang hulaan o kontrolin ng HarvestWise.",
      p3: "Ang magsasaka pa rin ang may huling responsibilidad sa mga desisyon tungkol sa pagtatanim, produksyon, pag-aani, paggastos, at pagbebenta.",
      p4: "Para sa matinding panahon, emergency, o opisyal na agricultural instruction, dapat ding sundin ang advisory ng naaangkop na ahensya ng gobyerno."
    },
    academic: {
      title: "Capstone Project",
      p1: "Ang HarvestWise ay binuo bilang Bachelor of Science in Information Technology Capstone Project sa University of Mindanao.",
      p2: "Kabilang sa layunin nito ang academic research, system development, evaluation, at pag-aaral ng praktikal na paggamit ng digital decision-support tools sa agrikultura.",
      p3: "Hindi ito nangangahulugan na ang HarvestWise ay isang opisyal na agricultural service ng gobyerno o opisyal na commercial service ng University of Mindanao."
    },
    contact: {
      title: "Makipag-ugnayan",
      intro: "Para sa mga tanong, technical concern, privacy request, o feedback tungkol sa HarvestWise:",
      email_label: "Email",
      email: "harvestwise.app@gmail.com",
      address_label: "Address",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines"
    }
  }
};
