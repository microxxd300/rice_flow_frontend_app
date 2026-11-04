/**
 * The landing page's photo size. The opening animation drops the same photo into the
 * same place, so both read it from here and the hand-off has no jump.
 */
export const PHOTO_RATIO = 1536 / 1024;   // rice_field.jpg is 1024 × 1536

/** A little over half the screen; less on short phones, capped on tall ones. */
export function welcomePhotoHeight(screenHeight: number): number {
  return Math.round(Math.min(Math.max(screenHeight * 0.52, 300), 520));
}
