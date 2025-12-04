import { Groq } from 'groq-sdk';

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'GROQ_API_KEY not found in environment variables' 
      });
    }

    const groq = new Groq({ apiKey });
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Hello, say hi in Spanish' }],
      model: 'llama-3.3-70b-versatile', // CHANGED HERE
      temperature: 0.7,
      max_tokens: 100,
    });

    res.status(200).json({
      success: true,
      message: 'Groq API connection successful',
      response: completion.choices[0]?.message?.content,
      model: 'llama-3.3-70b-versatile',
      keyStatus: `Present (first 5 chars): ${apiKey.substring(0, 5)}...`
    });
    
  } catch (error: any) {
    console.error('Groq test error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || error,
      keyUsed: process.env.GROQ_API_KEY 
        ? `Present (first 5 chars): ${process.env.GROQ_API_KEY.substring(0, 5)}...`
        : 'Not found'
    });
  }
}