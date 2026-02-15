/**
 * Metro Area types — data comes from the database (seeded via Census + HUD APIs).
 * IDs are CBSA codes (e.g., '19100' for Dallas-Fort Worth-Arlington).
 */

export interface MetroArea {
  id: string;
  name: string;
  state: string;
  population?: number;
}
