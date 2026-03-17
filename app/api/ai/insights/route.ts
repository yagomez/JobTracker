import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from '@huggingface/inference';

export const runtime = 'nodejs';

/** Default: free instruction-tuned model. Override with HF_MODEL in .env.
 * Other models you can try (set HF_MODEL=... in .env.local):
 * - Qwen/Qwen2.5-7B-Instruct-1M — long context, good for large stats payloads
 * - mistralai/Mistral-7B-Instruct-v0.2 — fast, strong quality
 * - meta-llama/Llama-3.2-3B-Instruct — smaller, quicker responses
 * - google/gemma-2-9b-it — good instruction following
 * - Microsoft/Phi-3-mini-4k-instruct — compact, low latency
 * Browse more: https://huggingface.co/models?pipeline_tag=conversational&sort=trending
 */
const DEFAULT_HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

/** Curated news and policy links for the current year only. All related-reading links are from this year. */
const RELATED_NEWS: Array<{ title: string; url: string; description: string; year: number }> = [
  {
    title: 'US SEC preparing to eliminate quarterly reporting requirement (WSJ)',
    url: 'https://www.reuters.com/business/finance/us-sec-preparing-eliminate-quarterly-reporting-requirement-wsj-says-2026-03-16/',
    description: 'If companies report only twice a year instead of quarterly, job postings and hiring disclosure can be less transparent and loosely regulated.',
    year: 2026,
  },
  {
    title: 'The US economy lost 92,000 jobs in February and the unemployment rate rose to 4.4%',
    url: 'https://us.cnn.com/2026/03/06/economy/us-jobs-report-february',
    description: 'CNN: US jobs report February 2026; job market, employment, unemployment; job seekers.',
    year: 2026,
  },
  {
    title: 'A surprising loss of 92,000 jobs last month complicates the economic picture in the US',
    url: 'https://apnews.com/article/jobs-unemployment-economy-inflation-trump-tariffs-075a0d33e0794b7c93b9b8a7302dab98',
    description: 'AP News: US jobs, unemployment, economy; job market; job seekers.',
    year: 2026,
  },
  {
    title: 'February 2026 jobs report',
    url: 'https://www.cnbc.com/2026/03/06/february-2026-jobs-report.html',
    description: 'CNBC: February 2026 jobs report; US job market, employment.',
    year: 2026,
  },
  {
    title: 'Employment Situation Summary - 2026 M02 Results',
    url: 'https://www.bls.gov/news.release/empsit.nr0.htm',
    description: 'BLS official employment situation for February 2026; job market data.',
    year: 2026,
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = process.env.HUGGINGFACE_HUB_TOKEN ?? process.env.HF_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            'HUGGINGFACE_HUB_TOKEN (or HF_TOKEN) is not set. Create a free token at https://huggingface.co/settings/tokens',
        },
        { status: 500 },
      );
    }

    const { filters, stats } = body;
    const model = process.env.HF_MODEL ?? DEFAULT_HF_MODEL;

    const laborMarketContext =
      'Labor market context (use this to qualify your advice): ' +
      'U.S. job openings and employment data have seen reporting delays and revised estimates; official figures are not always updated promptly, and some researchers and reports suggest job openings or net employment may be lower than previously reported. ' +
      'Rejection rates and hiring outcomes can reflect these broader conditions—fewer real openings, ghost job postings, industry layoffs, and data lag—not only application quality. ' +
      'When giving recommendations, briefly acknowledge this macro context where relevant (e.g. "in a tight market with fewer openings…" or "given current labor market conditions…") so the user does not assume rejections are solely due to resume or cover letter quality.';

    const systemPrompt =
      "You are an assistant that analyzes a person's job application history and provides concise, practical insights. " +
      'You are given structured statistics: applications over time, by status, by company, and by role. ' +
      'When rejectionStats is present, use it: totalRejected, bySource (email / ai_generated / portal / other / unknown), dateRejectedCounts. ' +
      'Interpret how they learn about rejections (e.g. more AI-generated rejections may suggest automating feedback; email vs portal can inform where to check). ' +
      'When ghostPostStats is present (count > 0): these are roles they were rejected from but the posting still shows as active—common in the current market (ghost posts). ' +
      'Use ghostPostStats.jobs (company, position, daysSinceRejection, daysSinceApplication) to suggest re-checking postings or being cautious with similar listings. ' +
      'When trendsSummary is present, use current vs previous period (applicationDelta, rejectionDelta) to comment on momentum and pacing. ' +
      'Identify patterns, strengths, and potential issues, and suggest specific next steps. ' +
      'Keep the tone encouraging but realistic. Avoid restating raw numbers; interpret them. ' +
      laborMarketContext;

    const userContent =
      'Here is my current job application data and filters as JSON. ' +
      'Please provide: (1) a short summary, (2) key patterns you notice, and (3) 3–5 concrete recommendations ' +
      'for how I should adjust my job search strategy. ' +
      'When discussing rejections or application quality, cross-reference the labor market context from your instructions so your advice accounts for macro conditions (e.g. fewer openings, data lag) as well as application polish.\n\n' +
      JSON.stringify({ filters, stats }, null, 2);

    const client = new InferenceClient(token);
    const response = await client.chatCompletion({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: 1024,
      temperature: 0.4,
    });

    const text =
      response.choices?.[0]?.message?.content ??
      'Unable to generate insights at the moment.';

    // Pick top 3 most relevant news links for this insight (all from current year only).
    const listForModel = RELATED_NEWS.map(
      (a, i) => `[${i + 1}] ${a.title}\n    ${a.url}\n    ${a.description}`,
    ).join('\n\n');
    const defaultThree = RELATED_NEWS.slice(0, 3).map((a) => ({
      title: a.title,
      url: a.url,
    }));
    let suggestedReading: Array<{ title: string; url: string }> = defaultThree;
    try {
      const pickResponse = await client.chatCompletion({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You choose the 3 most relevant news articles for a job seeker based on the insights they received. Reply with only 3 URLs, one per line, from the given list. No other text.',
          },
          {
            role: 'user',
            content: `Insights the user received:\n\n${text.slice(0, 2000)}\n\nAvailable articles (all from this year):\n\n${listForModel}\n\nReply with only 3 URLs, one per line.`,
          },
        ],
        max_tokens: 256,
        temperature: 0.2,
      });
      const pickText =
        pickResponse.choices?.[0]?.message?.content?.trim() ?? '';
      const urlList = pickText
        .split(/\n/)
        .map((line) => line.trim().replace(/^[-*]\s*/, ''))
        .filter((line) => /^https?:\/\//i.test(line));
      const seen = new Set<string>();
      const picked: Array<{ title: string; url: string }> = [];
      for (const u of urlList) {
        const normalized = u.replace(/\/$/, '').toLowerCase();
        const article = RELATED_NEWS.find((a) => {
          const aNorm = a.url.replace(/\/$/, '').toLowerCase();
          return aNorm === normalized || a.url === u;
        });
        if (article && !seen.has(article.url)) {
          seen.add(article.url);
          picked.push({ title: article.title, url: article.url });
          if (picked.length >= 3) break;
        }
      }
      if (picked.length > 0) suggestedReading = picked;
    } catch (pickErr) {
      console.warn('Suggested reading selection failed, using default 3:', pickErr);
    }

    return NextResponse.json({
      insights: text,
      model,
      suggestedReading,
    });
  } catch (error) {
    console.error('AI insights error:', error);
    const message =
      error instanceof Error ? error.message : 'Unexpected error while generating insights.';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
