-- The partial unique index (`where external_id is not null`) doesn't match
-- PostgREST's upsert, which issues a plain `on conflict (category,
-- external_id) do update` with no where clause — Postgres only infers a
-- conflict target from an index whose predicate is present verbatim in the
-- ON CONFLICT clause, so every upsert failed with "no unique or exclusion
-- constraint matching the ON CONFLICT specification" (confirmed live via a
-- smoke test). A plain unique index still allows unlimited rows with a null
-- external_id — Postgres never treats null as equal to null in a unique
-- index — so dropping the partial predicate loses nothing.
drop index if exists public.curated_content_dedup_idx;

create unique index if not exists curated_content_dedup_idx
  on public.curated_content (category, external_id);
