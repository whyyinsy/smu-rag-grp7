import { MortgagePlanInput, MortgagePlanResult, SellerProceedsInput, SellerProceedsResult } from '../types/property';

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
