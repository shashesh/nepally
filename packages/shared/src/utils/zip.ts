/**
 * ZIP code to Metro Area mapping utilities
 * This will use the HUD USPS ZIP to County Crosswalk data
 */

import { METRO_AREAS, MetroArea } from '../constants/metroAreas';

// In production, this would query Firestore or a static dataset
// For now, it's a placeholder that returns a demo metro area

export async function getMetroAreaByZip(zipCode: string): Promise<MetroArea | null> {
  // TODO: Implement actual ZIP to Metro lookup using HUD data
  // For now, return Dallas-Fort Worth for demo purposes

  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return null;
  }

  // Demo: Map some known ZIP codes
  const demoMappings: Record<string, string> = {
    '75001': 'dallas-fort-worth', // Addison, TX
    '75201': 'dallas-fort-worth', // Dallas, TX
    '10001': 'new-york', // Manhattan, NY
    '90001': 'los-angeles', // Los Angeles, CA
  };

  const metroId = demoMappings[zipCode] || 'dallas-fort-worth';
  return METRO_AREAS[metroId] || null;
}

export function isValidZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}
