export interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  distance?: string;
  rating?: number;
  timestamp?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationType {
  latitude: number;
  longitude: number;
  timestamp?: number;
  address?: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

export interface RouteType {
  geometry: {
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
  formattedDistance: string;
  formattedDuration: string;
  startPoint: Coordinates;
  endPoint: Coordinates;
  transportMode: string;
  legs?: {
    steps: {
      name?: string;
      distance: number;
      duration: number;
    }[];
  }[];
}

export interface PlacesHook {
  searchResults: Place[];
  history: Place[];
  loading: boolean;
  error: string | null;
  search: (query: string, location: any, category: string | null) => Promise<Place[]>;
  searchNearby: (location: any, category: string | null) => Promise<Place[]>;
  savePlace: (place: Place) => Promise<boolean>;
  loadHistory: () => Promise<Place[]>;
  clearSearchResults: () => void;
  selectPlace: (place: Place) => Promise<Place>;
}

export type CompassMode = 'off' | 'follow' | 'rotate';

export interface TransportMode {
  id: string;
  icon: string;
  name: string;
}

// Các hằng số
export const TRANSPORT_MODES: TransportMode[] = [
  { id: 'driving', icon: 'car', name: 'Ô tô' },
  { id: 'walking', icon: 'walking', name: 'Đi bộ' },
  { id: 'cycling', icon: 'bicycle', name: 'Xe đạp' }
]; 