'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  onClose: () => void
  onSubmit: () => void
}

export default function CreatePollForm({ userId, onClose, onSubmit }: Props) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [closesAt, setClosesAt] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  function updateOption(index: number, value: string) {
    setOptions(prev => prev.map((o, i) => (i === index ? value : o)))
  }

  function addOption() {
    if (options.length < 6) setOptions(prev => [...prev, ''])
  }

  function removeOption(index: number) {
    if (options.length > 2) setOptions(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filled = options.filter(o => o.trim())
    if (!question.trim() || filled.length < 2) return
    setLoading(true)

    const { data: poll, error } = await supabase
      .from('polls')
      .insert({
        question: question.trim(),
        created_by: userId,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      })
      .select()
      .single()

    if (!error && poll) {
      await supabase.from('poll_options').insert(
        filled.map((text, i) => ({ poll_id: poll.id, text: text.trim(), sort_order: i }))
      )
    }

    setLoading(false)
    onSubmit()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Create a poll</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
            <input
              type="text"
              required
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. What should the buy-in be this year?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-gray-400 hover:text-red-500 transition-colors px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm text-green-600 hover:text-green-800 transition-colors"
              >
                + Add option
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voting deadline <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={closesAt}
              onChange={e => setClosesAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
