// /app/test-fix/page.tsx
'use client';

import { useState } from 'react';

export default function TestFixPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFix = async () => {
    setLoading(true);
    
    try {
      // Test the fixed function
      const response = await fetch('/api/test-football-data?team=France');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testMultiple = async () => {
    const teams = ['France', 'Barcelona', 'Brazil', 'Real Madrid'];
    const allResults = [];
    
    for (const team of teams) {
      setLoading(true);
      try {
        const response = await fetch(`/api/test-football-data?team=${encodeURIComponent(team)}`);
        const data = await response.json();
        allResults.push({ team, data });
      } catch (error) {
        console.error(`Test failed for ${team}:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setResults(allResults);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Football Data API Fix</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testFix}
          disabled={loading}
          style={{ padding: '10px 20px', marginRight: '10px' }}
        >
          Test "France" Fix
        </button>
        
        <button 
          onClick={testMultiple}
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          Test Multiple Teams
        </button>
      </div>
      
      {loading && <div>Testing...</div>}
      
      {results && (
        <pre style={{ background: '#f5f5f5', padding: '20px', overflow: 'auto' }}>
          {JSON.stringify(results, null, 2)}
        </pre>
      )}
    </div>
  );
}