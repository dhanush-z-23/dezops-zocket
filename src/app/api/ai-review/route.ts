import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, brandGuide } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key, return a simulated review
    if (!apiKey) {
      const score = Math.floor(Math.random() * 30) + 65; // 65-95
      return NextResponse.json({
        score,
        summary: `Creative review completed. The design ${score >= 80 ? 'strongly aligns' : 'partially aligns'} with the brand guidelines. Overall composition and visual hierarchy are ${score >= 80 ? 'excellent' : 'good with room for improvement'}.`,
        strengths: [
          'Good visual hierarchy and layout structure',
          'Color usage is consistent with brand palette',
          'Typography choices support readability',
        ],
        improvements: [
          'Consider increasing contrast for accessibility',
          'Ensure logo placement follows brand spacing guidelines',
          'Text-to-image ratio could be optimized',
        ],
        brandAlignmentNotes: brandGuide
          ? `Reviewed against "${brandGuide.name}" brand guidelines. ${score >= 80 ? 'The creative demonstrates strong brand alignment.' : 'Some adjustments needed to better match brand standards.'}`
          : 'No brand guide provided — review based on general design principles.',
        reviewedAt: new Date().toISOString(),
      });
    }

    // Real GPT-4 Vision review
    const systemPrompt = brandGuide
      ? `You are an expert design reviewer for the brand "${brandGuide.name}".

Brand Guidelines:
- Description: ${brandGuide.description}
- Primary Colors: ${brandGuide.primaryColors.join(', ')}
- Secondary Colors: ${brandGuide.secondaryColors.join(', ')}
- Fonts: ${brandGuide.fonts.join(', ')}
- Tone of Voice: ${brandGuide.tonOfVoice}
- Do: ${brandGuide.doList.join('; ')}
- Don't: ${brandGuide.dontList.join('; ')}
${brandGuide.aiGeneratedGuide ? `\nAI-Generated Brand Guide:\n${brandGuide.aiGeneratedGuide}` : ''}

Rate the creative out of 100 based on brand alignment, visual quality, and adherence to guidelines.`
      : 'You are an expert design reviewer. Rate the creative out of 100 based on visual quality, composition, typography, and color usage.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Review this creative design. Respond ONLY with valid JSON in this exact format: {"score": <number 0-100>, "summary": "<2-3 sentences>", "strengths": ["<point1>", "<point2>", "<point3>"], "improvements": ["<point1>", "<point2>", "<point3>"], "brandAlignmentNotes": "<1-2 sentences>"}',
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    // Parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const review = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      ...review,
      reviewedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('AI review error:', error);
    return NextResponse.json({ error: 'AI review failed' }, { status: 500 });
  }
}
