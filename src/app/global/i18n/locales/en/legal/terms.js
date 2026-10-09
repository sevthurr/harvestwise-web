export const terms = {
  title: "Terms and Conditions",
  effective_date_label: "Effective Date",
  effective_date: "October 9, 2026",
  version_label: "Version",
  version: "1.0",
  intro_p1: "These Terms and Conditions govern access to and use of HarvestWise.",
  intro_p2: "HarvestWise is a Bachelor of Science in Information Technology Capstone Project developed at the University of Mindanao.",
  intro_p3: "By creating an account, accessing the system, or continuing to use HarvestWise, you agree to these Terms and Conditions.",
  intro_p4: "If you do not agree with these Terms, you should not use the system.",
  sections: {
    s1: {
      title: "1. PURPOSE OF HARVESTWISE",
      p1: "HarvestWise is an agricultural decision-support and crop planning system.",
      p2: "It provides tools and information related to crop planning, production costs, break-even calculations, price trends and forecasts, market-arrival pressure, historical production, weather conditions, crop monitoring, and planting advisories.",
      p3: "HarvestWise is intended to support decision-making. It is not a guarantee of farm income, price, yield, weather conditions, production performance, or profitability."
    },
    s2: {
      title: "2. ELIGIBLE USERS AND ACCOUNTS",
      p1: "Farmer accounts may be created through the available registration process.",
      p2: "DFTC, administrative, and other restricted staff functions are available only to users who have been authorized or provisioned for those roles.",
      p3: "Users must provide information that is reasonably accurate and current.",
      p4: "Users must not create an account using another person's identity or access an account without authorization."
    },
    s3: {
      title: "3. ACCOUNT SECURITY",
      p1: "You are responsible for keeping your password, OTP, recovery information, and other account credentials secure.",
      p2: "You must promptly report suspected unauthorized access to:",
      email: "harvestwise.app@gmail.com",
      p3: "HarvestWise may temporarily lock, restrict, or suspend access when there is a reasonable security concern, repeated failed authentication, suspected abuse, or unauthorized activity."
    },
    s4: {
      title: "4. ACCEPTABLE USE",
      p1: "You may use HarvestWise for legitimate agricultural planning, system administration, academic evaluation, and other purposes supported by your assigned role.",
      intro: "You must not:",
      prohibited: [
        "attempt to access another user's account without authorization;",
        "bypass role or security controls;",
        "intentionally alter or falsify market, farm, crop, or administrative data;",
        "upload malicious code or attempt to disrupt the system;",
        "interfere with system logs, authentication, or security mechanisms;",
        "use HarvestWise to unlawfully obtain another person's personal information; or",
        "use the system in a way that violates applicable Philippine law."
      ]
    },
    s5: {
      title: "5. USER-PROVIDED DATA",
      p1: "You are responsible for the accuracy of information that you provide to HarvestWise.",
      p2: "This may include farm location, crop plans, production costs, expected yield, expected farmgate price, harvest information, and actual selling price.",
      p3: "Incorrect, outdated, or incomplete inputs may result in less accurate calculations, forecasts, or advisories."
    },
    s6: {
      title: "6. AGRICULTURAL DECISION-SUPPORT DISCLAIMER",
      p1: "HarvestWise provides decision-support information only.",
      p2: "Crop recommendations and action guidance are generated from available data and analytical rules involving Price Outlook, DFTC Arrival Pressure, Historical Seasonal Production, Weather Risk, and Profitability.",
      p3: "These factors may be weighted differently depending on crop stage, data availability, and data reliability.",
      p4: "A recommendation such as \"Recommended,\" \"Proceed with Caution,\" or \"Avoid for Now\" does not guarantee what will happen if a Farmer follows or does not follow that recommendation.",
      p5: "The Farmer remains responsible for the final decision."
    },
    s7: {
      title: "7. PRICE FORECAST DISCLAIMER",
      p1: "HarvestWise provides short-term Price Outlooks for supported 7-, 14-, 21-, and 28-day horizons.",
      p2: "Price forecasts are estimates based on available historical data and analytical models.",
      p3: "Actual prices may change because of supply disruptions, buyer behavior, transport conditions, weather events, sudden market arrivals, policy changes, and other events that are not fully predictable.",
      p4: "HarvestWise does not guarantee any future selling price."
    },
    s8: {
      title: "8. WEATHER DISCLAIMER",
      p1: "Weather information may be obtained from Open-Meteo and may use the saved coordinates of a Farmer's farm for personalized forecasts.",
      p2: "Forecasts may differ from actual conditions, particularly because of local microclimates and rapidly changing weather.",
      p3: "Current HarvestWise Weather Risk classification uses configured crop-specific temperature, humidity, and wind conditions.",
      p4: "Rainfall and rain probability are informational and do not currently determine the Weather Risk classification.",
      p5: "For severe weather, disaster preparedness, evacuation, or emergency decisions, users should follow official government weather and disaster advisories."
    },
    s9: {
      title: "9. PROFITABILITY AND BREAK-EVEN DISCLAIMER",
      p1: "Profitability and break-even results depend on information entered by the Farmer, including production costs and other crop-plan assumptions.",
      p2: "They are estimates for planning purposes.",
      p3: "HarvestWise does not guarantee that a Farmer will earn a profit or recover all production costs."
    },
    s10: {
      title: "10. MARKET AND PRODUCTION DATA",
      p1: "Some HarvestWise functions depend on DFTC market information, historical production datasets, and other records that may be updated manually or periodically.",
      p2: "Late, missing, incomplete, or incorrect source data may affect advisory and forecast results."
    },
    s11: {
      title: "11. EXTERNAL SERVICES",
      p1: "Some HarvestWise functions depend on external providers such as Open-Meteo, OpenStreetMap/Nominatim, PSGC data services, Supabase, or Cloudinary.",
      p2: "HarvestWise cannot guarantee that external services will always be available, error-free, or unchanged.",
      p3: "Use of those services may also be subject to their respective terms and privacy policies."
    },
    s12: {
      title: "12. ONLINE AND OFFLINE AVAILABILITY",
      p1: "HarvestWise is implemented as a Progressive Web App and may make selected previously loaded information available offline.",
      p2: "Offline or cached information may not be the latest available information.",
      p3: "Functions such as account synchronization, updated price information, fresh weather forecasts, geocoding, or newly generated advisory data may require an internet connection.",
      p4: "Users should check that information is current before making important decisions."
    },
    s13: {
      title: "13. PRIVACY",
      p1: "Personal information is handled in accordance with the HarvestWise Privacy Policy.",
      p2: "The Privacy Policy is available at:",
      privacy_link: "/privacy",
      p3: "Use of precise device or farm location is subject to the location choices and permissions described in that Policy."
    },
    s14: {
      title: "14. ACCOUNT RESTRICTION OR SUSPENSION",
      intro: "HarvestWise may restrict, suspend, or disable access when reasonably necessary to:",
      reasons: [
        "protect system or account security;",
        "respond to unauthorized access;",
        "prevent deliberate data falsification or system abuse;",
        "protect other users;",
        "investigate serious misuse; or",
        "comply with applicable law or authorized institutional requirements."
      ],
      conclusion: "Where reasonably practicable, users should be informed of the reason for an account restriction."
    },
    s15: {
      title: "15. ACCOUNT DELETION",
      p1: "Farmers may request account deletion through:",
      email: "harvestwise.app@gmail.com",
      p2: "Identity verification may be required before a deletion request is completed.",
      p3: "Deletion and retention of personal information will follow the HarvestWise Privacy Policy."
    },
    s16: {
      title: "16. INTELLECTUAL PROPERTY AND THIRD-PARTY MATERIALS",
      p1: "HarvestWise was developed as part of a Bachelor of Science in Information Technology Capstone Project.",
      p2: "Original HarvestWise software, interface materials, documentation, and project content may be protected by applicable intellectual-property laws.",
      p3: "Third-party software, datasets, maps, APIs, libraries, names, logos, and materials remain subject to the rights and licenses of their respective owners.",
      p4: "Nothing in these Terms transfers ownership of third-party materials to the HarvestWise project."
    },
    s17: {
      title: "17. SERVICE CHANGES",
      p1: "HarvestWise may change, improve, remove, or add features as the capstone system is developed, tested, evaluated, or maintained.",
      p2: "When a change materially affects privacy practices or these Terms, the relevant policy or Terms should be updated."
    },
    s18: {
      title: "18. NO WARRANTY OF OUTCOME",
      p1: "To the extent permitted by applicable law, HarvestWise is provided as an academic decision-support system without a guarantee that its information will always be complete, uninterrupted, error-free, or suitable for every farming situation.",
      p2: "Nothing in these Terms is intended to remove rights that cannot lawfully be waived under Philippine law."
    },
    s19: {
      title: "19. GOVERNING LAW",
      p1: "These Terms are interpreted in accordance with applicable laws of the Republic of the Philippines."
    },
    s20: {
      title: "20. CHANGES TO THESE TERMS",
      p1: "HarvestWise may update these Terms when system functionality, project arrangements, legal requirements, or operating practices change.",
      p2: "The current version and effective date will be displayed on this page.",
      p3: "Continuing to use HarvestWise after an updated version becomes effective means that the updated Terms will apply, subject to rights provided by applicable law."
    },
    s21: {
      title: "21. CONTACT",
      intro: "For questions regarding these Terms or HarvestWise:",
      email_label: "Email",
      email: "harvestwise.app@gmail.com",
      address_label: "Address",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines"
    }
  }
};
