function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function item(name, variantNames, isHW) {
  return { name, id: slug(name), variants: variantNames.map((n) => ({ name: n })), ...isHW ? { isHW } : {} };
}
const COMMODITY_CATEGORIES = [
  {
    category: "Lowland Vegetables",
    items: [
      item("Ampalaya", ["Galaxy"], true),
      item("Batong", ["Negrostar"]),
      item("Kalabasa", ["Suprema", "Malagkit"], true),
      item("Kamatis", ["Diamante Big"], true),
      item("Native Pechay", ["Condor"]),
      item("Okra", ["Smooth Green"]),
      item("Patola", ["Ordinary"]),
      item("Pipino", ["Mega C"], true),
      item("Radish", ["Ordinary"]),
      item("Talong", ["Banate King"], true),
      item("Upo", ["Mayumi"]),
      item("Alugbati", []),
      item("Pak choi / Bok choy", []),
      item("Kangkong / Tinangkong", []),
      item("Mustasa", []),
      item("Paco", []),
      item("Saluyot", []),
      item("Udlot sa saluyot", []),
      item("Udlot sa sayote", [])
    ]
  },
  {
    category: "Highland Vegetables",
    items: [
      item("Baguio Beans", ["Pencil"]),
      item("Broccoli", []),
      item("Cauliflower", []),
      item("Chinese Pechay", [], true),
      item("Lettuce", ["Curly", "Ball", "Romaine"], true),
      item("Repolyo", ["Wakamini"], true),
      item("Carrots", ["Big", "Medium", "Small"], true),
      item("Patatas", ["Big", "Medium", "Small"]),
      item("Sayote", ["Big", "Small"]),
      item("Celery", []),
      item("Asparagus", []),
      item("Beetroot", []),
      item("Sitsaro", [])
    ]
  },
  {
    category: "Spices",
    items: [
      item("Ahos", ["Imported"]),
      item("Atsal", ["Smooth Cayene", "Sultan"], true),
      item("Bombay", ["Native", "White"]),
      item("Luy-a", ["Hawaian", "Jamaica"]),
      item("Sibuyas Dahon", []),
      item("Tanglad", []),
      item("Sili", ["Labuyo", "Kolikot", "Native", "Dynamite"]),
      item("Parsley", [])
    ]
  },
  {
    category: "Rootcrops",
    items: [
      item("Cassava", []),
      item("Gabi", ["Bisol"]),
      item("Kamote", []),
      item("Karlang", []),
      item("Kamote tops / Galay", []),
      item("Takway", []),
      item("Ube", []),
      item("Udlot sa gabi", [])
    ]
  },
  {
    category: "Fruits",
    items: [
      item("Avocado", ["Medium"]),
      item("Durian", ["Puyat", "Arancillo", "Cob", "D101"]),
      item("Kalamansi", ["Local"]),
      item("Mangga", ["Cebu", "Carabao"]),
      item("Papaya", ["Solo", "Red Lady"]),
      item("Pomelo", ["Seedless", "Magallanes"]),
      item("Saging", ["Lakatan", "Latundan", "Cardava", "Cavendish", "Se\xF1orita", "Dalian", "Mundo", "Sab-a"]),
      item("Watermelon", ["Ordinary", "Seedless", "Venus"]),
      item("Marang", []),
      item("Rambutan", []),
      item("Jackfruit", []),
      item("Labana", ["Guyabano"]),
      item("Dragon Fruit", []),
      item("Apple", []),
      item("Lanzones", []),
      item("Lemon", []),
      item("Mangosteen", []),
      item("Orange", []),
      item("Passion Fruit", []),
      item("Pinya", ["Pineapple"]),
      item("Santol", []),
      item("Singkamas", []),
      item("Yakun", []),
      item("Puso Saging", ["Standard", "Small"])
    ]
  },
  {
    category: "Others",
    items: [
      item("Sweet Corn", []),
      item("Peanut", ["Mani"]),
      item("Poncan", []),
      item("Grapes", []),
      item("Monggo", []),
      item("Young Corn", []),
      item("Dabong", []),
      item("Kulo", [])
    ]
  }
];
const ALL_COMMODITY_ITEMS = COMMODITY_CATEGORIES.flatMap((c) => c.items);
const HW_COMMODITY_ITEMS = ALL_COMMODITY_ITEMS.filter((c) => c.isHW);
const HW_COMMODITY_NAMES = new Set(HW_COMMODITY_ITEMS.map((c) => c.name));
const HW_NAME_TO_ID = {
  "Kamatis": "kamatis",
  "Talong": "talong",
  "Repolyo": "repolyo",
  "Atsal": "atsal",
  "Carrots": "carrots",
  "Pipino": "pipino",
  "Ampalaya": "ampalaya",
  "Kalabasa": "kalabasa",
  "Lettuce": "lettuce",
  "Chinese Pechay": "pechay"
};
const HW_ID_TO_NAME = Object.fromEntries(
  Object.entries(HW_NAME_TO_ID).map(([n, id]) => [id, n])
);
function getVariants(commodityName) {
  const found = ALL_COMMODITY_ITEMS.find((c) => c.name === commodityName);
  return found ? found.variants.map((v) => v.name) : [];
}
function getCategoryFor(commodityName) {
  return COMMODITY_CATEGORIES.find((cat) => cat.items.some((i) => i.name === commodityName))?.category;
}
function isHWCommodity(nameOrId) {
  return HW_COMMODITY_NAMES.has(nameOrId) || nameOrId in HW_ID_TO_NAME;
}
export {
  ALL_COMMODITY_ITEMS,
  COMMODITY_CATEGORIES,
  HW_COMMODITY_ITEMS,
  HW_COMMODITY_NAMES,
  HW_ID_TO_NAME,
  HW_NAME_TO_ID,
  getCategoryFor,
  getVariants,
  isHWCommodity
};
