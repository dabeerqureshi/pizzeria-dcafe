import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { MENU_ITEMS } from "@/lib/data/menu";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });

      const catalogSummary = MENU_ITEMS.map(i => ({
        id: i.id,
        name: i.name,
        price: i.basePrice,
        category: i.categoryId,
        badge: i.badge,
        spice: i.spiceLevel,
        variants: i.variants?.map(v => `${v.sizeName}: Rs. ${v.price}`).join(", ")
      }));

      const systemPrompt = `You are 'D-Chef', the virtual master culinary assistant at Pizzeria D Café (Lahore, Pakistan).
You speak fluently in English, Urdu, and conversational Roman Urdu (e.g. "Salam!", "Bohat zabardast choice hai!", "Meltzilla Monster try karein").
Always be enthusiastic, warm, hospitable, and helpful.

Here is our menu data:
${JSON.stringify(catalogSummary)}

Operational Rules:
- Minimum delivery order is Rs. 1,000.
- Delivery is Rs. 100, but automatically FREE if the order is Rs. 1,500+.
- Our phone hotline is 0308-4382003.

When the customer asks for recommendations (e.g. for families, spicy lovers, budget combos, or specific items):
1. Give a delightful, concise recommendation in English or Roman Urdu matching the user's style.
2. In 'suggestedItems', list 1 to 3 items that directly match your recommendation so the customer can 1-click add them to their cart.

Respond ONLY with valid JSON with this schema:
{
  "reply": string (your friendly conversational response),
  "suggestedItems": [
    {
      "id": string (must match menu item id),
      "name": string,
      "price": number,
      "sizeName": string (optional, e.g. "Medium" or "Large")
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nCustomer message: "${message}"` }],
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return NextResponse.json(parsed);
    }

    // High quality rule-based fallback when GEMINI_API_KEY is not yet configured in local environment
    const query = message.toLowerCase();
    
    if (query.includes("spicy") || query.includes("mirch") || query.includes("tez")) {
      return NextResponse.json({
        reply: "Agar aapko proper spicy khana pasand hai, toh hamara Chicago Dynamite Pizza ya Peri-Peri Hot pizza try karein! Saath mein Dynamite Wrap ya Pizza Fries zaroor add karein. 🌶️🔥",
        suggestedItems: [
          { id: "hs-chicago-dynamite", name: "Chicago Dynamite (Medium)", price: 1299, sizeName: "Medium (10\")" },
          { id: "wp-dynamite", name: "Dynamite Wrap", price: 649 },
        ]
      });
    }

    if (query.includes("deal") || query.includes("combo") || query.includes("3") || query.includes("4") || query.includes("family")) {
      return NextResponse.json({
        reply: "3 se 4 logon ke liye hamara ultimate recommendation hai Meltzilla Monster 10\" Triple Layer (Rs. 2,699)! Ya fir ek Large My Crust Crown Shape aur 2 Crispy Zinger Burgers le lein. Free delivery automatically unlock ho jayegi (Rs. 1,500+ par free)! 🍕👑",
        suggestedItems: [
          { id: "ec-meltzilla-monster", name: "Meltzilla Monster (Triple Layer)", price: 2699 },
          { id: "bg-classic-zinger", name: "Classic Zinger", price: 599 },
        ]
      });
    }

    if (query.includes("burger") || query.includes("zinger") || query.includes("fast food")) {
      return NextResponse.json({
        reply: "Hamare Fast Food mein Pizza Burger Max (brioche bun + double patty + pizza baked on top!) aur Mighty Zinger Combo bohot famous hain. Saath mein loaded Pizza Fries zaroor try karein!",
        suggestedItems: [
          { id: "bg-pizza-burger-max", name: "Pizza Burger Max", price: 899 },
          { id: "fr-pizza-fries", name: "Loaded Pizza Fries", price: 799 },
        ]
      });
    }

    // Default friendly answer
    return NextResponse.json({
      reply: "Salam! Main Pizzeria D Café ka D-Chef hoon. Aapko kis cheez ka mood hai? Hamare signature stuffed crust House Specials, Meltzilla Monster, ya juicy Zingers? Aap Roman Urdu ya English mein pooch sakte hain!",
      suggestedItems: [
        { id: "hs-my-crust", name: "My Crust (Crown Shape)", price: 1299, sizeName: "Medium (10\")" },
        { id: "bg-mighty-zinger-combo", name: "Mighty Zinger Combo", price: 950 },
      ]
    });

  } catch (error: any) {
    console.error("D-Chef error:", error);
    return NextResponse.json({
      reply: "Salam! Main aapki help ke liye hazir hoon. Hamare House Specials aur Meltzilla Monster bohot popular hain!",
      suggestedItems: [
        { id: "ec-meltzilla-monster", name: "Meltzilla Monster", price: 2699 }
      ]
    });
  }
}

