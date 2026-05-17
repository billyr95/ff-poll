'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function NavBar({ user }: { user: User }) {
  const supabase = createClient()
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-gray-900">FF Rules Poll</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
