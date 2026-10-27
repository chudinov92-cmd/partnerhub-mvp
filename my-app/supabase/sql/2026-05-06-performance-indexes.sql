-- Проверка текущих индексов
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'profiles',
    'posts',
    'post_comments',
    'profile_contacts',
    'profile_views',
    'profile_blocks',
    'chat_members',
    'messages',
    'locations'
  )
order by tablename, indexname;

-- Индексы под самые частые фильтры/сортировки в текущем приложении
create index if not exists idx_profiles_auth_user_id
  on public.profiles (auth_user_id);

create index if not exists idx_posts_city_created_at
  on public.posts (city, created_at desc);

create index if not exists idx_post_comments_post_id_created_at
  on public.post_comments (post_id, created_at asc);

create index if not exists idx_profile_contacts_owner_id
  on public.profile_contacts (owner_id);

create index if not exists idx_profile_views_viewer_id
  on public.profile_views (viewer_id);

create index if not exists idx_profile_blocks_owner_id
  on public.profile_blocks (owner_id);

create index if not exists idx_chat_members_user_id_chat_id
  on public.chat_members (user_id, chat_id);

create index if not exists idx_chat_members_chat_id_user_id
  on public.chat_members (chat_id, user_id);

create index if not exists idx_messages_chat_id_created_at
  on public.messages (chat_id, created_at desc);

create index if not exists idx_locations_user_id
  on public.locations (user_id);
