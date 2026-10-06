import React, { useState } from 'react';
import { Database, Play, Copy, Check, ExternalLink, RefreshCw, Layers, MapPin } from 'lucide-react';
import { SINGAPORE_TOWNS } from '../data/townCoordinates';
import { fetchHdbTransactions, DataGovResponse } from '../services/dataGovService';
import { PropertyTransaction } from '../types/property';
import { formatCurrency } from '../utils/propertyMath';

interface DataGovConsoleProps {
  onAppendTransactions: (newTransactions: PropertyTransaction[]) => void;
  onNavigateToMap: () => void;
}

export const DataGovConsole: React.FC<DataGovConsoleProps> = ({
  onAppendTransactions,
  onNavigateToMap
}) => {
  const [town, setTown] = useState<string>('TAMPINES');
  const [flatType, setFlatType] = useState<string>('4 ROOM');
  const [limit, setLimit] = useState<number>(5);
  const [sort, setSort] = useState<string>('month desc');
  const [query, setQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<PropertyTransaction[]>([]);
  const [totalInGov, setTotalInGov] = useState<number | null>(null);
  const [rawJson, setRawJson] = useState<DataGovResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Construct current URL
  const buildCurrentUrl = () => {
    const base = 'https://data.gov.sg/api/action/datastore_search?resource_id=d_8b84c4ee58e3cfc0ece0d773c8ca6abc';
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (sort) params.set('sort', sort);

    const filters: Record<string, string> = {};
    if (town && town !== 'ALL') filters['town'] = town;
    if (flatType && flatType !== 'ALL') filters['flat_type'] = flatType;
    if (Object.keys(filters).length > 0) {
      params.set('filters', JSON.stringify(filters));
    }
    if (query) params.set('q', query);

    return `${base}&${params.toString()}`;
  };

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHdbTransactions({
        town: town === 'ALL' ? undefined : town,
        flatType: flatType === 'ALL' ? undefined : flatType,
        limit,
        sort,
        q: query || undefined
      });

      setFetchedData(res.transactions);
      setTotalInGov(res.totalRecords);
      if (res.rawResponse) setRawJson(res.rawResponse);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (pTown: string, pFlat: string, pLimit: number, pSort: string) => {
    setTown(pTown);
    setFlatType(pFlat);
    setLimit(pLimit);
    setSort(pSort);
    setQuery('');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(buildCurrentUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportToMap = () => {
    if (fetchedData.length > 0) {
      onAppendTransactions(fetchedData);
      onNavigateToMap();
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-500" />
            Data.gov.sg Real-Time HDB Resale API Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query Singapore Government's official datastore (<code className="text-rose-400">d_8b84c4ee58e3cfc0ece0d773c8ca6abc</code>) with customized filters, pagination, and sorting.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePreset('ALL', 'ALL', 5, 'month desc')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            First 5 (Any Town)
          </button>
          <button
            onClick={() => handlePreset('TAMPINES', '4 ROOM', 5, 'month desc')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-rose-300 transition-colors"
          >
            Tampines 4-Room
          </button>
          <button
            onClick={() => handlePreset('BISHAN', '5 ROOM', 10, 'resale_price desc')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-slate-300 transition-colors"
          >
            Top Bishan 5-Room
          </button>
        </div>
      </div>

      {/* Query Builder Form */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Town Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Town / Area</label>
            <select
              value={town}
              onChange={(e) => setTown(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Towns (Any)</option>
              {Object.keys(SINGAPORE_TOWNS).sort().map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Flat Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Flat Model / Type</label>
            <select
              value={flatType}
              onChange={(e) => setFlatType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Flat Types</option>
              <option value="2 ROOM">2 ROOM</option>
              <option value="3 ROOM">3 ROOM</option>
              <option value="4 ROOM">4 ROOM</option>
              <option value="5 ROOM">5 ROOM</option>
              <option value="EXECUTIVE">EXECUTIVE</option>
            </select>
          </div>

          {/* Limit */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Record Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value={5}>5 records</option>
              <option value={10}>10 records</option>
              <option value={25}>25 records</option>
              <option value={50}>50 records</option>
              <option value={100}>100 records</option>
            </select>
          </div>

          {/* Sort */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Sort By</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="month desc">Latest Month (desc)</option>
              <option value="month asc">Oldest Month (asc)</option>
              <option value="resale_price desc">Highest Price (desc)</option>
              <option value="resale_price asc">Lowest Price (asc)</option>
              <option value="_id desc">Latest ID (desc)</option>
            </select>
          </div>

          {/* Search Query */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Fulltext Query (q)</label>
            <input
              type="text"
              placeholder="e.g. Model A or St 21"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Generated URL Box */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="truncate font-mono text-slate-400">
            <span className="text-emerald-400 font-semibold">GET </span>
            {buildCurrentUrl()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyUrl}
              className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleExecute}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Fetching...' : 'Run Query'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {fetchedData.length > 0 && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Query Results ({fetchedData.length} records returned)</span>
                {totalInGov !== null && (
                  <span className="text-xs text-slate-400 font-normal font-mono">
                    · Total matching records in government datastore: {totalInGov.toLocaleString()}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={handleImportToMap}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Plot on Interactive Map</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Town</th>
                  <th className="py-2 px-3">Address</th>
                  <th className="py-2 px-3">Flat Type & Model</th>
                  <th className="py-2 px-3">Storey</th>
                  <th className="py-2 px-3">Remaining Lease</th>
                  <th className="py-2 px-3 text-right">Floor Area</th>
                  <th className="py-2 px-3 text-right">Resale Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {fetchedData.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">{tx.transactionDate}</td>
                    <td className="py-2 px-3 text-white font-sans font-medium">{tx.town}</td>
                    <td className="py-2 px-3 text-slate-300 font-sans">{tx.title}</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">{tx.projectOrModel}</td>
                    <td className="py-2 px-3 text-slate-400">{tx.unitRange || '-'}</td>
                    <td className="py-2 px-3 text-slate-300 font-sans">{tx.remainingLeaseDisplay}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{tx.floorAreaSqm} m² ({tx.floorAreaSqft} sqft)</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-bold">{formatCurrency(tx.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Raw JSON expandable */}
          {rawJson && (
            <details className="pt-2 text-xs">
              <summary className="text-slate-400 hover:text-slate-200 cursor-pointer font-medium">
                View Raw Data.gov.sg API JSON Payload
              </summary>
              <pre className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};
