// Type definitions for Google Maps JavaScript API
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => {
            getPlacePredictions: (
              request: {
                input: string;
                types?: string[];
                componentRestrictions?: {
                  country: string | string[];
                };
                sessionToken?: any;
              },
              callback: (
                predictions: google.maps.places.AutocompletePrediction[] | null,
                status: google.maps.places.PlacesServiceStatus
              ) => void
            ) => void;
          };
          AutocompleteSessionToken: new () => any;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            OVER_QUERY_LIMIT: string;
            REQUEST_DENIED: string;
            INVALID_REQUEST: string;
            UNKNOWN_ERROR: string;
          };
        };
        Geocoder: new () => {
          geocode: (
            request: {
              address?: string;
              location?: { lat: number; lng: number };
              placeId?: string;
            },
            callback: (
              results: google.maps.GeocoderResult[] | null,
              status: google.maps.GeocoderStatus
            ) => void
          ) => void;
        };
        GeocoderStatus: {
          OK: string;
          ZERO_RESULTS: string;
          OVER_QUERY_LIMIT: string;
          REQUEST_DENIED: string;
          INVALID_REQUEST: string;
          UNKNOWN_ERROR: string;
        };
      };
    };
  }
}

declare namespace google.maps {
  namespace places {
    interface AutocompletePrediction {
      description: string;
      matched_substrings: Array<{
        length: number;
        offset: number;
      }>;
      place_id: string;
      reference: string;
      structured_formatting: {
        main_text: string;
        main_text_matched_substrings: Array<{
          length: number;
          offset: number;
        }>;
        secondary_text: string;
      };
      terms: Array<{
        offset: number;
        value: string;
      }>;
      types: string[];
    }
    
    type PlacesServiceStatus = 
      | 'OK' 
      | 'ZERO_RESULTS' 
      | 'OVER_QUERY_LIMIT' 
      | 'REQUEST_DENIED' 
      | 'INVALID_REQUEST' 
      | 'UNKNOWN_ERROR';
  }
  
  interface GeocoderResult {
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    formatted_address: string;
    geometry: {
      location: {
        lat: () => number;
        lng: () => number;
      };
      location_type: string;
      viewport: {
        north: number;
        east: number;
        south: number;
        west: number;
      };
    };
    place_id: string;
    types: string[];
  }
  
  type GeocoderStatus = 
    | 'OK' 
    | 'ZERO_RESULTS' 
    | 'OVER_QUERY_LIMIT' 
    | 'REQUEST_DENIED' 
    | 'INVALID_REQUEST' 
    | 'UNKNOWN_ERROR';
}

export {};