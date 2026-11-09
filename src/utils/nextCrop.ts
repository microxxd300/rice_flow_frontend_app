/** A harvested or given-up crop has nothing left to do: its guide must give no more tasks or warnings. */
export function cropIsOver(cycle: any): boolean {
  return !!cycle && cycle.status !== 'active';
}

/**
 * What the pick-a-variety flow needs to start a new crop on a farm that already exists.
 * The saved top 3 are reused in the same season; a changed season scans again.
 */
export function nextCropParams(farm: any) {
  return {
    existingFarm: farm,
    farmData: {
      farmName:     farm?.name ?? '',
      barangay:     farm?.barangay ?? '',
      municipality: 'Panabo City',
      area:         farm?.area_hectares != null ? String(farm.area_hectares) : '',
      ecosystem:    farm?.ecosystem ?? '',
      latitude:     farm?.latitude,
      longitude:    farm?.longitude,
    },
  };
}
