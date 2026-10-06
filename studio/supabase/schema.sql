-- Private studio tables keep anonymous identities and rate limits out of the Data API.
create schema if not exists glaral_studio;
create table if not exists glaral_studio.settings(key text primary key,value text not null);
create table if not exists glaral_studio.owners(id uuid primary key references auth.users(id));
create table if not exists glaral_studio.projects(slug text primary key,data jsonb not null,updated_at bigint not null);
create table if not exists glaral_studio.posts(id text primary key,data jsonb not null,created_at bigint not null);
create table if not exists glaral_studio.reactions(post_id text not null,visitor uuid not null,kind text not null check(kind in ('useful','love','curious')),updated_at bigint not null,primary key(post_id,visitor));
create table if not exists glaral_studio.rate_limits(key text primary key,hits integer not null,expires bigint not null);
alter table glaral_studio.settings enable row level security;
alter table glaral_studio.owners enable row level security;
alter table glaral_studio.projects enable row level security;
alter table glaral_studio.posts enable row level security;
alter table glaral_studio.reactions enable row level security;
alter table glaral_studio.rate_limits enable row level security;
revoke all on all tables in schema glaral_studio from public,anon,authenticated;
create or replace function glaral_studio.dispatch(p_secret text,p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; is_owner boolean; previous_kind text; selected_kind text; reaction_total jsonb; visitor_id uuid; v_post_id text; reaction_kind text; rate_count integer; stamp bigint; rate_key text;
begin
 if p_secret is null or p_secret is distinct from (select value from glaral_studio.settings where key='backend_secret') then raise exception 'Access denied' using errcode='42501';end if;
 is_owner:=exists(select 1 from glaral_studio.owners where id=(select auth.uid()));
 stamp:=(extract(epoch from clock_timestamp())*1000)::bigint;
 if p_action='read' then
  select jsonb_build_object('projects',coalesce((select jsonb_agg(data order by slug) from glaral_studio.projects),'[]'::jsonb),'posts',coalesce((select jsonb_agg(data order by created_at desc) from glaral_studio.posts),'[]'::jsonb),'counts',coalesce((select jsonb_agg(x) from (select post_id,kind,count(*) as count from glaral_studio.reactions group by post_id,kind)x),'[]'::jsonb),'selected',coalesce((select jsonb_object_agg(post_id,kind) from glaral_studio.reactions where visitor=(p_payload->>'visitor')::uuid),'{}'::jsonb),'isAdmin',is_owner) into result;
  return result;
 elsif p_action='react' then
  visitor_id:=(p_payload->>'visitor')::uuid;v_post_id:=p_payload->>'postId';reaction_kind:=p_payload->>'kind';rate_key:=p_payload->>'rateKey';
  if visitor_id is null or v_post_id is null or reaction_kind not in ('useful','love','curious') or rate_key is null then raise exception 'Invalid reaction';end if;
  if not exists(select 1 from glaral_studio.posts where id=v_post_id) and v_post_id not in ('starter-1','starter-2','starter-3') then raise exception 'Unknown post';end if;
  insert into glaral_studio.rate_limits(key,hits,expires) values(rate_key,1,stamp+120000) on conflict(key) do update set hits=glaral_studio.rate_limits.hits+1 returning hits into rate_count;
  if rate_count>30 then return jsonb_build_object('error','Please wait before reacting again.','status',429);end if;
  delete from glaral_studio.rate_limits where expires<stamp;
  perform pg_advisory_xact_lock(hashtextextended(v_post_id||visitor_id::text,0));
  select kind into previous_kind from glaral_studio.reactions r where r.post_id=v_post_id and r.visitor=visitor_id;
  if previous_kind=reaction_kind then delete from glaral_studio.reactions r where r.post_id=v_post_id and r.visitor=visitor_id;selected_kind:=null;
  else insert into glaral_studio.reactions values(v_post_id,visitor_id,reaction_kind,stamp) on conflict(post_id,visitor) do update set kind=excluded.kind,updated_at=excluded.updated_at;selected_kind:=reaction_kind;end if;
  select coalesce(jsonb_agg(x),'[]'::jsonb) into reaction_total from (select kind,count(*) as count from glaral_studio.reactions r where r.post_id=v_post_id group by kind)x;
  return jsonb_build_object('counts',reaction_total,'selected',selected_kind);
 end if;
 if not is_owner then raise exception 'Only the studio owner can publish' using errcode='42501';end if;
 if p_action='project' then
  insert into glaral_studio.projects values(p_payload->>'slug',p_payload,stamp) on conflict(slug) do update set data=excluded.data,updated_at=excluded.updated_at;
 elsif p_action='post' then
  insert into glaral_studio.posts values(p_payload->>'id',p_payload,stamp);
 else raise exception 'Unknown action';end if;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function glaral_studio.dispatch(text,text,jsonb) from public;
grant usage on schema glaral_studio to anon,authenticated;
grant execute on function glaral_studio.dispatch(text,text,jsonb) to anon,authenticated;
-- An unprivileged exposed wrapper calls the gated function in the unexposed schema.
create or replace function public.glaral_studio_api(p_secret text,p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select glaral_studio.dispatch(p_secret,p_action,p_payload);$$;
revoke all on function public.glaral_studio_api(text,text,jsonb) from public;
grant execute on function public.glaral_studio_api(text,text,jsonb) to anon,authenticated;
