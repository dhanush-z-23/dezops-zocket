import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, brandName, brandDescription } = await request.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No reference images provided' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key, return a simulated brand guide
    if (!apiKey) {
      return NextResponse.json({
        guide: `# ${brandName || 'Brand'} — AI-Generated Brand Guide

## Visual Identity
Based on analysis of ${imageUrls.length} reference creative(s), here is the recommended brand guide:

### Color Palette
- **Primary**: Deep indigo and electric blue tones dominate the visual identity
- **Secondary**: Warm accents in amber/gold for CTAs and highlights
- **Neutrals**: Clean whites and soft grays for backgrounds

### Typography
- **Headlines**: Bold, geometric sans-serif (e.g., Inter Bold, Space Grotesk)
- **Body**: Clean, readable sans-serif at 14-16px
- **Captions**: Light weight, smaller size with generous letter-spacing

### Layout Principles
- Clean, minimal layouts with generous whitespace
- Strong visual hierarchy through size contrast
- Grid-based alignment for consistency
- Left-aligned text with centered hero elements

### Imagery Style
- High-contrast, vibrant visuals
- Modern, professional photography
- Abstract gradients and geometric shapes as decorative elements
- Consistent border-radius (8-12px) on cards and containers

### Tone & Voice
${brandDescription ? `Based on the brand description: "${brandDescription}"` : 'Professional yet approachable'}
- Confident but not arrogant
- Clear and concise messaging
- Action-oriented CTAs

### Do's
- Maintain consistent spacing (8px grid system)
- Use brand colors as primary accents
- Keep designs clean and uncluttered
- Ensure text meets WCAG contrast requirements

### Don'ts
- Don't use more than 2-3 font families
- Don't overcrowd layouts with too many elements
- Don't use low-resolution or stretched images
- Don't deviate from the established color palette`,
      });
    }

    // Real GPT-4 Vision analysis
    const imageContent = imageUrls.slice(0, 5).map((url: string) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'high' as const },
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert brand designer. Analyze the provided reference creatives and generate a comprehensive brand guide in markdown format. Include: Color Palette (with hex codes), Typography, Layout Principles, Imagery Style, Tone & Voice, Do's and Don'ts. Be specific and actionable.${brandName ? ` The brand is "${brandName}".` : ''}${brandDescription ? ` Description: ${brandDescription}` : ''}`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze these ${imageUrls.length} reference creatives and generate a detailed brand guide:`,
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return NextResponse.json({ error: 'Brand guide generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const guide = data.choices?.[0]?.message?.content ?? '';

    return NextResponse.json({ guide });
  } catch (error) {
    console.error('Brand guide error:', error);
    return NextResponse.json({ error: 'Brand guide generation failed' }, { status: 500 });
  }
}
