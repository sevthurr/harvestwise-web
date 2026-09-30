// Static layout for the DFTC price monitoring report: commodity catalogue
// structure (commodity -> variants) and the page groupings. Price values are
// NOT stored here — they are resolved from the API at render time.

const DFTC_REPORT_CATEGORIES = [
  {
    name: "LOWLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Kamatis", variants: [
        { descriptor: "(diamante Big)", uom: "kg", bankLanding: "55.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "60.00", dftcRetail: "90.00" },
        { descriptor: "(local round)", uom: "kg", bankLanding: "50.00", bankWholesale: "58.00", bankRetail: "78.00", dftcWholesale: "—", dftcRetail: "75.00" }
      ] },
      { no: 2, name: "Talong", variants: [
        { descriptor: "(banate king)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "60.00", dftcWholesale: "35.00", dftcRetail: "55.00" },
        { descriptor: "(round/native)", uom: "kg", bankLanding: "28.00", bankWholesale: "32.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 3, name: "Pipino", variants: [
        { descriptor: "(mega c)", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "45.00", dftcWholesale: "25.00", dftcRetail: "42.00" }
      ] },
      { no: 4, name: "Ampalaya", variants: [
        { descriptor: "(galaxy)", uom: "kg", bankLanding: "38.00", bankWholesale: "45.00", bankRetail: "70.00", dftcWholesale: "42.00", dftcRetail: "65.00" },
        { descriptor: "(white/pale)", uom: "kg", bankLanding: "—", bankWholesale: "42.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" }
      ] },
      { no: 5, name: "Kalabasa", variants: [
        { descriptor: "(suprema)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "40.00", dftcWholesale: "22.00", dftcRetail: "38.00" }
      ] },
      { no: 6, name: "Chinese Pechay", variants: [
        { descriptor: "(baby pechay)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" },
        { descriptor: "(regular)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 7, name: "Native Pechay", variants: [
        { descriptor: "(condor)", uom: "kg/bundle", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "—", dftcRetail: "22.00" }
      ] },
      { no: 8, name: "Okra", variants: [
        { descriptor: "(smooth green)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 9, name: "Sitaw", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" }
      ] },
      { no: 10, name: "Batong", variants: [
        { descriptor: "(negrostar)", uom: "kg", bankLanding: "32.00", bankWholesale: "42.00", bankRetail: "60.00", dftcWholesale: "—", dftcRetail: "55.00" }
      ] }
    ]
  },
  {
    name: "HIGHLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Repolyo", variants: [
        { descriptor: "(green cabbage)", uom: "kg", bankLanding: "38.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "45.00", dftcRetail: "62.00" },
        { descriptor: "(red cabbage)", uom: "kg", bankLanding: "55.00", bankWholesale: "68.00", bankRetail: "90.00", dftcWholesale: "—", dftcRetail: "85.00" }
      ] },
      { no: 2, name: "Atsal", variants: [
        { descriptor: "(smooth cayene)", uom: "kg", bankLanding: "100.00", bankWholesale: "130.00", bankRetail: "190.00", dftcWholesale: "120.00", dftcRetail: "185.00" },
        { descriptor: "(sultan)", uom: "kg", bankLanding: "85.00", bankWholesale: "110.00", bankRetail: "165.00", dftcWholesale: "—", dftcRetail: "160.00" }
      ] },
      { no: 3, name: "Carrots", variants: [
        { descriptor: "(big)", uom: "kg", bankLanding: "48.00", bankWholesale: "60.00", bankRetail: "85.00", dftcWholesale: "55.00", dftcRetail: "80.00" },
        { descriptor: "(medium)", uom: "kg", bankLanding: "42.00", bankWholesale: "54.00", bankRetail: "75.00", dftcWholesale: "50.00", dftcRetail: "72.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "35.00", bankWholesale: "46.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 4, name: "Lettuce", variants: [
        { descriptor: "(curly)", uom: "kg", bankLanding: "50.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "—", dftcRetail: "90.00" },
        { descriptor: "(ball)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "85.00", dftcWholesale: "—", dftcRetail: "80.00" }
      ] },
      { no: 5, name: "Broccoli", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "80.00", bankWholesale: "100.00", bankRetail: "145.00", dftcWholesale: "—", dftcRetail: "140.00" }
      ] },
      { no: 6, name: "Cauliflower", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "135.00", dftcWholesale: "—", dftcRetail: "130.00" }
      ] },
      { no: 7, name: "Sayote", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "—", dftcRetail: "42.00" }
      ] }
    ]
  },
  {
    name: "SPICES",
    commodities: [
      { no: 1, name: "Luya", variants: [
        { descriptor: "(fresh ginger)", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "110.00", dftcWholesale: "—", dftcRetail: "105.00" }
      ] },
      { no: 2, name: "Bawang", variants: [
        { descriptor: "(local)", uom: "kg", bankLanding: "130.00", bankWholesale: "165.00", bankRetail: "220.00", dftcWholesale: "150.00", dftcRetail: "210.00" },
        { descriptor: "(imported)", uom: "kg", bankLanding: "200.00", bankWholesale: "265.00", bankRetail: "340.00", dftcWholesale: "—", dftcRetail: "330.00" }
      ] },
      { no: 3, name: "Sibuyas", variants: [
        { descriptor: "(red onion)", uom: "kg", bankLanding: "110.00", bankWholesale: "145.00", bankRetail: "180.00", dftcWholesale: "—", dftcRetail: "175.00" },
        { descriptor: "(bombay/yellow)", uom: "kg", bankLanding: "—", bankWholesale: "—", bankRetail: "—", dftcWholesale: "—", dftcRetail: "—" }
      ] },
      { no: 4, name: "Sili", variants: [
        { descriptor: "(labuyo)", uom: "kg", bankLanding: "180.00", bankWholesale: "220.00", bankRetail: "280.00", dftcWholesale: "—", dftcRetail: "270.00" },
        { descriptor: "(espada/haba)", uom: "kg", bankLanding: "40.00", bankWholesale: "55.00", bankRetail: "80.00", dftcWholesale: "—", dftcRetail: "75.00" },
        { descriptor: "(baguio)", uom: "kg", bankLanding: "95.00", bankWholesale: "120.00", bankRetail: "160.00", dftcWholesale: "—", dftcRetail: "155.00" }
      ] }
    ]
  },
  {
    name: "ROOTCROPS",
    commodities: [
      { no: 1, name: "Kamote", variants: [
        { descriptor: "(orange/yellow)", uom: "kg", bankLanding: "25.00", bankWholesale: "35.00", bankRetail: "50.00", dftcWholesale: "—", dftcRetail: "48.00" },
        { descriptor: "(purple/violet)", uom: "kg", bankLanding: "30.00", bankWholesale: "40.00", bankRetail: "58.00", dftcWholesale: "—", dftcRetail: "55.00" }
      ] },
      { no: 2, name: "Gabi", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "40.00", bankWholesale: "52.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 3, name: "Singkamas", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 4, name: "Ube", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "55.00", bankWholesale: "70.00", bankRetail: "90.00", dftcWholesale: "—", dftcRetail: "88.00" }
      ] }
    ]
  },
  {
    name: "FRUITS",
    commodities: [
      { no: 1, name: "Saging", variants: [
        { descriptor: "(lakatan)", uom: "kg", bankLanding: "48.00", bankWholesale: "62.00", bankRetail: "85.00", dftcWholesale: "—", dftcRetail: "80.00" },
        { descriptor: "(latundan)", uom: "kg", bankLanding: "38.00", bankWholesale: "52.00", bankRetail: "70.00", dftcWholesale: "—", dftcRetail: "65.00" },
        { descriptor: "(saba)", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 2, name: "Mangga", variants: [
        { descriptor: "(carabao/ripe)", uom: "kg", bankLanding: "95.00", bankWholesale: "125.00", bankRetail: "150.00", dftcWholesale: "—", dftcRetail: "145.00" },
        { descriptor: "(green/unripe)", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 3, name: "Papaya", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "25.00", bankWholesale: "35.00", bankRetail: "45.00", dftcWholesale: "—", dftcRetail: "42.00" },
        { descriptor: "(solo/hawaiian)", uom: "kg", bankLanding: "40.00", bankWholesale: "55.00", bankRetail: "75.00", dftcWholesale: "—", dftcRetail: "72.00" }
      ] },
      { no: 4, name: "Durian", variants: [
        { descriptor: "(Puyat)", uom: "kg", bankLanding: "150.00", bankWholesale: "200.00", bankRetail: "250.00", dftcWholesale: "—", dftcRetail: "245.00" }
      ] }
    ]
  },
  {
    name: "OTHERS",
    commodities: [
      { no: 1, name: "Mushroom", variants: [
        { descriptor: "(button)", uom: "kg", bankLanding: "180.00", bankWholesale: "240.00", bankRetail: "320.00", dftcWholesale: "—", dftcRetail: "310.00" },
        { descriptor: "(oyster)", uom: "kg", bankLanding: "150.00", bankWholesale: "200.00", bankRetail: "280.00", dftcWholesale: "—", dftcRetail: "270.00" }
      ] },
      { no: 2, name: "Tokwa / Tofu", variants: [
        { descriptor: "(firm)", uom: "pcs", bankLanding: "45.00", bankWholesale: "60.00", bankRetail: "80.00", dftcWholesale: "—", dftcRetail: "78.00" },
        { descriptor: "(soft)", uom: "pcs", bankLanding: "38.00", bankWholesale: "50.00", bankRetail: "68.00", dftcWholesale: "—", dftcRetail: "65.00" }
      ] },
      { no: 3, name: "Toge (Bean Sprouts)", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] }
    ]
  }
];

const PAGE_CATEGORY_GROUPS = [
  ["LOWLAND VEGETABLES"],
  ["HIGHLAND VEGETABLES"],
  ["SPICES", "ROOTCROPS"],
  ["FRUITS", "OTHERS"]
];

export { DFTC_REPORT_CATEGORIES, PAGE_CATEGORY_GROUPS };
