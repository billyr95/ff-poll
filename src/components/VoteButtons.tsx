'use client'

interface Props {
  yesCount: number
  noCount: number
  total: number
  myVote?: 'yes' | 'no'
  onVote: (vote: 'yes' | 'no') => void
}

export default function VoteButtons({ yesCount, noCount, total, myVote, onVote }: Props) {
  const yesPct = total > 0 ? Math.round((yesCount / total) * 100) : 0

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        onClick={() => onVote('yes')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          myVote === 'yes'
            ? 'bg-green-600 text-white'
            : 'bg-green-50 text-green-700 hover:bg-green-100'
        }`}
      >
        <span>👍</span>
        <span>{yesCount}</span>
      </button>
      <button
        onClick={() => onVote('no')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          myVote === 'no'
            ? 'bg-red-600 text-white'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        <span>👎</span>
        <span>{noCount}</span>
      </button>
      {total > 0 && (
        <div className="flex-1">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${yesPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{yesPct}% in favor · {total} votes</p>
        </div>
      )}
    </div>
  )
}
