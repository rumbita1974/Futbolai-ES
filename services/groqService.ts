import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export interface Team {
  name: string;
  fifaCode: string;
  flagEmoji: string;
  qualified: boolean;
  previousAppearances?: number;
  bestResult?: string;
  group: string;
}

export interface Group {
  name: string;
  teams: Team[];
}

export interface Match {
  date: string;
  stage: string;
  group?: string;
  team1: string;
  team2: string;
  venue: string;
  city: string;
  country: string;
  status: 'scheduled' | 'completed' | 'live';
  score?: string;
}

export interface WorldCupData {
  groups: Group[];
  matches: Match[];
  lastUpdated: string;
  source: string;
}

export class GroqService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 3600000; // 1 hour

  async getWorldCupData(): Promise<WorldCupData> {
    const cacheKey = 'worldcup-2026-data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await axios.post(
        GROQ_API_ENDPOINT,
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a football expert providing accurate 2026 FIFA World Cup information from Wikipedia.
              ALWAYS return valid JSON with this exact structure:
              {
                "groups": [
                  {
                    "name": "Group A",
                    "teams": [
                      {
                        "name": "United States",
                        "fifaCode": "USA",
                        "flagEmoji": "🇺🇸",
                        "qualified": true,
                        "previousAppearances": 11,
                        "bestResult": "Third place (1930)",
                        "group": "Group A"
                      }
                    ]
                  }
                ],
                "matches": [
                  {
                    "date": "2026-06-11",
                    "stage": "Group Stage",
                    "group": "Group A",
                    "team1": "United States",
                    "team2": "Canada",
                    "venue": "MetLife Stadium",
                    "city": "New York/New Jersey",
                    "country": "USA",
                    "status": "scheduled"
                  }
                ]
              }
              
              IMPORTANT: For 2026 World Cup, use 12 groups (A-L) with 4 teams each.
              Include host countries: USA, Canada, Mexico as qualified.
              For teams not yet qualified, use qualified: false.
              Current date: ${new Date().toISOString().split('T')[0]}`
            },
            {
              role: 'user',
              content: 'Provide current 2026 FIFA World Cup groups and match schedule from Wikipedia as valid JSON'
            }
          ],
          temperature: 0.1,
          max_tokens: 8000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const data = response.data.choices[0].message.content;
      const parsedData = JSON.parse(data);
      
      const result: WorldCupData = {
        groups: parsedData.groups || [],
        matches: parsedData.matches || [],
        lastUpdated: new Date().toISOString(),
        source: 'Wikipedia via GROQ AI'
      };
      
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
      
    } catch (error: any) {
      console.error('GROQ API Error:', error);
      return this.getFallbackData();
    }
  }

  async getTeamInfo(teamName: string): Promise<any> {
    try {
      const response = await axios.post(
        GROQ_API_ENDPOINT,
        {
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a football expert providing accurate team information from Wikipedia. Return valid JSON.'
            },
            {
              role: 'user',
              content: `Provide information about ${teamName} national football team for 2026 World Cup, including qualification status, squad, manager, and FIFA code. Return as JSON.`
            }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('Error fetching team info:', error);
      return null;
    }
  }

  private getFallbackData(): WorldCupData {
    // Minimal fallback data for host countries
    return {
      groups: [
        {
          name: 'Group A',
          teams: [
            { name: 'United States', fifaCode: 'USA', flagEmoji: '🇺🇸', qualified: true, group: 'Group A', previousAppearances: 11 },
            { name: 'Canada', fifaCode: 'CAN', flagEmoji: '🇨🇦', qualified: true, group: 'Group A', previousAppearances: 2 },
            { name: 'Mexico', fifaCode: 'MEX', flagEmoji: '🇲🇽', qualified: true, group: 'Group A', previousAppearances: 17 },
            { name: 'TBD', fifaCode: 'TBD', flagEmoji: '🏳️', qualified: false, group: 'Group A' }
          ]
        },
        {
          name: 'Group B',
          teams: [
            { name: 'TBD', fifaCode: 'TBD', flagEmoji: '🏳️', qualified: false, group: 'Group B' },
            { name: 'TBD', fifaCode: 'TBD', flagEmoji: '🏳️', qualified: false, group: 'Group B' },
            { name: 'TBD', fifaCode: 'TBD', flagEmoji: '🏳️', qualified: false, group: 'Group B' },
            { name: 'TBD', fifaCode: 'TBD', flagEmoji: '🏳️', qualified: false, group: 'Group B' }
          ]
        }
      ],
      matches: [],
      lastUpdated: new Date().toISOString(),
      source: 'Fallback Data (GROQ API unavailable)'
    };
  }
}

export const groqService = new GroqService();