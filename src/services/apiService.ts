import { apiClient } from './api';
import { API_ROUTES } from '@/config/api';
import type { FarmerNotice } from '@/utils/farmerNotices';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  barangay: string;
  municipality: string;
  province: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  user: UserProfile;
  access_token: string;
  refresh_token: string;
}

export interface Farm {
  id: number;
  name: string;
  barangay: string;
  area_hectares: number | null;
  latitude: number | null;
  longitude: number | null;
  ecosystem: string;
  elevation_m: number | null;
  slope_pct: number | null;
  location_flag?: string;
  location_confirmed?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PinWarningReason = 'on_building' | 'built_up' | 'water' | 'mangrove';

export interface LocationCheck {
  status: 'ok' | 'warning' | 'unchecked';
  reason: PinWarningReason | null;
  land_cover: string | null;
  on_building: boolean | null;
  message: string;
  barangay: string | null;     // from the official barangay boundaries; null outside Panabo
}

export interface RiceVarietyBrief {
  id: number;
  variety_id: string;
  nsic_code: string;
  common_name: string;
  ecosystem: string;
  avg_yield_t_ha: number;
  max_yield_t_ha: number;
  maturity_days: number;
  submergence_tolerance: string;
  drought_tolerance: string;
  salinity_tolerance: string;
  notes: string;
}

export interface RecommendationResult {
  rank: number;
  rsi_score: number;
  suitability_class: string;
  variety_cluster: number;
  factor_scores: Record<string, number>;
  variety: RiceVarietyBrief;
}

export interface Recommendation {
  id: number;
  farm: number;
  scan: number;
  farm_cluster: number;
  created_at: string;
  results: RecommendationResult[];
}

export interface EnvironmentalScan {
  id: number;
  farm: number;
  soil_ph: number;
  soil_texture: string;
  soil_series?: string;        // BSWM soil series at the pin, e.g. "Cabangan clay loam"
  soil_source?: string;        // 'openlandmap', 'soilgrids' or 'default': where pH and the rest came from
  organic_matter: number;
  drainage: string;
  avg_temperature: number;
  seasonal_rainfall: number;
  humidity: number;
  solar_radiation: number;
  temp_at_flowering: number;
  elevation_m: number;
  slope: string;
  flood_risk: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authLogin = (data: LoginRequest) =>
  apiClient.post<LoginResponse>(API_ROUTES.auth.login, data);

export const authRegister = (data: RegisterRequest) =>
  apiClient.post<UserProfile>(API_ROUTES.auth.register, data);

export const authProfile = () =>
  apiClient.get<UserProfile>(API_ROUTES.auth.profile);

// Name and location; the email is the login and is not changed here
export const authUpdateProfile = (data: Partial<Pick<UserProfile,
  'first_name' | 'last_name' | 'barangay' | 'municipality' | 'province'>>) =>
  apiClient.patch<UserProfile>(API_ROUTES.auth.profile, data);

// ── Farms ──────────────────────────────────────────────────────────────────

export const apiFarms = {
  list:   async () => {
    const res = await apiClient.get<Farm[] | { results: Farm[] }>(API_ROUTES.farms.list);
    const data = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
    return { data };
  },
  create: (data: Partial<Farm> & { name: string }) =>
                                       apiClient.post<Farm>(API_ROUTES.farms.list, data),
  update: (id: number, data: Partial<Farm>) =>
                                       apiClient.patch<Farm>(API_ROUTES.farms.detail(id), data),
  delete: (id: number) =>              apiClient.delete<void>(API_ROUTES.farms.detail(id)),
  checkLocation: (lat: number, lon: number) =>
    apiClient.get<LocationCheck>(`${API_ROUTES.farms.checkLocation}?lat=${lat}&lon=${lon}`, { timeout: 5000 }),
};

// ── Environmental ──────────────────────────────────────────────────────────

export const apiScan = {
  run: (farmId: number) =>
    apiClient.post<EnvironmentalScan>(API_ROUTES.environmental.scan(farmId), {}, { timeout: 90000 }),
  history: (farmId: number) =>
    apiClient.get<EnvironmentalScan[]>(API_ROUTES.environmental.history(farmId)),
};

export interface WeatherCurrent {
  temperature:     number;
  weather_code:    number;
  rainfall_mm:     number;
  humidity:        number;
  wind_speed_kph:  number;
  wind_speed_ms:   number;
  rain_pct:        number;   // max precipitation probability in the next 6 hours
}
export interface WeatherHour {
  time:         string;      // ISO local "yyyy-MM-ddTHH:00"
  temp:         number;
  weather_code: number;
  rainfall_mm:  number;
  rain_prob:    number;
}
// Rain and wind ahead of now, for the planting guide's weather advice (utils/stepWeather)
export interface WeatherOutlook {
  rain_mm_6h:       number;
  rain_prob_6h:     number;
  rain_mm_24h:      number;
  rain_prob_24h:    number;
  rain_mm_48h:      number;
  rain_prob_48h:    number;
  wind_kph_max_12h: number;
}
export interface WeatherResponse {
  current:     WeatherCurrent;
  hourly:      WeatherHour[];
  outlook?:    WeatherOutlook;
  fetched_at?: string | null;   // when the server got this forecast from Open-Meteo
}

export const apiWeather = {
  // Live current weather + 3-day forecast for the farm's coords (via Open-Meteo through our backend)
  current: (lat: number, lng: number) =>
    apiClient.get<WeatherResponse>(`environmental/weather/?lat=${lat}&lng=${lng}`),
  // Average rain per month (mm, Jan..Dec) over the last 3 years at the farm, for the planting calendar
  monthlyRainfall: (lat: number, lng: number) =>
    apiClient.get<{ months: number[]; years: string }>(`environmental/monthly-rainfall/?lat=${lat}&lng=${lng}`),
};

// ── Recommendations ────────────────────────────────────────────────────────

export const apiRecommendations = {
  generate: (scanId: number) =>
    apiClient.post<Recommendation>(API_ROUTES.recommendations.generate(scanId), {}),
  history: (farmId: number) =>
    apiClient.get<Recommendation[]>(API_ROUTES.recommendations.history(farmId)),
};

// ── Varieties ──────────────────────────────────────────────────────────────

export const apiVarieties = {
  list:   ()            => apiClient.get<RiceVarietyBrief[]>(API_ROUTES.varieties.list),
  detail: (id: number)  => apiClient.get<RiceVarietyBrief>(API_ROUTES.varieties.detail(id)),
};

// ── Guides ─────────────────────────────────────────────────────────────────

export const apiGuides = {
  list:       ()                       => apiClient.get<any[]>(API_ROUTES.guides.list),
  detail:     (id: number)             => apiClient.get<any>(API_ROUTES.guides.detail(id)),
  // The PalayCheck guide is built on the server in a moment; the long timeout covers a server waking up
  generate:   (recId: number, data: any) =>
                                          apiClient.post<any>(API_ROUTES.guides.generate(recId), data, { timeout: 90000 }),
  complete:   (stepId: number, done: boolean = true) =>
                                          apiClient.patch<any>(API_ROUTES.guides.stepComplete(stepId), { is_completed: done }),
  // "Did you sow already?": sown on a date (YYYY-MM-DD, default today), or not yet
  sowing:     (guideId: number, data: { sown: boolean; date?: string; language?: string }) =>
                                          apiClient.post<any>(API_ROUTES.guides.sowing(guideId), data),
};

// ── Predictions ────────────────────────────────────────────────────────────

export interface YieldPredictionModel {
  id: number;
  model_type: string;
  model_type_display: string;
  r2_score: number;
  mae: number;
  rmse: number;
  training_samples: number;
  is_active: boolean;
  trained_at: string;
  notes: string;
}

export interface YieldPredictRequest {
  area_ha: number;
  soil_ph?: number;
  organic_matter?: number;
  avg_temperature?: number;
  seasonal_rainfall?: number;
  humidity?: number;
  elevation_m?: number;
  flood_risk?: string;
  ecosystem?: string;
  maturity_days?: number;
  variety_avg_yield?: number;
  // The real-harvest model reads barangay, ecosystem and seed type from these
  farm_id?: number;
  variety_id?: number;
  season?: string;
}

export const apiPredictions = {
  models:  ()                           => apiClient.get<YieldPredictionModel[]>(API_ROUTES.predictions.models),
  predict: (data: YieldPredictRequest)  => apiClient.post<{ predicted_yield_t_ha: number; model_used: string; r2_score: number }>(API_ROUTES.predictions.predict, data),
};

/* ── Field-problem advice (booklets + AI) ───────────── */

export type AdviceLang = 'en' | 'fil' | 'ceb';

/** Where a line of advice comes from: a PhilRice / PalayCheck booklet and its page. */
export interface AdviceSource { title: string; publisher: string; pages: string; url: string }
export interface AdviceLine   { text: string; sources: AdviceSource[] }

export interface ProblemSummary {
  key: string;
  category: 'pest' | 'disease' | 'weather' | 'nutrient' | 'other';
  name: string;
  hint: string;
}

export interface ProblemCard {
  key: string;
  category: ProblemSummary['category'];
  name: string;
  identify: AdviceLine[];
  serious_when: AdviceLine | null;
  do_now: AdviceLine[];
  dont: AdviceLine[];
  next_season: AdviceLine[];
  get_help: AdviceLine;
  urgent: string;
  checked_by_validator: boolean;
}

export interface AdviceExplanation {
  problem: string;
  ai_used: boolean;
  not_covered: boolean;
  note: null | 'ai_unavailable' | 'daily_limit' | 'rejected';
  points: { text: string; cards: string[]; sources: AdviceSource[] }[];
}

export const apiAdvice = {
  problems: (language: AdviceLang) =>
    apiClient.get<ProblemSummary[]>(`${API_ROUTES.advice.problems}?language=${language}`),
  // The booklet card: no AI, so it works even when the AI is busy or out of quota
  problem: (key: string, language: AdviceLang) =>
    apiClient.get<ProblemCard>(`${API_ROUTES.advice.problem(key)}?language=${language}`),
  match: (text: string, language: AdviceLang) =>
    apiClient.post<{ matches: { key: string; name: string; why: string }[]; ai_used: boolean }>(
      API_ROUTES.advice.match, { text, language }, { timeout: 35000 }),
  // With `log`, the farmer's observation is the question and the tip is saved on the log
  explain: (data: { problem: string; language: AdviceLang; farm?: number | null; question?: string; log?: number }) =>
    apiClient.post<AdviceExplanation>(API_ROUTES.advice.explain, data, { timeout: 35000 }),
};

export const apiAI = {
  chat: (
    message: string,
    history?: { role: string; text: string }[],
    language?: 'en' | 'fil' | 'ceb',
    farm?: number | null,   // the selected farm: answers use its crop, soil and logs
  ) =>
    // sources: the PhilRice / PalayCheck booklet pages the answer came from (empty when none)
    apiClient.post<{ reply: string; language?: string; sources?: AdviceSource[]; grounded?: boolean }>(API_ROUTES.ai.chat, {
      message,
      history: history ?? [],
      language: language ?? 'en',
      farm: farm ?? null,
    }),
};

// ── Admin notices ──────────────────────────────────────────────────────────

export const apiActivity = {
  // Notices about the admin's changes to this farmer's farms, cycles or planted variety
  notices: (after?: number) =>
    apiClient.get<FarmerNotice[]>(`${API_ROUTES.activity.notices}${after ? `?after=${after}` : ''}`),
};

// ── Progress ───────────────────────────────────────────────────────────────

// Cycle and log lists come back paginated ({count, next, results}); screens expect an array.
// page_size=100 keeps a whole season's logs on one page (the server default is 20).
const listOf = async <T,>(url: string): Promise<{ data: T[] }> => {
  const res = await apiClient.get<T[] | { results: T[] }>(url);
  return { data: Array.isArray(res.data) ? res.data : (res.data?.results ?? []) };
};

export const apiProgress = {
  listCycles:   (farmId?: number) =>
    listOf<any>(`${API_ROUTES.progress.cycles}?page_size=100${farmId ? `&farm_id=${farmId}` : ''}`),
  createCycle:  (data: any) => apiClient.post<any>(API_ROUTES.progress.cycles, data),
  getCycle:     (id: number) => apiClient.get<any>(API_ROUTES.progress.cycle(id)),
  updateCycle:  (id: number, data: any) => apiClient.patch<any>(API_ROUTES.progress.cycle(id), data),
  listLogs:     (cycleId?: number) =>
    listOf<any>(`${API_ROUTES.progress.logs}?page_size=100${cycleId ? `&cycle_id=${cycleId}` : ''}`),
  createLog:    (data: any) => apiClient.post<any>(API_ROUTES.progress.logs, data),
  updateLog:    (id: number, data: any) => apiClient.patch<any>(API_ROUTES.progress.log(id), data),
  // Logs store the stage as a GrowthStage id, so the screen maps its stage names through this list
  growthStages: () => listOf<any>(API_ROUTES.varieties.growthStages),
  getYield:    (cycleId: number) => apiClient.get<any>(API_ROUTES.progress.yield(cycleId)),
  createYield:  (cycleId: number, data: any) =>
    apiClient.post<any>(API_ROUTES.progress.yield(cycleId), data),
  updateYield:  (cycleId: number, data: any) =>
    apiClient.patch<any>(API_ROUTES.progress.yield(cycleId), data),
};
