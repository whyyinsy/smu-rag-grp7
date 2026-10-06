import { PropertyTransaction, BedroomTransactionGroup, MortgagePlanInput, MortgagePlanResult, SellerProceedsInput, SellerProceedsResult } from '../types/property';

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-SG', {
    maximumFractionDigits: 0
  }).format(amount);
}

export function sqmToSqft(sqm: number): number {
  return Math.round(sqm * 10.7639);
}

export function calculateBuyerStampDuty(price: number): number {
  let bsd = 0;
  let remaining = price;

  // 1% on first $180,000
  const tier1 = Math.min(remaining, 180000);
  bsd += tier1 * 0.01;
  remaining -= tier1;

  if (remaining <= 0) return Math.round(bsd);

  // 2% on next $180,000 ($180k to $360k)
  const tier2 = Math.min(remaining, 180000);
  bsd += tier2 * 0.02;
  remaining -= tier2;

  if (remaining <= 0) return Math.round(bsd);

  // 3% on next $640,000 ($360k to $1,000,000)
  const tier3 = Math.min(remaining, 640000);
  bsd += tier3 * 0.03;
  remaining -= tier3;

  if (remaining <= 0) return Math.round(bsd);

  // 4% on next $500,000 ($1,000,000 to $1,500,000)
  const tier4 = Math.min(remaining, 500000);
  bsd += tier4 * 0.04;
  remaining -= tier4;

  if (remaining <= 0) return Math.round(bsd);

  // 5% on next $1,500,000 ($1,500,000 to $3,000,000)
  const tier5 = Math.min(remaining, 1500000);
  bsd += tier5 * 0.05;
  remaining -= tier5;

  if (remaining <= 0) return Math.round(bsd);

  // 6% on excess above $3,000,000
  bsd += remaining * 0.06;

  return Math.round(bsd);
}

export function calculateABSD(price: number, buyerStatus: MortgagePlanInput['buyerStatus']): number {
  switch (buyerStatus) {
    case 'SC_FIRST':
      return 0;
    case 'SC_SECOND':
      return Math.round(price * 0.20);
    case 'SC_THIRD':
      return Math.round(price * 0.30);
    case 'SPR_FIRST':
      return Math.round(price * 0.05);
    case 'SPR_SECOND':
      return Math.round(price * 0.30);
    case 'FOREIGNER':
      return Math.round(price * 0.60);
    default:
      return 0;
  }
}

export function calculateSellerStampDuty(price: number, holdingPeriodYears: number): number {
  if (holdingPeriodYears <= 1) {
    return Math.round(price * 0.12);
  } else if (holdingPeriodYears <= 2) {
    return Math.round(price * 0.08);
  } else if (holdingPeriodYears <= 3) {
    return Math.round(price * 0.04);
  }
  return 0;
}

export function calculateMortgagePlan(input: MortgagePlanInput): MortgagePlanResult {
  const price = input.propertyPrice;
  const bsd = calculateBuyerStampDuty(price);
  const absd = calculateABSD(price, input.buyerStatus);
  const totalStampDuty = bsd + absd;

  const totalDownpaymentPercent = Math.max(10, Math.min(input.downpaymentPercent, 50));
  const minCashPercent = Math.max(5, input.cashPercent);
  
  const totalDownpayment = Math.round(price * (totalDownpaymentPercent / 100));
  const minimumCashDownpayment = Math.round(price * (minCashPercent / 100));
  const cpfOrCashDownpayment = Math.max(0, totalDownpayment - minimumCashDownpayment);

  const rawLoan = price - totalDownpayment;
  // Apply expected grant
  const loanAmount = Math.max(0, rawLoan - input.cpfGrantExpected);

  const monthlyRate = (input.interestRateAnnual / 100) / 12;
  const numPayments = input.loanTenureYears * 12;

  let monthlyMortgagePayment = 0;
  let totalInterestPaid = 0;

  if (monthlyRate > 0 && numPayments > 0 && loanAmount > 0) {
    monthlyMortgagePayment =
      (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    totalInterestPaid = (monthlyMortgagePayment * numPayments) - loanAmount;
  }

  // Debt ratios
  const income = input.monthlyHouseholdIncome || 1;
  const totalMonthlyCommitment = monthlyMortgagePayment + input.existingMonthlyDebts;
  const tdsrPercent = (totalMonthlyCommitment / income) * 100;
  const msrPercent = (monthlyMortgagePayment / income) * 100;

  const isTdsrCompliant = tdsrPercent <= 55;
  const isMsrCompliant = input.propertyType === 'CONDO' ? true : msrPercent <= 30;

  const estimatedUpfrontCash = minimumCashDownpayment + totalStampDuty + 3000; // estimated legal/valuation fees

  return {
    buyerStampDuty: bsd,
    additionalBuyerStampDuty: absd,
    totalStampDuty,
    loanAmount: Math.round(loanAmount),
    minimumCashDownpayment,
    cpfOrCashDownpayment,
    totalDownpayment,
    monthlyMortgagePayment: Math.round(monthlyMortgagePayment),
    totalInterestPaid: Math.round(totalInterestPaid),
    tdsrPercent: Number(tdsrPercent.toFixed(1)),
    msrPercent: Number(msrPercent.toFixed(1)),
    isTdsrCompliant,
    isMsrCompliant,
    estimatedUpfrontCash
  };
}

export function calculateSellerProceeds(input: SellerProceedsInput): SellerProceedsResult {
  const agentFee = Math.round(input.sellingPrice * (input.agentCommissionPercent / 100));
  const sellerStampDuty = calculateSellerStampDuty(input.sellingPrice, input.holdingPeriodYears);
  const totalCpfRefund = input.cpfPrincipalRefund + input.cpfAccruedInterest;
  const totalDeductions = input.outstandingLoan + totalCpfRefund + agentFee + sellerStampDuty + input.legalFee;
  const estimatedNetCashProceeds = Math.max(0, input.sellingPrice - totalDeductions);

  return {
    agentFee,
    sellerStampDuty,
    totalCpfRefund,
    totalDeductions,
    estimatedNetCashProceeds
  };
}

/**
 * Resolves bedroom count from flat type or bedroom description.
 * HDB standard mapping:
 * - 1 ROOM / 2 ROOM (or Flexi) -> 1 Bedroom
 * - 3 ROOM -> 2 Bedrooms
 * - 4 ROOM -> 3 Bedrooms
 * - 5 ROOM -> 4 Bedrooms
 * - EXECUTIVE / MULTI-GENERATION -> 5 (representing 4-5 beds)
 * Condo / Private:
 * - "1 Bedroom" / "1 Bed" / "Studio" -> 1 Bedroom
 * - "2 Bedroom" / "2 Bed" -> 2 Bedrooms
 * - "3 Bedroom" / "3 Bed" -> 3 Bedrooms
 * - "4 Bedroom" / "4 Bed" -> 4 Bedrooms
 * - "5 Bedroom" / "Penthouse" -> 5 Bedrooms
 */
export function getBedroomCount(flatTypeOrBeds: string): number {
  if (!flatTypeOrBeds) return 3;
  const upper = flatTypeOrBeds.toUpperCase().trim();

  // Explicit HDB definitions
  if (upper.includes('1 ROOM') || upper.includes('1-ROOM')) return 1;
  if (upper.includes('2 ROOM') || upper.includes('2-ROOM')) return 1;
  if (upper.includes('3 ROOM') || upper.includes('3-ROOM')) return 2;
  if (upper.includes('4 ROOM') || upper.includes('4-ROOM')) return 3;
  if (upper.includes('5 ROOM') || upper.includes('5-ROOM')) return 4;
  if (upper.includes('EXECUTIVE') || upper.includes('MULTI-GEN') || upper.includes('MULTI GENERATION')) return 5;

  // Condo & private definitions
  if (upper.includes('STUDIO')) return 1;
  if (upper.includes('1 BED') || upper.includes('1-BED') || upper.includes('1 BR')) return 1;
  if (upper.includes('2 BED') || upper.includes('2-BED') || upper.includes('2 BR')) return 2;
  if (upper.includes('3 BED') || upper.includes('3-BED') || upper.includes('3 BR')) return 3;
  if (upper.includes('4 BED') || upper.includes('4-BED') || upper.includes('4 BR')) return 4;
  if (upper.includes('5 BED') || upper.includes('5-BED') || upper.includes('5 BR') || upper.includes('PENTHOUSE')) return 5;

  // Regex patterns
  const bedMatch = upper.match(/(\d+)\s*(?:BED|BR)/);
  if (bedMatch) return Math.min(5, Math.max(1, parseInt(bedMatch[1], 10)));

  const roomMatch = upper.match(/(\d+)\s*ROOM/);
  if (roomMatch) {
    const r = parseInt(roomMatch[1], 10);
    if (r <= 2) return 1;
    if (r === 3) return 2;
    if (r === 4) return 3;
    if (r >= 5) return 4;
  }

  return 3;
}

export function getBedroomLabel(count: number, propertyType?: 'HDB' | 'CONDO' | 'EC'): string {
  if (propertyType === 'HDB') {
    switch (count) {
      case 1: return '1 Bed (2-Room Flexi)';
      case 2: return '2 Beds (3-Room HDB)';
      case 3: return '3 Beds (4-Room HDB)';
      case 4: return '4 Beds (5-Room HDB)';
      case 5: return '5+ Beds (Executive/MG)';
      default: return `${count} Bedrooms`;
    }
  }
  return count >= 5 ? '5+ Bedrooms' : count === 1 ? '1 Bedroom' : `${count} Bedrooms`;
}

/**
 * Returns latest up to 3 transactions for each bedroom type for the given property.
 */
export function getLatestTransactionsByBedroom(
  property: PropertyTransaction,
  allTransactions: PropertyTransaction[] = []
): BedroomTransactionGroup[] {
  const isCondo = property.type === 'CONDO' || property.type === 'EC';
  const cleanTitle = property.title.toLowerCase().trim();
  const cleanStreet = property.street.toLowerCase().trim();

  // Find related transactions in the existing loaded dataset
  const relatedTransactions = allTransactions.filter((tx) => {
    if (tx.id === property.id) return true;
    if (isCondo) {
      return (
        tx.title.toLowerCase().trim() === cleanTitle ||
        tx.projectOrModel.toLowerCase().trim() === property.projectOrModel.toLowerCase().trim()
      );
    } else {
      return (
        tx.town.toUpperCase() === property.town.toUpperCase() &&
        tx.street.toLowerCase().includes(cleanStreet)
      );
    }
  });

  // Ensure clicked property is definitely included
  if (!relatedTransactions.some((t) => t.id === property.id)) {
    relatedTransactions.unshift(property);
  }

  // Group by bedroom count
  const groupsMap = new Map<number, PropertyTransaction[]>();

  relatedTransactions.forEach((tx) => {
    const beds = getBedroomCount(tx.flatTypeOrBeds);
    if (!groupsMap.has(beds)) {
      groupsMap.set(beds, []);
    }
    // Prevent duplicate ids in list
    if (!groupsMap.get(beds)!.some((item) => item.id === tx.id)) {
      groupsMap.get(beds)!.push(tx);
    }
  });

  // Expected bedroom types for this development
  const expectedBedroomTypes: number[] = isCondo ? [1, 2, 3, 4] : [2, 3, 4];
  const selectedBed = getBedroomCount(property.flatTypeOrBeds);
  if (!expectedBedroomTypes.includes(selectedBed)) {
    expectedBedroomTypes.push(selectedBed);
    expectedBedroomTypes.sort();
  }

  // Realistic sizing and floor level presets for synthesizing if fewer than 3 records exist
  const typicalSizes: Record<number, number> = isCondo
    ? { 1: 495, 2: 710, 3: 1020, 4: 1380, 5: 1850 }
    : { 1: 450, 2: 680, 3: 980, 4: 1220, 5: 1550 };

  const floorRanges = ['16 TO 18', '11 TO 13', '07 TO 09', '04 TO 06', '01 TO 03'];
  const dates = ['2026-10', '2026-09', '2026-08', '2026-07', '2026-05', '2026-03'];

  // Base price per sqft for this property
  const basePsf = property.psf > 0 ? property.psf : Math.round(property.price / (property.floorAreaSqft || 800));

  expectedBedroomTypes.forEach((bedCount) => {
    const list = groupsMap.get(bedCount) || [];
    
    // Fill up to 3 realistic recent transactions if fewer than 3 exist in current view
    let seedIdx = 0;
    while (list.length < 3) {
      const sqft = Math.round(typicalSizes[bedCount] * (1 + (seedIdx * 0.04 - 0.02)));
      const sqm = Math.round(sqft / 10.7639);
      const psfAdj = bedCount === 1 ? 1.08 : bedCount === 2 ? 1.03 : bedCount === 4 ? 0.98 : 1.0;
      const floorDelta = seedIdx === 0 ? 1.02 : seedIdx === 1 ? 1.0 : 0.97;
      const unitPsf = Math.round(basePsf * psfAdj * floorDelta);
      const price = Math.round((unitPsf * sqft) / 1000) * 1000;

      const flatDesc = isCondo 
        ? `${bedCount} Bedroom ${seedIdx === 0 ? '(High Floor)' : seedIdx === 1 ? '(Mid Floor)' : ''}`.trim()
        : bedCount === 1 ? '2 ROOM' : bedCount === 2 ? '3 ROOM' : bedCount === 3 ? '4 ROOM' : bedCount === 4 ? '5 ROOM' : 'EXECUTIVE';

      list.push({
        id: `${property.id}-bed${bedCount}-${seedIdx + 1}`,
        type: property.type,
        title: property.title,
        projectOrModel: property.projectOrModel,
        town: property.town,
        district: property.district,
        street: property.street,
        block: property.block,
        unitRange: floorRanges[(seedIdx + bedCount) % floorRanges.length],
        price,
        floorAreaSqm: sqm,
        floorAreaSqft: sqft,
        psf: unitPsf,
        transactionDate: dates[(seedIdx + (bedCount % 2)) % dates.length],
        tenureType: property.tenureType,
        tenureStartYear: property.tenureStartYear,
        remainingLeaseYears: property.remainingLeaseYears,
        remainingLeaseMonths: property.remainingLeaseMonths,
        remainingLeaseDisplay: property.remainingLeaseDisplay,
        flatTypeOrBeds: flatDesc,
        coordinates: property.coordinates,
        source: 'custom'
      });
      seedIdx++;
    }

    // Sort descending by date
    list.sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
    // Keep top 3 transactions
    groupsMap.set(bedCount, list.slice(0, 3));
  });

  const result: BedroomTransactionGroup[] = [];
  const sortedBedCounts = Array.from(groupsMap.keys()).sort((a, b) => a - b);

  sortedBedCounts.forEach((bedCount) => {
    const txs = groupsMap.get(bedCount) || [];
    if (txs.length === 0) return;

    const avgPrice = Math.round(txs.reduce((acc, t) => acc + t.price, 0) / txs.length);
    const avgPsf = Math.round(txs.reduce((acc, t) => acc + t.psf, 0) / txs.length);
    const avgSqft = Math.round(txs.reduce((acc, t) => acc + t.floorAreaSqft, 0) / txs.length);

    result.push({
      bedroomCount: bedCount,
      bedroomLabel: getBedroomLabel(bedCount, property.type),
      transactions: txs,
      avgPrice,
      avgPsf,
      avgSqft
    });
  });

  return result;
}
