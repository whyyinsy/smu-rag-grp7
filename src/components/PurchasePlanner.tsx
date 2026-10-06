import React, { useState } from 'react';
import { 
  Calculator, DollarSign, Building2, Wallet, CheckCircle2, AlertCircle
} from 'lucide-react';
import { PropertyTransaction, PropertyType, MortgagePlanInput, SellerProceedsInput } from '../types/property';
import { 
  calculateMortgagePlan, calculateSellerProceeds, 
  formatCurrency 
} from '../utils/propertyMath';

interface PurchasePlannerProps {
  selectedProperty: PropertyTransaction | null;
  onClearSelectedProperty: () => void;
}

export const PurchasePlanner: React.FC<PurchasePlannerProps> = ({
  selectedProperty,
  onClearSelectedProperty
}) => {
  const [plannerMode, setPlannerMode] = useState<'buy' | 'sell'>('buy');

  // Buyer state
  const [buyerInput, setBuyerInput] = useState<MortgagePlanInput>({
    propertyPrice: selectedProperty ? selectedProperty.price : 850000,
    buyerStatus: 'SC_FIRST',
    propertyType: selectedProperty ? selectedProperty.type : 'HDB',
    loanTenureYears: 25,
    interestRateAnnual: 3.2,
    downpaymentPercent: 25,
    cashPercent: 5,
    monthlyHouseholdIncome: 12000,
    existingMonthlyDebts: 800,
    cpfGrantExpected: selectedProperty?.type === 'HDB' ? 50000 : 0
  });

  // Seller state
  const [sellerInput, setSellerInput] = useState<SellerProceedsInput>({
    sellingPrice: selectedProperty ? selectedProperty.price : 900000,
    outstandingLoan: 420000,
    cpfPrincipalRefund: 180000,
    cpfAccruedInterest: 32000,
    agentCommissionPercent: 2,
    legalFee: 2500,
    holdingPeriodYears: 5
  });

  // Calculate results
  const buyerResult = calculateMortgagePlan(buyerInput);
  const sellerResult = calculateSellerProceeds(sellerInput);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-rose-500" />
            Residential Purchase & Sale Financial Planner
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Singapore TDSR/MSR compliance, IRAS Stamp Duties (BSD & ABSD), CPF Housing Grants, and Seller Proceeds.
          </p>
        </div>

        {/* Buy vs Sell Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl shrink-0">
          <button
            onClick={() => setPlannerMode('buy')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              plannerMode === 'buy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-rose-500" />
            <span>Buyer Mortgage Plan</span>
          </button>
          <button
            onClick={() => setPlannerMode('sell')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ${
              plannerMode === 'sell'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Seller Net Proceeds</span>
          </button>
        </div>
      </div>

      {/* Selected Property Banner if attached */}
      {selectedProperty && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="text-slate-500">Selected Property: </span>
              <span className="font-bold text-slate-900">{selectedProperty.title} ({selectedProperty.town})</span>
              <span className="text-rose-600 font-mono font-bold ml-2">
                {formatCurrency(selectedProperty.price)}
              </span>
            </div>
          </div>
          <button
            onClick={onClearSelectedProperty}
            className="text-[11px] text-slate-500 hover:text-slate-900 font-medium underline transition-colors"
          >
            Reset to Custom
          </button>
        </div>
      )}

      {plannerMode === 'buy' ? (
        /* Buyer Mortgage & Affordability Planner */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Purchase & Borrower Inputs
            </h2>

            {/* Target Property Price */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Target Purchase Price (SGD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">SGD</span>
                <input
                  type="number"
                  step="10000"
                  value={buyerInput.propertyPrice}
                  onChange={(e) => setBuyerInput({ ...buyerInput, propertyPrice: Number(e.target.value) })}
                  className="w-full pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Property Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Property Classification</label>
              <div className="grid grid-cols-3 gap-2">
                {(['HDB', 'CONDO', 'EC'] as PropertyType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBuyerInput({ ...buyerInput, propertyType: t })}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      buyerInput.propertyType === t
                        ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Buyer Profile (Citizenship & Property Count) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Residency & Property Count (ABSD Tier)</label>
              <select
                value={buyerInput.buyerStatus}
                onChange={(e) => setBuyerInput({ ...buyerInput, buyerStatus: e.target.value as MortgagePlanInput['buyerStatus'] })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-rose-500"
              >
                <option value="SC_FIRST">Singapore Citizen - 1st Residential Property (0% ABSD)</option>
                <option value="SC_SECOND">Singapore Citizen - 2nd Property (20% ABSD)</option>
                <option value="SC_THIRD">Singapore Citizen - 3rd+ Property (30% ABSD)</option>
                <option value="SPR_FIRST">Singapore PR - 1st Residential Property (5% ABSD)</option>
                <option value="SPR_SECOND">Singapore PR - 2nd Property (30% ABSD)</option>
                <option value="FOREIGNER">Foreigner / Non-PR (60% ABSD)</option>
              </select>
            </div>

            {/* Downpayment & Loan Tenure */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Total Downpayment %</label>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={buyerInput.downpaymentPercent}
                  onChange={(e) => setBuyerInput({ ...buyerInput, downpaymentPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Loan Tenure (Years)</label>
                <input
                  type="number"
                  min="10"
                  max="30"
                  value={buyerInput.loanTenureYears}
                  onChange={(e) => setBuyerInput({ ...buyerInput, loanTenureYears: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Interest Rate & Income */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  value={buyerInput.interestRateAnnual}
                  onChange={(e) => setBuyerInput({ ...buyerInput, interestRateAnnual: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Gross Household Income</label>
                <input
                  type="number"
                  step="500"
                  value={buyerInput.monthlyHouseholdIncome}
                  onChange={(e) => setBuyerInput({ ...buyerInput, monthlyHouseholdIncome: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Expected CPF Housing Grants */}
            {buyerInput.propertyType === 'HDB' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  CPF Housing Grants (EHG / Family / PHG)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={buyerInput.cpfGrantExpected}
                  onChange={(e) => setBuyerInput({ ...buyerInput, cpfGrantExpected: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Affordability & Cashflow Breakdown
            </h2>

            {/* Monthly Installment Highlight */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-emerald-800">Estimated Monthly Mortgage Payment</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(buyerResult.monthlyMortgagePayment)}
                <span className="text-xs font-normal text-emerald-600"> /month</span>
              </div>
              <div className="text-[11px] text-slate-600 font-mono">
                Loan Amount: {formatCurrency(buyerResult.loanAmount)} over {buyerInput.loanTenureYears} years
              </div>
            </div>

            {/* Regulatory Ratios (TDSR & MSR) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">TDSR (Cap: 55%)</span>
                  <span className={`font-mono font-bold ${buyerResult.isTdsrCompliant ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {buyerResult.tdsrPercent}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {buyerResult.isTdsrCompliant ? '✓ Within MAS 55% limit' : '⚠ Exceeds MAS 55% limit'}
                </div>
              </div>

              {buyerInput.propertyType !== 'CONDO' && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">MSR (Cap: 30%)</span>
                    <span className={`font-mono font-bold ${buyerResult.isMsrCompliant ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {buyerResult.msrPercent}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {buyerResult.isMsrCompliant ? '✓ Within HDB 30% limit' : '⚠ Exceeds HDB 30% limit'}
                  </div>
                </div>
              )}
            </div>

            {/* Stamp Duties & Downpayment Schedule */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Buyer's Stamp Duty (BSD):</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(buyerResult.buyerStampDuty)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Additional Buyer's Stamp Duty (ABSD):</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(buyerResult.additionalBuyerStampDuty)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Minimum 5% Cash Downpayment:</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(buyerResult.minimumCashDownpayment)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CPF OA / Cash Balance Downpayment:</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(buyerResult.cpfOrCashDownpayment)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Estimated Upfront Cash Required:</span>
                <span className="font-mono text-rose-600 font-bold">{formatCurrency(buyerResult.estimatedUpfrontCash)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Seller Proceeds Planner */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Sale Transaction Parameters
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Expected Selling Price (SGD)</label>
              <input
                type="number"
                step="10000"
                value={sellerInput.sellingPrice}
                onChange={(e) => setSellerInput({ ...sellerInput, sellingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Outstanding Bank/HDB Mortgage Loan</label>
              <input
                type="number"
                step="5000"
                value={sellerInput.outstandingLoan}
                onChange={(e) => setSellerInput({ ...sellerInput, outstandingLoan: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">CPF Principal Used</label>
                <input
                  type="number"
                  step="5000"
                  value={sellerInput.cpfPrincipalRefund}
                  onChange={(e) => setSellerInput({ ...sellerInput, cpfPrincipalRefund: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">CPF Accrued Interest (2.5%)</label>
                <input
                  type="number"
                  step="2000"
                  value={sellerInput.cpfAccruedInterest}
                  onChange={(e) => setSellerInput({ ...sellerInput, cpfAccruedInterest: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Agent Commission %</label>
                <input
                  type="number"
                  step="0.5"
                  value={sellerInput.agentCommissionPercent}
                  onChange={(e) => setSellerInput({ ...sellerInput, agentCommissionPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Holding Period (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={sellerInput.holdingPeriodYears}
                  onChange={(e) => setSellerInput({ ...sellerInput, holdingPeriodYears: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Net Proceeds Calculation
            </h2>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
              <div className="text-xs font-semibold text-emerald-800">Estimated Net Cash in Hand</div>
              <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                {formatCurrency(sellerResult.estimatedNetCashProceeds)}
              </div>
              <div className="text-[11px] text-slate-600">
                After fully repaying mortgage, CPF principal with 2.5% accrued interest, and legal/agent costs.
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Selling Price:</span>
                <span className="font-mono font-semibold text-slate-900">{formatCurrency(sellerInput.sellingPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Less Outstanding Mortgage:</span>
                <span className="font-mono text-rose-600">-{formatCurrency(sellerInput.outstandingLoan)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Less Total CPF Refund (Principal + Accrued):</span>
                <span className="font-mono text-rose-600">-{formatCurrency(sellerResult.totalCpfRefund)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Less Agent Commission ({sellerInput.agentCommissionPercent}%):</span>
                <span className="font-mono text-rose-600">-{formatCurrency(sellerResult.agentFee)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Seller's Stamp Duty (SSD):</span>
                <span className="font-mono text-slate-500">{formatCurrency(sellerResult.sellerStampDuty)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
