import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MainClient from '@/components/MainClient'
import NavBar from '@/components/NavBar'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: polls } = await supabase
    .from('polls')
    .select('*, poll_options(id, text, sort_order, poll_votes(id, user_id))')
    .order('created_at', { ascending: false })

  const { data: myPollVotes } = await supabase
    .from('poll_votes')
    .select('poll_id, option_id')
    .eq('user_id', user.id)

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('id, title, created_at, profiles(full_name, username)')
    .order('created_at', { ascending: false })

  // Ensure profile exists for this user (handles users who signed up before the trigger)
  await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })

  const isAdmin = user.email === process.env.ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <MainClient
          polls={polls ?? []}
          myPollVotes={myPollVotes ?? []}
          suggestions={suggestions ?? []}
          userId={user.id}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  )
}
