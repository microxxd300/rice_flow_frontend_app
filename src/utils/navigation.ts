/**
 * Navigation helpers for the farm-setup flow.
 *
 * SetupNavigator resumes straight into whichever step the user quit on, by
 * setting that screen as `initialRouteName`. That screen is then the only
 * entry on the stack, so its back button has nothing behind it and
 * `goBack()` is dropped with:
 *
 *   The action 'GO_BACK' was not handled by any navigator.
 *
 * `goBackOr` keeps the button working in both cases: it goes back when there
 * is history, and otherwise navigates to the step that logically precedes the
 * current one, rebuilding the trail the resume skipped.
 */

/**
 * Structural shape we need from a navigation object. `navigate` is typed
 * loosely on purpose: React Navigation declares it as a set of overloads whose
 * parameters depend on the screen's param list, and a narrower signature here
 * is not assignable from any concrete navigator's type.
 */
interface BackCapableNavigation {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (...args: any[]) => void;
  // React Navigation 7: navigate with 6.x semantics (goes back to the screen if it's in the stack)
  navigateDeprecated: (...args: any[]) => void;
}

/** Ordered setup steps, so each screen knows what sits behind it. */
export const SETUP_STEPS = [
  'FarmSetupWelcome',
  'FarmDetailsForm',
  'LocationPermission',
  'FarmMapTagging',
  'AnalysisLoading',
  'SuitabilityResults',
  'PlantingGuideHandoff',
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number];

/**
 * The step before `step`, skipping AnalysisLoading — that screen creates the
 * farm and runs the analysis, so navigating back into it would re-run both.
 */
export function previousSetupStep(step: SetupStep): SetupStep | null {
  const i = SETUP_STEPS.indexOf(step);
  if (i <= 0) return null;
  const prev = SETUP_STEPS[i - 1];
  return prev === 'AnalysisLoading' ? SETUP_STEPS[i - 2] ?? null : prev;
}

/**
 * Go back if there is somewhere to go back to; otherwise fall forward onto
 * `fallback`. Pass the screen's own step name and the previous one is worked
 * out for you.
 */
export function goBackOr(
  navigation: BackCapableNavigation,
  fallback: SetupStep | null,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  if (fallback) navigation.navigateDeprecated(fallback);
}

/** Convenience wrapper: go back, or to whatever precedes `step`. */
export function goBackFromStep(
  navigation: BackCapableNavigation,
  step: SetupStep,
): void {
  goBackOr(navigation, previousSetupStep(step));
}
