import type { NextApiRequest, NextApiResponse } from 'next';
import { Groq } from 'groq-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    return res.status(500).json({ 
      success: false, 
      error: 'GROQ_API_KEY not found in environment variables' 
    });
  }
  
  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Say 'Hello World' in one word." }],
      model: "mixtral-8x7b-32768",
      max_tokens: 5,
    });
    
    const response = completion.choices[0]?.message?.content || 'No response';
    
    return res.status(200).json({
      success: true,
      message: 'Groq API is working!',
      response,
      keyStatus: 'Valid (first 10 chars): ' + GROQ_API_KEY.substring(0, 10) + '...'
    });
    
  } catch (error: any) {
    console.error('Groq Test Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      details: {
        status: error.status,
        code: error.code,
        type: error.type
      },
      keyUsed: GROQ_API_KEY ? 'Present (first 5 chars): ' + GROQ_API_KEY.substring(0, 5) + '...' : 'Missing'
    });
  }
}