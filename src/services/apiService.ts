import { apiClient } from './api';
import { API_ROUTES } from '@/config/api';

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
  barangay: string;
  municipality: string;
  province: string;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
export interface WeatherResponse {
  current: WeatherCurrent;
  hourly:  WeatherHour[];
}

export const apiWeather = {
  // Live current weather + 3-day forecast for the farm's coords (via Open-Meteo through our backend)
  current: (lat: number, lng: number) =>
    apiClient.get<WeatherResponse>(`environmental/weather/?lat=${lat}&lng=${lng}`),
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
  generate:   (recId: number, data: any) =>
                                          apiClient.post<any>(API_ROUTES.guides.generate(recId), data),
  appendStep: (recId: number, data: { category: string; last_day: number; existing_count: number; season?: string; language?: string; logs?: any[] }) =>
                                          apiClient.post<{ step: any }>(API_ROUTES.guides.appendStep(recId), data),
  complete:   (stepId: number)         => apiClient.patch<any>(API_ROUTES.guides.stepComplete(stepId), {}),
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
}

export const apiPredictions = {
  models:  ()                           => apiClient.get<YieldPredictionModel[]>(API_ROUTES.predictions.models),
  predict: (data: YieldPredictRequest)  => apiClient.post<{ predicted_yield_t_ha: number; model_used: string; r2_score: number }>(API_ROUTES.predictions.predict, data),
};

export const apiAI = {
  chat: (
    message: string,
    history?: { role: string; text: string }[],
    language?: 'en' | 'fil' | 'ceb',
  ) =>
    apiClient.post<{ reply: string; language?: string }>(API_ROUTES.ai.chat, {
      message,
      history: history ?? [],
      language: language ?? 'en',
    }),
};

// ── Progress ───────────────────────────────────────────────────────────────

export const apiProgress = {
  listCycles:   (farmId?: number) =>
    apiClient.get<any[]>(farmId
      ? `${API_ROUTES.progress.cycles}?farm_id=${farmId}`
      : API_ROUTES.progress.cycles),
  createCycle:  (data: any) => apiClient.post<any>(API_ROUTES.progress.cycles, data),
  getCycle:     (id: number) => apiClient.get<any>(API_ROUTES.progress.cycle(id)),
  updateCycle:  (id: number, data: any) => apiClient.patch<any>(API_ROUTES.progress.cycle(id), data),
  listLogs:     (cycleId?: number) =>
    apiClient.get<any[]>(cycleId
      ? `${API_ROUTES.progress.logs}?cycle_id=${cycleId}`
      : API_ROUTES.progress.logs),
  createLog:    (data: any) => apiClient.post<any>(API_ROUTES.progress.logs, data),
  getYield:     (cycleId: number) => apiClient.get<any>(API_ROUTES.progress.yield(cycleId)),
  createYield:  (cycleId: number, data: any) =>
    apiClient.post<any>(API_ROUTES.progress.yield(cycleId), data),
  updateYield:  (cycleId: number, data: any) =>
    apiClient.patch<any>(API_ROUTES.progress.yield(cycleId), data),
};
