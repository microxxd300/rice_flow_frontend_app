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
  },
  token: {
    refresh: 'token/refresh/',
  },
  farms: {
    list:   'farms/',
    detail: (id: number) => `farms/${id}/`,
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
  },
  guides: {
    list:         'guides/',
    detail:       (id: number) => `guides/${id}/`,
    generate:     (recId: number) => `guides/generate/${recId}/`,
    appendStep:   (recId: number) => `guides/append-step/${recId}/`,
    stepComplete: (stepId: number) => `guides/steps/${stepId}/complete/`,
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
} as const;
