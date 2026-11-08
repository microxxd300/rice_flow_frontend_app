import { ENV } from './env';

export const API_CONFIG = {
  baseURL: ENV.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

export const API_ROUTES = {
  auth: {
    login:    'auth/login/',
    register: 'auth/register/',
    profile:  'auth/profile/',
    logout:   'auth/logout/',
    passwordResetRequest: 'auth/password-reset/request/',
    passwordResetConfirm: 'auth/password-reset/confirm/',
  },
  token: {
    refresh: 'token/refresh/',
  },
  farms: {
    list:   'farms/',
    detail: (id: number) => `farms/${id}/`,
    checkLocation: 'farms/check-location/',
  },
  environmental: {
    scan:    (farmId: number) => `environmental/scan/${farmId}/`,
    history: (farmId: number) => `environmental/history/${farmId}/`,
  },
  recommendations: {
    generate: (scanId: number) => `recommendations/generate/${scanId}/`,
    history:  (farmId: number) => `recommendations/history/${farmId}/`,
  },
  varieties: {
    list:   'varieties/',
    detail: (id: number) => `varieties/${id}/`,
    growthStages: 'varieties/growth-stages/',
  },
  guides: {
    list:         'guides/',
    detail:       (id: number) => `guides/${id}/`,
    generate:     (recId: number) => `guides/generate/${recId}/`,
    stepComplete: (stepId: number) => `guides/steps/${stepId}/complete/`,
    sowing:       (guideId: number) => `guides/${guideId}/sowing/`,
  },
  progress: {
    cycles:  'progress/cycles/',
    cycle:   (id: number) => `progress/cycles/${id}/`,
    logs:    'progress/logs/',
    log:     (id: number) => `progress/logs/${id}/`,
    yield:   (cycleId: number) => `progress/cycles/${cycleId}/yield/`,
  },
  predictions: {
    models:  'predictions/models/',
    train:   'predictions/train/',
    predict: 'predictions/predict/',
  },
  ai: {
    chat: 'ai/chat/',
  },
  // Field-problem advice: PhilRice booklet cards, and the AI explaining them
  advice: {
    problems: 'advice/problems/',
    problem:  (key: string) => `advice/problems/${key}/`,
    match:    'advice/match/',
    explain:  'advice/explain/',
  },
  activity: {
    notices: 'activity/notices/',
  },
} as const;
