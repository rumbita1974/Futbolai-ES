// /app/debug-trace/page.tsx
'use client';

import { traceSearchProcess } from '@/services/dataTracer';
import { useState } from 'react';

export default function DebugTracePage() {
  const [query, setQuery] = useState('Argentina');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);

  // Capture console logs
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    setConsoleOutput(prev => [...prev, message]);
  };

  const runTrace = async () => {
    setLoading(true);
    setConsoleOutput([]);
    setResult(null);
    
    try {
      const analysis = await traceSearchProcess(query);
      setResult(analysis);
    } catch (error) {
      console.error('Trace failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testMultiple = async () => {
    const tests = ['Argentina', 'Barcelona', 'France', 'Brazil'];
    
    for (const testQuery of tests) {
      console.log(`\n\n🧪 TESTING: ${testQuery}`);
      setQuery(testQuery);
      await runTrace();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Data Source Tracer</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter team name"
          style={{ padding: '10px', marginRight: '10px', width: '300px' }}
        />
        <button 
          onClick={runTrace}
          disabled={loading}
          style={{ padding: '10px 20px', marginRight: '10px' }}
        >
          {loading ? 'Tracing...' : 'Trace Data Sources'}
        </button>
        <button 
          onClick={testMultiple}
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          Test Multiple Teams
        </button>
      </div>
      
      {result && (
        <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px' }}>
          <h2>Analysis Results for "{query}"</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Team Information:</h3>
            <p><strong>Coach:</strong> {result.team.coach}</p>
            <p><strong>Coach Sources:</strong> {result.team.coachSources.join(', ') || 'None'}</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Issues Found ({result.issues.length}):</h3>
            {result.issues.length > 0 ? (
              <ul style={{ color: 'red' }}>
                {result.issues.map((issue: string, i: number) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'green' }}>✅ No issues detected</p>
            )}
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h3>Recommendations:</h3>
            {result.recommendations.length > 0 ? (
              <ul style={{ color: 'orange' }}>
                {result.recommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            ) : (
              <p>No recommendations</p>
            )}
          </div>
          
          <div>
            <h3>Players Analysis ({result.players.length} players):</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '10px',
              marginTop: '10px'
            }}>
              {result.players.slice(0, 20).map((player: any, i: number) => (
                <div 
                  key={i}
                  style={{
                    border: '1px solid #eee',
                    padding: '10px',
                    borderRadius: '5px',
                    backgroundColor: player.sources.includes('TheSportsDB API') ? '#fff3cd' : '#f8f9fa'
                  }}
                >
                  <strong>{player.name}</strong>
                  <div style={{ fontSize: '12px', marginTop: '5px' }}>
                    Sources: {player.sources.join(', ')}
                  </div>
                  {player.sources.includes('TheSportsDB API') && (
                    <div style={{ fontSize: '11px', color: '#856404', marginTop: '3px' }}>
                      ⚠️ From TheSportsDB (may be incorrect)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div>
        <h2>Console Output</h2>
        <div style={{ 
          backgroundColor: '#000', 
          color: '#0f0', 
          padding: '15px',
          height: '400px',
          overflow: 'auto',
          fontSize: '12px',
          whiteSpace: 'pre-wrap'
        }}>
          {consoleOutput.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}