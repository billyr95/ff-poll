-- Polls
create table polls (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  status text default 'open' check (status in ('open', 'closed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table polls enable row level security;

create policy "Polls are viewable by everyone"
  on polls for select using (true);

create policy "Authenticated users can insert polls"
  on polls for insert with check (auth.uid() is not null);

create policy "Poll creator can update polls"
  on polls for update using (auth.uid() = created_by);

-- Poll options
create table poll_options (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references polls(id) on delete cascade,
  text text not null,
  sort_order int default 0
);

alter table poll_options enable row level security;

create policy "Poll options are viewable by everyone"
  on poll_options for select using (true);

create policy "Authenticated users can insert poll options"
  on poll_options for insert with check (auth.uid() is not null);

-- Poll votes (one per user per poll)
create table poll_votes (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references polls(id) on delete cascade,
  option_id uuid references poll_options(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(poll_id, user_id)
);

alter table poll_votes enable row level security;

create policy "Poll votes are viewable by everyone"
  on poll_votes for select using (true);

create policy "Authenticated users can vote on polls"
  on poll_votes for insert with check (auth.uid() = user_id);

create policy "Users can change their poll vote"
  on poll_votes for update using (auth.uid() = user_id);
