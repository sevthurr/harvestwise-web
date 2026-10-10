export const privacy = {
  title: "Patakaran sa Privacy",
  effective_date_label: "Epektibo Sukad",
  effective_date: "October 9, 2026",
  version_label: "Version",
  version: "1.0",
  intro_p1: "Girespeto sa HarvestWise ang privacy sa mga user ug responsable nga pagdumala sa personal nga impormasyon.",
  intro_p2: "Ang HarvestWise usa ka Bachelor of Science in Information Technology Capstone Project nga gihimo sa University of Mindanao. Kini nga Patakaran sa Privacy nagpasabot unsang impormasyon ang kolektahon ug gamiton sa HarvestWise, nganong gikinahanglan kini, asa kini mahimong ipadala, unsaon kini pagpanalipod, hangtod kanus-a kini mahimong tipigan, ug unsang mga katungod ug kapilian ang naa sa user.",
  intro_p3: "Paggamit nimo sa HarvestWise, nagpamatuod ka nga nabasa nimo kini nga Patakaran sa Privacy.",
  sections: {
    s1: {
      title: "1. IMPORMASYON NGA AMONG GIPROSESO",
      intro: "Depende sa imong role ug sa features nga imong gamiton, mahimong iproseso sa HarvestWise ang:",
      group1_title: "Impormasyon sa account ug profile:",
      group1_items: [
        "email address",
        "phone number",
        "password nga gitipigan sa hashed form",
        "pangalan ug profile information",
        "profile picture",
        "piniling language",
        "text-size preference",
        "impormasyon para sa account ug authentication security"
      ],
      group2_title: "Impormasyon sa mag-uuma ug uma:",
      group2_items: [
        "first, middle, ug last name ug suffix kung adunay gi-input",
        "gidak-on sa uma",
        "city",
        "district",
        "barangay",
        "purok o sitio",
        "street",
        "latitude ug longitude sa uma",
        "kasagarang lugar sa pagbaligya o buyer"
      ],
      group3_title: "Impormasyon sa crop ug produksyon:",
      group3_items: [
        "crop plans",
        "planado ug aktuwal nga petsa sa pagtanom",
        "gilaom nga petsa sa ani",
        "bahin sa uma nga gigamit sa crop",
        "gilaom nga gidaghanon sa ani",
        "gilaom nga farmgate price",
        "production costs",
        "break-even information",
        "aktuwal nga petsa sa ani",
        "aktuwal nga gidaghanon sa ani",
        "aktuwal nga presyo sa pagbaligya"
      ],
      group4_title: "Impormasyon sa staff:",
      group4_desc: "Ang awtorisadong DFTC ug administrative users mahimong maghatag usab og pangalan, position, email, ug ubang account information nga gikinahanglan sa ilang role.",
      group5_title: "Technical ug security information:",
      group5_desc: "Mahimong iproseso sa HarvestWise ang session identifiers, authentication-token information, IP address, browser o device information, login attempts, security lockouts, audit records, ug notification history.",
      group6_title: "Browser ug offline information:",
      group6_desc: "Naggamit ang HarvestWise og browser storage ug Progressive Web App caching para sa authentication, preferences, ug offline access sa piniling impormasyon sa sistema."
    },
    s2: {
      title: "2. NGANONG GIGAMIT ANG IMPORMASYON",
      intro: "Gigamit ang impormasyon aron:",
      items: [
        "makahimo ug makadumala sa user account;",
        "ma-authenticate ang user ug maprotektahan ang account;",
        "mahatag ang crop planning ug crop monitoring;",
        "makalkulo ang production cost ug break-even;",
        "makahimo og personalized decision-support advisory;",
        "makahatag og localized weather information;",
        "mapakita ang presyo ug impormasyon sa palengke;",
        "makahatag og system notifications;",
        "mapadayon ang security ug audit records;",
        "masulbad ang technical problems;",
        "masuportahan ang academic evaluation, research, ug pagpaayo sa sistema; ug",
        "matubag ang support, privacy, ug account-related requests."
      ],
      conclusion: "Ang impormasyon gamiton lamang sa mga katuyoan nga may kalabotan sa pag-operate, seguridad, evaluation, ug lehitimong academic use sa HarvestWise."
    },
    s3: {
      title: "3. LOKASYON SA UMA UG EXACT COORDINATES",
      p1: "Mahimong tipigan sa HarvestWise ang farm location nga gihatag sa mag-uuma, lakip ang barangay, district, purok o sitio, street, latitude, ug longitude.",
      p2: "Kung pilion sa user ang \"Use GPS Location,\" mangayo una ang browser og permission sa location.",
      p3: "Pwede gihapon gamiton ang manual location kung dili available ang GPS o kung dili gusto sa mag-uuma nga gamiton ang device location.",
      p4: "Para sa live personalized weather information, mahimong ipadala ang latitude ug longitude sa uma ngadto sa Open-Meteo.",
      p5: "Para sa address lookup o reverse geocoding, mahimong ipadala ang coordinates o address-search text ngadto sa OpenStreetMap/Nominatim.",
      p6: "Ang exact location gamiton lamang kung gikinahanglan sa location-related features sa HarvestWise."
    },
    s4: {
      title: "4. EXTERNAL SERVICES",
      intro: "Ang HarvestWise naggamit o mahimong mogamit sa mosunod:",
      open_meteo_title: "Open-Meteo",
      open_meteo_desc: "Makadawat sa coordinates sa uma para sa live Farmer weather request, o sa configured district coordinates para sa background weather synchronization. Gigamit kini sa pagkuha sa weather forecast ug related weather information.",
      osm_title: "OpenStreetMap / Nominatim",
      osm_desc: "Mahimong makadawat sa coordinates o location-search text aron mahimo nga readable nga geographic information ang lokasyon o aron makit-an ang manually entered address.",
      psgc_title: "Philippine Standard Geographic Code (PSGC)",
      psgc_desc: "Gigamit isip source sa opisyal nga geographic reference data sama sa mga barangay sa Davao City. Dili kinahanglan ang personal nga impormasyon para sa static barangay-data request mismo.",
      supabase_title: "Supabase",
      supabase_desc: "Mahimong magproseso sa email ug authentication-related information sa awtorisadong staff para sa OTP o staff invitation kung enabled kini nga features.",
      cloudinary_title: "Cloudinary",
      cloudinary_desc: "Kung naka-configure sa deployment, mahimong i-upload sa Cloudinary ang profile image nga gipili sa user para sa image storage.",
      conclusion: "Kini nga mga serbisyo adunay kaugalingong privacy ug service terms."
    },
    s5: {
      title: "5. AUTOMATED DECISION-SUPPORT PROCESSING",
      p1: "Naggamit ang HarvestWise og automated analytical processing sa paghimo sa crop advisory.",
      p2: "Gi-evaluate sa advisory engine ang mga factor sama sa Price Outlook, DFTC Arrival Pressure, Historical Seasonal Production, Weather Risk, ug Profitability.",
      p3: "Mahimong usbon sa sistema ang relative importance sa matag factor depende sa crop lifecycle stage ug sa pagkaanaa ug reliability sa datos.",
      p4: "Naggamit usab ang HarvestWise og pre-trained XGBoost models para sa short-term price forecasting.",
      p5: "Walay generative AI o large language model nga nagahimo sa Farmer advisory decision sa runtime.",
      p6: "Decision-support information lamang ang advisory. Dili kini legal nga desisyon alang sa mag-uuma ug dili kini garantiya sa farming, financial, o market outcome."
    },
    s6: {
      title: "6. KINSAY MAHIMONG MAKATAN-AW O MAKADAWAT SA IMPORMASYON",
      p1: "Mahimong iproseso ang personal nga impormasyon sa awtorisadong HarvestWise project members, awtorisadong agricultural o system personnel kung gikinahanglan sa ilang role, ug sa external services nga gihisgutan niini nga Policy kung gikinahanglan para sa usa ka feature.",
      p2: "Mahimong ihatag usab ang impormasyon kung gikinahanglan sa balaod o pinaagi sa balidong request gikan sa awtorisadong ahensya.",
      p3: "Ang access limitado lamang sa impormasyon nga makatarunganong gikinahanglan sa trabaho o purpose sa user."
    },
    s7: {
      title: "7. PAGTIPIG SA DATOS",
      p1: "Tipigan sa HarvestWise ang personal nga impormasyon samtang active ang account ug samtang kinahanglan pa kini para sa mga purpose nga gihisgutan niini nga Policy.",
      p2: "Para sa inactive accounts, policy sa HarvestWise project nga i-delete o i-anonymize ang identifying personal information dili molapas sa duha ka tuig gikan sa katapusang meaningful account activity, gawas kung adunay makatarunganong legal, security, academic, o research nga rason aron mas dugay kini tipigan.",
      p3: "Ang security ug audit records kasagarang mahimong tipigan hangtod 12 ka bulan, gawas kung kinahanglan kini mas dugay tungod sa investigation, security incident, legal obligation, o lehitimong academic requirement.",
      p4: "Ang authentication credentials ug session-related records mo-expire o tangtangon sumala sa ilang technical lifecycle.",
      p5: "Sa pagkakaron, ang retention ug deletion mahimong dumalahon manually sa HarvestWise project team imbes nga pinaagi sa fully automated database-purging process.",
      p6: "Ang datos nga tinuod nang na-anonymize o na-aggregate ug dili na makaila sa usa ka tawo mahimong tipigan para sa academic, statistical, system evaluation, o agricultural research."
    },
    s8: {
      title: "8. PAG-DELETE SA ACCOUNT",
      p1: "Ang mag-uuma mahimong mangayo nga ma-delete ang account pinaagi sa:",
      email: "harvestwise.app@gmail.com",
      p2: "Mahimong mangayo ang HarvestWise og reasonable verification sa dili pa prosesoha ang deletion aron malikayan nga laing tawo ang magpa-delete sa imong account.",
      p3: "Human ma-verify ug makompleto ang deletion request, ang identifying account information, contact information, ug exact farm-location information tangtangon o himuong dili na makaila sa user, gawas sa impormasyon nga kinahanglan pa tipigan tungod sa balidong legal o lehitimong rason.",
      p4: "Ang crop, cost, harvest, o ubang agricultural records mahimo lamang ipadayon og tipig kung na-anonymize o na-aggregate na kini ug dili na makatarunganong ma-link balik sa mag-uuma.",
      p5: "Ang current in-app deletion request dili angay ihulagway nga diha-diha nga awtomatikong pagtangtang sa database gawas kon kini nga katakos gipatuman."
    },
    s9: {
      title: "9. SEGURIDAD",
      p1: "Naggamit ang HarvestWise og makatarunganong technical ug organizational safeguards nga angay sa klase sa project ug impormasyon nga giproseso.",
      p2: "Lakip sa kasamtangang safeguards ang password hashing, authenticated API access, role-based authorization, token rotation ug revocation, security lockouts, audit logging, ug multi-factor authentication para sa supported staff accounts.",
      p3: "Walay internet-based nga sistema nga makagarantiya og hingpit nga seguridad. Kinahanglan protektahan sa user ang iyang account credentials ug i-report dayon kung adunay suspetsa nga unauthorized access."
    },
    s10: {
      title: "10. IMONG MGA KATUNGOD SA PRIVACY",
      intro: "Depende sa applicable Philippine data-protection law, mahimo kang adunay katungod nga:",
      items: [
        "mahibalo kung giunsa pagproseso ang imong personal data;",
        "mangayo og access sa personal data nga gitipigan bahin kanimo;",
        "mangayo og correction kung sayop o kulang ang impormasyon;",
        "mosupak sa pipila ka klase sa processing kung applicable;",
        "mangayo og erasure o blocking kung gitugotan sa balaod;",
        "mangayo og kopya o portability sa personal data kung applicable;",
        "mangayo og angay nga remedyo o damages kung gitugotan sa balaod; ug",
        "magsumite og reklamo sa National Privacy Commission."
      ],
      p1: "Wala pa karon ang fully automated self-service personal-data export sa HarvestWise.",
      p2: "Para sa access, correction, portability, deletion, o uban pang privacy concern:",
      email: "harvestwise.app@gmail.com"
    },
    s11: {
      title: "11. KATUKMA SA IMPORMASYON",
      p1: "Gidasig ang mga user nga ipadayon nga sakto ug updated ang ilang profile, farm location, crop plans, production costs, ug ubang impormasyon.",
      p2: "Ang sayop o kulang nga datos mahimong makapakunhod sa katukma o kapuslanan sa HarvestWise advisory ug calculations."
    },
    s12: {
      title: "12. MGA BATA UG AUTHORIZED USERS",
      p1: "Ang HarvestWise gidesinyo para sa agricultural users ug awtorisadong system personnel.",
      p2: "Kung ang usa ka user dili pa legal nga makahimo sa gikinahanglang paghatag sa personal information o consent nga siya ra, kinahanglan tabangan o awtorisahan siya sa angay nga parent, guardian, o authorized representative sumala sa applicable law."
    },
    s13: {
      title: "13. MGA KAUSABAN NIINI NGA POLICY",
      p1: "Mahimong i-update ang Patakaran sa Privacy kung mausab ang system functionality, information practices, legal requirements, o project arrangements.",
      p2: "Ipakita niini nga page ang kasamtangang version ug effective date.",
      p3: "Kung adunay dakong kausaban, ipahibalo kini pinaagi sa sistema kung makatarunganong mahimo."
    },
    s14: {
      title: "14. KONTAK",
      contact_title: "Privacy and Support Contact:",
      email: "harvestwise.app@gmail.com",
      address_title: "Address:",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines",
      footer_note: "Ang HarvestWise usa ka Bachelor of Science in Information Technology Capstone Project nga gihimo sa University of Mindanao."
    }
  }
};
