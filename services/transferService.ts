// services/transferService.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface EnhancedTransferNews {
  player: string;
  from: string;
  to: string;
  date: string;
  fee: string;
  type: 'transfer' | 'loan' | 'free' | 'rumor';
  status: 'confirmed' | 'rumor' | 'completed' | 'medical';
  description: string;
  age?: number;
  position?: string;
  marketValue?: string;
  source: string;
  verified: boolean;
  impact: 'high' | 'medium' | 'low';
}

// Common football position abbreviations
const VALID_POSITIONS = [
  'ST', 'CF',  // Striker/Center Forward
  'RW', 'LW',  // Right/Left Winger
  'CAM', 'CM', 'CDM', // Central positions
  'RM', 'LM',  // Right/Left Midfielder
  'CB', 'RB', 'LB', // Defenders
  'GK'         // Goalkeeper
];

// Clean position string - remove any unwanted text
const cleanPosition = (position: string): string => {
  if (!position) return 'N/A';
  
  let cleaned = position
    .toUpperCase()
    .replace(/YEARS|YRS?|NA\/?|N\/A|\d+|OLD|AGE|\s+/gi, '') // Remove unwanted text
    .trim();
  
  // If empty after cleaning, return N/A
  if (!cleaned) return 'N/A';
  
  // Check if it's already a valid abbreviation
  if (VALID_POSITIONS.includes(cleaned)) {
    return cleaned;
  }
  
  // Try to match common variations
  const positionMap: Record<string, string> = {
    'FORWARD': 'ST',
    'STRIKER': 'ST',
    'CENTERFORWARD': 'CF',
    'WINGER': 'RW',
    'RIGHTWINGER': 'RW',
    'LEFTWINGER': 'LW',
    'MIDFIELDER': 'CM',
    'CENTERMID': 'CM',
    'CENTRALMID': 'CM',
    'DEFENDER': 'CB',
    'CENTRALBACK': 'CB',
    'CENTREBACK': 'CB',
    'RIGHTBACK': 'RB',
    'LEFTBACK': 'LB',
    'GOALKEEPER': 'GK',
    'KEEPER': 'GK'
  };
  
  // Check for partial matches
  for (const [key, value] of Object.entries(positionMap)) {
    if (cleaned.includes(key) || key.includes(cleaned)) {
      return value;
    }
  }
  
  // Take first 2-3 characters if nothing else works
  return cleaned.substring(0, Math.min(cleaned.length, 3));
};

// Clean age - ensure it's a number
const cleanAge = (age: any): number | undefined => {
  if (typeof age === 'number') {
    return age >= 16 && age <= 45 ? age : undefined;
  }
  
  if (typeof age === 'string') {
    // Extract numbers only
    const ageMatch = age.match(/\d+/);
    if (ageMatch) {
      const numAge = parseInt(ageMatch[0]);
      return numAge >= 16 && numAge <= 45 ? numAge : undefined;
    }
  }
  
  return undefined;
};

// Clean transfer data function
const cleanTransferData = (transfers: any[]): EnhancedTransferNews[] => {
  return transfers.map((transfer: any, index: number) => {
    // Clean position
    const cleanedPosition = cleanPosition(transfer.position);
    
    // Clean age
    const cleanedAge = cleanAge(transfer.age);
    
    // Clean date - remove any unwanted text and format
    let cleanedDate = transfer.date || '';
    if (cleanedDate.includes('years') || cleanedDate.includes('yrs')) {
      cleanedDate = cleanedDate.replace(/years|yrs?/gi, '').trim();
    }
    
    // Clean source
    let cleanedSource = transfer.source || 'Unknown Source';
    if (cleanedSource.includes('years') || cleanedSource.includes('yrs')) {
      cleanedSource = cleanedSource.replace(/years|yrs?/gi, '').trim();
    }
    
    // Clean fee
    let cleanedFee = transfer.fee || 'Unknown';
    if (cleanedFee.includes('years') || cleanedFee.includes('yrs')) {
      cleanedFee = cleanedFee.replace(/years|yrs?/gi, '').trim();
    }
    
    // Ensure date format (YYYY-MM-DD)
    if (cleanedDate && !/^\d{4}-\d{2}-\d{2}$/.test(cleanedDate)) {
      // Try to extract date or use a default
      const dateMatch = cleanedDate.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        cleanedDate = dateMatch[0];
      } else {
        // Use current date minus some days for variety
        const baseDate = new Date('2024-07-01');
        const variedDate = new Date(baseDate.getTime() + (index * 7 * 24 * 60 * 60 * 1000));
        cleanedDate = variedDate.toISOString().split('T')[0];
      }
    }
    
    return {
      player: transfer.player || `Player ${index + 1}`,
      from: transfer.from || 'Unknown Club',
      to: transfer.to || 'Unknown Club',
      date: cleanedDate,
      fee: cleanedFee,
      type: (transfer.type || 'transfer') as 'transfer' | 'loan' | 'free' | 'rumor',
      status: (transfer.status || 'rumor') as 'confirmed' | 'rumor' | 'completed' | 'medical',
      description: transfer.description || 'Transfer news',
      age: cleanedAge,
      position: cleanedPosition,
      marketValue: transfer.marketValue || cleanedFee,
      source: cleanedSource,
      verified: transfer.verified !== undefined ? Boolean(transfer.verified) : false,
      impact: (transfer.impact || 'medium') as 'high' | 'medium' | 'low'
    };
  });
};

// Update the AI prompt to be very strict
const getCleanTransferData = async (limit: number = 12): Promise<EnhancedTransferNews[]> => {
  try {
    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'system',
        content: `You are a football transfer expert. Generate recent (2024-2025 season) transfer news.
        
        CRITICAL RULES - ABSOLUTELY NO EXCEPTIONS:
        1. Player age: ONLY a number (e.g., 24)
        2. Position: ONLY standard abbreviation (e.g., ST, RW, CB, GK, CM)
        3. NEVER include "years", "yrs", "age", "old", "N/A", or similar text in ANY field
        4. Market value: ONLY currency format (e.g., €50m, £40m, Free)
        5. Source: ONLY news outlet name (e.g., Sky Sports, Fabrizio Romano)
        6. Date: ONLY in YYYY-MM-DD format (e.g., 2024-07-01)
        
        VALID POSITION ABBREVIATIONS (USE ONLY THESE):
        - ST (Striker)
        - CF (Center Forward)
        - RW (Right Winger)
        - LW (Left Winger)
        - CAM (Central Attacking Midfielder)
        - CM (Central Midfielder)
        - CDM (Central Defensive Midfielder)
        - RM (Right Midfielder)
        - LM (Left Midfielder)
        - CB (Center Back)
        - RB (Right Back)
        - LB (Left Back)
        - GK (Goalkeeper)`
      }, {
        role: 'user',
        content: `Generate ${limit} recent football transfers for the 2024/2025 season.
        
        IMPORTANT: ABSOLUTELY NO "years", "yrs", "age", "old", or "N/A" text anywhere!
        
        Required fields (CLEAN FORMAT ONLY):
        - player: "Kylian Mbappé"
        - from: "Paris Saint-Germain"
        - to: "Real Madrid"
        - date: "2024-07-01" (YYYY-MM-DD only, no other text)
        - fee: "Free" or "€180m" (currency only)
        - type: "transfer" or "loan" or "free" or "rumor"
        - status: "confirmed" or "rumor" or "completed" or "medical"
        - description: "One of the biggest free transfers in history" (max 80 chars)
        - age: 25 (number only, no text)
        - position: "ST" (abbreviation only from list above)
        - marketValue: "€180m" (currency only)
        - source: "Fabrizio Romano" (outlet name only)
        - verified: true or false
        - impact: "high" or "medium" or "low"
        
        Make the transfers diverse: Include confirmed transfers, rumors, loans, and free transfers.
        
        Return JSON: { "transfers": [...] }`
      }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = completion.choices[0]?.message?.content;
    if (content) {
      console.log('[Transfers] Raw AI response received');
      
      const parsed = JSON.parse(content);
      let transfers = Array.isArray(parsed) ? parsed : parsed.transfers || [];
      
      console.log(`[Transfers] Raw AI returned ${transfers.length} transfers`);
      
      // Clean the data
      transfers = cleanTransferData(transfers);
      
      console.log(`[Transfers] Cleaned ${transfers.length} transfers`);
      
      return transfers;
    }
  } catch (error) {
    console.log('[Transfers] AI generation failed:', error);
  }
  
  console.log('[Transfers] Returning empty array - AI failed');
  return [];
};

export const fetchEnhancedTransferNews = async (limit: number = 12): Promise<EnhancedTransferNews[]> => {
  const cacheKey = `enhanced_transfers_${limit}`;
  
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 6 * 60 * 60 * 1000) { // 6 hours cache
        console.log('[Transfers] Returning cached data');
        return data;
      }
    }
  }
  
  console.log('[Transfers] Fetching fresh transfer data...');
  
  try {
    // Try to get clean AI-generated transfer data
    const aiTransfers = await getCleanTransferData(limit);
    
    if (aiTransfers.length >= limit) {
      console.log(`[Transfers] AI returned ${aiTransfers.length} transfers`);
      
      // Cache successful AI results
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: aiTransfers,
          timestamp: Date.now()
        }));
      }
      return aiTransfers;
    }
    
    console.log(`[Transfers] AI only returned ${aiTransfers.length} transfers, mixing with static data`);
    
    // If AI didn't return enough data, use static data
    const staticTransfers = getStaticFallbackTransfers();
    const enhancedTransfers = aiTransfers.length > 0 ? [
      ...aiTransfers,
      ...staticTransfers.slice(0, Math.max(0, limit - aiTransfers.length))
    ] : staticTransfers.slice(0, limit);
    
    console.log(`[Transfers] Final: ${enhancedTransfers.length} transfers`);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: enhancedTransfers,
        timestamp: Date.now()
      }));
    }
    
    return enhancedTransfers;
    
  } catch (error) {
    console.log('[Transfers] AI failed, using static data');
  }
  
  return getStaticFallbackTransfers().slice(0, limit);
};

const getStaticFallbackTransfers = (): EnhancedTransferNews[] => [
  {
    player: 'Kylian Mbappé',
    from: 'Paris Saint-Germain',
    to: 'Real Madrid',
    date: '2024-07-01',
    fee: 'Free',
    type: 'transfer',
    status: 'confirmed',
    description: 'Historic free transfer to Real Madrid',
    age: 25,
    position: 'ST',
    marketValue: '€180m',
    source: 'Fabrizio Romano',
    verified: true,
    impact: 'high'
  },
  {
    player: 'Victor Osimhen',
    from: 'Napoli',
    to: 'Chelsea',
    date: '2024-08-15',
    fee: '€120m',
    type: 'transfer',
    status: 'rumor',
    description: 'Chelsea ready to activate release clause',
    age: 25,
    position: 'ST',
    marketValue: '€110m',
    source: 'Sky Sports',
    verified: false,
    impact: 'high'
  },
  {
    player: 'Florian Wirtz',
    from: 'Bayer Leverkusen',
    to: 'Bayern Munich',
    date: '2025-01-05',
    fee: '€100m',
    type: 'rumor',
    status: 'rumor',
    description: 'Bayern preparing summer bid',
    age: 21,
    position: 'CAM',
    marketValue: '€90m',
    source: 'Bild',
    verified: false,
    impact: 'medium'
  },
  {
    player: 'Rafael Leão',
    from: 'AC Milan',
    to: 'Paris Saint-Germain',
    date: '2024-08-20',
    fee: '€90m',
    type: 'transfer',
    status: 'completed',
    description: 'PSG replaces Mbappé with Portuguese winger',
    age: 24,
    position: 'LW',
    marketValue: '€85m',
    source: 'L\'Équipe',
    verified: true,
    impact: 'high'
  },
  {
    player: 'Jude Bellingham',
    from: 'Borussia Dortmund',
    to: 'Real Madrid',
    date: '2023-07-01',
    fee: '€103m',
    type: 'transfer',
    status: 'completed',
    description: 'Record transfer for British player',
    age: 21,
    position: 'CM',
    marketValue: '€150m',
    source: 'Official',
    verified: true,
    impact: 'high'
  },
  {
    player: 'Lautaro Martínez',
    from: 'Inter Milan',
    to: 'Atlético Madrid',
    date: '2024-08-10',
    fee: '€85m',
    type: 'transfer',
    status: 'medical',
    description: 'Medical tests completed',
    age: 26,
    position: 'ST',
    marketValue: '€80m',
    source: 'Di Marzio',
    verified: true,
    impact: 'high'
  },
  {
    player: 'Alphonso Davies',
    from: 'Bayern Munich',
    to: 'Real Madrid',
    date: '2024-08-05',
    fee: '€50m',
    type: 'transfer',
    status: 'rumor',
    description: 'Contract talks ongoing',
    age: 23,
    position: 'LB',
    marketValue: '€60m',
    source: 'Marca',
    verified: false,
    impact: 'medium'
  },
  {
    player: 'Bruno Guimarães',
    from: 'Newcastle',
    to: 'Barcelona',
    date: '2024-08-25',
    fee: '€80m',
    type: 'transfer',
    status: 'rumor',
    description: 'Barcelona looking to strengthen midfield',
    age: 26,
    position: 'CDM',
    marketValue: '€75m',
    source: 'Sport',
    verified: false,
    impact: 'medium'
  },
  {
    player: 'Mohamed Salah',
    from: 'Liverpool',
    to: 'Al-Ittihad',
    date: '2024-07-15',
    fee: '€150m',
    type: 'transfer',
    status: 'rumor',
    description: 'Saudi club interested in Liverpool star',
    age: 32,
    position: 'RW',
    marketValue: '€65m',
    source: 'Sky Sports',
    verified: false,
    impact: 'high'
  },
  {
    player: 'Pedri',
    from: 'Barcelona',
    to: 'Manchester City',
    date: '2024-09-01',
    fee: '€100m',
    type: 'rumor',
    status: 'rumor',
    description: 'City interested in Spanish midfielder',
    age: 21,
    position: 'CM',
    marketValue: '€90m',
    source: 'Fabrizio Romano',
    verified: false,
    impact: 'medium'
  },
  {
    player: 'Ronald Araújo',
    from: 'Barcelona',
    to: 'Manchester United',
    date: '2024-08-30',
    fee: '€70m',
    type: 'transfer',
    status: 'rumor',
    description: 'United looking to strengthen defense',
    age: 25,
    position: 'CB',
    marketValue: '€65m',
    source: 'The Guardian',
    verified: false,
    impact: 'medium'
  },
  {
    player: 'Federico Valverde',
    from: 'Real Madrid',
    to: 'Liverpool',
    date: '2024-09-10',
    fee: '€90m',
    type: 'rumor',
    status: 'rumor',
    description: 'Liverpool interested in Uruguayan midfielder',
    age: 26,
    position: 'CM',
    marketValue: '€85m',
    source: 'ESPN',
    verified: false,
    impact: 'medium'
  }
];

// Additional utility function to get clean static transfers
export const getCleanStaticTransfers = (limit: number = 12): EnhancedTransferNews[] => {
  return getStaticFallbackTransfers()
    .map(transfer => ({
      ...transfer,
      // Ensure no "years" text in any field
      position: transfer.position || 'N/A',
      age: transfer.age || undefined,
      fee: transfer.fee || 'Unknown',
      source: transfer.source || 'Unknown Source'
    }))
    .slice(0, limit);
};

export default {
  fetchEnhancedTransferNews,
  getCleanStaticTransfers,
  getStaticFallbackTransfers
};