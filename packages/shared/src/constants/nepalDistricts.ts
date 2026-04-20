/**
 * Frozen list of the 77 districts of Nepal.
 * Used to validate `users.hometown_district` and power the dropdown on the
 * profile edit screen.
 *
 * Source: Government of Nepal, Ministry of Federal Affairs and General Administration.
 */

export const NEPAL_DISTRICTS = [
  'Achham', 'Arghakhanchi', 'Baglung', 'Baitadi', 'Bajhang', 'Bajura',
  'Banke', 'Bara', 'Bardiya', 'Bhaktapur', 'Bhojpur', 'Chitwan',
  'Dadeldhura', 'Dailekh', 'Dang', 'Darchula', 'Dhading', 'Dhankuta',
  'Dhanusha', 'Dolakha', 'Dolpa', 'Doti', 'Eastern Rukum', 'Gorkha',
  'Gulmi', 'Humla', 'Ilam', 'Jajarkot', 'Jhapa', 'Jumla',
  'Kailali', 'Kalikot', 'Kanchanpur', 'Kapilvastu', 'Kaski', 'Kathmandu',
  'Kavrepalanchok', 'Khotang', 'Lalitpur', 'Lamjung', 'Mahottari', 'Makwanpur',
  'Manang', 'Morang', 'Mugu', 'Mustang', 'Myagdi', 'Nawalparasi East',
  'Nawalparasi West', 'Nuwakot', 'Okhaldhunga', 'Palpa', 'Panchthar', 'Parbat',
  'Parsa', 'Pyuthan', 'Ramechhap', 'Rasuwa', 'Rautahat', 'Rolpa',
  'Rupandehi', 'Salyan', 'Sankhuwasabha', 'Saptari', 'Sarlahi', 'Sindhuli',
  'Sindhupalchok', 'Siraha', 'Solukhumbu', 'Sunsari', 'Surkhet', 'Syangja',
  'Tanahun', 'Taplejung', 'Terhathum', 'Udayapur', 'Western Rukum',
] as const;

export type NepalDistrict = (typeof NEPAL_DISTRICTS)[number];

export function isNepalDistrict(value: string): value is NepalDistrict {
  return (NEPAL_DISTRICTS as readonly string[]).includes(value);
}
