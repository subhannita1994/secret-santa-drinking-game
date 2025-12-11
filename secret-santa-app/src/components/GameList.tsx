'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, MessageSquare, ExternalLink, Copy, Check } from 'lucide-react'

interface Game {
  id: string
  name: string
  partyDate: string
  giftBudget: string
  customMessage?: string
  createdAt: string
  participants: Array<{
    id: string
    name: string
    email: string
    gender: string
    yearMoved: number
  }>
  clues: Array<{
    id: string
    clueText: string
    clueType: string
  }>
  _count: {
    participants: number
    clues: number
  }
}

export default function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (!response.ok) {
        throw new Error('Failed to fetch games')
      }
      const data = await response.json()
      setGames(data)
    } catch (error) {
      console.error('Error fetching games:', error)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const copyPartyLink = async (gameId: string) => {
    const link = `${window.location.origin}/party/${gameId}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedGameId(gameId)
      setTimeout(() => setCopiedGameId(null), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const openPartyInterface = (gameId: string) => {
    const link = `${window.location.origin}/party/${gameId}`
    window.open(link, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isPartyDay = (dateString: string) => {
    const today = new Date()
    const partyDate = new Date(dateString)
    return partyDate <= today
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your games...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchGames()
            }}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎄</div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            No games created yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first Secret Santa game to get started!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          My Secret Santa Games
        </h2>
        <p className="text-gray-600">
          Manage your created games and access party interfaces
        </p>
      </div>

      <div className="space-y-6">
        {games.map((game) => {
          const partyDayPassed = isPartyDay(game.partyDate)
          
          return (
            <div key={game.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    {game.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created on {formatDate(game.createdAt)}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyPartyLink(game.id)}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition duration-200"
                  >
                    {copiedGameId === game.id ? (
                      <Check className="w-4 h-4 mr-1" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    {copiedGameId === game.id ? 'Copied!' : 'Copy Link'}
                  </button>
                  
                  <button
                    onClick={() => openPartyInterface(game.id)}
                    className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition duration-200"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Party Interface
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(game.partyDate)}
                    </p>
                    <p className="text-xs">
                      {partyDayPassed ? 'Party day passed' : 'Upcoming party'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <div>
                    <p className="text-sm font-medium">
                      {game._count.participants} participants
                    </p>
                    <p className="text-xs">Budget: {game.giftBudget}</p>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <div>
                    <p className="text-sm font-medium">
                      {game._count.clues} clues generated
                    </p>
                    <p className="text-xs">
                      {partyDayPassed ? 'Clues available' : 'Available on party day'}
                    </p>
                  </div>
                </div>
              </div>

              {game.customMessage && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>Custom Message:</strong> {game.customMessage}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                    <span>View Participants ({game.participants.length})</span>
                    <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform duration-200">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="mt-3 grid md:grid-cols-2 gap-2">
                    {game.participants.map((participant) => (
                      <div key={participant.id} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">{participant.name}</span>
                        <span className="text-gray-500 ml-2">
                          ({participant.gender}, moved {participant.yearMoved})
                        </span>
                      </div>
                    ))}
                  </div>
                </details>

                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center">
                    <span>Preview Game Clues ({game.clues.length})</span>
                    <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform duration-200">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="mt-3 space-y-2">
                    {game.clues.map((clue, index) => (
                      <div key={clue.id} className="bg-blue-50 border border-blue-200 p-3 rounded">
                        <div className="flex items-center space-x-2">
                          <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {clue.clueType}
                          </span>
                          <span className="font-medium text-gray-800">Clue #{index + 1}</span>
                        </div>
                        <p className="text-gray-700 mt-2">{clue.clueText}</p>
                      </div>
                    ))}
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-3">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> These clues will be sent to participants via reminder email the day before the party.
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
