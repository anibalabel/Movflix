import { NextRequest, NextResponse } from 'next/server';

async function resolveVidaraStream(filecode: string) {
  const response = await fetch('https://vidara.so/api/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://vidara.so',
      Referer: `https://vidara.so/e/${filecode}`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      filecode,
      device: 'web',
      codecs: ['av1'],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Vidara API respondió con estado ${response.status}`);
  }

  const data = await response.json();
  return {
    filecode: data.filecode || filecode,
    streaming_url: data.streaming_url || null,
    thumbnail: data.thumbnail || null,
    title: data.title || null,
    subtitles: data.subtitles || null,
    default_sub_lang: data.default_sub_lang || null,
    fallback_embed: `https://vidara.so/e/${filecode}`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filecode = (searchParams.get('filecode') || '').trim();

    if (!filecode) {
      return NextResponse.json(
        { success: false, error: 'Parámetro filecode requerido' },
        { status: 400 }
      );
    }

    const result = await resolveVidaraStream(filecode);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/vidara:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al extraer stream de Vidara',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filecode = (body.filecode || '').trim();

    if (!filecode) {
      return NextResponse.json(
        { success: false, error: 'Campo filecode requerido' },
        { status: 400 }
      );
    }

    const result = await resolveVidaraStream(filecode);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/vidara:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al extraer stream de Vidara',
      },
      { status: 500 }
    );
  }
}

