import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  console.log("Checking API Key:", process.env.GEMINI_API_KEY ? "KEY EXISTS" : "KEY IS MISSING");
  try {
    // In the App Router, we parse the body using await req.json()
    const body = await req.json();
    const { locations, city } = body;

    // Safety check
    if (!locations || locations.length === 0) {
      return NextResponse.json({ tip: `Explore the hidden gems of ${city} at your own pace!` });
    }

    const prompt = `
      You are an expert local travel guide for ${city}. 
      The user is visiting: ${locations.join(", ")}.
      Provide ONE single, highly specific, practical "Pro-Tip" for their day under 3 sentences.
    `;

    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tip = response.text();
    
    // Return the response using NextResponse
    return NextResponse.json({ tip: tip.trim() });
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to generate tip" }, { status: 500 });
  }
}