-- ============================================================
-- Supabase Storage: review photos
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true, -- public read so admins/customers can view without signed URLs; write is locked down
  10485760, -- 10 MB
  array['image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public can read (needed to preview uploaded/enhanced photos in the flow and in admin UI)
create policy "public read review photos"
  on storage.objects for select
  using (bucket_id = 'review-photos');

-- Only the service role (used inside Edge Functions) can write. This means the browser
-- NEVER uploads directly with the anon key — uploads go through the `upload-photo` Edge
-- Function, which validates type/size/count server-side before writing to Storage.
-- (No anon insert/update/delete policy exists => denied by default for those roles.)

-- Recommended object path convention: review-photos/{restaurant_slug}/{session_id}/{uuid}.{ext}
