import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialise Gemini client using API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Handle POST requests to generate travel tips
export async function POST(req: Request) {
  try {
    // Extract request payload
    const { locations, city, previousTips } = await req.json();

    // Fallback response if no locations are provided
    if (!locations || locations.length === 0) {
      return NextResponse.json({ tip: `Explore the hidden gems of ${city} at your own pace!` });
    }

    let historyContext = "";
    
    // Build context to prevent repetition of previously generated tips
    if (Array.isArray(previousTips) && previousTips.length > 0) {
      historyContext = `
      CRITICAL INSTRUCTION: Do NOT repeat, rephrase, or give advice similar to ANY of these previously given tips:
      ${previousTips.map((t: string) => `- "${t}"`).join("\n")}
      `;
    }

    // Construct prompt with strict formatting and content constraints
    const prompt = `
      You are an expert local travel guide for ${city}. 
      The user is visiting: ${locations.join(", ")}.
      
      Provide EXACTLY 2 highly specific, practical "Pro-Tips" for their day.
      
      STRICT FORMATTING RULES:
      1. NO introductory or concluding text (Do not say "Here are your tips").
      2. Start immediately with the first bullet point.
      3. Keep each tip punchy and strictly under 2 sentences.
      4. Do NOT use asterisks (*) or markdown formatting.
      5. Format exactly like this:
         • [Short Title]: [Brief tip text]
         • [Short Title]: [Brief tip text]

      ${historyContext}
    `;

    // Configure Gemini model
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );

    // Generate response from model
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tip = response.text();
    
    // Return cleaned response
    return NextResponse.json({ tip: tip.trim() });
    
  } catch (error: any) {
    // Log detailed error for debugging
    console.error("Gemini API Error Detail:", error);
    
    // Return fallback tip on failure
    return NextResponse.json({ 
      tip: "Pro tip: Ask a local for their favorite hidden spot near your current location!" 
    }, { status: 500 }); 
  }
}