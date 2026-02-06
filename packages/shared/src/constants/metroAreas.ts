/**
 * US Census Metro Areas
 * This will be populated with actual metro area data
 */

export interface MetroArea {
  id: string;
  name: string;
  state: string;
  zipCodes?: string[];
}

// Example metro areas - to be expanded with full dataset
export const METRO_AREAS: Record<string, MetroArea> = {
  'dallas-fort-worth': {
    id: 'dallas-fort-worth',
    name: 'Dallas-Fort Worth-Arlington',
    state: 'TX',
  },
  'new-york': {
    id: 'new-york',
    name: 'New York-Newark-Jersey City',
    state: 'NY',
  },
  'los-angeles': {
    id: 'los-angeles',
    name: 'Los Angeles-Long Beach-Anaheim',
    state: 'CA',
  },
  // More metro areas will be added from HUD USPS ZIP crosswalk data
};
