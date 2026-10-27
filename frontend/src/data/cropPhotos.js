// Curated agricultural crop and land photography data with regional Karnataka focus (Tumakuru & Davanagere)

export const CROP_DATABASE = {
  "Ragi (Finger Millet)": {
    name: "Ragi (Finger Millet)",
    scientificName: "Eleusine coracana",
    kannadaName: "ರಾಗಿ (ರಾಗಿ ಬೆಳೆ)",
    category: "Dry Crop / Millets",
    season: "Kharif (July - November)",
    soilType: "Red Loamy / Sandy Clay",
    irrigationType: "Rainfed / Protective Tank Irrigation",
    growthDuration: "105 - 120 Days",
    averageYield: "14 - 18 Quintals / Acre",
    mspValue: "₹4,290 / Quintal",
    colorHex: "#84cc16", // Lime / Golden-Green
    threeColor: 0x84cc16,
    terrainTexture: "patch-ragi",
    description: "Tumakuru's flagship drought-resistant millet. Highly nutritious, cultivated extensively across Kasaba, Gubbi, and Madhugiri taluks.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1592417817098-8f3d6ef238ff?auto=format&fit=crop&w=1000&q=80",
        caption: "Lush green Ragi field terrace during monsoon vegetative stage in rural Tumakuru.",
        photographer: "Karnataka Agri Drone Survey"
      },
      {
        url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1000&q=80",
        caption: "Golden maturing finger millet ears ready for village granary harvest.",
        photographer: "Krishi Vigyan Kendra"
      }
    ]
  },

  "Paddy (Wetland Rice)": {
    name: "Paddy (Wetland Rice)",
    scientificName: "Oryza sativa",
    kannadaName: "ಭತ್ತ (ತರಿ ಜಮೀನು)",
    category: "Wetland / Cereal",
    season: "Kharif & Rabi (Dual Season)",
    soilType: "Alluvial Clay / Silt Loam",
    irrigationType: "Canal & Borewell Fed (Bhadra / Hemavathi)",
    growthDuration: "125 - 140 Days",
    averageYield: "24 - 30 Quintals / Acre",
    mspValue: "₹2,320 / Quintal",
    colorHex: "#10b981", // Emerald Green
    threeColor: 0x10b981,
    terrainTexture: "patch-paddy",
    description: "Canal-irrigated paddy fields of Davanagere and valley parcels of Tumakuru. High-yield Sona Masuri and Jyothi varieties.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=1000&q=80",
        caption: "Tiered wetland paddy fields with standing irrigation water and boundary bunds.",
        photographer: "Cauvery-Hemavathi Basin Survey"
      },
      {
        url: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=1000&q=80",
        caption: "Farmers inspecting standing paddy crop prior to state granary procurement.",
        photographer: "State Land Registry Photogrammetry"
      }
    ]
  },

  "Arecanut & Betel Palm": {
    name: "Arecanut & Betel Palm",
    scientificName: "Areca catechu",
    kannadaName: "ಅಡಿಕೆ (ಬಾಗಾಯ್ತು ತೋಟ)",
    category: "Commercial Plantation / Garden",
    season: "Perennial (Year-round Harvest)",
    soilType: "Deep Laterite / Fertile Red Loam",
    irrigationType: "Micro-Drip & Sprinkler Irrigated",
    growthDuration: "Perennial (Peak yield at 7-25 years)",
    averageYield: "12 - 16 Quintals (Dry Chali) / Acre",
    mspValue: "₹45,000 / Quintal (Market Grade)",
    colorHex: "#047857", // Deep Forest Green
    threeColor: 0x047857,
    terrainTexture: "patch-plantation",
    description: "High-value commercial plantation typical of Central Karnataka. Intercropped with black pepper and banana for multi-tier microclimate.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80",
        caption: "Dense canopy of arecanut palms with drip irrigation lines in Kasaba hobli.",
        photographer: "Karnataka Plantation Cadastre"
      },
      {
        url: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1000&q=80",
        caption: "Harvested betel nuts laid out for sun curing on village threshing floor.",
        photographer: "Agricultural Marketing Board"
      }
    ]
  },

  "Coconut Grove (Kalpataru)": {
    name: "Coconut Grove (Kalpataru)",
    scientificName: "Cocos nucifera",
    kannadaName: "ತೆಂಗಿನ ತೋಟ (ಕಲ್ಪತರು)",
    category: "Commercial Plantation",
    season: "Perennial (Monthly Plucking)",
    soilType: "Sandy Loam / Coastal & Inland Loam",
    irrigationType: "Basin & Drip Irrigation",
    growthDuration: "Perennial (60+ years productive life)",
    averageYield: "9,000 - 12,500 Nuts / Acre / Year",
    mspValue: "₹12,000 / Quintal (Milling Copra)",
    colorHex: "#065f46", // Dark Pine
    threeColor: 0x065f46,
    terrainTexture: "patch-coconut",
    description: "Tumakuru is revered as the 'Kalpataru Naadu' (Land of the Coconut). Prime source of premium Tiptur copra exported nationwide.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80",
        caption: "Stately coconut palm plantation bordering village boundary survey stones.",
        photographer: "Tiptur Coconut Research Station"
      },
      {
        url: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=1000&q=80",
        caption: "Fresh green coconuts harvested from survey parcel plot.",
        photographer: "State Horticulture Mission"
      }
    ]
  },

  "Maize & Grain Reserves": {
    name: "Maize & Grain Reserves",
    scientificName: "Zea mays",
    kannadaName: "ಮೆಕ್ಕೆಜೋಳ (ಧಾನ್ಯ ಬೆಳೆ)",
    category: "Grain / Granary Feed",
    season: "Kharif & Summer",
    soilType: "Well-drained Fertile Loam",
    irrigationType: "Semi-irrigated / Borewell",
    growthDuration: "90 - 110 Days",
    averageYield: "26 - 32 Quintals / Acre",
    mspValue: "₹2,225 / Quintal",
    colorHex: "#eab308", // Golden Yellow
    threeColor: 0xeab308,
    terrainTexture: "patch-maize",
    description: "Essential feed grain for state food storage and livestock granaries across Davanagere and Tumakuru districts.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?auto=format&fit=crop&w=1000&q=80",
        caption: "Ripe golden maize crop ready for combine harvesting into granary hoppers.",
        photographer: "Central Warehousing Corporation"
      },
      {
        url: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=1000&q=80",
        caption: "Tall corn stands basking in rural sunlight with healthy soil tilling.",
        photographer: "Karnataka Agri Tech"
      }
    ]
  },

  "Groundnut & Oilseeds": {
    name: "Groundnut & Oilseeds",
    scientificName: "Arachis hypogaea",
    kannadaName: "ಕಡಲೆಕಾಯಿ (ಎಣ್ಣೆಕಾಳು)",
    category: "Oilseeds & Nitrogen Fixer",
    season: "Kharif (Monsoon)",
    soilType: "Sandy Loam / Light Red Gravel",
    irrigationType: "Rainfed",
    growthDuration: "105 - 115 Days",
    averageYield: "10 - 14 Quintals / Acre",
    mspValue: "₹6,783 / Quintal",
    colorHex: "#d97706", // Amber
    threeColor: 0xd97706,
    terrainTexture: "patch-groundnut",
    description: "Vital rotational crop fixing atmospheric nitrogen in sandy red soils, maintaining soil fertility across rural dry plots.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80",
        caption: "Groundnut crop carpet spreading across red agrarian parcel soil.",
        photographer: "ICAR Agricultural Research"
      }
    ]
  }
};

// Fallback helper to retrieve crop info by general land_type or default to Ragi/Paddy
export function getCropInfoByLandType(landType, surveyNumber = "104") {
  const lt = (landType || "").toLowerCase();
  if (lt.includes("bagayat") || lt.includes("garden") || lt.includes("plantation")) {
    return parseInt(surveyNumber, 10) % 2 === 0 ? CROP_DATABASE["Arecanut & Betel Palm"] : CROP_DATABASE["Coconut Grove (Kalpataru)"];
  }
  if (lt.includes("wet") || lt.includes("tari") || lt.includes("paddy")) {
    return CROP_DATABASE["Paddy (Wetland Rice)"];
  }
  if (lt.includes("commercial") || lt.includes("maize")) {
    return CROP_DATABASE["Maize & Grain Reserves"];
  }
  if (lt.includes("oilseed") || lt.includes("groundnut")) {
    return CROP_DATABASE["Groundnut & Oilseeds"];
  }
  // Default for Dry Crop (Agricultural)
  return parseInt(surveyNumber, 10) % 2 === 0 ? CROP_DATABASE["Ragi (Finger Millet)"] : CROP_DATABASE["Paddy (Wetland Rice)"];
}

// Granary Storage Silos Data for "Krishi Bhandara"
export const GRANARY_METRICS = {
  facilityName: "Karnataka State Agricultural Granary & Buffer Storage #04",
  location: "Tumakuru - Kunigal Road Grain Reserve Hub",
  totalCapacityQuintals: 16500,
  currentStockQuintals: 13900,
  occupancyPercent: 84.2,
  silos: [
    {
      id: "SILO-A",
      name: "Silo A (Tumakuru Ragi Reserve)",
      crop: "Ragi (Finger Millet)",
      capacityQuintals: 5000,
      storedQuintals: 4200,
      fillPercent: 84,
      temperatureC: 22.4,
      moisturePercent: 11.2,
      lastAudit: "2026-10-24",
      status: "OPTIMAL_STORAGE",
      color: "#84cc16"
    },
    {
      id: "SILO-B",
      name: "Silo B (Central Paddy & Rice Buffer)",
      crop: "Paddy (Wetland Rice)",
      capacityQuintals: 7500,
      storedQuintals: 6800,
      fillPercent: 90.6,
      temperatureC: 23.1,
      moisturePercent: 12.0,
      lastAudit: "2026-10-25",
      status: "OPTIMAL_STORAGE",
      color: "#10b981"
    },
    {
      id: "SILO-C",
      name: "Silo C (Maize & Pulses Silo)",
      crop: "Maize & Grain Reserves",
      capacityQuintals: 4000,
      storedQuintals: 2900,
      fillPercent: 72.5,
      temperatureC: 21.8,
      moisturePercent: 10.8,
      lastAudit: "2026-10-26",
      status: "RECEIVING_SHIPMENTS",
      color: "#eab308"
    }
  ],
  recentGrainReceipts: [
    {
      receiptId: "GB-2026-8841",
      surveyNumber: "75/2A",
      village: "Melekote",
      farmerName: "Gowramma W/o Chennappa",
      crop: "Ragi",
      quantityQuintals: 45,
      mspRate: 4290,
      totalPayment: 193050,
      blockchainTx: "0x8fa3...b401"
    },
    {
      receiptId: "GB-2026-8842",
      surveyNumber: "104/1",
      village: "Avaragere",
      farmerName: "Kallappa Basappa Patil",
      crop: "Paddy",
      quantityQuintals: 72,
      mspRate: 2320,
      totalPayment: 167040,
      blockchainTx: "0x91c4...e18b"
    },
    {
      receiptId: "GB-2026-8843",
      surveyNumber: "142/2",
      village: "Vijayapura",
      farmerName: "Suresh Kumar",
      crop: "Maize",
      quantityQuintals: 58,
      mspRate: 2225,
      totalPayment: 129050,
      blockchainTx: "0xa2d7...42f0"
    }
  ]
};
