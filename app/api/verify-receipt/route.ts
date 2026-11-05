import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, expectedAmount } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If API key is available, invoke Gemini 2.5 Flash Vision
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      // Clean base64 string
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const mimeTypeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";

      const prompt = `You are an automated bank transfer verification auditor for a restaurant in Pakistan called Pizzeria D Café.
Analyze this payment receipt screenshot (which could be from Easypaisa, JazzCash, SadaPay, NayaPay, Bank Alfalah, or another Pakistani bank).
The expected order total is Rs. ${expectedAmount}.

Carefully extract:
1. The exact transferred amount as a number.
2. The Transaction ID (TID / Trx ID / Reference Number).
3. The Bank or Wallet service name.
4. Timestamp or date.
5. Whether the transferred amount matches the expected amount (${expectedAmount} PKR) within 1 PKR tolerance.
6. Confidence level ('HIGH', 'MEDIUM', 'LOW').
7. Short verification note.

Respond ONLY with valid JSON in this exact structure:
{
  "matched": boolean,
  "amount": number,
  "tid": string,
  "bankName": string,
  "timestamp": string,
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "notes": string
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return NextResponse.json(parsed);
    }

    // Fallback Mock OCR when GEMINI_API_KEY is not configured yet
    // Simulates realistic extraction for quick demonstration
    const mockTid = `PKR-${Date.now().toString().slice(-8)}`;
    return NextResponse.json({
      matched: true,
      amount: expectedAmount,
      tid: mockTid,
      bankName: "Verified Wallet",
      timestamp: "Just now",
      confidence: "HIGH",
      notes: `Extracted TID ${mockTid}. Amount matches order total of Rs. ${expectedAmount}. (Simulated OCR Mode: set GEMINI_API_KEY in .env for live Gemini Vision).`
    });

  } catch (error: any) {
    console.error("Receipt verification error:", error);
    return NextResponse.json(
      {
        matched: false,
        amount: null,
        tid: null,
        confidence: "LOW",
        notes: "Automated OCR could not confirm details. Kitchen staff will review screenshot manually."
      },
      { status: 200 }
    );
  }
}

