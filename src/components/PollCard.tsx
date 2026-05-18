'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type PollOption = {
  id: string
  text: string
  sort_order: number
  poll_votes: { id: string; user_id: string }[]
}

export type Poll = {
  id: string
  question: string
  status: string
  created_at: string
  poll_options: PollOption[]
}

interface Props {
  poll: Poll
  myVotedOptionId: string | undefined
  userId: string
  isAdmin: boolean
  onRefresh: () => void
}

export default function PollCard({ poll, myVotedOptionId, userId, isAdmin, onRefresh }: Props) {
  const [pending, setPending] = useState(false)
  const supabase = createClient()

  const totalVotes = poll.poll_options.reduce((sum, o) => sum + o.poll_votes.length, 0)
  const isClosed = poll.status === 'closed'
  const hasVoted = !!myVotedOptionId

  const sorted = [...poll.poll_options].sort((a, b) => a.sort_order - b.sort_order)

  async function vote(optionId: string) {
    if (isClosed || pending) return
    setPending(true)

    if (myVotedOptionId) {
      await supabase
        .from('poll_votes')
        .update({ option_id: optionId })
        .match({ poll_id: poll.id, user_id: userId })
    } else {
      await supabase
        .from('poll_votes')
        .insert({ poll_id: poll.id, option_id: optionId, user_id: userId })
    }

    setPending(false)
    onRefresh()
  }

  async function closePoll() {
    setPending(true)
    await supabase.from('polls').update({ status: 'closed' }).eq('id', poll.id)
    setPending(false)
    onRefresh()
  }

  return (
    <div className={`bg-white rounded-xl border p-5 ${isClosed ? 'border-gray-100 opacity-75' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="font-semibold text-gray-900">{poll.question}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {isClosed && (
            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Closed</span>
          )}
          {isAdmin && !isClosed && (
            <button
              onClick={closePoll}
              disabled={pending}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Close poll
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map(option => {
          const count = option.poll_votes.length
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isMyVote = myVotedOptionId === option.id
          const showResults = hasVoted || isClosed

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={isClosed || pending}
              className={`w-full text-left rounded-lg border transition-all overflow-hidden ${
                isMyVote
                  ? 'border-green-500 bg-green-50'
                  : showResults
                  ? 'border-gray-100 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50'
              } ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div className="relative px-4 py-2.5">
                {showResults && (
                  <div
                    className={`absolute inset-0 rounded-lg transition-all ${isMyVote ? 'bg-green-100' : 'bg-gray-100'}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className={`text-sm font-medium ${isMyVote ? 'text-green-800' : 'text-gray-800'}`}>
                    {option.text}
                    {isMyVote && <span className="ml-1.5 text-green-600 text-xs">✓ your vote</span>}
                  </span>
                  {showResults && (
                    <span className="text-xs text-gray-500 ml-4 shrink-0">{pct}% · {count}</span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
        {!hasVoted && !isClosed && ' · tap an option to vote'}
        {hasVoted && !isClosed && ' · tap another option to change your vote'}
      </p>
    </div>
  )
}
