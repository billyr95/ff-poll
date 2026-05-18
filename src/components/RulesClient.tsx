'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import SuggestionForm from './SuggestionForm'
import AddRuleForm from './AddRuleForm'
import VoteButtons from './VoteButtons'
import PollCard, { type Poll } from './PollCard'
import CreatePollForm from './CreatePollForm'

type Rule = {
  id: string
  title: string
  description: string | null
  category: string
}

type VoteTally = {
  yes_count: number
  no_count: number
  total_votes: number
}

type Suggestion = {
  id: string
  rule_id: string | null
  title: string
  description: string | null
  type: string
  profiles: { full_name: string | null; username: string | null } | null
  vote_tallies: VoteTally[] | null
}

type MyVote = {
  suggestion_id: string
  vote: string
}

type MyPollVote = {
  poll_id: string
  option_id: string
}

interface Props {
  rules: Rule[]
  suggestions: Suggestion[]
  myVotes: MyVote[]
  polls: Poll[]
  myPollVotes: MyPollVote[]
  userId: string
  isAdmin: boolean
}

export default function RulesClient({ rules, suggestions, myVotes, polls, myPollVotes, userId, isAdmin }: Props) {
  const [activeTab, setActiveTab] = useState<'rules' | 'suggestions' | 'polls'>('polls')
  const [showForm, setShowForm] = useState(false)
  const [showAddRule, setShowAddRule] = useState(false)
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const myVoteMap = Object.fromEntries(myVotes.map(v => [v.suggestion_id, v.vote]))
  const myPollVoteMap = Object.fromEntries(myPollVotes.map(v => [v.poll_id, v.option_id]))

  const categories = Array.from(new Set(rules.map(r => r.category)))

  function openSuggestionForm(ruleId?: string) {
    setSelectedRuleId(ruleId ?? null)
    setShowForm(true)
  }

  async function handleVote(suggestionId: string, vote: 'yes' | 'no') {
    const existing = myVoteMap[suggestionId]

    if (existing === vote) {
      await supabase.from('votes').delete().match({ suggestion_id: suggestionId, user_id: userId })
    } else if (existing) {
      await supabase.from('votes').update({ vote }).match({ suggestion_id: suggestionId, user_id: userId })
    } else {
      await supabase.from('votes').insert({ suggestion_id: suggestionId, user_id: userId, vote })
    }

    router.refresh()
  }

  const openPolls = polls.filter(p => p.status === 'open')
  const closedPolls = polls.filter(p => p.status === 'closed')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          {(['polls', 'rules', 'suggestions'] as const).map(tab => (
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
        <div className="flex gap-2">
          {isAdmin && activeTab === 'polls' && (
            <button
              onClick={() => setShowCreatePoll(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Create poll
            </button>
          )}
          {isAdmin && activeTab === 'rules' && (
            <button
              onClick={() => setShowAddRule(true)}
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Add rule
            </button>
          )}
          {activeTab === 'suggestions' && (
            <button
              onClick={() => openSuggestionForm()}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Submit suggestion
            </button>
          )}
        </div>
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

      {activeTab === 'rules' && (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat}</h2>
              <div className="space-y-2">
                {rules.filter(r => r.category === cat).map(rule => (
                  <div key={rule.id} className="bg-white rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{rule.title}</p>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => openSuggestionForm(rule.id)}
                        className="text-xs text-green-600 hover:text-green-800 shrink-0 transition-colors"
                      >
                        Suggest edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-3">
          {suggestions.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">No open suggestions yet.</p>
          )}
          {suggestions.map(s => {
            const tally = s.vote_tallies?.[0]
            const yesCount = tally?.yes_count ?? 0
            const noCount = tally?.no_count ?? 0
            const total = tally?.total_votes ?? 0
            const myVote = myVoteMap[s.id] as 'yes' | 'no' | undefined
            const author = s.profiles?.full_name || s.profiles?.username || 'League member'
            const linkedRule = rules.find(r => r.id === s.rule_id)

            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    s.type === 'add' ? 'bg-blue-50 text-blue-700' :
                    s.type === 'remove' ? 'bg-red-50 text-red-700' :
                    'bg-yellow-50 text-yellow-700'
                  }`}>
                    {s.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{s.title}</p>
                    {linkedRule && (
                      <p className="text-xs text-gray-400 mt-0.5">re: {linkedRule.title}</p>
                    )}
                    {s.description && (
                      <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">— {author}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <VoteButtons
                    yesCount={yesCount}
                    noCount={noCount}
                    total={total}
                    myVote={myVote}
                    onVote={(v) => handleVote(s.id, v)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <SuggestionForm
          rules={rules}
          defaultRuleId={selectedRuleId}
          userId={userId}
          onClose={() => setShowForm(false)}
          onSubmit={() => {
            setShowForm(false)
            router.refresh()
          }}
        />
      )}

      {showAddRule && (
        <AddRuleForm
          onClose={() => setShowAddRule(false)}
          onSubmit={() => {
            setShowAddRule(false)
            router.refresh()
          }}
        />
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
