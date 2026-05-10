select 'auth.users' as table_name, count(*)::bigint as rows_count from auth.users
union all
select 'auth.identities', count(*)::bigint from auth.identities
union all
select 'public.profiles', count(*)::bigint from public.profiles
union all
select 'public.profession_catalog', count(*)::bigint from public.profession_catalog
union all
select 'public.industry_catalog', count(*)::bigint from public.industry_catalog
union all
select 'public.subindustry_catalog', count(*)::bigint from public.subindustry_catalog
union all
select 'public.locations', count(*)::bigint from public.locations
union all
select 'public.posts', count(*)::bigint from public.posts
union all
select 'public.post_comments', count(*)::bigint from public.post_comments
union all
select 'public.chats', count(*)::bigint from public.chats
union all
select 'public.chat_members', count(*)::bigint from public.chat_members
union all
select 'public.messages', count(*)::bigint from public.messages
union all
select 'public.profile_work', count(*)::bigint from public.profile_work
union all
select 'public.profile_contacts', count(*)::bigint from public.profile_contacts
union all
select 'public.profile_views', count(*)::bigint from public.profile_views
union all
select 'public.profile_blocks', count(*)::bigint from public.profile_blocks
union all
select 'public.push_subscriptions', count(*)::bigint from public.push_subscriptions
union all
select 'public.app_config', count(*)::bigint from public.app_config
union all
select 'public.profile_likes', count(*)::bigint from public.profile_likes
order by table_name;
