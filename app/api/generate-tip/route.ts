import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { locations, city, previousTips } = await req.json();

    if (!locations || locations.length === 0) {
      return NextResponse.json({ tip: `Explore the hidden gems of ${city} at your own pace!` });
    }

    let historyContext = "";
    
    // ⭐ SAFETY FIX: Ensure previousTips is actually an Array before trying to map it
    if (Array.isArray(previousTips) && previousTips.length > 0) {
      historyContext = `
      CRITICAL INSTRUCTION: Do NOT repeat, rephrase, or give advice similar to ANY of these previously given tips:
      ${previousTips.map((t: string) => `- "${t}"`).join("\n")}
      `;
    }

    // ⭐ PROMPT ADJUSTMENT: If you want multiple tips, it's best to ask Gemini 
    // to format them clearly, otherwise it will output a giant wall of text.
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

    // Using 1.5-flash as it is the most robust/stable for the free tier right now
    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tip = response.text();
    
    return NextResponse.json({ tip: tip.trim() });
    
  } catch (error: any) {
    // This will print the EXACT reason it failed in your terminal (e.g. rate limit, safety block)
    console.error("Gemini API Error Detail:", error);
    
    return NextResponse.json({ 
      tip: "Pro tip: Ask a local for their favorite hidden spot near your current location!" 
    }, { status: 500 }); // ⭐ SAFETY FIX: Added Status 500 so the frontend knows this is an error!
  }
}