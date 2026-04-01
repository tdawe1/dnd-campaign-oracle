
import { SessionAnalysisResult } from "../types";

// Helper to get API URL (respects the Vite proxy/env)
const getApiUrl = (path: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  // If baseUrl is empty, it means we use relative path (proxy)
  // If invalid URL, handle gracefully?
  if (!baseUrl) return path;
  return `${baseUrl}${path}`;
};

// Internal auth header helper
// Note: client.ts handles credentials: 'include', so cookies should work. 
// If we use fetch directly, we need to ensure credentials are sent.
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  // For single tunnel setup, credentials: 'include' is key.
  const res = await fetch(getApiUrl(url), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
};

// Helper for streaming JSON responses (buffers chunks until done)
const streamJson = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(getApiUrl(url), {
    ...options,
    credentials: 'include', // Ensure cookies are sent
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} ${text}`);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalJson: T | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: done')) {
          // Next line should be data
          continue;
        }
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.fullText) {
              // We found our final payload
              try {
                finalJson = JSON.parse(data.fullText) as T;
              } catch (e) {
                console.warn("Retrieved fullText is not valid JSON", data.fullText);
              }
            }
          } catch (e) {
            // Ignore parse errors for intermediate chunks or keep-alives
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalJson) {
    throw new Error("Stream completed but no valid JSON response was received.");
  }

  return finalJson;
};

export const GeminiService = {
  /**
   * Transcribes audio and generates structured session data.
   */
  async processSessionAudio(
    audioBase64: string,
    mimeType: string,
    customInstructions: string,
    isDemo: boolean = false
  ): Promise<SessionAnalysisResult> {
    if (isDemo) {
      return new Promise(resolve => setTimeout(() => resolve({
        title: "Demo Session: The Lost Mine",
        location: "Phandalin",
        journalEntry: "This is a demo session generated without AI. In a real session, Gemini would analyze the audio to create a detailed journal entry.",
        combat: [{ name: "Goblin Ambush", result: "Victory" }],
        loot: [{ name: "Potion of Healing", effect: "Restores 2d4+2 HP" }]
      }), 1500));
    }

    try {
      return await streamJson<SessionAnalysisResult>('/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          type: 'audio',
          data: audioBase64,
          mimeType,
          instructions: customInstructions
        })
      });
    } catch (error) {
      console.error("Gemini Audio Analysis Error:", error);
      throw error;
    }
  },

  /**
   * Analyzes a text transcript to generate structured session data.
   */
  async analyzeTranscript(
    transcript: string,
    options: {
      extractCombat?: boolean;
      extractLoot?: boolean;
      detectNPCs?: boolean;
      keyMoments?: boolean;
      summaryLength?: 'brief' | 'standard' | 'detailed';
      focusAreas?: string;
    } = {},
    isDemo: boolean = false
  ): Promise<SessionAnalysisResult> {
    if (isDemo) {
      return new Promise(resolve => setTimeout(() => resolve({
        title: "Demo Transcript Analysis",
        location: "Demo Dungeon",
        journalEntry: "This is a demo analysis. The AI features are disabled in demo mode.",
        combat: [],
        loot: []
      }), 1000));
    }

    // Build dynamic instructions based on options
    const {
      extractCombat = true,
      extractLoot = true,
      detectNPCs = true,
      keyMoments = true,
      summaryLength = 'standard',
      focusAreas = ''
    } = options;

    const parts: string[] = [];
    if (extractCombat) parts.push('Extract all combat encounters with names and outcomes');
    if (extractLoot) parts.push('List all loot and rewards obtained');
    if (detectNPCs) parts.push('Identify key NPCs and their roles');
    if (keyMoments) parts.push('Highlight important story moments and decisions');

    const lengthGuide = summaryLength === 'brief'
      ? 'Keep the journal entry concise (2-3 paragraphs)'
      : summaryLength === 'detailed'
        ? 'Write a comprehensive journal entry covering all events in detail'
        : 'Write a balanced journal entry covering main events';

    let instructions = `Analyze this D&D session transcript. ${parts.join('. ')}. ${lengthGuide}.`;
    if (focusAreas) {
      instructions += ` Additional focus: ${focusAreas}`;
    }

    try {
      return await streamJson<SessionAnalysisResult>('/api/llm/analyze', {
        method: 'POST',
        body: JSON.stringify({
          type: 'transcript',
          data: transcript,
          instructions
        })
      });
    } catch (error) {
      console.error("Gemini Transcript Analysis Error:", error);
      throw error;
    }
  },

  /**
   * Chat with the Oracle (Campaign Assistant).
   */
  async chatWithOracle(
    history: { role: 'user' | 'model', text: string }[],
    newMessage: string,
    contextData: string,
    isDemo: boolean = false
  ): Promise<string> {
    if (isDemo) {
      return new Promise(resolve => setTimeout(() => resolve(
        "I am the Oracle, but my vision is clouded in this demo realm. Sign in to unlock my full foresight."
      ), 800));
    }

    try {
      // Map history to server format
      // Server expects: { role: "user" | "assistant", content: string }
      // Client uses: { role: "user" | "model", text: string }
      const messages = history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.text
      }));

      // Add new message
      messages.push({ role: 'user', content: newMessage });

      const response = await authenticatedFetch('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify({
          model: 'gemini/gemini-1.5-flash', // Specify provider explicitly
          messages,
          stream: false, // Use non-streaming for now to match interface
          campaignContext: contextData
        })
      });

      // Response format from server for non-streaming:
      // { choices: [{ message: { content: "..." } }] }
      return response?.choices?.[0]?.message?.content || "The mists obscure my vision...";

    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "The Oracle is currently unreachable.";
    }
  }
};
