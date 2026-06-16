// api/chat.js
// ============================================================
// WHAT IS THIS FILE?
// This is a Vercel "serverless function" — a tiny piece of code
// that runs on Vercel's servers, not in the user's browser.
//
// WHY DO WE NEED IT?
// Browsers block direct calls to the Anthropic API (for security).
// So instead of: Browser → Anthropic (blocked)
// We do:         Browser → This function → Anthropic (works!)
//
// Your API key lives here as an environment variable — never
// visible to anyone looking at your website's source code.
//
// WHERE DOES THIS FILE LIVE IN YOUR REPO?
// It must be at: api/chat.js  (inside a folder called "api")
// Vercel automatically turns any file in /api into a URL endpoint.
// So this becomes: https://your-site.vercel.app/api/chat
// ============================================================

export default async function handler(req, res) {

  // Only allow POST requests — this is an API endpoint, not a webpage
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Pull the messages and system prompt out of the request body
  // These come from your index.html's fetch('/api/chat', ...) call
  const { messages, system } = req.body;

  // Basic validation — don't proceed if there's nothing to send
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  try {
    /*
      process.env.ANTHROPIC_API_KEY reads from Vercel's environment variables.
      You set this in: Vercel → your project → Settings → Environment Variables
      It never appears in your code or in the browser — it's a secret on the server.
    */
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system || '',
        messages: messages
      })
    });

    // If Anthropic returned an error, pass it through
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ error: 'Anthropic API error', details: errorData });
    }

    // Forward the successful response back to the browser
    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Failed to contact AI — check your API key in Vercel environment variables' });
  }
}
