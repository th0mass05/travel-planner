import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 👇 Extract previousTips from the body
    const { locations, city, previousTips } = await req.json();

    if (!locations || locations.length === 0) {
      return NextResponse.json({ tip: `Explore the hidden gems of ${city} at your own pace!` });
    }

    // 👇 Build a strict "Do Not Repeat" rule if there is history
    let historyContext = "";
    if (previousTips && previousTips.length > 0) {
      historyContext = `
      CRITICAL INSTRUCTION: Do NOT repeat, rephrase, or give advice similar to ANY of these previously given tips:
      ${previousTips.map((t: string) => `- "${t}"`).join("\n")}
      `;
    }

    // 👇 Inject the history into the prompt
    const prompt = `
      You are an expert local travel guide for ${city}. 
      The user is visiting: ${locations.join(", ")}.
      
      Provide ONE single, highly specific, practical "Pro-Tip" for their day under 3 sentences.
      ${historyContext}
    `;

    const model = genAI.getGenerativeModel(
      { model: "gemini-2.0-flash" }, 
      { apiVersion: "v1" } 
    );

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tip = response.text();
    
    return NextResponse.json({ tip: tip.trim() });
    
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    return NextResponse.json({ 
      tip: "Pro tip: Ask a local for their favorite hidden spot near your current location!" 
    });
  }
}