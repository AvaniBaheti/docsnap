// Fixed version with proper rate limiting and error handling
import { NextRequest, NextResponse } from 'next/server';

// Retry function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
        
        console.log(`Rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Request failed. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
  try {
    const { endpoint, method, requestBody, responseData } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const prompt = `Generate a comprehensive description for this API endpoint:

Endpoint: ${method} ${endpoint}
Request Body: ${JSON.stringify(requestBody, null, 2)}
Response Data: ${JSON.stringify(responseData, null, 2)}

Please provide:
1. A brief overview of what this API endpoint does
2. Key functionality and purpose
3. Important request parameters and their meanings
4. Response structure explanation
5. Common use cases

Keep the description professional, clear, and concise (around 200-300 words).`;

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a technical writer specializing in API documentation. Generate clear, professional descriptions for API endpoints.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content || 'Unable to generate description';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Error generating description:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('Rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to generate description. Please try again.' },
      { status: 500 }
    );
  }
}