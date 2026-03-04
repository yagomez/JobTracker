import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set on the server.' },
        { status: 500 },
      );
    }

    const { filters, stats } = body;

    const systemPrompt =
      "You are an assistant that analyzes a person's job application history and provides concise, practical insights. " +
      'You are given structured statistics: applications over time, by status, by company, and by role. ' +
      'When rejectionStats is present, use it: totalRejected, bySource (email / ai_generated / portal / other / unknown), dateRejectedCounts. ' +
      'Interpret how they learn about rejections (e.g. more AI-generated rejections may suggest automating feedback; email vs portal can inform where to check). ' +
      'When ghostPostStats is present (count > 0): these are roles they were rejected from but the posting still shows as active—common in the current market (ghost posts). ' +
      'Use ghostPostStats.jobs (company, position, daysSinceRejection, daysSinceApplication) to suggest re-checking postings or being cautious with similar listings. ' +
      'When trendsSummary is present, use current vs previous period (applicationDelta, rejectionDelta) to comment on momentum and pacing. ' +
      'Identify patterns, strengths, and potential issues, and suggest specific next steps. ' +
      'Keep the tone encouraging but realistic. Avoid restating raw numbers; interpret them.';

    const userMessage = {
      role: 'user' as const,
      content:
        'Here is my current job application data and filters as JSON. ' +
        'Please provide: (1) a short summary, (2) key patterns you notice, and (3) 3–5 concrete recommendations ' +
        'for how I should adjust my job search strategy.\n\n' +
        JSON.stringify(
          {
            filters,
            stats,
          },
          null,
          2,
        ),
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          userMessage,
        ],
        temperature: 0.4,
      } as any),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json(
        { error: `Failed to generate insights from AI: ${errorText}` },
        { status: 500 },
      );
    }

    const json = await response.json();
    const text =
      json.choices?.[0]?.message?.content ??
      'Unable to generate insights at the moment.';

    return NextResponse.json({ insights: text });
  } catch (error) {
    console.error('AI insights error:', error);
    return NextResponse.json(
      { error: 'Unexpected error while generating insights.' },
      { status: 500 },
    );
  }
}

