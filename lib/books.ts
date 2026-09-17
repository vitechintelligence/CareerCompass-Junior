import { getDb } from "@/lib/db";

export type BookLibraryItem = {
  code: string;
  titleEn: string;
  titleVi: string;
  descriptionEn: string | null;
  descriptionVi: string | null;
  levelLabel: string | null;
  ageBand: string | null;
  coverAssetUrl: string | null;
  firstUnitCode: string | null;
  publishedUnits: number;
};

export async function listPublishedBooks(): Promise<BookLibraryItem[]> {
  const sql = getDb();
  const rows = await sql`
    select b.code, b.title_en, b.title_vi, b.description_en, b.description_vi,
           b.level_label, b.age_band, b.cover_asset_url,
           min(u.code) filter (where u.status = 'published') as first_unit_code,
           count(u.id) filter (where u.status = 'published')::int as published_units
    from books b
    left join book_units u on u.book_id = b.id
    where b.status = 'published'
    group by b.id
    order by b.created_at
  `;

  return rows.map((row) => ({
    code: String(row.code),
    titleEn: String(row.title_en),
    titleVi: String(row.title_vi),
    descriptionEn: row.description_en ? String(row.description_en) : null,
    descriptionVi: row.description_vi ? String(row.description_vi) : null,
    levelLabel: row.level_label ? String(row.level_label) : null,
    ageBand: row.age_band ? String(row.age_band) : null,
    coverAssetUrl: row.cover_asset_url ? String(row.cover_asset_url) : null,
    firstUnitCode: row.first_unit_code ? String(row.first_unit_code) : null,
    publishedUnits: Number(row.published_units ?? 0),
  }));
}
