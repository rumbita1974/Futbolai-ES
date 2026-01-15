'use client';

import { useEffect, useState } from 'react';
import { getTokenSavingsReport } from '@/services/groqOptimizer';
import { getCacheStats } from '@/services/optimizedDataService';

interface TokenMetrics {
  report: any;
  cacheStats: any;
  lastUpdated: string;
}

export default function OptimizationDashboard() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const report = getTokenSavingsReport();
        const cacheStats = getCacheStats();
        
        setMetrics({
          report,
          cacheStats,
          lastUpdated: new Date().toLocaleTimeString(),
        });
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    };

    // Initial load
    updateMetrics();

    // Update every 10 seconds
    const interval = setInterval(updateMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg border border-gray-700">
        <div className="animate-pulse">Loading metrics...</div>
      </div>
    );
  }

  const costSaved = metrics.report.costSavingsUSD || 0;
  const tokensSaved = metrics.report.estimatedTokensSaved || 0;
  const queriesOptimized = metrics.report.totalQueriesOptimized || 0;

  return (
    <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg border border-green-600/50">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🚀 FutbolAI Optimization Dashboard</h2>
        <p className="text-gray-400 text-sm">Real-time token savings & performance metrics</p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Queries Optimized */}
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
          <div className="text-sm text-blue-300 mb-1">Queries Optimized</div>
          <div className="text-3xl font-bold text-blue-400">{queriesOptimized}</div>
          <div className="text-xs text-blue-500 mt-2">Total searches routed to free APIs</div>
        </div>

        {/* Groq Calls Avoided */}
        <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
          <div className="text-sm text-green-300 mb-1">Groq Calls Avoided</div>
          <div className="text-3xl font-bold text-green-400">
            {metrics.report.groqCallsAvoided}
          </div>
          <div className="text-xs text-green-500 mt-2">Unnecessary API calls prevented</div>
        </div>

        {/* Tokens Saved */}
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-1">Tokens Saved</div>
          <div className="text-3xl font-bold text-purple-400">{(tokensSaved / 1000).toFixed(0)}K</div>
          <div className="text-xs text-purple-500 mt-2">Equivalent to {Math.round(tokensSaved / 1000)} thousand tokens</div>
        </div>

        {/* Cost Savings */}
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-4">
          <div className="text-sm text-emerald-300 mb-1">Cost Saved</div>
          <div className="text-3xl font-bold text-emerald-400">${costSaved.toFixed(2)}</div>
          <div className="text-xs text-emerald-500 mt-2">Monthly savings estimate</div>
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📦 Cache Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-400">Football Data Cached</div>
            <div className="text-2xl font-bold text-white">{metrics.cacheStats.footballDataCached}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Wikimedia Cached</div>
            <div className="text-2xl font-bold text-white">{metrics.cacheStats.wikimediaCached}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Wikipedia Cached</div>
            <div className="text-2xl font-bold text-white">{metrics.cacheStats.wikipediaCached}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Total Cached</div>
            <div className="text-2xl font-bold text-white">{metrics.cacheStats.totalCached}</div>
          </div>
        </div>
      </div>

      {/* Query Breakdown */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📊 Query Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Team Queries:</span>
            <span className="font-semibold text-white">{metrics.report.breakdownByType?.teamQueries || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Player Queries:</span>
            <span className="font-semibold text-white">{metrics.report.breakdownByType?.playerQueries || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Translations:</span>
            <span className="font-semibold text-white">{metrics.report.breakdownByType?.translationQueries || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Image Queries:</span>
            <span className="font-semibold text-white">{metrics.report.breakdownByType?.imageQueries || 0}</span>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Last updated: <span className="text-white font-semibold">{metrics.lastUpdated}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-green-400">Optimization Active</span>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
        <p className="text-sm text-blue-300">
          💡 <strong>Optimization Impact:</strong> This dashboard shows real-time savings from using free data sources 
          (Football Data API, Wikipedia, Wikimedia) instead of expensive Groq API calls. The goal is to reduce token 
          usage by 90% while maintaining data quality and reliability.
        </p>
      </div>
    </div>
  );
}
