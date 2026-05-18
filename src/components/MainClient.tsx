'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PollCard, { type Poll } from './PollCard'
import CreatePollForm from './CreatePollForm'

type Suggestion = {
  id: string
  title: string
  created_at: string
  profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null
}

type MyPollVote = {
  poll_id: string
  option_id: string
}

interface Props {
  polls: Poll[]
  myPollVotes: MyPollVote[]
  suggestions: Suggestion[]
  userId: string
  isAdmin: boolean
}

export default function MainClient({ polls, myPollVotes, suggestions, userId, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<'polls' | 'suggestions'>('polls')
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const myPollVoteMap = Object.fromEntries(myPollVotes.map(v => [v.poll_id, v.option_id]))

  const openPolls = polls.filter(p => p.status === 'open')
  const closedPolls = polls.filter(p => p.status === 'closed')

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    await supabase.from('suggestions').insert({ title: text.trim(), created_by: userId })
    setText('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          {(['polls', 'suggestions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {isAdmin && activeTab === 'polls' && (
          <button
            onClick={() => setShowCreatePoll(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Create poll
          </button>
        )}
      </div>

      {activeTab === 'polls' && (
        <div className="space-y-4">
          {polls.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">No polls yet.</p>
          )}
          {openPolls.map(poll => (
            <PollCard
              key={poll.id}
              poll={poll}
              myVotedOptionId={myPollVoteMap[poll.id]}
              userId={userId}
              isAdmin={isAdmin}
              onRefresh={() => router.refresh()}
            />
          ))}
          {closedPolls.length > 0 && (
            <>
              {openPolls.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Closed</p>
              )}
              {closedPolls.map(poll => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  myVotedOptionId={myPollVoteMap[poll.id]}
                  userId={userId}
                  isAdmin={isAdmin}
                  onRefresh={() => router.refresh()}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <form onSubmit={submitSuggestion} className="bg-white rounded-xl border border-gray-100 p-4">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              placeholder="Got a suggestion for the league? Type it here…"
              className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>

          {suggestions.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No suggestions yet — be the first.</p>
          )}
          {suggestions.map(s => {
            const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
            const author = profile?.full_name || profile?.username || 'League member'
            const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-400 mt-1.5">{author} · {date}</p>
              </div>
            )
          })}
        </div>
      )}

      {showCreatePoll && (
        <CreatePollForm
          userId={userId}
          onClose={() => setShowCreatePoll(false)}
          onSubmit={() => {
            setShowCreatePoll(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
