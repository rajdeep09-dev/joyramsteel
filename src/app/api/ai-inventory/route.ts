import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(req: Request) {
  try {
    console.log("AI Route: Starting Raw Fetch Mode");
    const { text, images } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 1. Prepare the prompt
    const prompt = `Analyze these product photos. Extract inventory details strictly as a JSON object:
    {
      "productName": "string",
      "category": "string",
      "quantity": number,
      "mrp": number,
      "msp": number
    }
    User instruction: ${text}`;

    // 2. Format images for the raw API
    const parts = [
      { text: prompt }
    ];

    images.forEach((base64Str: string) => {
      const data = base64Str.split(",")[1];
      const mimeType = base64Str.split(",")[0].match(/:(.*?);/)?.[1] || "image/jpeg";
      parts.push({
        // @ts-ignore
        inline_data: {
          mime_type: mimeType,
          data: data
        }
      });
    });

    // 3. Call Google API directly (Avoids SDK WASM crashes on Android)
    console.log("AI Route: Calling Google API directly...");
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google API Error:", errorData);
      return NextResponse.json({ error: "Google AI rejected the request." }, { status: 500 });
    }

    const result = await response.json();
    let aiText = result.candidates[0].content.parts[0].text;
    console.log("AI Route: Raw response:", aiText);

    // Manual JSON cleaning
    if (aiText.includes("```json")) {
      aiText = aiText.split("```json")[1].split("```")[0].trim();
    } else if (aiText.includes("```")) {
      aiText = aiText.split("```")[1].split("```")[0].trim();
    }

    const extractedData = JSON.parse(aiText);
    const { productName, quantity } = extractedData;

    // --- Optional Cloud Sync (Supabase) ---
    let imageUrl = "";
    try {
      const base64Data = images[0].split(",")[1];
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${Date.now()}-ai.jpg`;
      const { data: uploadData } = await supabaseAdmin.storage
        .from('product-images')
        .upload(`ai/${fileName}`, buffer, { contentType: 'image/jpeg' });
      
      if (uploadData) {
        const { data: pUrl } = supabaseAdmin.storage.from('product-images').getPublicUrl(`ai/${fileName}`);
        imageUrl = pUrl.publicUrl;
      }
    } catch (e) {
      console.warn("Supabase storage skipped");
    }

    return NextResponse.json({ 
      message: `Updated! Added ${quantity} units of "${productName}".`,
      data: { ...extractedData, imageUrl }
    });

  } catch (error: any) {
    console.error("AI Route Final Error:", error);
    return NextResponse.json({ error: "AI Processing failed. Please try a smaller image." }, { status: 500 });
  }
}
