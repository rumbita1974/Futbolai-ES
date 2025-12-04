import { Groq } from 'groq-sdk';

export default async function handler(req: any, res: any) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        message: 'GROQ_API_KEY not found',
        suggestion: 'Add it in Vercel environment variables'
      });
    }

    const groq = new Groq({ apiKey });
    
    // List of currently available models (as of Dec 2024)
    const availableModels = [
      'llama-3.3-70b-versatile',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'mixtral-8x7b-32768', // Deprecated but listed for reference
      'gemma2-9b-it',
      'llama-guard-3-8b'
    ];

    // Test the first available model
    const testModel = 'llama-3.3-70b-versatile';
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'List 3 popular football players' }],
      model: testModel,
      temperature: 0.3,
      max_tokens: 50,
    });

    res.status(200).json({
      success: true,
      message: 'Groq models test successful',
      availableModels: availableModels,
      recommended: 'llama-3.3-70b-versatile',
      testResult: {
        model: testModel,
        response: completion.choices[0]?.message?.content,
        tokensUsed: completion.usage?.total_tokens
      },
      environment: {
        apiKeyPresent: !!apiKey,
        keyPreview: `${apiKey.substring(0, 5)}...`
      }
    });
    
  } catch (error: any) {
    console.error('Models test error:', error);
    
    res.status(200).json({
      success: false,
      error: error.message,
      details: error.response?.data || error,
      suggestion: 'Check if GROQ_API_KEY is valid and has access to models',
      currentModels: [
        'llama-3.3-70b-versatile',
        'llama3-70b-8192',
        'llama3-8b-8192'
      ]
    });
  }
}