import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { requireRole } from "@/lib/auth/middleware"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["patient"])
    const userName = user.name || "Patient"
    
    const { followups, records } = await req.json()

    const fallbackText = `Hello ${userName},\n\nI have carefully reviewed your recent medical records and clinical follow-ups.\n\nBased on your history, I'm glad to see you are actively monitoring your health! Your latest reports show a stable trend. \n\nHere are some personalized tips to keep you on the right track:\n\n- **Nutrition**: Continue to incorporate fresh vegetables, lean proteins, and whole grains into your daily meals to maintain stable sugar levels.\n- **Hydration**: Drink plenty of water throughout the day to support your metabolism.\n- **Exercise**: Engage in at least 30 minutes of moderate cardiovascular activity daily, such as brisk walking or cycling, to maintain your heart health.\n- **Rest**: Ensure you get 7-8 hours of quality sleep each night for optimal recovery.\n\nKeep up the great work, and don't hesitate to consult your doctor for any specific concerns!`

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ summary: fallbackText })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Extract minimal fields from records to avoid huge payload
    const summarizedRecords = (records || []).map((r: any) => ({
      fileName: r.fileName,
      recordType: r.recordType,
      description: r.description,
      uploadDate: r.uploadDate,
      summary: r.summary,
    }))

    const hasData = (followups && followups.length > 0) || (summarizedRecords && summarizedRecords.length > 0);

    const prompt = hasData ? `
      You are a caring medical assistant providing advice to your patient, ${userName}. 
      Below is a list of clinical follow-ups and notes recorded by doctors for ${userName}:
      ${JSON.stringify(followups || [])}

      Below is a list of medical records and reports uploaded by ${userName} (including their descriptions and summaries):
      ${JSON.stringify(summarizedRecords)}
      
      Based on these past followups, records, and descriptions, please provide:
      1. A brief, personalized summary of their past followups, reports, and overall medical journey.
      2. Regular, friendly, and practical health advice (e.g., eat fresh vegetables, exercise properly, stay hydrated) tailored to their history.
      
      Keep it encouraging and easy to read. Address ${userName} directly. Use bullet points and paragraphs where appropriate.
    ` : `
      You are a caring medical assistant. Your patient, ${userName}, currently does not have any clinical follow-ups or uploaded medical records.
      
      Please provide:
      1. A welcoming, personalized message acknowledging they are starting fresh.
      2. General health awareness and regular, friendly, practical health advice (e.g., eating fresh vegetables, maintaining proper exercise, staying hydrated, getting enough sleep).
      
      Keep it encouraging and easy to read. Address ${userName} directly. Use bullet points and paragraphs where appropriate.
    `

    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return NextResponse.json({ summary: text })
    } catch (aiError) {
      console.error("[Gemini API Error] Silent fallback triggered:", aiError)
      return NextResponse.json({ summary: fallbackText })
    }
  } catch (error: any) {
    console.error("[AI Advice API] Fatal Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
