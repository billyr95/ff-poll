import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RulesClient from '@/components/RulesClient'
import NavBar from '@/components/NavBar'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('status', 'active')
    .order('category')

  const { data: suggestions } = await supabase
    .from('suggestions')
    .select('*, profiles(full_name, username), vote_tallies(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const { data: myVotes } = await supabase
    .from('votes')
    .select('suggestion_id, vote')
    .eq('user_id', user.id)

  const isAdmin = user.email === process.env.ADMIN_EMAIL

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar user={user} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <RulesClient
          rules={rules ?? []}
          suggestions={suggestions ?? []}
          myVotes={myVotes ?? []}
          userId={user.id}
          isAdmin={isAdmin}
        />
      </main>
    </div>
  )
}
