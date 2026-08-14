-- 0003: Profile enhancements + scheduled posts

alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists location text;

alter table public.posts add column if not exists scheduled_at timestamptz;

-- Lazily publish scheduled posts whose time has come (called on feed load)
create or replace function public.publish_scheduled_posts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update posts
  set is_draft = false,
      scheduled_at = null,
      updated_at = now()
  where is_draft = true
    and scheduled_at is not null
    and scheduled_at <= now();
end;
$$;

grant execute on function public.publish_scheduled_posts() to authenticated, anon, service_role;

-- Covers storage bucket for profile cover photos
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "Public read covers" on storage.objects
  for select using (bucket_id = 'covers');

create policy "Authenticated users can upload covers" on storage.objects
  for insert with check (bucket_id = 'covers');

create policy "Owners can delete covers" on storage.objects
  for delete using (
    bucket_id = 'covers'
    and auth.uid() = ((storage.foldername(name))[1])::uuid
  );
