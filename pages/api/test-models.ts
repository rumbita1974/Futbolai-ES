import type { NextApiRequest, NextApiResponse } from 'next';
import { Groq } from 'groq-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'GROQ_API_KEY not found' 
    });
  }
  
  const groq = new Groq({ apiKey: GROQ_API_KEY });
  
  // Try different models
  const modelsToTest = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama-3.2-3b-preview',
    'llama-3.2-90b-vision-preview',
    'llama-guard-3-8b',
    'gemma2-9b-it',
    'llama-3.3-70b-versatile', // Old one - should fail
  ];
  
  const results = [];
  
  for (const model of modelsToTest) {
    try {
      const startTime = Date.now();
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Say 'Hello'" }],
        model: model,
        max_tokens: 5,
      });
      const endTime = Date.now();
      
      results.push({
        model,
        success: true,
        response: completion.choices[0]?.message?.content || 'No response',
        time: `${endTime - startTime}ms`
      });
      
      // Break after first success to save time
      break;
    } catch (error: any) {
      results.push({
        model,
        success: false,
        error: error.message,
        code: error.code
      });
    }
  }
  
  return res.status(200).json({
    success: results.some(r => r.success),
    results,
    keyExists: !!GROQ_API_KEY
  });
}