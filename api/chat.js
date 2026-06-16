
// api/chat.js
// ============================================================
// GROQ VERSION REPLACED WITH GOOGLE GEMINI
//
// Gemini is Google's free AI API — no credit card needed.
//
// HOW TO GET YOUR GEMINI API KEY:
// 1. Go to aistudio.google.com
// 2. Sign in with your Google account
// 3. Click "Get API key" → "Create API key"
// 4. Copy the key
// 5. Add it to Vercel: Settings → Environment Variables
//    Name:  GEMINI_API_KEY
//    Value: your key
//
// This file lives at: api/chat.js in your GitHub repo
// Vercel turns it into: https://your-site.vercel.app/api/chat
// ============================================================

export default async function handler(req, res) {

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    /*
      Gemini has a different API format to both Anthropic and Groq.
      Key differences:
        - URL includes your API key as a query parameter (not in headers)
        - Messages are called "contents" not "messages"
        - Each message has "parts" instead of "content"
        - System prompt is a separate "systemInstruction" field
        - Role "assistant" is called "model" in Gemini
      
      We handle all of this here so index.html doesn't need to change at all.
    */

    // Convert Anthropic-style messages to Gemini format
    // Anthropic: { role: "user", content: "hello" }
    // Gemini:    { role: "user", parts: [{ text: "hello" }] }
    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      // Gemini calls the assistant "model" instead of "assistant"
      parts: [{ text: m.content }]
    }));

    const geminiBody = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7   // 0 = very precise, 1 = more creative. 0.7 is a good balance.
      }
    };

    // Add system instruction if provided
    if (system) {
      geminiBody.systemInstruction = {
        parts: [{ text: system }]
      };
    }

    /*
      Gemini's API URL includes the model name and your API key.
      We use gemini-1.5-flash — Google's fastest free model.
      gemini-1.5-pro is more powerful but has lower free rate limits.
    */
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return res.status(response.status).json({ error: 'Gemini API error', details: errorData });
    }

    const data = await response.json();

    /*
      Gemini returns:
        data.candidates[0].content.parts[0].text

      We reformat this to match Anthropic's format:
        { content: [{ type: 'text', text: '...' }] }

      This means index.html doesn't need any changes — it reads
      data.content[0].text the same way it always has.
    */
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';

    const reformatted = {
      content: [{ type: 'text', text }]
    };

    return res.status(200).json(reformatted);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Failed to contact AI — check your GEMINI_API_KEY in Vercel environment variables'
    });
  }
}
