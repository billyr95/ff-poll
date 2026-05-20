'use client'

import { useState, useEffect } from 'react'
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
  closes_at: string | null
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

function useCountdown(closesAt: string | null) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!closesAt) return

    function update() {
      const diff = new Date(closesAt!).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft(''); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setTimeLeft(`${d}d ${h}h remaining`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m remaining`)
      else if (m > 0) setTimeLeft(`${m}m ${s}s remaining`)
      else setTimeLeft(`${s}s remaining`)
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return timeLeft
}

export default function PollCard({ poll, myVotedOptionId, userId, isAdmin, onRefresh }: Props) {
  const [pending, setPending] = useState(false)
  const supabase = createClient()
  const timeLeft = useCountdown(poll.closes_at)

  const isExpired = poll.closes_at ? new Date(poll.closes_at) <= new Date() : false
  const isClosed = poll.status === 'closed' || isExpired
  const hasVoted = !!myVotedOptionId
  const totalVotes = poll.poll_options.reduce((sum, o) => sum + o.poll_votes.length, 0)
  const sorted = [...poll.poll_options].sort((a, b) => a.sort_order - b.sort_order)

  // Auto-close in DB when deadline passes
  useEffect(() => {
    if (isExpired && poll.status === 'open') {
      supabase.from('polls').update({ status: 'closed' }).eq('id', poll.id).then(() => onRefresh())
    }
  }, [isExpired, poll.status, poll.id, supabase, onRefresh])

  async function vote(optionId: string) {
    if (isClosed || pending) return
    setPending(true)
    if (myVotedOptionId) {
      await supabase.from('poll_votes').update({ option_id: optionId }).match({ poll_id: poll.id, user_id: userId })
    } else {
      await supabase.from('poll_votes').insert({ poll_id: poll.id, option_id: optionId, user_id: userId })
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
      <div className="flex items-start justify-between gap-4 mb-1">
        <h3 className="font-semibold text-gray-900">{poll.question}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {isClosed && (
            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Closed</span>
          )}
          {isAdmin && !isClosed && (
            <button onClick={closePoll} disabled={pending} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Close poll
            </button>
          )}
        </div>
      </div>

      {!isClosed && timeLeft && (
        <p className="text-xs text-amber-500 font-medium mb-3">{timeLeft}</p>
      )}
      {!isClosed && !timeLeft && poll.closes_at && (
        <p className="text-xs text-red-500 font-medium mb-3">Voting closed</p>
      )}
      {!isClosed && !poll.closes_at && <div className="mb-3" />}

      <div className="space-y-2">
        {sorted.map(option => {
          const count = option.poll_votes.length
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isMyVote = myVotedOptionId === option.id
          const showResults = isClosed || isAdmin

          return (
            <button
              key={option.id}
              onClick={() => vote(option.id)}
              disabled={isClosed || pending}
              className={`w-full text-left rounded-lg border transition-all overflow-hidden ${
                isMyVote ? 'border-green-500 bg-green-50' :
                showResults ? 'border-gray-100 bg-gray-50' :
                'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50'
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
        {isClosed ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} · final results` :
         isAdmin ? `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'} · results visible to you only` :
         hasVoted ? 'Your vote is in · results revealed when poll closes' :
         'Tap an option to vote'}
      </p>
    </div>
  )
}
