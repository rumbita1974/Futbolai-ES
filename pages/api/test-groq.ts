import type { NextApiRequest, NextApiResponse } from 'next';
import { Groq } from 'groq-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set' });
  }

  try {
    const groq = new Groq({ apiKey });
    
    // Simple test request
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say "Hello World"' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content || 'No response';
    
    res.status(200).json({
      success: true,
      message: 'Groq API is working',
      response: response,
      model: 'lama-3.3-70b-versatile'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        status: error.status,
        code: error.code,
        type: error.type
      }
    });
  }
}