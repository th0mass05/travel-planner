import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextApiRequest, NextApiResponse } from 'next'; // 👈 Add this import
// Initialize the Gemini API with your Google AI Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { locations, city } = req.body;

  // Safety check: if no locations, don't waste an API call
  if (!locations || locations.length === 0) {
    return res.status(200).json({ tip: `Explore the hidden gems of ${city} at your own pace!` });
  }

  // 1. Construct the prompt
  const prompt = `
    You are an expert local travel guide for ${city}. 
    The user is visiting the following locations today: ${locations.join(", ")}.
    
    Provide ONE single, highly specific, practical "Pro-Tip" for their day.
    - It must be under 3 sentences.
    - Focus on logistics, crowds, hidden entrances, specific foods to try near these spots, or transit hacks.
    - Do NOT give generic advice like "wear comfortable shoes" or "have fun".
    - Do NOT use introductory phrases like "Here is a tip:". Just provide the tip text directly.
  `;

  try {
    // 2. Initialize the model (Flash is the fastest/cheapest/best for this)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. Generate Content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tip = response.text();
    
    res.status(200).json({ tip: tip.trim() });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate tip" });
  }
}