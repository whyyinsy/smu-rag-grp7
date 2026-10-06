export type PropertyType = 'HDB' | 'CONDO' | 'EC';

export interface PropertyTransaction {
  id: string;
  type: PropertyType;
  title: string;
  projectOrModel: string; // e.g. "Treasure at Tampines" or "Model A"
  town: string; // e.g. "TAMPINES", "BISHAN", "QUEENSTOWN"
  district?: string; // e.g. "D18", "D20", "D03"
  street: string;
  block?: string;
  unitRange?: string; // e.g. "10 TO 12"
  price: number; // SGD, e.g. 650000
  floorAreaSqm: number;
  floorAreaSqft: number;
  psf: number; // SGD per sqft
  transactionDate: string; // e.g. "2026-10" or "2026-09"
  tenureType: 'Freehold' | '99-year' | '999-year';
  tenureStartYear?: number;
  remainingLeaseYears?: number;
  remainingLeaseMonths?: number;
  remainingLeaseDisplay: string; // e.g. "94 years 04 months", "Freehold"
  flatTypeOrBeds: string; // e.g. "4 ROOM", "3 Bedroom", "Executive"
  coordinates: {
    lat: number;
    lng: number;
  };
  distanceFromUserMeters?: number;
  source: 'data.gov.sg' | 'ura_benchmark' | 'custom';
}

export interface GeolocationState {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
  address?: {
    building?: string;
    block?: string;
    road?: string;
    postal?: string;
    formatted?: string;
    subzone?: string;
  };
  status: 'idle' | 'detecting' | 'located' | 'denied' | 'error';
  errorMessage?: string;
}

export interface OneMapRouteResult {
  routeGeometry?: [number, number][]; // lat, lng points
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  routeType: 'walk' | 'drive' | 'cycle' | 'pt';
  directions?: string[];
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string;
}

export interface FilterState {
  propertyTypes: PropertyType[];
  town: string; // 'ALL' or specific town
  flatTypes: string[]; // 'ALL' or specific types
  priceMin: number;
  priceMax: number;
  sizeSqftMin: number;
  sizeSqftMax: number;
  minRemainingLeaseYears: number;
  tenureType: 'ALL' | 'Freehold' | '99-year' | '999-year';
  radiusKm: number; // 0 means no radius filter
  sortBy: 'date_desc' | 'date_asc' | 'price_asc' | 'price_desc' | 'psf_asc' | 'psf_desc' | 'distance_asc';
  searchQuery: string;
}

export interface MonthlyPriceTrendPoint {
  period: string; // e.g. "2026-Q3" or "2026-09"
  hdbAvgPsf: number;
  condoAvgPsf: number;
  overallAvgPsf: number;
  volume: number;
  hdbVolume: number;
  condoVolume: number;
  averagePrice: number;
}

export interface MortgagePlanInput {
  propertyPrice: number;
  buyerStatus: 'SC_FIRST' | 'SC_SECOND' | 'SC_THIRD' | 'SPR_FIRST' | 'SPR_SECOND' | 'FOREIGNER';
  propertyType: PropertyType;
  loanTenureYears: number;
  interestRateAnnual: number;
  downpaymentPercent: number; // e.g. 25
  cashPercent: number; // e.g. 5
  monthlyHouseholdIncome: number;
  existingMonthlyDebts: number;
  cpfGrantExpected: number;
}

export interface MortgagePlanResult {
  buyerStampDuty: number;
  additionalBuyerStampDuty: number;
  totalStampDuty: number;
  loanAmount: number;
  minimumCashDownpayment: number;
  cpfOrCashDownpayment: number;
  totalDownpayment: number;
  monthlyMortgagePayment: number;
  totalInterestPaid: number;
  tdsrPercent: number;
  msrPercent: number; // for HDB / EC
  isTdsrCompliant: boolean;
  isMsrCompliant: boolean;
  estimatedUpfrontCash: number;
}

export interface SellerProceedsInput {
  sellingPrice: number;
  outstandingLoan: number;
  cpfPrincipalRefund: number;
  cpfAccruedInterest: number;
  agentCommissionPercent: number;
  legalFee: number;
  holdingPeriodYears: number; // for Seller Stamp Duty (SSD)
}

export interface SellerProceedsResult {
  agentFee: number;
  sellerStampDuty: number;
  totalCpfRefund: number;
  totalDeductions: number;
  estimatedNetCashProceeds: number;
}
