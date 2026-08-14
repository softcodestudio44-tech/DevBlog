-- 0004: OAuth (Google/GitHub) login support

-- Hardened auto-create profile: pulls display name + avatar from OAuth metadata,
-- tolerates NULL email (GitHub), and updates the row in place if it already exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _email text;
  _name text;
  _avatar text;
begin
  _email := coalesce(
    nullif(new.email, ''),
    nullif(new.raw_user_meta_data->>'email', ''),
    nullif(new.raw_user_meta_data->>'user_name', '') || '@devblog.local',
    new.id::text || '@devblog.local'
  );

  _name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'user_name', ''),
    split_part(_email, '@', 1)
  );

  _avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  insert into public.profiles (id, email, name, avatar, role)
  values (
    new.id,
    _email,
    _name,
    _avatar,
    case when _email = 'sofcodestudio44@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar = coalesce(public.profiles.avatar, excluded.avatar);

  return new;
end;
$$;

-- Make sure the trigger is attached (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Let clients create their own profile as a fallback (e.g. if the trigger
-- ran against an older schema). Used by ensureProfile on the frontend.
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
