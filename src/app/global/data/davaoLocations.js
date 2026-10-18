/**
 * Davao City Administrative Districts, Barangay-District Mappings,
 * and common purok/street suggestions for the Farm Location Comboboxes.
 */

// 1. The 11 Official Administrative Districts of Davao City
export const DAVAO_DISTRICTS = [
  "Agdao",
  "Baguio",
  "Buhangin",
  "Bunawan",
  "Calinan",
  "Marilog",
  "Paquibato",
  "Poblacion",
  "Talomo",
  "Toril",
  "Tugbok",
];

// 2. Mapping of all 182 Davao City Barangays to their official Administrative District
export const BARANGAY_DISTRICT_MAP = {
  // Poblacion District (Barangays 1-A through 40-D)
  "Barangay 1-A": "Poblacion",
  "Barangay 2-A": "Poblacion",
  "Barangay 3-A": "Poblacion",
  "Barangay 4-A": "Poblacion",
  "Barangay 5-A": "Poblacion",
  "Barangay 6-A": "Poblacion",
  "Barangay 7-A": "Poblacion",
  "Barangay 8-A": "Poblacion",
  "Barangay 9-A": "Poblacion",
  "Barangay 10-A": "Poblacion",
  "Barangay 11-B": "Poblacion",
  "Barangay 12-B": "Poblacion",
  "Barangay 13-B": "Poblacion",
  "Barangay 14-B": "Poblacion",
  "Barangay 15-B": "Poblacion",
  "Barangay 16-B": "Poblacion",
  "Barangay 17-B": "Poblacion",
  "Barangay 18-B": "Poblacion",
  "Barangay 19-B": "Poblacion",
  "Barangay 20-B": "Poblacion",
  "Barangay 21-C": "Poblacion",
  "Barangay 22-C": "Poblacion",
  "Barangay 23-C": "Poblacion",
  "Barangay 24-C": "Poblacion",
  "Barangay 25-C": "Poblacion",
  "Barangay 26-C": "Poblacion",
  "Barangay 27-C": "Poblacion",
  "Barangay 28-C": "Poblacion",
  "Barangay 29-C": "Poblacion",
  "Barangay 30-C": "Poblacion",
  "Barangay 31-D": "Poblacion",
  "Barangay 32-D": "Poblacion",
  "Barangay 33-D": "Poblacion",
  "Barangay 34-D": "Poblacion",
  "Barangay 35-D": "Poblacion",
  "Barangay 36-D": "Poblacion",
  "Barangay 37-D": "Poblacion",
  "Barangay 38-D": "Poblacion",
  "Barangay 39-D": "Poblacion",
  "Barangay 40-D": "Poblacion",

  // Talomo District
  "Bago Aplaya": "Talomo",
  "Bago Gallera": "Talomo",
  "Baliok": "Talomo",
  "Bucana": "Talomo",
  "Catalunan Grande": "Talomo",
  "Catalunan Pequeño": "Talomo",
  "Dumoy": "Talomo",
  "Langub": "Talomo",
  "Ma-a": "Talomo",
  "Magtuod": "Talomo",
  "Matina Aplaya": "Talomo",
  "Matina Crossing": "Talomo",
  "Matina Pangi": "Talomo",
  "Talomo (Pob.)": "Talomo",

  // Agdao District
  "Agdao (Pob.)": "Agdao",
  "Centro (San Juan)": "Agdao",
  "Gov. Paciano Bangoy": "Agdao",
  "Gov. Vicente Duterte": "Agdao",
  "Kap. Tomas Monteverde, Sr.": "Agdao",
  "Lapu-Lapu": "Agdao",
  "Leon Garcia, Sr.": "Agdao",
  "Rafael Castillo": "Agdao",
  "San Antonio": "Agdao",
  "Ubalde": "Agdao",
  "Vicente Hizon Sr.": "Agdao",

  // Buhangin District
  "Acacia": "Buhangin",
  "Alfonso Angliongto Sr.": "Buhangin",
  "Buhangin (Pob.)": "Buhangin",
  "Cabantian": "Buhangin",
  "Callawa": "Buhangin",
  "Communal": "Buhangin",
  "Indangan": "Buhangin",
  "Mandug": "Buhangin",
  "Pampanga": "Buhangin",
  "Sasa": "Buhangin",
  "Tigatto": "Buhangin",
  "Waan": "Buhangin",

  // Bunawan District
  "Alejandra Navarro (Lasang)": "Bunawan",
  "Bunawan (Pob.)": "Bunawan",
  "Gatungan": "Bunawan",
  "Ilang": "Bunawan",
  "Mahayag": "Bunawan",
  "Mudiang": "Bunawan",
  "Panacan": "Bunawan",
  "San Isidro (Licanan)": "Bunawan",
  "Tibungco": "Bunawan",

  // Paquibato District
  "Colosas": "Paquibato",
  "Fatima (Benowang)": "Paquibato",
  "Lumiad": "Paquibato",
  "Mabuhay": "Paquibato",
  "Malabog": "Paquibato",
  "Mapula": "Paquibato",
  "Panalum": "Paquibato",
  "Pandaitan": "Paquibato",
  "Paquibato (Pob.)": "Paquibato",
  "Paradise Embac": "Paquibato",
  "Salapawan": "Paquibato",
  "Sumimao": "Paquibato",
  "Tapak": "Paquibato",

  // Baguio District
  "Baguio (Pob.)": "Baguio",
  "Cadalian": "Baguio",
  "Carmen": "Baguio",
  "Gumalang": "Baguio",
  "Malagos": "Baguio",
  "Tambobong": "Baguio",
  "Tawan-Tawan": "Baguio",
  "Wines": "Baguio",

  // Calinan District
  "Biao Escuela": "Calinan",
  "Biao Joaquin": "Calinan",
  "Calinan (Pob.)": "Calinan",
  "Cawayan": "Calinan",
  "Dacudao": "Calinan",
  "Dalagdag": "Calinan",
  "Dominga": "Calinan",
  "Inayangan": "Calinan",
  "Lacson": "Calinan",
  "Lamanan": "Calinan",
  "Lampianao": "Calinan",
  "Megkawayan": "Calinan",
  "Pangyan": "Calinan",
  "Riverside": "Calinan",
  "Saloy": "Calinan",
  "Sirib": "Calinan",
  "Subasta": "Calinan",
  "Talomo River": "Calinan",
  "Tamayong": "Calinan",
  "Wangan": "Calinan",

  // Marilog District
  "Baganihan": "Marilog",
  "Bantol": "Marilog",
  "Buda": "Marilog",
  "Dalag": "Marilog",
  "Datu Salumay": "Marilog",
  "Gumitan": "Marilog",
  "Magsaysay": "Marilog",
  "Malamba": "Marilog",
  "Marilog (Pob.)": "Marilog",
  "Salaysay": "Marilog",
  "Suawan (Kulafu)": "Marilog",
  "Tamugan": "Marilog",

  // Toril District
  "Alambre": "Toril",
  "Atan-Awe": "Toril",
  "Bangkas Heights": "Toril",
  "Baracatan": "Toril",
  "Bato": "Toril",
  "Bayabas": "Toril",
  "Binugao": "Toril",
  "Camansi": "Toril",
  "Catigan": "Toril",
  "Crossing Bayabas": "Toril",
  "Daliao": "Toril",
  "Daliaon Plantation": "Toril",
  "Eden": "Toril",
  "Kilate": "Toril",
  "Lizada": "Toril",
  "Lubogan": "Toril",
  "Marapangi": "Toril",
  "Mulig": "Toril",
  "Sibulan": "Toril",
  "Sirawan": "Toril",
  "Tagluno": "Toril",
  "Tagurano": "Toril",
  "Tibuloy": "Toril",
  "Toril (Pob.)": "Toril",
  "Tungkalan": "Toril",

  // Tugbok District
  "Angalan": "Tugbok",
  "Bago Oshiro": "Tugbok",
  "Balengaeng": "Tugbok",
  "Biao Guianga": "Tugbok",
  "Los Amigos": "Tugbok",
  "Manambulan": "Tugbok",
  "Manuel Guianga": "Tugbok",
  "Matina Biao": "Tugbok",
  "Mintal": "Tugbok",
  "New Carmen": "Tugbok",
  "New Valencia": "Tugbok",
  "Santo Niño": "Tugbok",
  "Tacunan": "Tugbok",
  "Tagakpan": "Tugbok",
  "Talandang": "Tugbok",
  "Tugbok (Pob.)": "Tugbok",
  "Ula": "Tugbok",
};

// 3. Common Puroks / Sitios across Davao farming and residential communities
export const COMMON_PUROKS = [
  "Purok 1",
  "Purok 2",
  "Purok 3",
  "Purok 4",
  "Purok 5",
  "Purok 6",
  "Purok 7",
  "Purok 8",
  "Purok 9",
  "Purok 10",
  "Purok 11",
  "Purok 12",
  "Purok Centro",
  "Purok Pag-asa",
  "Purok Riverside",
  "Purok San Roque",
  "Purok Maharlika",
  "Purok Mabuhay",
  "Sitio Centro",
  "Sitio Upper",
  "Sitio Lower",
  "Sitio Quarry",
];

// District or Barangay-specific popular suggestions
export const DISTRICT_PUROK_SUGGESTIONS = {
  Tugbok: [
    "Deca Prime",
    "Deca Homes",
    "Deca Resort",
    "Sitio Sto. Niño",
    "Mintal Relocation",
    "Granville Subd",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
    "Purok 6",
    "Purok 7",
  ],
  Marilog: [
    "Sitio Buda",
    "Sitio Baganihan",
    "Sitio Lapan",
    "Sitio Malamba",
    "Sitio Salaysay",
    "Sitio Datu Salumay",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
  ],
  Calinan: [
    "Sitio Riverside",
    "Sitio Tamayong",
    "Sitio Subasta",
    "Sitio Dacudao",
    "Purok Centro",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
    "Purok 6",
    "Purok 7",
  ],
  Baguio: [
    "Sitio Malagos",
    "Sitio Gumalang",
    "Sitio Tambobong",
    "Sitio Cadalian",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
  ],
  Toril: [
    "Crossing Bayabas",
    "Eden Nature Area",
    "Sitio Catigan",
    "Sitio Sibulan",
    "Sitio Baracatan",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
    "Purok 5",
  ],
  Talomo: [
    "Bago Gallera Subd",
    "Catalunan Grande Subd",
    "Deca Homes Talomo",
    "Bangkal Area",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
  ],
  Buhangin: [
    "Cabantian Country Homes",
    "Indangan Relocation",
    "Sasa Wharf Area",
    "Purok 1",
    "Purok 2",
    "Purok 3",
    "Purok 4",
  ],
  Paquibato: [
    "Sitio Tapak",
    "Sitio Mapula",
    "Sitio Malabog",
    "Sitio Colosas",
    "Purok 1",
    "Purok 2",
    "Purok 3",
  ],
  Bunawan: [
    "Lasang Crossing",
    "Tibungco Market Area",
    "Panacan Relocation",
    "Purok 1",
    "Purok 2",
    "Purok 3",
  ],
};

// 4. Common Highways, Thoroughfares, and Farm Roads in Davao City
export const COMMON_STREETS = [
  "Davao-Bukidnon Highway",
  "MacArthur Highway",
  "Carlos P. Garcia Highway (Diversion Road)",
  "Pan-Philippine Highway (AH26)",
  "Davao-Cotabato Road",
  "Coastal Road",
  "Mandug Road",
  "Tigatto Road",
  "Cabantian Road",
  "Buhangin-Lapanday Road",
  "Calinan-Baguio Road",
  "Eden-Bayabas Road",
  "Toril-Daliao Road",
  "Tugbok-Tacunan Road",
  "Mintal-Bago Oshiro Road",
  "Catalunan Grande Road",
  "Ma-a Road",
  "Quimpo Boulevard",
  "Quezon Boulevard",
  "JP Laurel Avenue",
  "Ecoland Drive",
];

// District-specific major streets
export const DISTRICT_STREET_SUGGESTIONS = {
  Tugbok: [
    "Davao-Bukidnon Highway",
    "Tugbok-Tacunan Road",
    "Mintal-Bago Oshiro Road",
    "Deca Homes Main Road",
    "Los Amigos Road",
  ],
  Marilog: [
    "Davao-Bukidnon Highway",
    "Buda National Highway",
    "Baganihan Access Road",
    "Tamugan Road",
  ],
  Calinan: [
    "Davao-Bukidnon Highway",
    "Calinan-Baguio Road",
    "Tamayong-Sirib Road",
    "Subasta Provincial Road",
  ],
  Baguio: [
    "Calinan-Baguio Road",
    "Malagos-Cadalian Road",
    "Gumalang Road",
  ],
  Toril: [
    "MacArthur Highway",
    "Toril-Daliao Road",
    "Eden-Bayabas Road",
    "Crossing Bayabas Road",
    "Catigan Provincial Road",
  ],
  Talomo: [
    "MacArthur Highway",
    "Catalunan Grande Road",
    "Bago Aplaya Coastal Road",
    "Ma-a Road",
  ],
  Buhangin: [
    "Carlos P. Garcia Highway (Diversion Road)",
    "Cabantian Road",
    "Mandug Road",
    "Tigatto Road",
    "Buhangin-Lapanday Road",
  ],
  Bunawan: [
    "Pan-Philippine Highway (AH26)",
    "Tibungco Main Road",
    "Panacan Relocation Road",
  ],
  Paquibato: [
    "Paquibato Provincial Road",
    "Malabog Highway",
    "Fatima-Tapak Road",
  ],
};

/**
 * Returns the official administrative district for a given barangay name.
 */
export function getDistrictForBarangay(barangayName) {
  if (!barangayName) return "";
  // Check direct match
  if (BARANGAY_DISTRICT_MAP[barangayName]) {
    return BARANGAY_DISTRICT_MAP[barangayName];
  }
  // Case-insensitive match or stripped (Pob.) match
  const clean = barangayName.replace(/\(pob\.?\)/gi, "").trim().toLowerCase();
  for (const [bName, dist] of Object.entries(BARANGAY_DISTRICT_MAP)) {
    const bClean = bName.replace(/\(pob\.?\)/gi, "").trim().toLowerCase();
    if (bClean === clean) {
      return dist;
    }
  }
  return "";
}

/**
 * Checks whether a given barangay belongs to a given administrative district.
 */
export function isBarangayInDistrict(barangayName, districtName) {
  if (!barangayName || !districtName) return false;
  const dist = getDistrictForBarangay(barangayName);
  return dist.toLowerCase() === districtName.trim().toLowerCase();
}

/**
 * Returns prioritized suggestions for Purok / Sitio given a district or barangay.
 */
export function getPurokSuggestions(district, barangay) {
  const dist = district || getDistrictForBarangay(barangay);
  const districtList = (dist && DISTRICT_PUROK_SUGGESTIONS[dist]) || [];
  // Combine unique
  return Array.from(new Set([...districtList, ...COMMON_PUROKS]));
}

/**
 * Returns prioritized suggestions for Street given a district or barangay.
 */
export function getStreetSuggestions(district, barangay) {
  const dist = district || getDistrictForBarangay(barangay);
  const districtList = (dist && DISTRICT_STREET_SUGGESTIONS[dist]) || [];
  return Array.from(new Set([...districtList, ...COMMON_STREETS]));
}
