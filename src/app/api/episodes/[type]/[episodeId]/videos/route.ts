import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { classifyVideoLink, RawVideoLink } from '@/lib/video-utils';
import { RowDataPacket } from 'mysql2';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ type: string; episodeId: string }> }
) {
  try {
    const { type, episodeId } = await context.params;

    if (type !== 'series' && type !== 'animes') {
      return NextResponse.json({ error: 'Tipo de episodio inválido' }, { status: 400 });
    }

    const table = type === 'series' ? 'serie_videos' : 'anime_videos';
    const fkCol = type === 'series' ? 'episode_id' : 'anime_episode_id';

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, server, header, link, lang, quality, video_name, embed, youtubelink, hls, supported_hosts
       FROM ${table}
       WHERE ${fkCol} = ? AND link IS NOT NULL AND link != ''
       ORDER BY id ASC`,
      [episodeId]
    );

    const videos = (rows as RawVideoLink[]).map(classifyVideoLink);

    return NextResponse.json({
      success: true,
      episodeId: Number(episodeId),
      videos,
    });
  } catch (error: unknown) {
    console.error('Error in /api/episodes/[type]/[episodeId]/videos:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener enlaces del episodio',
      },
      { status: 500 }
    );
  }
}

