import { useContext } from 'react';
import { LocationContext } from '../contexts/LocationContext';

export function useLocation() {
  return useContext(LocationContext);
}
