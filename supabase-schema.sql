-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop everything cleanly first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop view if exists vote_tallies;
drop table if exists votes cascade;
drop table if exists suggestions cascade;
drop table if exists rules cascade;
drop table if exists profiles cascade;

-- Profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Rules
create table rules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text default 'General',
  status text default 'active' check (status in ('active', 'archived')),
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

alter table rules enable row level security;

create policy "Rules are viewable by everyone"
  on rules for select using (true);

create policy "Authenticated users can insert rules"
  on rules for insert with check (auth.uid() is not null);

-- Suggestions
create table suggestions (
  id uuid default gen_random_uuid() primary key,
  rule_id uuid references rules(id) on delete cascade,
  title text not null,
  description text,
  type text default 'modify' check (type in ('modify', 'add', 'remove')),
  status text default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table suggestions enable row level security;

create policy "Suggestions are viewable by everyone"
  on suggestions for select using (true);

create policy "Authenticated users can create suggestions"
  on suggestions for insert with check (auth.uid() is not null);

-- Votes
create table votes (
  id uuid default gen_random_uuid() primary key,
  suggestion_id uuid references suggestions(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz default now(),
  unique(suggestion_id, user_id)
);

alter table votes enable row level security;

create policy "Votes are viewable by everyone"
  on votes for select using (true);

create policy "Authenticated users can vote"
  on votes for insert with check (auth.uid() = user_id);

create policy "Users can change their own vote"
  on votes for update using (auth.uid() = user_id);

create policy "Users can delete their own vote"
  on votes for delete using (auth.uid() = user_id);

-- Vote tallies view
create view vote_tallies as
select
  suggestion_id,
  count(*) filter (where vote = 'yes') as yes_count,
  count(*) filter (where vote = 'no') as no_count,
  count(*) as total_votes
from votes
group by suggestion_id;

-- Seed example rules
insert into rules (title, description, category) values
  ('Scoring: PPR', 'Point Per Reception scoring. Each reception is worth 1 point.', 'Scoring'),
  ('Roster Size: 15 players', 'Each team carries 15 players on their roster at all times.', 'Roster'),
  ('Draft: Snake Draft', 'Draft order reverses each round (snake format).', 'Draft'),
  ('Trades: Allowed until Week 10', 'Trades are allowed through the end of Week 10.', 'Trades'),
  ('Playoffs: Top 4 teams', 'Top 4 teams by record make the playoffs starting Week 15.', 'Playoffs');
