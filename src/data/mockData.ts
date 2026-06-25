// Mock user data
export const mockUser = {
  id: 'user_001',
  name: 'Juan Santos',
  email: 'juan.santos@ricefarmer.ph',
  phone: '+63 917 123 4567',
  barangay: 'San Pablo',
  municipality: 'Iloilo City',
  province: 'Iloilo',
};

// Mock farms data
export const mockFarms = [
  {
    id: 'farm_001',
    userId: 'user_001',
    name: 'Santos Family Farm',
    barangay: 'San Pablo',
    municipality: 'Iloilo City',
    province: 'Iloilo',
    areaHectares: 2.5,
    latitude: 10.6897,
    longitude: 122.5667,
    profileType: 'Lowland - High Rainfall',
    createdAt: '2023-05-15',
  },
  {
    id: 'farm_002',
    userId: 'user_001',
    name: 'Hilltop Field',
    barangay: 'Jaro',
    municipality: 'Iloilo City',
    province: 'Iloilo',
    areaHectares: 1.8,
    latitude: 10.6823,
    longitude: 122.5482,
    profileType: 'Highland - Moderate Rainfall',
    createdAt: '2023-06-20',
  },
];

// Mock environmental scan data
export const mockEnvironmentalScans = [
  {
    id: 'scan_001',
    farmId: 'farm_001',
    soilType: 'Loamy',
    soilColor: 'Brown',
    rainfallMm: 2500,
    elevationM: 5,
    floodRisk: 'high',
    scanDate: '2024-04-10',
    dataSource: 'Manual Entry',
    status: 'completed',
  },
];

// Mock rice varieties data
export const mockRiceVarieties = [
  {
    id: 'variety_001',
    name: 'NSIC Rc160',
    maturityDays: 115,
    yieldPotential: 6.5,
    floodTolerance: 'high',
    droughtTolerance: 'moderate',
    description:
      'Premium quality rice variety with high yield potential and flood tolerance. Ideal for lowland areas with unpredictable rainfall.',
    compatibilitySummary:
      'Highly suitable for your farm conditions. Excellent performance in high-rainfall areas with loamy soil.',
  },
  {
    id: 'variety_002',
    name: 'PSBRc28',
    maturityDays: 120,
    yieldPotential: 6.8,
    floodTolerance: 'very high',
    droughtTolerance: 'moderate',
    description:
      'High-yield, flood-tolerant rice variety. Well-suited for areas prone to flooding and waterlogging.',
    compatibilitySummary:
      'Perfect match for your farm. Shows exceptional resilience to the flood conditions in your area.',
  },
  {
    id: 'variety_003',
    name: 'BNR3',
    maturityDays: 125,
    yieldPotential: 6.2,
    floodTolerance: 'moderate',
    droughtTolerance: 'high',
    description:
      'Drought-tolerant rice with good yield. Suitable for areas with irregular rainfall patterns.',
    compatibilitySummary:
      'Good option for your farm. Provides drought resilience for uncertain weather patterns.',
  },
];

// Mock recommendations data
export const mockRecommendations = [
  {
    id: 'rec_001',
    farmId: 'farm_001',
    scanId: 'scan_001',
    varietyId: 'variety_001',
    rank: 1,
    suitabilityScore: 95,
    rsiScore: 8.8,
    climateResilience: 'high',
    whyFits:
      'This variety thrives in high-rainfall lowland areas with loamy soil, exactly matching your farm conditions.',
  },
  {
    id: 'rec_002',
    farmId: 'farm_001',
    scanId: 'scan_001',
    varietyId: 'variety_002',
    rank: 2,
    suitabilityScore: 91,
    rsiScore: 8.5,
    climateResilience: 'high',
    whyFits:
      'Excellent flood tolerance makes this variety ideal for areas with unpredictable water levels.',
  },
  {
    id: 'rec_003',
    farmId: 'farm_001',
    scanId: 'scan_001',
    varietyId: 'variety_003',
    rank: 3,
    suitabilityScore: 78,
    rsiScore: 7.2,
    climateResilience: 'moderate',
    whyFits:
      'Good backup option with drought tolerance to mitigate potential dry spells.',
  },
];

// Mock planting guide data
export const mockPlantingGuides = [
  {
    id: 'guide_001',
    recommendationId: 'rec_001',
    varietyId: 'variety_001',
    farmId: 'farm_001',
    season: 'Wet Season 2024',
    startDate: '2024-06-15',
    expectedHarvestDate: '2024-10-09',
    steps: [
      {
        id: 'step_001',
        stepNumber: 1,
        title: 'Land Preparation',
        instruction:
          'Plow the field twice. Allow for 10-15 days after final plowing. Maintain water level at 5-10 cm.',
        daysAfterPlanting: -20,
        category: 'planting',
      },
      {
        id: 'step_002',
        stepNumber: 2,
        title: 'Seed Selection & Nursery Bed',
        instruction:
          'Select certified seeds. Treat with fungicide. Sow at 50 kg/ha in prepared nursery bed.',
        daysAfterPlanting: -15,
        category: 'planting',
      },
      {
        id: 'step_003',
        stepNumber: 3,
        title: 'Transplanting',
        instruction:
          'Transplant 25-30 day-old seedlings. Space at 20 x 20 cm. Use 2-3 seedlings per hill.',
        daysAfterPlanting: 0,
        category: 'planting',
      },
      {
        id: 'step_004',
        stepNumber: 4,
        title: 'First Fertilizer Application',
        instruction:
          'Apply 50 kg Urea/ha + 50 kg Muriate of Potash/ha at 7 days after transplanting.',
        daysAfterPlanting: 7,
        category: 'fertilizer',
      },
      {
        id: 'step_005',
        stepNumber: 5,
        title: 'Second Fertilizer Application',
        instruction: 'Apply 50 kg Urea/ha at panicle initiation stage (around day 40).',
        daysAfterPlanting: 40,
        category: 'fertilizer',
      },
      {
        id: 'step_006',
        stepNumber: 6,
        title: 'Pest Monitoring & Control',
        instruction:
          'Check for rice blast, brown planthopper, and stem borer. Apply organic pesticide if needed.',
        daysAfterPlanting: 15,
        category: 'pest_prevention',
      },
      {
        id: 'step_007',
        stepNumber: 7,
        title: 'Irrigation Management',
        instruction:
          'Maintain water level at 5 cm during vegetative phase. Drain 10 days before harvesting.',
        daysAfterPlanting: 20,
        category: 'irrigation',
      },
      {
        id: 'step_008',
        stepNumber: 8,
        title: 'Harvesting',
        instruction:
          'Harvest when 80% of panicles turn golden yellow. Use mechanical harvester or manual cutting.',
        daysAfterPlanting: 115,
        category: 'harvesting',
      },
    ],
  },
];

// Mock farm cycle data
export const mockFarmCycles = [
  {
    id: 'cycle_001',
    farmId: 'farm_001',
    recommendationId: 'rec_001',
    varietyId: 'variety_001',
    season: 'Wet Season 2024',
    plantingDate: '2024-06-15',
    expectedHarvestDate: '2024-10-09',
    status: 'in_progress',
    createdAt: '2024-06-01',
  },
];

// Mock progress logs data
export const mockProgressLogs = [
  {
    id: 'log_001',
    cycleId: 'cycle_001',
    logDate: '2024-06-20',
    growthStage: 'Vegetative',
    observedIssue: 'Light yellowing of leaves',
    actionTaken: 'Applied nitrogen fertilizer',
    notes: 'Growth appears normal after fertilizer application',
  },
  {
    id: 'log_002',
    cycleId: 'cycle_001',
    logDate: '2024-07-05',
    growthStage: 'Tillering',
    observedIssue: 'None',
    actionTaken: 'Routine watering and monitoring',
    notes: 'Crop is developing well. Good tiller count observed.',
  },
  {
    id: 'log_003',
    cycleId: 'cycle_001',
    logDate: '2024-07-20',
    growthStage: 'Stem Elongation',
    observedIssue: 'Minor brown spot disease detected',
    actionTaken: 'Fungicide spray applied',
    notes: 'Disease controlled quickly. No significant damage.',
  },
  {
    id: 'log_004',
    cycleId: 'cycle_001',
    logDate: '2024-08-15',
    growthStage: 'Panicle Initiation',
    observedIssue: 'None',
    actionTaken: 'Applied potassium fertilizer',
    notes: 'Panicles forming well. Plant health is excellent.',
  },
];

// Mock yield record data
export const mockYieldRecords = [
  {
    id: 'yield_001',
    cycleId: 'cycle_001',
    harvestDate: '2024-10-09',
    areaHarvested: 2.5,
    actualYield: 16.5,
    rsiValue: 8.6,
    remarks:
      'Excellent harvest. Quality grain output was very high. Farmer satisfied with variety selection.',
  },
];

// Mock Gemini AI Q&A for Planting Guide chat
export const mockPlantingQA = [
  {
    keywords: ['fertilizer', 'urea', 'potash', 'npk', 'nutrient', 'apply'],
    question: 'How much fertilizer should I apply?',
    answer:
      'Apply fertilizer in **two split doses** for NSIC Rc160:\n\n- **Day 7 (Basal):** 50 kg Urea/ha + 50 kg Muriate of Potash/ha\n- **Day 40 (Top-dress):** 50 kg Urea/ha at panicle initiation\n\nSplitting applications ensures better nutrient uptake and reduces run-off losses. Avoid applying during heavy rain to prevent leaching.',
  },
  {
    keywords: ['pest', 'insect', 'planthopper', 'borer', 'stem borer', 'bug', 'worm'],
    question: 'How do I control pests?',
    answer:
      'Monitor your field for **brown planthopper** and **stem borers** starting Day 15.\n\n**Steps to control pests:**\n1. Set yellow sticky traps as an early warning system\n2. Scout at least twice a week — check 10 hills per row\n3. If planthopper count exceeds **10 per hill**, apply an approved organic pesticide\n4. Avoid broad-spectrum chemicals during flowering — they harm natural predators\n\n**Tip:** Maintaining proper water levels also reduces planthopper breeding.',
  },
  {
    keywords: ['water', 'irrigation', 'flood', 'drain', 'level', 'cm'],
    question: 'What water level should I maintain?',
    answer:
      'Follow this water management schedule:\n\n- **Days 0–40 (Vegetative):** Keep at **5 cm depth**\n- **Days 40–80 (Reproductive):** Alternate wetting and drying (AWD)\n- **Day 105 (Pre-harvest):** Begin **final drainage** 10 days before harvest\n\nIntermittent draining reduces methane emissions and improves root aeration. A firm, dry soil at harvest is critical for mechanized harvesting.',
  },
  {
    keywords: ['harvest', 'when', 'ready', 'golden', 'panicle', 'maturity', 'day'],
    question: 'When is the right time to harvest?',
    answer:
      'Harvest NSIC Rc160 when these signs are met:\n\n- **80% of panicles** have turned golden yellow\n- Target date is around **Day 115** from transplanting\n- Grain moisture reads **20–25%** on a moisture meter\n\n**Why timing matters:**\n- Too early → lower grain weight and chalky grains\n- Too late → shattering losses in the field\n\nHarvest in the early morning to reduce grain cracking from heat.',
  },
  {
    keywords: ['rain', 'weather', 'typhoon', 'storm', 'rainfall', 'wet'],
    question: 'What if heavy rain is expected?',
    answer:
      'Take these precautions based on your crop stage:\n\n- **Before transplanting:** Delay if heavy rain is forecast within 2 weeks\n- **Vegetative stage:** Clear all drainage outlets to prevent prolonged flooding\n- **Reproductive stage:** Avoid pesticide applications during and after heavy rain\n\nNSIC Rc160 has good flood tolerance, but submergence beyond **6 consecutive days** can cause crop failure. Monitor water levels daily during typhoon season.',
  },
  {
    keywords: ['seed', 'nursery', 'germination', 'soak', 'treat', 'seedling'],
    question: 'How do I prepare my seedlings?',
    answer:
      'Follow these steps for healthy seedlings:\n\n1. Use **certified seeds** from NSIC-accredited suppliers\n2. Soak seeds in water for **24 hours**\n3. Incubate wrapped in cloth for **48 hours** until sprouts appear\n4. Treat with **Mancozeb fungicide** before sowing\n5. Sow in nursery bed at **50 kg seed/ha**\n6. Transplant when seedlings are **25–30 days old**\n\nHealthy seedlings = stronger tillering and higher final yield.',
  },
  {
    keywords: ['disease', 'blast', 'blight', 'fungus', 'brown spot', 'tungro', 'yellow'],
    question: 'How do I handle rice diseases?',
    answer:
      'The most common threats for NSIC Rc160 are **Rice Blast** and **Brown Spot**.\n\n**Rice Blast:**\n- Scout weekly from Day 14\n- Apply **Tricyclazole fungicide** at first sign of lesions\n- Avoid excess nitrogen which worsens blast severity\n\n**Brown Spot:**\n- Caused by potassium deficiency\n- Ensure adequate K fertilization at basal and top-dress stages\n- Remove and bury severely infected plants to stop spread',
  },
  {
    keywords: ['land', 'plow', 'prepare', 'soil', 'puddling', 'harrowing'],
    question: 'How should I prepare my land?',
    answer:
      'Proper land preparation takes **10–15 days** before transplanting:\n\n1. **First plowing** — breaks up the soil\n2. Wait **7–10 days**, then do the **second plowing**\n3. Flood the field and **puddle** (harrow while wet) to break up clods\n4. Level the field carefully — **every 1 cm difference** in water depth affects tillering uniformity\n5. Allow soil to settle for **3–5 days** before transplanting\n\nA well-leveled, firm seedbed is the foundation of high yield.',
  },
  {
    keywords: ['yield', 'production', 'ton', 'bag', 'output', 'how much'],
    question: 'What yield can I expect?',
    answer:
      'Under good management, NSIC Rc160 typically yields:\n\n- **6.0–6.5 tons/ha** under normal conditions\n- **~100–108 bags** of 60 kg/ha\n\nYour farm\'s RSI score of **8.8** indicates excellent conditions for near-maximum yield potential.\n\n**Biggest yield factors:**\n- Correct fertilizer timing (split application)\n- Timely pest and disease control\n- Proper water management throughout the season',
  },
];

// ── Climate Calendar (monthly planting suitability) ──
export const mockClimateCalendar = {
  location: 'Iloilo City, Iloilo',
  currentMonth: 'Hunyo',
  alert: {
    level: 'danger',
    title: 'Mataas na Panganib ng Baha',
    message: 'Hunyo hanggang Agosto ay panahon ng malakas na ulan sa inyong lugar. Piliin ang flood-tolerant na uri tulad ng NSIC Rc160 o PSBRc28, at bantayan ang antas ng tubig araw-araw.',
  },
  bestMonths: ['Nobyembre', 'Disyembre', 'Enero', 'Pebrero'],
  months: [
    { label: 'Ene', rainfall: 80,  status: 'safe',    suitability: 95 },
    { label: 'Peb', rainfall: 60,  status: 'safe',    suitability: 92 },
    { label: 'Mar', rainfall: 55,  status: 'safe',    suitability: 90 },
    { label: 'Abr', rainfall: 110, status: 'caution', suitability: 72 },
    { label: 'May', rainfall: 185, status: 'caution', suitability: 58 },
    { label: 'Hun', rainfall: 280, status: 'danger',  suitability: 28 },
    { label: 'Hul', rainfall: 320, status: 'danger',  suitability: 18 },
    { label: 'Ago', rainfall: 300, status: 'danger',  suitability: 22 },
    { label: 'Set', rainfall: 210, status: 'caution', suitability: 48 },
    { label: 'Okt', rainfall: 140, status: 'caution', suitability: 70 },
    { label: 'Nob', rainfall: 75,  status: 'safe',    suitability: 90 },
    { label: 'Dis', rainfall: 65,  status: 'safe',    suitability: 94 },
  ],
};

// ── Variety × Climate Suitability Matrix ──
export const mockVarietyClimateMatrix = [
  {
    variety: 'NSIC Rc160',
    wetSeason:  { rating: 'magaling',     score: 92, note: 'Napaka-angkop sa tag-ulan. Mataas ang flood tolerance.' },
    drySeason:  { rating: 'magaling',     score: 84, note: 'Mataas din ang ani sa dry season.' },
    heavyRain:  { rating: 'magaling',     score: 88, note: 'Kayang tiisin ang malakas na ulan.' },
    drought:    { rating: 'katamtaman',   score: 62, note: 'Kailangan ng regular na patubig.' },
  },
  {
    variety: 'PSBRc28',
    wetSeason:  { rating: 'napakagaling', score: 97, note: 'Pinaka-flood tolerant. Para sa lugar na madalas bahain.' },
    drySeason:  { rating: 'katamtaman',   score: 68, note: 'Hindi pinaka-angkop sa tag-init.' },
    heavyRain:  { rating: 'napakagaling', score: 95, note: 'Kayang tiisin ang matagal na pagbaha.' },
    drought:    { rating: 'katamtaman',   score: 58, note: 'Kailangan ng sapat na tubig sa buong siklo.' },
  },
  {
    variety: 'BNR3',
    wetSeason:  { rating: 'katamtaman',   score: 66, note: 'Mas angkop sa tag-init kaysa tag-ulan.' },
    drySeason:  { rating: 'napakagaling', score: 94, note: 'Pinakamainam sa dry season. Drought-tolerant.' },
    heavyRain:  { rating: 'mahina',       score: 42, note: 'Hindi mainam sa matagal na pagbaha.' },
    drought:    { rating: 'napakagaling', score: 91, note: 'Hindi kailangan ng maraming tubig.' },
  },
];

// ── Seasonal Yield History (productivity trends) ──
export const mockSeasonalYields = [
  { season: 'Dry 2022',  variety: 'PSBRc28',    yieldTons: 13.8, area: 2.5, rsi: 7.2, bags: 230 },
  { season: 'Wet 2022',  variety: 'PSBRc28',    yieldTons: 14.5, area: 2.5, rsi: 7.5, bags: 241 },
  { season: 'Dry 2023',  variety: 'NSIC Rc160', yieldTons: 15.2, area: 2.5, rsi: 7.9, bags: 253 },
  { season: 'Wet 2023',  variety: 'NSIC Rc160', yieldTons: 15.8, area: 2.5, rsi: 8.2, bags: 263 },
  { season: 'Dry 2024',  variety: 'NSIC Rc160', yieldTons: 16.1, area: 2.5, rsi: 8.5, bags: 268 },
  { season: 'Wet 2024',  variety: 'NSIC Rc160', yieldTons: 16.5, area: 2.5, rsi: 8.6, bags: 275 },
];

// Mock dashboard summary
export const mockDashboardSummary = {
  totalFarms: 2,
  activeFarmCycles: 1,
  latestYield: 16.5,
  averageYield: 15.8,
  cropStageToday: 'Panicle Initiation',
  forecastInsight: 'Light rains expected this week. Maintain current irrigation.',
};
