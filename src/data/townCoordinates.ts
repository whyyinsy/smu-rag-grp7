export interface TownMetadata {
  name: string;
  region: 'CCR' | 'RCR' | 'OCR';
  district: string;
  lat: number;
  lng: number;
}

export const SINGAPORE_TOWNS: Record<string, TownMetadata> = {
  'TAMPINES': { name: 'TAMPINES', region: 'OCR', district: 'D18', lat: 1.3533, lng: 103.9442 },
  'BEDOK': { name: 'BEDOK', region: 'OCR', district: 'D16', lat: 1.3236, lng: 103.9273 },
  'BISHAN': { name: 'BISHAN', region: 'RCR', district: 'D20', lat: 1.3526, lng: 103.8352 },
  'ANG MO KIO': { name: 'ANG MO KIO', region: 'OCR', district: 'D20', lat: 1.3691, lng: 103.8454 },
  'QUEENSTOWN': { name: 'QUEENSTOWN', region: 'RCR', district: 'D03', lat: 1.2942, lng: 103.8060 },
  'BUKIT MERAH': { name: 'BUKIT MERAH', region: 'RCR', district: 'D03', lat: 1.2819, lng: 103.8239 },
  'TOA PAYOH': { name: 'TOA PAYOH', region: 'RCR', district: 'D12', lat: 1.3343, lng: 103.8563 },
  'KALLANG/WHAMPOA': { name: 'KALLANG/WHAMPOA', region: 'RCR', district: 'D12', lat: 1.3100, lng: 103.8651 },
  'GEYLANG': { name: 'GEYLANG', region: 'RCR', district: 'D14', lat: 1.3201, lng: 103.8918 },
  'MARINE PARADE': { name: 'MARINE PARADE', region: 'RCR', district: 'D15', lat: 1.3020, lng: 103.9073 },
  'CENTRAL AREA': { name: 'CENTRAL AREA', region: 'CCR', district: 'D01', lat: 1.2834, lng: 103.8507 },
  'BUKIT TIMAH': { name: 'BUKIT TIMAH', region: 'CCR', district: 'D10', lat: 1.3294, lng: 103.8021 },
  'CLEMENTI': { name: 'CLEMENTI', region: 'OCR', district: 'D05', lat: 1.3162, lng: 103.7649 },
  'JURONG EAST': { name: 'JURONG EAST', region: 'OCR', district: 'D22', lat: 1.3329, lng: 103.7436 },
  'JURONG WEST': { name: 'JURONG WEST', region: 'OCR', district: 'D22', lat: 1.3404, lng: 103.7090 },
  'BUKIT BATOK': { name: 'BUKIT BATOK', region: 'OCR', district: 'D23', lat: 1.3590, lng: 103.7637 },
  'BUKIT PANJANG': { name: 'BUKIT PANJANG', region: 'OCR', district: 'D23', lat: 1.3774, lng: 103.7719 },
  'CHOA CHU KANG': { name: 'CHOA CHU KANG', region: 'OCR', district: 'D23', lat: 1.3840, lng: 103.7470 },
  'WOODLANDS': { name: 'WOODLANDS', region: 'OCR', district: 'D25', lat: 1.4382, lng: 103.7890 },
  'SEMBAWANG': { name: 'SEMBAWANG', region: 'OCR', district: 'D27', lat: 1.4491, lng: 103.8185 },
  'YISHUN': { name: 'YISHUN', region: 'OCR', district: 'D27', lat: 1.4304, lng: 103.8354 },
  'SENGKANG': { name: 'SENGKANG', region: 'OCR', district: 'D19', lat: 1.3917, lng: 103.8955 },
  'PUNGGOL': { name: 'PUNGGOL', region: 'OCR', district: 'D19', lat: 1.4052, lng: 103.9023 },
  'HOUGANG': { name: 'HOUGANG', region: 'OCR', district: 'D19', lat: 1.3712, lng: 103.8915 },
  'SERANGOON': { name: 'SERANGOON', region: 'OCR', district: 'D19', lat: 1.3554, lng: 103.8679 },
  'PASIR RIS': { name: 'PASIR RIS', region: 'OCR', district: 'D18', lat: 1.3721, lng: 103.9474 },
  'NOVENA': { name: 'NOVENA', region: 'CCR', district: 'D11', lat: 1.3204, lng: 103.8438 },
  'ORCHARD': { name: 'ORCHARD', region: 'CCR', district: 'D09', lat: 1.3048, lng: 103.8318 },
  'MARINA BAY': { name: 'MARINA BAY', region: 'CCR', district: 'D01', lat: 1.2800, lng: 103.8530 }
};

export const SINGAPORE_CENTER = {
  lat: 1.3521,
  lng: 103.8198,
  zoom: 12
};
