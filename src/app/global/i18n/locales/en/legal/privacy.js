export const privacy = {
  title: "Privacy Policy",
  effective_date_label: "Effective Date",
  effective_date: "October 9, 2026",
  version_label: "Version",
  version: "1.0",
  intro_p1: "HarvestWise respects the privacy of its users and is committed to handling personal information responsibly.",
  intro_p2: "HarvestWise is a Bachelor of Science in Information Technology Capstone Project developed at the University of Mindanao. This Privacy Policy explains what information HarvestWise collects, why it is used, where it may be sent, how it is protected, how long it may be retained, and the choices and rights available to users.",
  intro_p3: "By using HarvestWise, you acknowledge that you have read this Privacy Policy.",
  sections: {
    s1: {
      title: "1. INFORMATION WE COLLECT",
      intro: "Depending on your role and the features you use, HarvestWise may process:",
      group1_title: "Account and profile information:",
      group1_items: [
        "email address",
        "phone number",
        "password in hashed form",
        "name and profile details",
        "profile picture",
        "preferred language",
        "text-size preference",
        "account and authentication-security information"
      ],
      group2_title: "Farmer and farm information:",
      group2_items: [
        "first, middle, and last name and suffix, when provided",
        "farm size",
        "city",
        "district",
        "barangay",
        "purok or sitio",
        "street",
        "saved farm latitude and longitude",
        "usual selling area or buyer"
      ],
      group3_title: "Crop and production information:",
      group3_items: [
        "crop plans",
        "planned and actual planting dates",
        "expected harvest dates",
        "farm area used for a crop",
        "expected harvest quantity",
        "expected farmgate price",
        "production costs",
        "break-even information",
        "actual harvest date",
        "actual harvest quantity",
        "actual selling price"
      ],
      group4_title: "Staff information:",
      group4_desc: "Authorized DFTC and administrative users may also provide name, position, email, and other account information necessary for their assigned role.",
      group5_title: "Technical and security information:",
      group5_desc: "HarvestWise may process session identifiers, authentication-token information, IP address, browser or device user-agent information, login attempts, security-lockout information, audit records, and notification history.",
      group6_title: "Browser and offline information:",
      group6_desc: "HarvestWise uses browser storage and Progressive Web App caching for authentication, preferences, and offline access to selected system information."
    },
    s2: {
      title: "2. HOW WE USE INFORMATION",
      intro: "HarvestWise processes information to:",
      items: [
        "create and maintain user accounts;",
        "authenticate users and protect accounts;",
        "provide crop planning and crop monitoring;",
        "calculate production costs and break-even values;",
        "generate personalized decision-support advisories;",
        "provide localized weather information;",
        "display price and market information;",
        "generate system notifications;",
        "maintain system security and audit records;",
        "troubleshoot technical problems;",
        "support academic system evaluation, research, and improvement; and",
        "respond to support, privacy, and account-related requests."
      ],
      conclusion: "Information should only be used for purposes that are relevant to the operation, security, evaluation, and legitimate academic use of HarvestWise."
    },
    s3: {
      title: "3. FARM LOCATION AND PRECISE COORDINATES",
      p1: "HarvestWise may store the farm location provided by a farmer, including barangay, district, purok or sitio, street, latitude, and longitude.",
      p2: "When the user chooses \"Use GPS Location,\" the browser first asks for location permission.",
      p3: "A farmer may use manual location entry when GPS is unavailable or when the farmer chooses not to use device location.",
      p4: "For live personalized weather information, saved farm latitude and longitude may be sent to Open-Meteo.",
      p5: "For address lookup or reverse geocoding, coordinates or address-search text may be sent to OpenStreetMap/Nominatim.",
      p6: "Precise location is used only when needed for location-related HarvestWise features."
    },
    s4: {
      title: "4. EXTERNAL SERVICES",
      intro: "HarvestWise currently uses or may use the following external services:",
      open_meteo_title: "Open-Meteo",
      open_meteo_desc: "Receives farm coordinates for live Farmer weather requests, or configured district coordinates for background weather synchronization. It is used to obtain weather forecasts and related weather information.",
      osm_title: "OpenStreetMap / Nominatim",
      osm_desc: "May receive coordinates or location-search text to convert locations into readable geographic information or locate a manually entered address.",
      psgc_title: "Philippine Standard Geographic Code (PSGC)",
      psgc_desc: "Used as a source of official geographic reference data such as Davao City barangays. Personal information is not required for the static barangay-data request itself.",
      supabase_title: "Supabase",
      supabase_desc: "May process authorized staff email and authentication-related information for staff OTP or invitation functions where those features are enabled.",
      cloudinary_title: "Cloudinary",
      cloudinary_desc: "If configured for the deployment, a profile image selected by a user may be uploaded to Cloudinary for image storage.",
      conclusion: "These services operate under their own privacy and service terms."
    },
    s5: {
      title: "5. AUTOMATED DECISION-SUPPORT PROCESSING",
      p1: "HarvestWise uses automated analytical processing to produce crop advisories.",
      p2: "The advisory engine evaluates factors that may include Price Outlook, DFTC Arrival Pressure, Historical Seasonal Production, Weather Risk, and Profitability.",
      p3: "The system may adjust the relative importance of these factors depending on the crop lifecycle stage and the availability and reliability of the data.",
      p4: "HarvestWise also uses pre-trained XGBoost models for short-term price forecasting.",
      p5: "HarvestWise does not use a generative AI system or large language model to generate Farmer advisory decisions at runtime.",
      p6: "The advisory is decision-support information only. It does not make a legally binding decision for the Farmer and does not guarantee a farming, financial, or market outcome."
    },
    s6: {
      title: "6. HOW INFORMATION MAY BE SHARED",
      p1: "Personal information may be processed by authorized HarvestWise project members, authorized agricultural or system personnel where required by their role, and the external service providers described in this Policy when necessary to provide a feature.",
      p2: "Information may also be disclosed when required by applicable law or a lawful request from a competent authority.",
      p3: "Access should be limited to information reasonably necessary for the assigned purpose or role."
    },
    s7: {
      title: "7. DATA RETENTION",
      p1: "HarvestWise retains identifiable personal information while an account is active and while the information remains necessary for the purposes described in this Policy.",
      p2: "For inactive accounts, the HarvestWise project policy is to delete or anonymize identifiable personal information no later than two years after the user's last meaningful account activity, unless longer retention is reasonably necessary for legal, security, academic, or research purposes.",
      p3: "Security and audit records may generally be retained for up to 12 months, unless they are required longer for an investigation, security incident, legal obligation, or legitimate academic requirement.",
      p4: "Authentication credentials and session-related records expire or are removed in accordance with their applicable technical lifecycle.",
      p5: "Retention and deletion may currently be administered manually by the HarvestWise project team rather than through a fully automated database-purging process.",
      p6: "Information that has been genuinely anonymized or aggregated so that it can no longer reasonably identify an individual may be retained for academic, statistical, system-evaluation, or agricultural research purposes."
    },
    s8: {
      title: "8. ACCOUNT DELETION",
      p1: "A Farmer may request account deletion by contacting:",
      email: "harvestwise.app@gmail.com",
      p2: "HarvestWise may require reasonable verification before processing a deletion request to protect the account from unauthorized deletion.",
      p3: "After a verified deletion request is completed, identifying account information, contact information, and precise farm-location information should be removed or irreversibly de-identified, subject to information that must be retained for a lawful or legitimate reason.",
      p4: "Agricultural, crop, cost, or harvest information may be retained only when it has been anonymized or aggregated so that it can no longer reasonably be linked to the Farmer.",
      p5: "The current in-app deletion request should not be represented as immediate automatic database erasure unless that capability is implemented."
    },
    s9: {
      title: "9. SECURITY",
      p1: "HarvestWise uses reasonable technical and organizational safeguards appropriate to the nature of the project and information processed.",
      p2: "Current safeguards include password hashing, authenticated API access, role-based authorization, token rotation and revocation, security lockouts, audit logging, and multi-factor authentication for supported staff accounts.",
      p3: "No internet-based system can guarantee absolute security. Users should protect their account credentials and promptly report suspected unauthorized access."
    },
    s10: {
      title: "10. YOUR PRIVACY RIGHTS",
      intro: "Subject to applicable Philippine data-protection law, users may have the right to:",
      items: [
        "be informed about the processing of their personal data;",
        "request access to personal data held about them;",
        "request correction of inaccurate or incomplete information;",
        "object to certain processing where applicable;",
        "request erasure or blocking where legally applicable;",
        "request a copy or portability of personal data where applicable;",
        "seek appropriate remedies or damages when provided by law; and",
        "file a complaint with the National Privacy Commission."
      ],
      p1: "HarvestWise does not currently provide a fully automated self-service personal-data export tool. Requests for access, correction, portability, deletion, or other privacy concerns may be submitted to:",
      email: "harvestwise.app@gmail.com"
    },
    s11: {
      title: "11. ACCURACY OF INFORMATION",
      p1: "Users are encouraged to keep their profile, farm location, crop plans, production costs, and other information accurate and current.",
      p2: "Incorrect or incomplete data may reduce the accuracy or usefulness of HarvestWise advisories and calculations."
    },
    s12: {
      title: "12. CHILDREN AND AUTHORIZED USERS",
      p1: "HarvestWise is designed for agricultural users and authorized system personnel.",
      p2: "Where a user cannot legally provide required personal information or consent on their own, use of the system should be assisted or authorized by an appropriate parent, guardian, or authorized representative as required by applicable law."
    },
    s13: {
      title: "13. CHANGES TO THIS PRIVACY POLICY",
      p1: "HarvestWise may update this Privacy Policy when system functionality, information practices, legal requirements, or project arrangements change.",
      p2: "The current version and effective date will be displayed on this page.",
      p3: "Material changes should be communicated through the system when reasonably practicable."
    },
    s14: {
      title: "14. CONTACT",
      contact_title: "Privacy and Support Contact:",
      email: "harvestwise.app@gmail.com",
      address_title: "Address:",
      address_line1: "University of Mindanao (UM) Matina Campus",
      address_line2: "University of Mindanao Drive, Matina Pangi Road, Matina Crossing",
      address_line3: "Davao City, 8000 Davao del Sur, Philippines",
      footer_note: "HarvestWise is a Bachelor of Science in Information Technology Capstone Project developed at the University of Mindanao."
    }
  }
};
