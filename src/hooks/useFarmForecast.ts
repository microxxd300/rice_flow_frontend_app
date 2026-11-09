import { cropIsOver } from '@/utils/nextCrop';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { apiWeather } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useTranslation } from '@/i18n/useTranslation';
import { guideDay, guideProgress, guideSteps, type GuideStep } from '@/utils/guideSteps';
import { ADVICE_TEXT, stepWeather, usableOutlook, type StepWeather } from '@/utils/stepWeather';
import { stepTimeAdvice, type StepAdvice } from '@/utils/stepTime';

// The server keeps a forecast for 10 minutes, so asking more often brings nothing new
export const FORECAST_REFRESH_MS = 10 * 60 * 1000;

export const farmKey = (farm: any): string =>
  farm?.latitude != null && farm?.longitude != null ? `${farm.latitude},${farm.longitude}` : '';

/**
 * Keeps the selected farm's forecast fresh for the whole app: on open, every 10 minutes,
 * and when the farmer comes back to the app. Mounted once (MainTabs); screens read
 * the shared forecast from the store, so they all change together.
 */
export function useFarmForecast(): void {
  const farm = useSelectedFarm() as any;
  const lat = farm?.latitude, lng = farm?.longitude;
  useEffect(() => {
    if (lat == null || lng == null) return;
    const key = `${lat},${lng}`;
    let stopped = false;
    const load = () => {
      apiWeather.current(Number(lat), Number(lng))
        .then(res => {
          if (!stopped) useAppStore.getState().setForecast({ key, data: res.data, at: Date.now() });
        })
        .catch(() => {});   // keep the last forecast; it stops being used once it is old
    };
    const loadIfOld = () => {
      const f = useAppStore.getState().forecast;
      if (!f || f.key !== key || Date.now() - f.at >= FORECAST_REFRESH_MS) load();
    };
    loadIfOld();
    const timer = setInterval(load, FORECAST_REFRESH_MS);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') loadIfOld(); });
    return () => { stopped = true; clearInterval(timer); sub.remove(); };
  }, [lat, lng]);
}

/** Weather advice for the selected farm's guide steps, from the shared forecast. */
export function useStepWeather() {
  const farm     = useSelectedFarm();
  const forecast = useAppStore(s => s.forecast);
  const guide    = useAppStore(s => s.latestGuide);
  const outlook  = usableOutlook(forecast, farmKey(farm));
  const today    = guideDay(guide);
  const completed = useAppStore(s => s.completedGuideSteps);
  const current  = guideProgress(guideSteps(guide), completed).current;
  return {
    adviceFor: (step: GuideStep | null | undefined): StepWeather | null =>
      stepWeather(step, outlook, today, !!step && step.id === current?.id),
    updatedAt: outlook && forecast ? forecast.at : null,
  };
}

/** Live advice shown on screens: weather first, then a nighttime safety reminder. */
export function useStepAdvice() {
  const weather = useStepWeather();
  const guide   = useAppStore(s => s.latestGuide);
  const today   = guideDay(guide);
  return {
    adviceFor: (step: GuideStep | null | undefined): StepAdvice | null =>
      weather.adviceFor(step) ?? stepTimeAdvice(step, today),
    updatedAt: weather.updatedAt,
  };
}

/**
 * Puts a weather warning in the bell when the current step should not be done now
 * (heavy rain before fertilizer, rain at harvest...). Once a day per warning; the
 * Profile switch for weather alerts mutes it.
 */
export function useStepWeatherAlert(): void {
  const tr        = useTranslation();
  const guide     = useAppStore(s => s.latestGuide);
  const completed = useAppStore(s => s.completedGuideSteps);
  const { adviceFor } = useStepWeather();
  const cropOver = cropIsOver(useAppStore(s => s.activeCycle));   // no warnings for a harvested crop
  const current = cropOver ? null : guideProgress(guideSteps(guide), completed).current;
  const advice  = adviceFor(current);
  const body    = advice?.level === 'stop' && current
    ? `${current.title}: ${(tr as any)[ADVICE_TEXT[advice.code]]}` : null;
  useEffect(() => {
    if (!body) return;
    const state = useAppStore.getState();
    const today = new Date().toDateString();
    if (state.notifications.some(n => n.body === body && new Date(n.createdAt).toDateString() === today)) return;
    state.addNotification({ title: tr.wxStepAlertTitle, body, category: 'irrigation', icon: 'rainy-outline' });
  }, [body, tr]);
}
