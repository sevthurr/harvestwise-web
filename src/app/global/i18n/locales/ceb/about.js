export const about = {
  title: "Mahitungod sa HarvestWise",
  meta: "Decision-Support ug Crop Planning System",
  intro_p1: "Ang HarvestWise usa ka decision-support ug crop planning system nga gihimo isip Bachelor of Science in Information Technology Capstone Project sa University of Mindanao. Gidesinyo kini para sa mga mag-uuma og gulay ug awtorisadong agricultural personnel sa Davao City aron makatabang sa mas maayong pagdesisyon sa pagtanom, pagmonitor sa tanom, pag-ani, ug pagplano sa pagbaligya.",
  intro_p2: "Dili ilisan sa HarvestWise ang kasinatian ug kaugalingong paghukom sa mag-uuma, ug dili usab kini puli sa opisyal nga agricultural o weather advisories. Dugang nga impormasyon ang gihatag sa sistema nga mahimong gamiton sa mag-uuma sa iyang pagdesisyon.",
  sections: {
    purpose: {
      title: "Among Tumong",
      p1: "Gihimo ang HarvestWise aron makatabang sa mga problema sama sa parehas o dili koordinadong panahon sa pagtanom, sobra nga suplay sa gulay, mausab-usab nga presyo sa palengke, risgo sa produksyon, ug kakulang sa tukma sa panahon nga impormasyon para sa pagdesisyon.",
      p2: "Gihiusa sa sistema ang datos sa presyo ug palengke, produksyon, panahon, ug impormasyon nga gi-input sa mag-uuma aron mas masabtan niya ang posibleng kahimtang sa usa ka tanom sa dili pa magtanom ug samtang nagpadayon ang crop cycle."
    },
    provides: {
      title: "Unsa ang Gihatag sa HarvestWise",
      p1: "Para sa mga mag-uuma, adunay crop planning, pagmonitor sa crop stage, pagtala sa gasto sa produksyon, break-even calculation, impormasyon sa presyo, short-term price forecast, lokal nga impormasyon sa panahon, ug crop planting advisory ang HarvestWise.",
      factors_intro: "Lima ka importanteng factor ang gi-evaluate sa advisory:",
      factor_1: "1. Price Outlook",
      factor_2: "2. DFTC Arrival Pressure",
      factor_3: "3. Historical Seasonal Production",
      factor_4: "4. Weather Risk",
      factor_5: "5. Profitability o Break-Even Feasibility",
      p2: "Mahimong mausab ang kabug-aton o importansya sa matag factor depende sa kasamtangang stage sa tanom ug sa kalidad, pagka-kompleto, ug pagkaanaa sa datos.",
      p3: "Ang resulta sa advisory makatabang sa pagpasabot kung maayo ba ang kasamtangang kondisyon para mopadayon, kung kinahanglan mas magbantay, o kung mas maayong maghulat ug susihon pag-usab ang impormasyon."
    },
    price_market: {
      title: "Presyo ug Impormasyon sa Palengke",
      p1: "Ang HarvestWise adunay short-term Price Outlook para sa 7, 14, 21, ug 28 ka adlaw.",
      p2: "Sa matag supported horizon, ang tantiya sa umaabot nga presyo ikumpara sa kasagarang presyo sa parehas nga gidaghanon sa miaging mga adlaw. Pananglitan, ang 14-day forecast ikumpara sa kasagarang presyo sa miaging 14 ka adlaw.",
      p3: "Gigamit usab ang DFTC arrival information aron makatabang sa pagpakita sa kasamtangang pressure sa suplay sa palengke."
    },
    weather: {
      title: "Impormasyon sa Panahon",
      p1: "Para sa personalized weather information, mahimong gamiton sa HarvestWise ang naka-save nga coordinates sa uma aron makakuha og mas lokal nga forecast.",
      p2: "Sa kasamtangan, ang Weather Risk sa advisory engine nagtan-aw sa crop-specific nga temperature, humidity, ug wind conditions.",
      p3: "Ang rainfall ug posibilidad sa ulan mahimong ipakita para sa kahibalo ug pagplano sa mag-uuma, apan dili pa kini direktang makausab sa Weather Risk classification.",
      p4: "Kung mangayo og live personalized weather forecast, mahimong ipadala ang coordinates sa uma ngadto sa Open-Meteo aron makuha ang forecast."
    },
    crops: {
      title: "Kasamtangang Sakop sa mga Tanom",
      p1: "Sa pagkakaron, ang HarvestWise nakatutok sa piniling high-priority vegetable commodities sama sa:",
      list: "Ampalaya, Atsal, Carrots, Chinese Pechay, Kalabasa, Kamatis, Lettuce, Pipino, Repolyo, ug Talong.",
      p2: "Ang available nga variety magdepende sa commodity records nga gi-configure sa sistema."
    },
    tech_data: {
      title: "Teknolohiya ug Datos",
      p1: "Ang HarvestWise naggamit og deterministic business rules, crop-specific thresholds, historical datasets, statistical analysis, ug pre-trained XGBoost price forecasting models.",
      p2: "Walay generative AI o large language model nga nagahimo sa Farmer advisory sa runtime.",
      p3: "Naggamit usab ang sistema og datos ug serbisyo nga mahimong gikan sa DFTC market records, agricultural production data, Open-Meteo, OpenStreetMap/Nominatim, ug Philippine Standard Geographic Code data."
    },
    limitations: {
      title: "Importante nga mga Limitasyon",
      p1: "Ang forecast ug advisory mga tantiya ug impormasyon para makatabang sa pagdesisyon. Dili kini garantiya sa resulta.",
      p2: "Ang aktuwal nga presyo, ani, kahimtang sa panahon, performance sa tanom, suplay, ug kita mahimong lahi sa estimate sa sistema tungod sa mga panghitabo nga dili matagna o makontrol sa HarvestWise.",
      p3: "Ang mag-uuma gihapon ang adunay katapusang responsibilidad sa desisyon bahin sa pagtanom, pag-atiman, pag-ani, paggasto, ug pagbaligya.",
      p4: "Kung adunay grabeng panahon, emergency, o opisyal nga agricultural instruction, sundon usab ang advisory sa tukmang ahensya sa gobyerno."
    },
    academic: {
      title: "Capstone Project",
      p1: "Ang HarvestWise gihimo isip Bachelor of Science in Information Technology Capstone Project sa University of Mindanao.",
      p2: "Kabahin sa tumong niini ang academic research, system development, evaluation, ug pagsusi kung unsaon paggamit sa digital decision-support tools sa agrikultura.",
      p3: "Dili pasabot niini nga ang HarvestWise usa ka opisyal nga agricultural service sa gobyerno o opisyal nga commercial service sa University of Mindanao."
    },
    contact: {
      title: "Kontak",
      intro: "Para sa pangutana, technical concern, privacy request, o feedback bahin sa HarvestWise:",
      email_label: "Email",
      email: "harvestwise.app@gmail.com",
      address_label: "Address",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines"
    }
  }
};
