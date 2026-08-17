import { PageHeader } from "../../global/components/shared/PageHeader";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  PenLine,
  Upload,
  FileText,
  X,
  ChevronRight,
  CheckCircle,
  Download,
  ChevronLeft,
  AlertCircle,
  Check
} from "lucide-react";
import {
  SAVED_FILES,
  HW_COMMODITY_RECORDS,
  TEMP_COMMODITY_RECORDS,
  PRICE_CATEGORIES
} from "./dftc-add-data-data";
import { CommodityIllustration, COMMODITY_REGISTRY } from "../../farmer/components/market/CommodityIllustrations";
import { HW_NAME_TO_ID as _HW_NAME_TO_ID } from "../../global/data/commodities";
function hwId(name) {
  return _HW_NAME_TO_ID[name] ?? null;
}
function hasHWIcon(name) {
  const id = hwId(name);
  return id !== null && id in COMMODITY_REGISTRY;
}
function getCommodityCategory(name) {
  for (const cat of PRICE_CATEGORIES) {
    if (cat.commodities.some((c) => c.name === name)) return cat.name;
  }
  return "Other";
}
const REPORT_DATE = "August 2, 2026";
const REPORT_DATE_SHORT = "Aug-02-2026";
const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";
const DFTC_PERSONNEL_LIST = [
  { name: "CHRISTIAN JOEY PAUL M. HERMOSO", role: "Agricultural Technologist" },
  { name: "IVY JOYCE P. BOLODO", role: "Agri-Service & Related Worker" }
];
const DEFAULT_PERSONNEL = {
  encodedBy: DFTC_PERSONNEL_LIST[0].name,
  encodedByRole: DFTC_PERSONNEL_LIST[0].role,
  preparedBy: DFTC_PERSONNEL_LIST[1].name,
  preparedByRole: DFTC_PERSONNEL_LIST[1].role
};
function getCurrentDateLabel() {
  return (/* @__PURE__ */ new Date("2026-08-02T13:39:00")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
const DFTC_REPORT_CATEGORIES = [
  {
    name: "LOWLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Kamatis", variants: [{ descriptor: "(diamante big)", uom: "kg", bankLanding: "55.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "60.00", dftcRetail: "90.00" }] },
      { no: 2, name: "Batong", variants: [{ descriptor: "(negrostar)", uom: "kg", bankLanding: "32.00", bankWholesale: "42.00", bankRetail: "60.00", dftcWholesale: "", dftcRetail: "55.00" }] },
      { no: 3, name: "Kalabasa", variants: [
        { descriptor: "(suprema)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "40.00", dftcWholesale: "22.00", dftcRetail: "38.00" },
        { descriptor: "(malagkit)", uom: "kg", bankLanding: "16.00", bankWholesale: "22.00", bankRetail: "36.00", dftcWholesale: "", dftcRetail: "34.00" }
      ] },
      { no: 4, name: "Native Pechay", variants: [{ descriptor: "(condor)", uom: "kg/bundle", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "", dftcRetail: "22.00" }] },
      { no: 5, name: "Okra", variants: [{ descriptor: "(smooth green)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "", dftcRetail: "50.00" }] },
      { no: 6, name: "Patola", variants: [{ descriptor: "(ordinary)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "", dftcRetail: "42.00" }] },
      { no: 7, name: "Pipino", variants: [{ descriptor: "(mega c)", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "45.00", dftcWholesale: "25.00", dftcRetail: "42.00" }] },
      { no: 8, name: "Radish", variants: [{ descriptor: "(ordinary)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 9, name: "Talong", variants: [{ descriptor: "(banate king)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "60.00", dftcWholesale: "35.00", dftcRetail: "55.00" }] },
      { no: 10, name: "Upo", variants: [{ descriptor: "(mayumi)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 11, name: "Ampalaya", variants: [{ descriptor: "(galaxy)", uom: "kg", bankLanding: "38.00", bankWholesale: "45.00", bankRetail: "70.00", dftcWholesale: "42.00", dftcRetail: "65.00" }] },
      { no: 12, name: "Alugbati", variants: [{ descriptor: "", uom: "kg", bankLanding: "15.00", bankWholesale: "20.00", bankRetail: "32.00", dftcWholesale: "", dftcRetail: "30.00" }] },
      { no: 13, name: "Pak choi / Bok choy", variants: [{ descriptor: "", uom: "kg", bankLanding: "28.00", bankWholesale: "36.00", bankRetail: "52.00", dftcWholesale: "", dftcRetail: "48.00" }] },
      { no: 14, name: "Kangkong / Tinangkong", variants: [{ descriptor: "", uom: "kg/bundle", bankLanding: "8.00", bankWholesale: "12.00", bankRetail: "20.00", dftcWholesale: "", dftcRetail: "18.00" }] },
      { no: 15, name: "Mustasa", variants: [{ descriptor: "", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 16, name: "Paco", variants: [{ descriptor: "", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "42.00", dftcWholesale: "", dftcRetail: "40.00" }] },
      { no: 17, name: "Saluyot", variants: [{ descriptor: "", uom: "kg", bankLanding: "12.00", bankWholesale: "18.00", bankRetail: "28.00", dftcWholesale: "", dftcRetail: "25.00" }] },
      { no: 18, name: "Udlot sa saluyot", variants: [{ descriptor: "", uom: "kg", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "", dftcRetail: "22.00" }] },
      { no: 19, name: "Udlot sa sayote", variants: [{ descriptor: "", uom: "kg", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "", dftcRetail: "22.00" }] }
    ]
  },
  {
    name: "HIGHLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Baguio Beans", variants: [{ descriptor: "(pencil)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "80.00", dftcWholesale: "52.00", dftcRetail: "75.00" }] },
      { no: 2, name: "Broccoli", variants: [{ descriptor: "", uom: "kg", bankLanding: "80.00", bankWholesale: "100.00", bankRetail: "145.00", dftcWholesale: "", dftcRetail: "140.00" }] },
      { no: 3, name: "Cauliflower", variants: [{ descriptor: "", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "135.00", dftcWholesale: "", dftcRetail: "130.00" }] },
      { no: 4, name: "Chinese Pechay", variants: [{ descriptor: "", uom: "kg", bankLanding: "30.00", bankWholesale: "40.00", bankRetail: "60.00", dftcWholesale: "", dftcRetail: "55.00" }] },
      { no: 5, name: "Lettuce", variants: [
        { descriptor: "(curly)", uom: "kg", bankLanding: "50.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "", dftcRetail: "90.00" },
        { descriptor: "(ball)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "85.00", dftcWholesale: "", dftcRetail: "80.00" },
        { descriptor: "(romaine)", uom: "kg", bankLanding: "52.00", bankWholesale: "68.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }
      ] },
      { no: 6, name: "Repolyo", variants: [{ descriptor: "(wakamini)", uom: "kg", bankLanding: "38.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "45.00", dftcRetail: "62.00" }] },
      { no: 7, name: "Carrots", variants: [
        { descriptor: "(big)", uom: "kg", bankLanding: "48.00", bankWholesale: "60.00", bankRetail: "85.00", dftcWholesale: "55.00", dftcRetail: "80.00" },
        { descriptor: "(medium)", uom: "kg", bankLanding: "42.00", bankWholesale: "54.00", bankRetail: "75.00", dftcWholesale: "50.00", dftcRetail: "72.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "35.00", bankWholesale: "46.00", bankRetail: "65.00", dftcWholesale: "", dftcRetail: "62.00" }
      ] },
      { no: 8, name: "Patatas", variants: [
        { descriptor: "(big)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "80.00", dftcWholesale: "", dftcRetail: "78.00" },
        { descriptor: "(medium)", uom: "kg", bankLanding: "38.00", bankWholesale: "50.00", bankRetail: "70.00", dftcWholesale: "", dftcRetail: "68.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "30.00", bankWholesale: "40.00", bankRetail: "58.00", dftcWholesale: "", dftcRetail: "55.00" }
      ] },
      { no: 9, name: "Sayote", variants: [
        { descriptor: "(big)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "", dftcRetail: "42.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }
      ] },
      { no: 10, name: "Celery", variants: [{ descriptor: "", uom: "kg", bankLanding: "60.00", bankWholesale: "78.00", bankRetail: "110.00", dftcWholesale: "", dftcRetail: "105.00" }] },
      { no: 11, name: "Asparagus", variants: [{ descriptor: "", uom: "kg", bankLanding: "150.00", bankWholesale: "195.00", bankRetail: "260.00", dftcWholesale: "", dftcRetail: "255.00" }] },
      { no: 12, name: "Beetroot", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "70.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 13, name: "Sitsaro", variants: [{ descriptor: "", uom: "kg", bankLanding: "80.00", bankWholesale: "105.00", bankRetail: "145.00", dftcWholesale: "", dftcRetail: "140.00" }] }
    ]
  },
  {
    name: "SPICES",
    commodities: [
      { no: 1, name: "Ahos", variants: [{ descriptor: "(imported)", uom: "kg", bankLanding: "200.00", bankWholesale: "265.00", bankRetail: "340.00", dftcWholesale: "", dftcRetail: "330.00" }] },
      { no: 2, name: "Atsal", variants: [
        { descriptor: "(smooth cayene)", uom: "kg", bankLanding: "100.00", bankWholesale: "130.00", bankRetail: "190.00", dftcWholesale: "120.00", dftcRetail: "185.00" },
        { descriptor: "(sultan)", uom: "kg", bankLanding: "85.00", bankWholesale: "110.00", bankRetail: "165.00", dftcWholesale: "", dftcRetail: "160.00" }
      ] },
      { no: 3, name: "Bombay", variants: [
        { descriptor: "(native)", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "95.00", dftcWholesale: "", dftcRetail: "90.00" },
        { descriptor: "(white)", uom: "kg", bankLanding: "110.00", bankWholesale: "145.00", bankRetail: "180.00", dftcWholesale: "", dftcRetail: "175.00" }
      ] },
      { no: 4, name: "Luy-a", variants: [
        { descriptor: "(hawaian)", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "110.00", dftcWholesale: "", dftcRetail: "105.00" },
        { descriptor: "(jamaica)", uom: "kg", bankLanding: "80.00", bankWholesale: "100.00", bankRetail: "118.00", dftcWholesale: "", dftcRetail: "115.00" }
      ] },
      { no: 5, name: "Sibuyas Dahon", variants: [{ descriptor: "", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "", dftcRetail: "62.00" }] },
      { no: 6, name: "Tanglad", variants: [{ descriptor: "", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 7, name: "Sili", variants: [
        { descriptor: "(labuyo)", uom: "kg", bankLanding: "180.00", bankWholesale: "220.00", bankRetail: "280.00", dftcWholesale: "", dftcRetail: "270.00" },
        { descriptor: "(kolikot)", uom: "kg", bankLanding: "90.00", bankWholesale: "118.00", bankRetail: "160.00", dftcWholesale: "", dftcRetail: "155.00" },
        { descriptor: "(native)", uom: "kg", bankLanding: "65.00", bankWholesale: "85.00", bankRetail: "120.00", dftcWholesale: "", dftcRetail: "115.00" },
        { descriptor: "(dynamite)", uom: "kg", bankLanding: "95.00", bankWholesale: "125.00", bankRetail: "168.00", dftcWholesale: "", dftcRetail: "165.00" }
      ] },
      { no: 8, name: "Parsley", variants: [{ descriptor: "", uom: "kg", bankLanding: "80.00", bankWholesale: "105.00", bankRetail: "145.00", dftcWholesale: "", dftcRetail: "140.00" }] }
    ]
  },
  {
    name: "ROOTCROPS",
    commodities: [
      { no: 1, name: "Cassava", variants: [{ descriptor: "", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 2, name: "Gabi", variants: [{ descriptor: "(bisol)", uom: "kg", bankLanding: "40.00", bankWholesale: "52.00", bankRetail: "65.00", dftcWholesale: "", dftcRetail: "62.00" }] },
      { no: 3, name: "Kamote", variants: [{ descriptor: "", uom: "kg", bankLanding: "25.00", bankWholesale: "35.00", bankRetail: "50.00", dftcWholesale: "", dftcRetail: "48.00" }] },
      { no: 4, name: "Karlang", variants: [{ descriptor: "", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "", dftcRetail: "52.00" }] },
      { no: 5, name: "Kamote tops / Galay", variants: [{ descriptor: "", uom: "kg", bankLanding: "12.00", bankWholesale: "18.00", bankRetail: "28.00", dftcWholesale: "", dftcRetail: "25.00" }] },
      { no: 6, name: "Takway", variants: [{ descriptor: "", uom: "kg", bankLanding: "15.00", bankWholesale: "22.00", bankRetail: "35.00", dftcWholesale: "", dftcRetail: "32.00" }] },
      { no: 7, name: "Ube", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "70.00", bankRetail: "90.00", dftcWholesale: "", dftcRetail: "88.00" }] },
      { no: 8, name: "Udlot sa gabi", variants: [{ descriptor: "", uom: "kg", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "", dftcRetail: "22.00" }] }
    ]
  },
  {
    name: "FRUITS",
    commodities: [
      { no: 1, name: "Avocado", variants: [{ descriptor: "(medium)", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 2, name: "Durian", variants: [
        { descriptor: "(puyat)", uom: "kg", bankLanding: "150.00", bankWholesale: "200.00", bankRetail: "250.00", dftcWholesale: "", dftcRetail: "245.00" },
        { descriptor: "(arancillo)", uom: "kg", bankLanding: "165.00", bankWholesale: "218.00", bankRetail: "275.00", dftcWholesale: "", dftcRetail: "270.00" },
        { descriptor: "(cob)", uom: "kg", bankLanding: "158.00", bankWholesale: "208.00", bankRetail: "260.00", dftcWholesale: "", dftcRetail: "255.00" },
        { descriptor: "(d101)", uom: "kg", bankLanding: "140.00", bankWholesale: "185.00", bankRetail: "235.00", dftcWholesale: "", dftcRetail: "230.00" }
      ] },
      { no: 3, name: "Kalamansi", variants: [{ descriptor: "(local)", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "58.00", dftcWholesale: "", dftcRetail: "55.00" }] },
      { no: 4, name: "Mangga", variants: [
        { descriptor: "(cebu)", uom: "kg", bankLanding: "75.00", bankWholesale: "98.00", bankRetail: "130.00", dftcWholesale: "", dftcRetail: "125.00" },
        { descriptor: "(carabao)", uom: "kg", bankLanding: "95.00", bankWholesale: "125.00", bankRetail: "150.00", dftcWholesale: "", dftcRetail: "145.00" }
      ] },
      { no: 5, name: "Papaya", variants: [
        { descriptor: "(solo)", uom: "kg", bankLanding: "40.00", bankWholesale: "55.00", bankRetail: "75.00", dftcWholesale: "", dftcRetail: "72.00" },
        { descriptor: "(red lady)", uom: "kg", bankLanding: "45.00", bankWholesale: "60.00", bankRetail: "82.00", dftcWholesale: "", dftcRetail: "80.00" }
      ] },
      { no: 6, name: "Pomelo", variants: [
        { descriptor: "(seedless)", uom: "kg", bankLanding: "38.00", bankWholesale: "50.00", bankRetail: "72.00", dftcWholesale: "", dftcRetail: "70.00" },
        { descriptor: "(magallanes)", uom: "kg", bankLanding: "42.00", bankWholesale: "55.00", bankRetail: "78.00", dftcWholesale: "", dftcRetail: "75.00" }
      ] },
      { no: 7, name: "Saging", variants: [
        { descriptor: "(lakatan)", uom: "kg", bankLanding: "48.00", bankWholesale: "62.00", bankRetail: "85.00", dftcWholesale: "", dftcRetail: "80.00" },
        { descriptor: "(latundan)", uom: "kg", bankLanding: "38.00", bankWholesale: "52.00", bankRetail: "70.00", dftcWholesale: "", dftcRetail: "65.00" },
        { descriptor: "(cardava)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "", dftcRetail: "42.00" },
        { descriptor: "(cavendish)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "80.00", dftcWholesale: "", dftcRetail: "78.00" },
        { descriptor: "(se\xF1orita)", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" },
        { descriptor: "(dalian)", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "", dftcRetail: "62.00" },
        { descriptor: "(mundo)", uom: "kg", bankLanding: "30.00", bankWholesale: "42.00", bankRetail: "58.00", dftcWholesale: "", dftcRetail: "55.00" },
        { descriptor: "(sab-a)", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "", dftcRetail: "50.00" }
      ] },
      { no: 8, name: "Watermelon", variants: [
        { descriptor: "(ordinary)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" },
        { descriptor: "(seedless)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "", dftcRetail: "42.00" },
        { descriptor: "(venus)", uom: "kg", bankLanding: "25.00", bankWholesale: "34.00", bankRetail: "50.00", dftcWholesale: "", dftcRetail: "48.00" }
      ] },
      { no: 9, name: "Marang", variants: [{ descriptor: "", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "80.00", dftcWholesale: "", dftcRetail: "78.00" }] },
      { no: 10, name: "Rambutan", variants: [{ descriptor: "", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "", dftcRetail: "62.00" }] },
      { no: 11, name: "Jackfruit", variants: [{ descriptor: "", uom: "kg", bankLanding: "25.00", bankWholesale: "34.00", bankRetail: "50.00", dftcWholesale: "", dftcRetail: "48.00" }] },
      { no: 12, name: "Labana", variants: [{ descriptor: "(guyabano)", uom: "kg", bankLanding: "42.00", bankWholesale: "55.00", bankRetail: "78.00", dftcWholesale: "", dftcRetail: "75.00" }] },
      { no: 13, name: "Dragon Fruit", variants: [{ descriptor: "", uom: "kg", bankLanding: "80.00", bankWholesale: "105.00", bankRetail: "145.00", dftcWholesale: "", dftcRetail: "140.00" }] },
      { no: 14, name: "Apple", variants: [{ descriptor: "", uom: "kg", bankLanding: "120.00", bankWholesale: "158.00", bankRetail: "200.00", dftcWholesale: "", dftcRetail: "195.00" }] },
      { no: 15, name: "Lanzones", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 16, name: "Lemon", variants: [{ descriptor: "", uom: "kg", bankLanding: "65.00", bankWholesale: "85.00", bankRetail: "120.00", dftcWholesale: "", dftcRetail: "115.00" }] },
      { no: 17, name: "Mangosteen", variants: [{ descriptor: "", uom: "kg", bankLanding: "95.00", bankWholesale: "125.00", bankRetail: "168.00", dftcWholesale: "", dftcRetail: "165.00" }] },
      { no: 18, name: "Orange", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 19, name: "Passion Fruit", variants: [{ descriptor: "", uom: "kg", bankLanding: "85.00", bankWholesale: "110.00", bankRetail: "150.00", dftcWholesale: "", dftcRetail: "145.00" }] },
      { no: 20, name: "Pinya", variants: [{ descriptor: "(pineapple)", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "", dftcRetail: "52.00" }] },
      { no: 21, name: "Santol", variants: [{ descriptor: "", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "", dftcRetail: "42.00" }] },
      { no: 22, name: "Singkamas", variants: [{ descriptor: "", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "42.00", dftcWholesale: "", dftcRetail: "40.00" }] },
      { no: 23, name: "Yakun", variants: [{ descriptor: "", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 24, name: "Puso Saging", variants: [
        { descriptor: "(standard)", uom: "kg", bankLanding: "15.00", bankWholesale: "20.00", bankRetail: "32.00", dftcWholesale: "", dftcRetail: "30.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "12.00", bankWholesale: "16.00", bankRetail: "26.00", dftcWholesale: "", dftcRetail: "24.00" }
      ] }
    ]
  },
  {
    name: "OTHERS",
    commodities: [
      { no: 1, name: "Sweet Corn", variants: [{ descriptor: "", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "38.00", dftcWholesale: "", dftcRetail: "35.00" }] },
      { no: 2, name: "Peanut", variants: [{ descriptor: "(mani)", uom: "kg", bankLanding: "80.00", bankWholesale: "105.00", bankRetail: "145.00", dftcWholesale: "", dftcRetail: "140.00" }] },
      { no: 3, name: "Poncan", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 4, name: "Grapes", variants: [{ descriptor: "", uom: "kg", bankLanding: "120.00", bankWholesale: "158.00", bankRetail: "200.00", dftcWholesale: "", dftcRetail: "195.00" }] },
      { no: 5, name: "Monggo", variants: [{ descriptor: "", uom: "kg", bankLanding: "55.00", bankWholesale: "72.00", bankRetail: "98.00", dftcWholesale: "", dftcRetail: "95.00" }] },
      { no: 6, name: "Young Corn", variants: [{ descriptor: "", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "", dftcRetail: "52.00" }] },
      { no: 7, name: "Dabong", variants: [{ descriptor: "", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "42.00", dftcWholesale: "", dftcRetail: "40.00" }] },
      { no: 8, name: "Kulo", variants: [{ descriptor: "", uom: "kg", bankLanding: "15.00", bankWholesale: "22.00", bankRetail: "35.00", dftcWholesale: "", dftcRetail: "32.00" }] }
    ]
  }
];
const PAGE_CATEGORY_GROUPS = [
  ["LOWLAND VEGETABLES"],
  ["HIGHLAND VEGETABLES"],
  ["SPICES", "ROOTCROPS"],
  ["FRUITS", "OTHERS"]
];
function SetupModal({ onClose, onContinue }) {
  const [dataType, setDataType] = useState("Price Data");
  const [market, setMarket] = useState("Bangkerohan Public Market");
  const [priceType, setPriceType] = useState("Retail");
  const [dateLabel] = useState(getCurrentDateLabel());
  const [changingDate, setChangingDate] = useState(false);
  const [customDate, setCustomDate] = useState("2026-08-02");
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  const priceMarkets = ["Bangkerohan Public Market", "DFTC Taboan"];
  const priceTypes = ["Retail", "Wholesale", "Landing"];
  function handleContinue() {
    const date = changingDate ? customDate : "2026-08-02";
    onContinue({ dataType, market, priceType, date });
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Start Data Entry</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-2">Data Type</label>
            <div className="grid grid-cols-2 gap-2">
              {["Price Data", "Arrival Volume"].map((t) => <button
    key={t}
    onClick={() => {
      setDataType(t);
      setMarket(t === "Arrival Volume" ? "DFTC Taboan" : "Bangkerohan Public Market");
    }}
    className={`py-2.5 px-3 rounded-xl border text-[13px] font-medium transition-colors ${dataType === t ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >{t}</button>)}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">
              {dataType === "Arrival Volume" ? "Facility" : "Market"}
            </label>
            {dataType === "Arrival Volume" ? <div className="px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)] text-[13px] text-[var(--hw-neutral-800)]">
                DFTC Taboan
              </div> : <select
    value={market}
    onChange={(e) => setMarket(e.target.value)}
    className="w-full px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  >
                {priceMarkets.map((m) => <option key={m}>{m}</option>)}
              </select>}
          </div>

          {dataType === "Price Data" && <div>
              <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Price Type</label>
              <div className="flex gap-2">
                {priceTypes.map((pt) => <button
    key={pt}
    onClick={() => setPriceType(pt)}
    className={`flex-1 py-2 rounded-xl border text-[13px] font-medium transition-colors ${priceType === pt ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"}`}
  >{pt}</button>)}
              </div>
            </div>}

          <div>
            <label className="block text-[12px] font-medium text-[var(--hw-neutral-800)] mb-1">Date and Time</label>
            {changingDate ? <div className="flex gap-2 items-center">
                <input
    type="date"
    value={customDate}
    onChange={(e) => setCustomDate(e.target.value)}
    className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[13px] text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
  />
                <button onClick={() => setChangingDate(false)} className="text-[12px] text-[var(--hw-green-700)] underline whitespace-nowrap">
                  Use today
                </button>
              </div> : <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]">
                <span className="text-[13px] text-[var(--hw-neutral-900)]">{dateLabel}</span>
                <button onClick={() => setChangingDate(true)} className="text-[12px] text-[var(--hw-green-700)] underline ml-3 shrink-0">
                  Change Date
                </button>
              </div>}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
    onClick={onClose}
    className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Cancel
          </button>
          <button
    onClick={handleContinue}
    className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Continue to Data Entry
          </button>
        </div>
      </div>
    </div>;
}
function HowHarvestWiseModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--hw-neutral-100)]">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">How HarvestWise Uses DFTC Data</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            HarvestWise currently provides analytics, price forecasting, and farmer-facing decision support for its 10 supported commodities: <strong>Kamatis, Talong, Repolyo, Atsal, Carrots, Pipino, Ampalaya, Kalabasa, Lettuce, and Chinese Pechay.</strong>
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            All other market commodities are securely retained for DFTC reporting and downloads. Their records remain available and are not subject to deletion.
          </p>
          <p className="text-[13px] text-[var(--hw-neutral-800)] leading-relaxed">
            Analytics coverage continues to expand over time as more commodities are added to HarvestWise.
          </p>
        </div>
        <div className="px-5 pb-5">
          <button
    onClick={onClose}
    className="w-full py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Close
          </button>
        </div>
      </div>
    </div>;
}
function ReportColumnHeaders() {
  const thBase = (bg, extra = {}) => ({
    background: bg,
    border: "1px solid #000",
    padding: "4px 5px",
    textAlign: "center",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    ...extra
  });
  return <thead>
      <tr>
        <th rowSpan={2} style={thBase(LEFT_BG, { width: 28, fontSize: 10 })}>No.</th>
        <th rowSpan={2} style={thBase(LEFT_BG, { minWidth: 150, fontSize: 10 })}>Commodity</th>
        <th rowSpan={2} style={thBase(LEFT_BG, { width: 68, fontSize: 10 })}>UOM</th>
        <th colSpan={3} style={thBase(BANK_BG, { fontSize: 10 })}>BANKEROHAN MARKET</th>
        <th colSpan={2} style={thBase(DFTC_BG, { fontSize: 10 })}>DFTC TABOAN</th>
      </tr>
      <tr>
        {["Landing", "Wholesale", "Retail"].map((h) => <th key={h} style={{ background: BANK_BG, border: "1px solid #000", padding: "3px 5px", textAlign: "center", fontSize: 10, width: 72 }}>{h}</th>)}
        {["Wholesale", "Retail"].map((h) => <th key={h} style={{ background: DFTC_BG, border: "1px solid #000", padding: "3px 5px", textAlign: "center", fontSize: 10, width: 72 }}>{h}</th>)}
      </tr>
    </thead>;
}
function DFTCReportPage({ pageIndex, totalPages, categories, isFirst, isLast, reportDate, personnel }) {
  const cellL = (extra = {}) => ({
    background: LEFT_BG,
    border: "1px solid #000",
    padding: "3px 6px",
    fontSize: 11,
    ...extra
  });
  const cellB = (extra = {}) => ({
    background: BANK_BG,
    border: "1px solid #000",
    padding: "3px 5px",
    textAlign: "right",
    fontSize: 11,
    ...extra
  });
  const cellD = (extra = {}) => ({
    background: DFTC_BG,
    border: "1px solid #000",
    padding: "3px 5px",
    textAlign: "right",
    fontSize: 11,
    ...extra
  });
  return <div style={{ fontFamily: "Arial, Helvetica, sans-serif", backgroundColor: "white", padding: "14px 18px", minWidth: 720 }}>
      {isFirst && <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>
            Davao Food Terminal Complex Price Monitoring
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 3 }}>
            Prevailing Market Prices as of {reportDate}
          </div>
          <div style={{ fontSize: 12, fontWeight: "bold", marginTop: 2 }}>Class A</div>
        </div>}

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
        <ReportColumnHeaders />
        <tbody>
          {categories.map((cat) => <React.Fragment key={cat.name}>
              {
    /* Category heading row – colored columns preserved */
  }
              <tr>
                <td colSpan={3} style={{ ...cellL(), fontWeight: "bold", fontStyle: "italic", textDecoration: "underline", textAlign: "left" }}>
                  {cat.name}
                </td>
                <td style={cellB()} />
                <td style={cellB()} />
                <td style={cellB()} />
                <td style={cellD()} />
                <td style={cellD()} />
              </tr>

              {cat.commodities.map(
    (com) => com.variants.map((v, vi) => <tr key={`${com.no}-${vi}`}>
                    <td style={cellL({ textAlign: "center", width: 28 })}>
                      {vi === 0 ? com.no : ""}
                    </td>
                    <td style={cellL()}>
                      {vi === 0 ? <><strong>{com.name}</strong>{" "}<span style={{ fontWeight: "normal" }}>{v.descriptor}</span></> : <span style={{ paddingLeft: 16 }}>{v.descriptor}</span>}
                    </td>
                    <td style={cellL({ textAlign: "center", width: 68 })}>{v.uom}</td>
                    <td style={cellB()}>{v.bankLanding}</td>
                    <td style={cellB()}>{v.bankWholesale}</td>
                    <td style={cellB()}>{v.bankRetail}</td>
                    <td style={cellD()}>{v.dftcWholesale}</td>
                    <td style={cellD()}>{v.dftcRetail}</td>
                  </tr>)
  )}
            </React.Fragment>)}
        </tbody>
      </table>

      {isLast && personnel && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, paddingTop: 10, borderTop: "1px solid #000" }}>
          <div>
            <div style={{ fontSize: 10, marginBottom: 2 }}>Encoded by:</div>
            <div style={{ fontSize: 11, fontWeight: "bold", textDecoration: "underline" }}>{personnel.encodedBy}</div>
            <div style={{ fontSize: 10 }}>{personnel.encodedByRole}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, marginBottom: 2 }}>Prepared by:</div>
            <div style={{ fontSize: 11, fontWeight: "bold", textDecoration: "underline" }}>{personnel.preparedBy}</div>
            <div style={{ fontSize: 10 }}>{personnel.preparedByRole}</div>
          </div>
        </div>}

      <div style={{ textAlign: "right", fontSize: 9, marginTop: 6, color: "#555" }}>
        Page {pageIndex + 1} of {totalPages}
      </div>
    </div>;
}
function PDFPreviewContent({ personnel }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return <div className="space-y-5">
      {PAGE_CATEGORY_GROUPS.map((group, idx) => {
    const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
    return <div key={idx} className="bg-white shadow-sm rounded-lg border border-[var(--hw-neutral-300)]">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-200)] rounded-t-lg">
              <span className="text-[11px] font-semibold text-[var(--hw-neutral-800)]">Page {idx + 1} of {total}</span>
              <span className="text-[12px] text-[var(--hw-neutral-800)]">A4 Landscape</span>
            </div>
            <div className="overflow-x-auto">
              <DFTCReportPage
      pageIndex={idx}
      totalPages={total}
      categories={cats}
      isFirst={idx === 0}
      isLast={idx === total - 1}
      reportDate={REPORT_DATE}
      personnel={idx === total - 1 ? personnel : void 0}
    />
            </div>
          </div>;
  })}
    </div>;
}
function ExcelPreviewContent({ personnel }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return <div className="rounded-lg overflow-hidden border border-[var(--hw-neutral-300)]">
      {
    /* Fake Excel toolbar strip */
  }
      <div className="bg-[#217346] px-3 py-1.5 flex items-center gap-2">
        <span className="text-white text-[12px] font-semibold">Microsoft Excel</span>
        <span className="text-green-200 text-[11px]">— DFTC-Price-Monitoring-{REPORT_DATE_SHORT}.xlsx</span>
      </div>
      <div className="bg-[#f3f3f3] border-b border-[var(--hw-neutral-300)] px-3 py-1 flex items-center gap-2">
        <span className="text-[13px] text-[var(--hw-neutral-800)] font-medium">A1</span>
        <span className="text-[var(--hw-neutral-700)] text-[12px]">fx</span>
        <span className="text-[11px] text-[var(--hw-neutral-800)]">DAVAO FOOD TERMINAL COMPLEX PRICE MONITORING</span>
      </div>
      <div className="overflow-x-auto bg-white">
        {PAGE_CATEGORY_GROUPS.map((group, idx) => {
    const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
    return <DFTCReportPage
      key={idx}
      pageIndex={idx}
      totalPages={total}
      categories={cats}
      isFirst={idx === 0}
      isLast={idx === total - 1}
      reportDate={REPORT_DATE}
      personnel={idx === total - 1 ? personnel : void 0}
    />;
  })}
      </div>
      {
    /* Fake worksheet tab */
  }
      <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
        <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[11px] font-medium text-[#217346] -mb-1.5">
          Price Monitoring
        </div>
      </div>
    </div>;
}
function IMGPreview({ file, page, onPageChange, personnel, combineEnabled, onCombineToggle }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  const currentCats = PAGE_CATEGORY_GROUPS[page].map((name) => DFTC_REPORT_CATEGORIES.find((c) => c.name === name)).filter(Boolean);
  const sameDateFiles = SAVED_FILES.filter(
    (f) => f.savedIso === file.savedIso && f.id !== file.id && f.dataType !== "DFTC Arrival Volume"
  );
  return <div className="space-y-4">
      {
    /* Combine toggle */
  }
      <div className="p-3 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--hw-neutral-900)]">Combine saved data for this reporting date</p>
            {combineEnabled && <div className="mt-1.5 space-y-0.5">
                <p className="text-[11px] text-[var(--hw-neutral-800)]">· {file.dataName}</p>
                {sameDateFiles.map((f) => <p key={f.id} className="text-[11px] text-[var(--hw-neutral-800)]">· {f.dataName}</p>)}
                {sameDateFiles.length === 0 && <p className="text-[13px] text-[var(--hw-neutral-800)] italic">No other entries found for this reporting date.</p>}
              </div>}
          </div>
          <button
    onClick={onCombineToggle}
    className={`shrink-0 w-10 h-6 rounded-full transition-colors ${combineEnabled ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-300)]"}`}
  >
            <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${combineEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
      </div>

      {
    /* Page navigation */
  }
      <div className="flex items-center justify-between">
        <button
    onClick={() => onPageChange(Math.max(0, page - 1))}
    disabled={page === 0}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <ChevronLeft className="w-4 h-4 text-[var(--hw-neutral-800)]" />
        </button>
        <div className="text-center">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-900)]">Image {page + 1} of {total}</span>
          <div className="flex gap-1.5 justify-center mt-1">
            {Array.from({ length: total }).map((_, i) => <button
    key={i}
    onClick={() => onPageChange(i)}
    className={`w-2.5 h-2.5 rounded-full transition-colors ${i === page ? "bg-[var(--hw-neutral-800)]" : "bg-[var(--hw-neutral-300)]"}`}
  />)}
          </div>
        </div>
        <button
    onClick={() => onPageChange(Math.min(total - 1, page + 1))}
    disabled={page === total - 1}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" />
        </button>
      </div>

      {
    /* Report table */
  }
      <div className="border border-[var(--hw-neutral-300)] rounded-xl overflow-auto bg-white">
        <DFTCReportPage
    pageIndex={page}
    totalPages={total}
    categories={currentCats}
    isFirst={page === 0}
    isLast={page === total - 1}
    reportDate={REPORT_DATE}
    personnel={page === total - 1 ? personnel : void 0}
  />
      </div>

      {
    /* Personnel summary */
  }
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-1">Encoded by</p>
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{personnel.encodedBy}</p>
          <p className="text-[11px] text-[var(--hw-neutral-800)]">{personnel.encodedByRole}</p>
        </div>
        <div className="p-3 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-1">Prepared by</p>
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)]">{personnel.preparedBy}</p>
          <p className="text-[11px] text-[var(--hw-neutral-800)]">{personnel.preparedByRole}</p>
        </div>
      </div>
    </div>;
}
function FilePreviewModal({ file, onClose }) {
  const [format, setFormat] = useState("IMG");
  const [imgPage, setImgPage] = useState(0);
  const [dlState, setDlState] = useState("idle");
  const [combineEnabled, setCombineEnabled] = useState(true);
  const [personnel, setPersonnel] = useState(DEFAULT_PERSONNEL);
  const [updated, setUpdated] = useState(false);
  const pageRefs = useRef([]);
  const total = PAGE_CATEGORY_GROUPS.length;
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  function updatePersonnel(field, name) {
    const user = DFTC_PERSONNEL_LIST.find((p) => p.name === name);
    if (!user) return;
    setPersonnel((prev) => ({
      ...prev,
      [field]: user.name,
      [field === "encodedBy" ? "encodedByRole" : "preparedByRole"]: user.role
    }));
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3e3);
  }
  async function downloadImages() {
    setDlState("generating-img");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const JSZip = (await import("jszip")).default;
      const blobs = [];
      for (let i = 0; i < total; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/png");
        });
        blobs.push(blob);
      }
      if (blobs.length === 1) {
        const url = URL.createObjectURL(blobs[0]);
        triggerDownload(url, `DFTC-Price-Monitoring-${REPORT_DATE_SHORT}-Page-1.png`);
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        blobs.forEach((blob, i) => {
          zip.file(`DFTC-Price-Monitoring-${REPORT_DATE_SHORT}-Page-${i + 1}.png`, blob);
        });
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        triggerDownload(url, `DFTC-Price-Monitoring-${REPORT_DATE_SHORT}-Images.zip`);
        URL.revokeObjectURL(url);
      }
      setDlState("idle");
    } catch (err) {
      console.error("IMG generation error:", err);
      setDlState("error-img");
    }
  }
  async function downloadPDF() {
    setDlState("generating-pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < total; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        if (i > 0) pdf.addPage("a4", "l");
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const ratio = canvas.width / canvas.height;
        let w = pdfW - 12;
        let h = w / ratio;
        if (h > pdfH - 12) {
          h = pdfH - 12;
          w = h * ratio;
        }
        const x = (pdfW - w) / 2;
        const y = (pdfH - h) / 2;
        pdf.addImage(imgData, "PNG", x, y, w, h);
      }
      pdf.save(`DFTC-Price-Monitoring-${REPORT_DATE_SHORT}.pdf`);
      setDlState("idle");
    } catch (err) {
      console.error("PDF generation error:", err);
      setDlState("error-pdf");
    }
  }
  async function downloadExcel() {
    setDlState("generating-excel");
    try {
      let applyCell = function(cell, fill, font = {}, alignment = {}, border2 = allBorders) {
        cell.fill = fill;
        cell.font = font;
        cell.alignment = { vertical: "middle", ...alignment };
        cell.border = border2;
      };
      const ExcelJSModule = await import("exceljs");
      const Workbook = ExcelJSModule.default?.Workbook ?? ExcelJSModule.Workbook;
      const wb = new Workbook();
      wb.creator = "HarvestWise / DFTC";
      wb.created = /* @__PURE__ */ new Date();
      const ws = wb.addWorksheet("Price Monitoring", {
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
      });
      ws.columns = [
        { width: 5 },
        { width: 34 },
        { width: 13 },
        { width: 13 },
        { width: 13 },
        { width: 13 },
        { width: 13 },
        { width: 13 }
      ];
      const border = { style: "thin", color: { argb: "FF000000" } };
      const allBorders = { top: border, left: border, bottom: border, right: border };
      const fillL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
      const fillB = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
      const fillD = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE8FC" } };
      const titles = [
        "DAVAO FOOD TERMINAL COMPLEX PRICE MONITORING",
        `PREVAILING MARKET PRICES AS OF ${REPORT_DATE.toUpperCase()}`,
        "CLASS A"
      ];
      titles.forEach((text, ti) => {
        const rn = ws.rowCount + 1;
        ws.addRow([text]);
        ws.mergeCells(`A${rn}:H${rn}`);
        const cell = ws.getCell(`A${rn}`);
        cell.value = text;
        cell.font = { bold: true, size: ti === 0 ? 13 : 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = allBorders;
        ws.getRow(rn).height = 20;
      });
      const h1n = ws.rowCount + 1;
      const hRow1 = ws.addRow(["No.", "Commodity", "UOM", "BANKEROHAN MARKET", "", "", "DFTC TABOAN", ""]);
      ws.mergeCells(`D${h1n}:F${h1n}`);
      ws.mergeCells(`G${h1n}:H${h1n}`);
      [1, 2, 3].forEach((c) => applyCell(hRow1.getCell(c), fillL, { bold: true }, { horizontal: "center" }));
      [4, 5, 6].forEach((c) => applyCell(hRow1.getCell(c), fillB, { bold: true }, { horizontal: "center" }));
      [7, 8].forEach((c) => applyCell(hRow1.getCell(c), fillD, { bold: true }, { horizontal: "center" }));
      hRow1.height = 18;
      const h2n = ws.rowCount + 1;
      const hRow2 = ws.addRow(["", "", "", "Landing", "Wholesale", "Retail", "Wholesale", "Retail"]);
      ws.mergeCells(`A${h1n}:A${h2n}`);
      ws.mergeCells(`B${h1n}:B${h2n}`);
      ws.mergeCells(`C${h1n}:C${h2n}`);
      [1, 2, 3].forEach((c) => applyCell(hRow2.getCell(c), fillL, {}, { horizontal: "center" }));
      [4, 5, 6].forEach((c) => applyCell(hRow2.getCell(c), fillB, { bold: true }, { horizontal: "center" }));
      [7, 8].forEach((c) => applyCell(hRow2.getCell(c), fillD, { bold: true }, { horizontal: "center" }));
      hRow2.height = 16;
      ws.views = [{ state: "frozen", ySplit: ws.rowCount }];
      ws.pageSetup.printTitlesRow = `${h1n}:${h2n}`;
      DFTC_REPORT_CATEGORIES.forEach((cat) => {
        const catRn = ws.rowCount + 1;
        const catRow = ws.addRow([cat.name, "", "", "", "", "", "", ""]);
        ws.mergeCells(`A${catRn}:C${catRn}`);
        applyCell(catRow.getCell(1), fillL, { bold: true, italic: true }, { horizontal: "left" });
        catRow.getCell(1).value = cat.name;
        catRow.getCell(1).font = { bold: true, italic: true, underline: true };
        catRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        [2, 3].forEach((c) => applyCell(catRow.getCell(c), fillL));
        [4, 5, 6].forEach((c) => applyCell(catRow.getCell(c), fillB));
        [7, 8].forEach((c) => applyCell(catRow.getCell(c), fillD));
        catRow.height = 16;
        cat.commodities.forEach((com) => {
          com.variants.forEach((v, vi) => {
            const numVal = (s) => {
              if (s === "" || s === void 0) return null;
              if (s === "-") return "-";
              const n = parseFloat(s);
              return isNaN(n) ? s : n;
            };
            const dataRow = ws.addRow([
              vi === 0 ? com.no : "",
              vi === 0 ? `${com.name} ${v.descriptor}` : `    ${v.descriptor}`,
              v.uom,
              numVal(v.bankLanding),
              numVal(v.bankWholesale),
              numVal(v.bankRetail),
              numVal(v.dftcWholesale),
              numVal(v.dftcRetail)
            ]);
            applyCell(dataRow.getCell(1), fillL, vi === 0 ? {} : {}, { horizontal: "center" });
            applyCell(dataRow.getCell(2), fillL, vi === 0 ? { bold: true } : {}, vi === 0 ? {} : { indent: 2 });
            applyCell(dataRow.getCell(3), fillL, {}, { horizontal: "center" });
            [4, 5, 6].forEach((c) => {
              const cell = dataRow.getCell(c);
              applyCell(cell, fillB, {}, { horizontal: "right" });
              if (typeof cell.value === "number") cell.numFmt = "0.00";
            });
            [7, 8].forEach((c) => {
              const cell = dataRow.getCell(c);
              applyCell(cell, fillD, {}, { horizontal: "right" });
              if (typeof cell.value === "number") cell.numFmt = "0.00";
            });
            dataRow.height = 15;
          });
        });
      });
      ws.addRow([]);
      const pRow1 = ws.addRow(["Encoded by:", "", "", "", "", "Prepared by:", "", ""]);
      pRow1.getCell(1).font = { bold: false };
      pRow1.getCell(6).font = { bold: false };
      const pRow2 = ws.addRow([personnel.encodedBy, "", "", "", "", personnel.preparedBy, "", ""]);
      pRow2.getCell(1).font = { bold: true, underline: true };
      pRow2.getCell(6).font = { bold: true, underline: true };
      ws.mergeCells(`A${pRow2.number}:E${pRow2.number}`);
      ws.mergeCells(`F${pRow2.number}:H${pRow2.number}`);
      const pRow3 = ws.addRow([personnel.encodedByRole, "", "", "", "", personnel.preparedByRole, "", ""]);
      ws.mergeCells(`A${pRow3.number}:E${pRow3.number}`);
      ws.mergeCells(`F${pRow3.number}:H${pRow3.number}`);
      ws.pageSetup.printArea = `A1:H${ws.rowCount}`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `DFTC-Price-Monitoring-${REPORT_DATE_SHORT}.xlsx`);
      URL.revokeObjectURL(url);
      setDlState("idle");
    } catch (err) {
      console.error("Excel generation error:", err);
      setDlState("error-excel");
    }
  }
  async function handleDownload() {
    if (format === "IMG") await downloadImages();
    else if (format === "PDF") await downloadPDF();
    else await downloadExcel();
  }
  const isGenerating = dlState.startsWith("generating");
  const isError = dlState.startsWith("error");
  const errorFormat = isError ? dlState.replace("error-", "").toUpperCase() : null;
  const dlLabel = isGenerating ? dlState === "generating-pdf" ? "Generating PDF\u2026" : dlState === "generating-excel" ? "Generating Excel\u2026" : "Generating Images\u2026" : format === "PDF" ? "Download PDF" : format === "Excel" ? "Download Excel" : "Download Images";
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/50">
      <div
    className="bg-white rounded-2xl shadow-[var(--shadow-lg)] flex flex-col w-full"
    style={{ width: "min(94vw, 1450px)", maxHeight: "92vh" }}
  >
        {
    /* ── Header ── */
  }
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--hw-neutral-100)] shrink-0">
          <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Preview Saved Data</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)]">
            <X className="w-4 h-4 text-[var(--hw-neutral-600)]" />
          </button>
        </div>

        {
    /* ── File info ── */
  }
        <div className="px-6 py-3 border-b border-[var(--hw-neutral-100)] shrink-0">
          <p className="font-semibold text-[15px] text-[var(--hw-neutral-900)] mb-2">{file.dataName}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {[
    file.fileId ? ["File ID", file.fileId] : null,
    ["Reporting Date", REPORT_DATE],
    ["Class", "A"],
    ["Data Type", file.dataType],
    ["Market or Facility", file.market],
    file.priceType ? ["Price Type", file.priceType] : null,
    ["Entry Method", file.entryMethod],
    ["Records Included", String(file.records)],
    ["Saved Date", file.savedDate],
    file.encodedAccount ? ["Encoded Account", file.encodedAccount] : null,
    file.encodedUserId ? ["Encoded User ID", file.encodedUserId] : null
  ].filter(Boolean).map(([label, val]) => <div key={label}>
                <span className="text-[11px] font-medium text-[var(--hw-neutral-800)]">{label}: </span>
                <span className="text-[11px] text-[var(--hw-neutral-800)]">{val}</span>
              </div>)}
          </div>
        </div>

        {
    /* ── Format tabs ── */
  }
        <div className="px-6 py-3 border-b border-[var(--hw-neutral-100)] shrink-0">
          <div className="flex gap-2">
            {["PDF", "Excel", "IMG"].map((f) => <button
    key={f}
    onClick={() => setFormat(f)}
    className={`px-4 py-2 rounded-lg border text-[13px] font-medium transition-colors ${format === f ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
  >{f}</button>)}
          </div>
        </div>

        {
    /* ── Preview area ── */
  }
        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-[var(--hw-neutral-50)]">
          {format === "IMG" && <IMGPreview
    file={file}
    page={imgPage}
    onPageChange={setImgPage}
    personnel={personnel}
    combineEnabled={combineEnabled}
    onCombineToggle={() => setCombineEnabled((v) => !v)}
  />}
          {format === "PDF" && <PDFPreviewContent personnel={personnel} />}
          {format === "Excel" && <ExcelPreviewContent personnel={personnel} />}
        </div>

        {
    /* ── Report Personnel (below preview) ── */
  }
        <div className="px-6 py-4 border-t border-[var(--hw-neutral-100)] shrink-0 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex flex-col min-w-0">
              <label className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-0.5">Encoded By</label>
              <select
    value={personnel.encodedBy}
    onChange={(e) => updatePersonnel("encodedBy", e.target.value)}
    className="text-[12px] border border-[var(--hw-neutral-200)] rounded-lg px-2 py-1.5 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
    style={{ minWidth: 220 }}
  >
                {DFTC_PERSONNEL_LIST.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <span className="text-[11px] text-[var(--hw-neutral-800)] mt-0.5">{personnel.encodedByRole}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <label className="text-[11px] font-semibold text-[var(--hw-neutral-800)] mb-0.5">Prepared By</label>
              <select
    value={personnel.preparedBy}
    onChange={(e) => updatePersonnel("preparedBy", e.target.value)}
    className="text-[12px] border border-[var(--hw-neutral-200)] rounded-lg px-2 py-1.5 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)]"
    style={{ minWidth: 220 }}
  >
                {DFTC_PERSONNEL_LIST.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
              <span className="text-[11px] text-[var(--hw-neutral-800)] mt-0.5">{personnel.preparedByRole}</span>
            </div>
            {updated && <div className="flex items-center gap-1.5 self-end pb-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-emerald-700">Report personnel updated</span>
              </div>}
          </div>
        </div>

        {
    /* ── Error state ── */
  }
        {isError && <div className="px-6 py-2 bg-red-50 border-t border-red-100 shrink-0 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-[12px] text-red-700">
              {errorFormat === "PDF" ? "PDF" : errorFormat === "EXCEL" ? "Excel" : "Image"} generation failed.{" "}
              <button className="underline font-medium" onClick={() => setDlState("idle")}>Try again</button>
            </span>
          </div>}

        {
    /* ── Action bar ── */
  }
        <div className="px-6 py-4 border-t border-[var(--hw-neutral-100)] shrink-0 flex gap-3">
          <button
    onClick={onClose}
    className="py-2.5 px-5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Close
          </button>
          <button
    onClick={handleDownload}
    disabled={isGenerating}
    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-60"
  >
            {isGenerating ? <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>{dlLabel}</span>
              </> : <>
                <Download className="w-4 h-4 shrink-0" />
                <span>{dlLabel}</span>
              </>}
          </button>
        </div>
      </div>

      {
    /* Hidden off-screen pages for html2canvas rendering – must stay in DOM with full dimensions */
  }
      <div style={{ position: "fixed", left: -9999, top: 0, width: 960, pointerEvents: "none" }}>
        {PAGE_CATEGORY_GROUPS.map((group, idx) => {
    const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
    return <div key={idx} ref={(el) => {
      pageRefs.current[idx] = el;
    }}>
              <DFTCReportPage
      pageIndex={idx}
      totalPages={total}
      categories={cats}
      isFirst={idx === 0}
      isLast={idx === total - 1}
      reportDate={REPORT_DATE}
      personnel={idx === total - 1 ? personnel : void 0}
    />
            </div>;
  })}
      </div>
    </div>;
}
function DFTCInput() {
  const navigate = useNavigate();
  const location = useLocation();
  const [files] = useState(() => {
    const state = location.state;
    if (state?.savedFile) {
      return [{ ...state.savedFile, isNew: true }, ...SAVED_FILES.filter((f) => !f.isNew)];
    }
    return SAVED_FILES;
  });
  const [successMessage, setSuccessMessage] = useState(() => {
    const state = location.state;
    return state?.successMsg ?? "";
  });
  const [setupOpen, setSetupOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [commodityTab, setCommodityTab] = useState(() => {
    const s = location.state;
    return s?.restoreTab ?? "hw";
  });
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 6e3);
    return () => clearTimeout(t);
  }, [successMessage]);
  useEffect(() => {
    const s = location.state;
    if (s?.restoreScrollY) {
      window.scrollTo({ top: s.restoreScrollY, behavior: "instant" });
    }
    if (location.state) window.history.replaceState({}, "");
  }, []);
  function handleSetupContinue(setup) {
    setSetupOpen(false);
    if (setup.dataType === "Arrival Volume") navigate("/dftc/arrival-input", { state: setup });
    else navigate("/dftc/price-input", { state: setup });
  }
  const displayedFiles = showAll ? files : files.slice(0, 10);
  return <div className="px-4 md:px-8 lg:px-10 py-5 max-w-[1240px] mx-auto space-y-5">

      {successMessage && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1 text-[13px] text-emerald-800">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="p-0.5 rounded hover:bg-emerald-100">
            <X className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>}

      <PageHeader
    title="Submit Data"
    description="Input, upload, and review market price and arrival-volume data."
  />

      {
    /* Action cards */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
    onClick={() => setSetupOpen(true)}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.98] flex items-center gap-4"
  >
          <div className="p-3 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <PenLine className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Input Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Encode price or arrival-volume data gathered from the market.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>

        <button
    onClick={() => navigate("/dftc/upload")}
    className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 text-left hover:border-[var(--hw-neutral-300)] hover:bg-[var(--hw-neutral-50)] transition-all active:scale-[.98] flex items-center gap-4"
  >
          <div className="p-3 bg-[var(--hw-green-50)] rounded-xl shrink-0">
            <Upload className="w-6 h-6 text-[var(--hw-green-700)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)]">Upload Data</p>
            <p className="text-[12px] text-[var(--hw-neutral-700)] mt-0.5">Import an existing Excel or CSV dataset.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0" />
        </button>
      </div>

      {
    /* Recent Saved Files */
  }
      <div>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Recent Saved Files</h2>
          <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">Recent files saved or imported. All records are securely retained.</p>
        </div>

        {files.length === 0 ? <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-5 py-10 text-center">
            <FileText className="w-8 h-8 text-[var(--hw-neutral-300)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--hw-neutral-700)]">No saved files yet.</p>
            <p className="text-[12px] text-[var(--hw-neutral-800)] mt-1">Files will appear here after you save data.</p>
          </div> : <>
            {
    /* Desktop table */
  }
            <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Data Name", "Data Type", "Market or Facility", "Entry Method", "Saved Date", "Records"].map((h) => <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {displayedFiles.map((file) => <tr
    key={file.id}
    onClick={() => setPreviewFile(file)}
    className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-neutral-50)] cursor-pointer transition-colors"
  >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[var(--hw-neutral-900)] font-medium">{file.dataName}</span>
                          {file.isNew && <span className="text-[10px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-300)] rounded px-1.5 py-0.5 leading-none whitespace-nowrap">New</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.dataType}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.market}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.entryMethod}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{file.savedDate}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{file.records}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>

            {
    /* Mobile cards */
  }
            <div className="block md:hidden space-y-3">
              {displayedFiles.map((file) => <button
    key={file.id}
    onClick={() => setPreviewFile(file)}
    className="w-full bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-left hover:bg-[var(--hw-neutral-50)] transition-colors active:scale-[.98]"
  >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] leading-snug">{file.dataName}</p>
                    {file.isNew && <span className="shrink-0 text-[10px] font-medium text-[var(--hw-green-700)] border border-[var(--hw-green-300)] rounded px-1.5 py-0.5 leading-none">New</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.dataType}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">·</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.entryMethod}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">·</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.records} records</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.savedDate}</span>
                    <span className="text-[12px] text-[var(--hw-neutral-700)]">{file.records} records</span>
                  </div>
                </button>)}
            </div>

            {files.length > 10 && !showAll && <div className="mt-3 text-center">
                <button onClick={() => setShowAll(true)} className="text-[13px] text-[var(--hw-green-700)] hover:underline">
                  View All Recent Files
                </button>
              </div>}
          </>}
      </div>

      {
    /* Commodity Records */
  }
      <div>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Commodity Records</h2>
          <p className="text-[14px] text-[var(--hw-neutral-800)] mt-0.5">
            Review retained price and arrival-volume records by commodity. Select a commodity to view its complete record history.
          </p>
        </div>

        <div className="flex items-center justify-between mb-1">
          <div className="flex border-b border-[var(--hw-neutral-200)] flex-1">
            {[["hw", "Analytics-Supported Commodities"], ["temp", "Other Commodities"]].map(([id, label]) => <button
    key={id}
    onClick={() => setCommodityTab(id)}
    className={`px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${commodityTab === id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)]"}`}
  >{label}</button>)}
          </div>
          <button onClick={() => setInfoModalOpen(true)} className="shrink-0 text-[13px] text-[var(--hw-green-700)] underline ml-4 whitespace-nowrap">
            About analytics coverage
          </button>
        </div>

        {commodityTab === "hw" ? <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
              <p className="text-[12px] text-[var(--hw-neutral-800)]">Select a commodity to view all of its retained records.</p>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Commodity", "Data Type", "Market or Facility", "Latest Record Date", "Record Count", "Processing Use"].map((h) => <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {HW_COMMODITY_RECORDS.map((r, i) => <tr
    key={i}
    onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
    className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-green-50)] cursor-pointer transition-colors focus-within:bg-[var(--hw-green-50)]"
    tabIndex={0}
    role="button"
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } });
    }}
  >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {hasHWIcon(r.commodity) && <CommodityIllustration commodityId={hwId(r.commodity)} className="w-5 h-5 shrink-0" />}
                          <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.dataType}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.market}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.latestDate}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.recordCount}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.processingUse}</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
            <div className="block md:hidden divide-y divide-[var(--hw-neutral-100)]">
              {HW_COMMODITY_RECORDS.map((r, i) => <button
    key={i}
    type="button"
    onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
    className="w-full px-4 py-3 text-left hover:bg-[var(--hw-green-50)] active:bg-[var(--hw-green-100)] transition-colors"
  >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      {hasHWIcon(r.commodity) && <CommodityIllustration commodityId={hwId(r.commodity)} className="w-5 h-5 shrink-0" />}
                      <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                    </div>
                    <span className="text-[13px] text-[var(--hw-neutral-800)]">{r.recordCount} records</span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-800)]">{r.dataType} · {r.latestDate}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{r.processingUse}</p>
                </button>)}
            </div>
          </div> : <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
              <p className="text-[12px] text-[var(--hw-neutral-800)]">Select a commodity to view all of its retained records.</p>
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-200)]">
                  <tr>
                    {["Commodity", "Category", "Data Type", "Latest Record Date", "Records", "Processing Use"].map((h) => <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TEMP_COMMODITY_RECORDS.map((r, i) => <tr
    key={i}
    onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
    className="border-b border-[var(--hw-neutral-100)] last:border-0 hover:bg-[var(--hw-green-50)] cursor-pointer transition-colors focus-within:bg-[var(--hw-green-50)]"
    tabIndex={0}
    role="button"
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } });
    }}
  >
                      <td className="px-4 py-3 text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.category}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.dataType}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)] whitespace-nowrap">{r.latestDate}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">{r.records}</td>
                      <td className="px-4 py-3 text-[13px] text-[var(--hw-neutral-800)]">DFTC monitoring and reporting</td>
                    </tr>)}
                </tbody>
              </table>
            </div>
            <div className="block md:hidden divide-y divide-[var(--hw-neutral-100)]">
              {TEMP_COMMODITY_RECORDS.map((r, i) => <button
    key={i}
    type="button"
    onClick={() => navigate(`/dftc/input/commodity/${encodeURIComponent(r.commodity)}`, { state: { returnTab: commodityTab, returnScrollY: window.scrollY } })}
    className="w-full px-4 py-3 text-left hover:bg-[var(--hw-green-50)] active:bg-[var(--hw-green-100)] transition-colors"
  >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[14px] font-medium text-[var(--hw-neutral-900)]">{r.commodity}</span>
                    <span className="text-[13px] text-[var(--hw-neutral-800)]">{r.records} records</span>
                  </div>
                  <p className="text-[13px] text-[var(--hw-neutral-800)]">{r.category} · {r.dataType}</p>
                  <p className="text-[12px] text-[var(--hw-neutral-800)] mt-0.5">{r.latestDate}</p>
                </button>)}
            </div>
          </div>}
      </div>

      {setupOpen && <SetupModal onClose={() => setSetupOpen(false)} onContinue={handleSetupContinue} />}
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {infoModalOpen && <HowHarvestWiseModal onClose={() => setInfoModalOpen(false)} />}
    </div>;
}
export {
  DFTCInput as default
};
