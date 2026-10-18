export const privacy = {
  title: "Patakaran sa Privacy",
  effective_date_label: "Petsa ng Pagkabisa",
  effective_date: "October 9, 2026",
  version_label: "Version",
  version: "1.0",
  intro_p1: "Iginagalang ng HarvestWise ang privacy ng mga gumagamit nito at responsable itong humawak ng personal na impormasyon.",
  intro_p2: "Ang HarvestWise ay isang Bachelor of Science in Information Technology Capstone Project na binuo sa University of Mindanao. Ipinapaliwanag ng Patakaran sa Privacy na ito kung anong impormasyon ang kinokolekta at ginagamit ng HarvestWise, bakit ito kailangan, saan ito maaaring ipadala, paano ito pinoprotektahan, gaano ito katagal maaaring itago, at kung anong mga karapatan at pagpipilian ang mayroon ang user.",
  intro_p3: "Sa paggamit ng HarvestWise, kinikilala mong nabasa mo ang Patakaran sa Privacy na ito.",
  sections: {
    s1: {
      title: "1. IMPORMASYONG AMING PINOPROSESO",
      intro: "Depende sa iyong role at mga feature na ginagamit mo, maaaring iproseso ng HarvestWise ang:",
      group1_title: "Impormasyon sa account at profile:",
      group1_items: [
        "email address",
        "phone number",
        "password na naka-hash",
        "pangalan at profile information",
        "profile picture",
        "piniling language",
        "text-size preference",
        "account at authentication-security information"
      ],
      group2_title: "Impormasyon tungkol sa magsasaka at bukid:",
      group2_items: [
        "first, middle, at last name at suffix kapag ibinigay",
        "laki ng bukid",
        "city",
        "district",
        "barangay",
        "purok o sitio",
        "street",
        "latitude at longitude ng bukid",
        "karaniwang lugar ng pagbebenta o buyer"
      ],
      group3_title: "Impormasyon tungkol sa crop at produksyon:",
      group3_items: [
        "crop plans",
        "planado at aktuwal na petsa ng pagtatanim",
        "inaasahang petsa ng ani",
        "lawak ng bukid na ginagamit para sa crop",
        "inaasahang dami ng ani",
        "inaasahang farmgate price",
        "production costs",
        "break-even information",
        "aktuwal na petsa ng ani",
        "aktuwal na dami ng ani",
        "aktuwal na presyo ng pagbebenta"
      ],
      group4_title: "Impormasyon ng staff:",
      group4_desc: "Ang mga awtorisadong DFTC at administrative users ay maaari ring magbigay ng pangalan, position, email, at iba pang account information na kailangan para sa kanilang role.",
      group5_title: "Technical at security information:",
      group5_desc: "Maaaring iproseso ng HarvestWise ang session identifiers, authentication-token information, IP address, browser o device information, login attempts, security lockouts, audit records, at notification history.",
      group6_title: "Browser at offline information:",
      group6_desc: "Gumagamit ang HarvestWise ng browser storage at Progressive Web App caching para sa authentication, preferences, at offline access sa piling impormasyon ng sistema."
    },
    s2: {
      title: "2. PAANO NAMIN GINAGAMIT ANG IMPORMASYON",
      intro: "Ginagamit ang impormasyon upang:",
      items: [
        "gumawa at mamahala ng user account;",
        "i-authenticate ang user at protektahan ang account;",
        "magbigay ng crop planning at crop monitoring;",
        "kalkulahin ang production costs at break-even;",
        "gumawa ng personalized decision-support advisory;",
        "magbigay ng localized weather information;",
        "magpakita ng presyo at impormasyon sa palengke;",
        "magbigay ng system notifications;",
        "mapanatili ang security at audit records;",
        "ayusin ang technical problems;",
        "suportahan ang academic evaluation, research, at pagpapahusay ng sistema; at",
        "sagutin ang support, privacy, at account-related requests."
      ],
      conclusion: "Ang impormasyon ay dapat gamitin lamang para sa mga layuning may kaugnayan sa pagpapatakbo, seguridad, evaluation, at lehitimong academic use ng HarvestWise."
    },
    s3: {
      title: "3. LOKASYON NG BUKID AT EXACT COORDINATES",
      p1: "Maaaring itago ng HarvestWise ang farm location na ibinigay ng magsasaka, kabilang ang barangay, district, purok o sitio, street, latitude, at longitude.",
      p2: "Kapag pinili ng user ang \"Use GPS Location,\" hihingi muna ng location permission ang browser.",
      p3: "Maaaring gamitin ang manual location entry kung hindi available ang GPS o kung ayaw gamitin ng magsasaka ang device location.",
      p4: "Para sa live personalized weather information, maaaring ipadala ang latitude at longitude ng bukid sa Open-Meteo.",
      p5: "Para sa address lookup o reverse geocoding, maaaring ipadala ang coordinates o address-search text sa OpenStreetMap/Nominatim.",
      p6: "Ginagamit lamang ang exact location kung kailangan para sa location-related features ng HarvestWise."
    },
    s4: {
      title: "4. EXTERNAL SERVICES",
      intro: "Gumagamit o maaaring gumamit ang HarvestWise ng mga sumusunod:",
      open_meteo_title: "Open-Meteo",
      open_meteo_desc: "Maaaring makatanggap ng farm coordinates para sa live Farmer weather request, o configured district coordinates para sa background weather synchronization. Ginagamit ito upang kumuha ng weather forecast at kaugnay na weather information.",
      osm_title: "OpenStreetMap / Nominatim",
      osm_desc: "Maaaring makatanggap ng coordinates o location-search text upang gawing readable geographic information ang location o hanapin ang manually entered address.",
      psgc_title: "Philippine Standard Geographic Code (PSGC)",
      psgc_desc: "Ginagamit bilang source ng opisyal na geographic reference data gaya ng mga barangay ng Davao City. Hindi kailangan ang personal information para sa static barangay-data request mismo.",
      supabase_title: "Supabase",
      supabase_desc: "Maaaring magproseso ng email at authentication-related information ng awtorisadong staff para sa OTP o staff invitation kapag enabled ang mga feature na iyon.",
      cloudinary_title: "Cloudinary",
      cloudinary_desc: "Kung naka-configure sa deployment, maaaring i-upload sa Cloudinary ang profile image na pinili ng user para sa image storage.",
      conclusion: "May sarili nilang privacy at service terms ang mga serbisyong ito."
    },
    s5: {
      title: "5. AUTOMATED DECISION-SUPPORT PROCESSING",
      p1: "Gumagamit ang HarvestWise ng automated analytical processing upang gumawa ng crop advisory.",
      p2: "Sinusuri ng advisory engine ang mga factor gaya ng Price Outlook, DFTC Arrival Pressure, Historical Seasonal Production, Weather Risk, at Profitability.",
      p3: "Maaaring baguhin ng sistema ang relative importance ng bawat factor depende sa crop lifecycle stage at sa availability at reliability ng data.",
      p4: "Gumagamit din ang HarvestWise ng pre-trained XGBoost models para sa short-term price forecasting.",
      p5: "Walang generative AI o large language model na gumagawa ng Farmer advisory decision habang ginagamit ang sistema.",
      p6: "Decision-support information lamang ang advisory. Hindi ito legal na desisyon para sa magsasaka at hindi nito ginagarantiya ang farming, financial, o market outcome."
    },
    s6: {
      title: "6. PAANO MAAARING MAIBAHAGI ANG IMPORMASYON",
      p1: "Maaaring iproseso ang personal information ng mga awtorisadong HarvestWise project members, awtorisadong agricultural o system personnel kapag kailangan para sa kanilang role, at ng external services na binanggit sa Policy na ito kapag kailangan para sa isang feature.",
      p2: "Maaari ring ibigay ang impormasyon kapag kinakailangan ng applicable law o ng isang balidong request mula sa awtorisadong ahensya.",
      p3: "Dapat limitado ang access sa impormasyong makatuwirang kailangan para sa nakatalagang purpose o role."
    },
    s7: {
      title: "7. PAGTATAGO NG DATA",
      p1: "Itinatago ng HarvestWise ang personal information habang active ang account at habang kailangan pa ang impormasyon para sa mga layuning nakasaad sa Policy na ito.",
      p2: "Para sa inactive accounts, policy ng HarvestWise project na i-delete o i-anonymize ang identifying personal information nang hindi lalampas sa dalawang taon mula sa huling meaningful account activity, maliban kung may makatuwirang legal, security, academic, o research reason upang mas matagal itong itago.",
      p3: "Ang security at audit records ay karaniwang maaaring itago nang hanggang 12 buwan, maliban kung kailangan nang mas matagal para sa investigation, security incident, legal obligation, o lehitimong academic requirement.",
      p4: "Ang authentication credentials at session-related records ay nag-e-expire o tinatanggal ayon sa kanilang technical lifecycle.",
      p5: "Sa kasalukuyan, maaaring manual na pamahalaan ng HarvestWise project team ang retention at deletion sa halip na sa pamamagitan ng fully automated database-purging process.",
      p6: "Ang data na tunay nang na-anonymize o na-aggregate at hindi na makatuwirang makapagpapakilala sa isang tao ay maaaring panatilihin para sa academic, statistical, system-evaluation, o agricultural research."
    },
    s8: {
      title: "8. PAG-DELETE NG ACCOUNT",
      p1: "Maaaring humiling ang magsasaka ng account deletion sa:",
      email: "harvestwise.app@gmail.com",
      p2: "Maaaring humingi ang HarvestWise ng makatuwirang verification bago iproseso ang deletion request upang maprotektahan ang account laban sa unauthorized deletion.",
      p3: "Kapag nakumpleto ang verified deletion request, ang identifying account information, contact information, at exact farm-location information ay tatanggalin o permanenteng ide-de-identify, maliban sa impormasyong kailangang panatilihin dahil sa balidong legal o lehitimong dahilan.",
      p4: "Ang crop, cost, harvest, o iba pang agricultural records ay maaari lamang panatilihin kung na-anonymize o na-aggregate na ang mga ito at hindi na makatuwirang maiugnay sa magsasaka.",
      p5: "Ang kasalukuyang in-app deletion request ay hindi dapat ipahiwatig bilang kagyat na awtomatikong pagbura sa database maliban kung naipatupad na ang gayong kakayahan."
    },
    s9: {
      title: "9. SEGURIDAD",
      p1: "Gumagamit ang HarvestWise ng makatuwirang technical at organizational safeguards na angkop sa uri ng project at impormasyong pinoproseso.",
      p2: "Kabilang sa kasalukuyang safeguards ang password hashing, authenticated API access, role-based authorization, token rotation at revocation, security lockouts, audit logging, at multi-factor authentication para sa supported staff accounts.",
      p3: "Walang internet-based system na makakagarantiya ng ganap na seguridad. Dapat protektahan ng user ang account credentials at agad i-report ang pinaghihinalaang unauthorized access."
    },
    s10: {
      title: "10. IYONG MGA KARAPATAN SA PRIVACY",
      intro: "Alinsunod sa applicable Philippine data-protection law, maaari kang magkaroon ng karapatang:",
      items: [
        "malaman kung paano pinoproseso ang iyong personal data;",
        "humiling ng access sa personal data na hawak tungkol sa iyo;",
        "humiling ng correction sa mali o kulang na impormasyon;",
        "tumutol sa ilang uri ng processing kung applicable;",
        "humiling ng erasure o blocking kung pinapayagan ng batas;",
        "humiling ng kopya o portability ng personal data kung applicable;",
        "humingi ng naaangkop na remedy o damages kung ibinibigay ng batas; at",
        "magsampa ng reklamo sa National Privacy Commission."
      ],
      p1: "Wala pang fully automated self-service personal-data export ang HarvestWise.",
      p2: "Para sa access, correction, portability, deletion, o iba pang privacy concern:",
      email: "harvestwise.app@gmail.com"
    },
    s11: {
      title: "11. KATUMPAKAN NG IMPORMASYON",
      p1: "Hinihikayat ang mga user na panatilihing tama at updated ang kanilang profile, farm location, crop plans, production costs, at iba pang impormasyon.",
      p2: "Ang mali o kulang na data ay maaaring makabawas sa accuracy o usefulness ng HarvestWise advisory at calculations."
    },
    s12: {
      title: "12. MGA BATA AT AUTHORIZED USERS",
      p1: "Ang HarvestWise ay idinisenyo para sa agricultural users at awtorisadong system personnel.",
      p2: "Kung ang isang user ay hindi legal na makapagbigay nang mag-isa ng kinakailangang personal information o consent, dapat siyang tulungan o awtorisahan ng naaangkop na parent, guardian, o authorized representative alinsunod sa applicable law."
    },
    s13: {
      title: "13. MGA PAGBABAGO SA POLICY NA ITO",
      p1: "Maaaring i-update ang Patakaran sa Privacy kapag nagbago ang system functionality, information practices, legal requirements, o project arrangements.",
      p2: "Ipapakita sa page na ito ang kasalukuyang version at effective date.",
      p3: "Kung may malaking pagbabago, ipapaalam ito sa pamamagitan ng sistema kapag makatuwirang posible."
    },
    s14: {
      title: "14. KONTAK",
      contact_title: "Privacy and Support Contact:",
      email: "harvestwise.app@gmail.com",
      address_title: "Address:",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines",
      footer_note: "Ang HarvestWise ay isang Bachelor of Science in Information Technology Capstone Project na binuo sa University of Mindanao."
    }
  }
};
