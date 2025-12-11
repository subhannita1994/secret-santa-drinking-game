'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import GameCreation from '@/components/GameCreation'
import GameList from '@/components/GameList'

export default function Home() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create')

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-gray-800 mb-4">
                🎄 Secret Santa Game
              </h1>
              <p className="text-2xl text-gray-600 mb-8">
                Create the ultimate holiday drinking game!
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">How It Works</h2>
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl mb-2">🎁</div>
                  <h3 className="font-bold text-lg mb-2">1. Get Your Assignment</h3>
                  <p className="text-gray-600">Everyone gets a secret email with their gift recipient</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl mb-2">🕵️</div>
                  <h3 className="font-bold text-lg mb-2">2. Use the Clues</h3>
                  <p className="text-gray-600">At the party, use the generated clues to guess your Secret Santa</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl mb-2">🍻</div>
                  <h3 className="font-bold text-lg mb-2">3. Guess & Drink</h3>
                  <p className="text-gray-600">Guess right - they drink! Guess wrong - you drink!</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start?</h2>
              <p className="text-gray-600 mb-6">Sign in to create your Secret Santa game</p>
              <button
                onClick={() => signIn('google')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition duration-200"
              >
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-800">
              🎄 Secret Santa Game
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Welcome, {session.user?.name || session.user?.email}!
              </span>
              <button
                onClick={() => signOut()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2 rounded-md font-medium transition duration-200 ${
                  activeTab === 'create'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Create New Game
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`px-6 py-2 rounded-md font-medium transition duration-200 ${
                  activeTab === 'list'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                My Games
              </button>
            </div>
          </div>

          {activeTab === 'create' ? <GameCreation /> : <GameList />}
        </div>
      </div>
    </div>
  )
}
