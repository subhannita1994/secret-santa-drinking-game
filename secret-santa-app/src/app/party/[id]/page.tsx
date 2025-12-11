'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, RefreshCw, Users, Calendar, Gift } from 'lucide-react'

interface Clue {
  id: string
  text: string
  type: string
}

interface GameData {
  gameId: string
  name: string
  partyDate: string
  participantCount: number
  clues: Clue[]
  message?: string
}

export default function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const [gameData, setGameData] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealedClues, setRevealedClues] = useState<Set<string>>(new Set())
  const [allRevealed, setAllRevealed] = useState(false)
  const [gameId, setGameId] = useState<string | null>(null)

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setGameId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (gameId) {
      fetchGameData()
    }
  }, [gameId])

  const fetchGameData = async () => {
    if (!gameId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/games/${gameId}/clues`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Game not found')
        }
        throw new Error('Failed to load game data')
      }
      
      const data = await response.json()
      setGameData(data)
    } catch (error) {
      console.error('Error fetching game data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load game data')
    } finally {
      setLoading(false)
    }
  }

  const toggleClue = (clueId: string) => {
    const newRevealed = new Set(revealedClues)
    if (newRevealed.has(clueId)) {
      newRevealed.delete(clueId)
    } else {
      newRevealed.add(clueId)
    }
    setRevealedClues(newRevealed)
  }

  const revealAllClues = () => {
    if (allRevealed) {
      setRevealedClues(new Set())
      setAllRevealed(false)
    } else {
      const allClueIds = new Set(gameData?.clues.map(clue => clue.id) || [])
      setRevealedClues(allClueIds)
      setAllRevealed(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getClueTypeIcon = (type: string) => {
    switch (type) {
      case 'gender':
        return '♂♀'
      case 'year':
        return '📅'
      case 'count':
        return '🔢'
      case 'specific':
        return '🎯'
      default:
        return '🔍'
    }
  }

  const getClueTypeColor = (type: string) => {
    switch (type) {
      case 'gender':
        return 'bg-pink-50 border-pink-200 text-pink-800'
      case 'year':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'count':
        return 'bg-purple-50 border-purple-200 text-purple-800'
      case 'specific':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading party clues...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchGameData}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">No game data available</p>
        </div>
      </div>
    )
  }

  // Clues are now available immediately after game creation

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎄 {gameData.name}
            </h1>
            <p className="text-lg text-gray-600">Secret Santa Drinking Game</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Game Info */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="flex items-center justify-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-800">Party Date</p>
                  <p className="text-sm text-gray-600">{formatDate(gameData.partyDate)}</p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-800">Participants</p>
                  <p className="text-sm text-gray-600">{gameData.participantCount} people</p>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Gift className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-gray-800">Game Status</p>
                  <p className="text-sm text-gray-600">
                    {gameData.clues.length > 0 ? 'Ready to Play!' : 'Setting Up...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Rules */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              🍻 Game Rules
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                <h3 className="font-bold text-green-800 mb-2">✅ Guess Correctly</h3>
                <p className="text-green-700">
                  If you correctly guess who your Secret Santa is, <strong>they have to drink!</strong>
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
                <h3 className="font-bold text-red-800 mb-2">❌ Guess Wrong</h3>
                <p className="text-red-700">
                  If you guess incorrectly, <strong>you have to drink!</strong>
                </p>
              </div>
            </div>
            <div className="mt-4 text-center text-gray-600">
              <p>Use the clues below to figure out who gave you your gift! 🕵️</p>
            </div>
          </div>

          {gameData.clues.length === 0 ? (
            /* No Clues Available */
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Game Created!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Your Secret Santa assignments have been sent via email. Clues will be available soon!
              </p>
              <button
                onClick={fetchGameData}
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition duration-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Clues
              </button>
            </div>
          ) : (
            /* Clues Section */
            <>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">
                    🕵️ Detective Clues ({gameData.clues.length})
                  </h2>
                  <button
                    onClick={revealAllClues}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition duration-200"
                  >
                    {allRevealed ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide All
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Reveal All
                      </>
                    )}
                  </button>
                </div>

                {gameData.clues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No clues available yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {gameData.clues.map((clue, index) => {
                      const isRevealed = revealedClues.has(clue.id)
                      
                      return (
                        <div key={clue.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleClue(clue.id)}
                            className="w-full p-4 text-left hover:bg-gray-50 transition duration-200 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getClueTypeColor(clue.type)}`}>
                                {getClueTypeIcon(clue.type)} {clue.type}
                              </div>
                              <span className="font-medium text-gray-800">
                                Clue #{index + 1}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isRevealed ? (
                                <EyeOff className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          </button>
                          
                          {isRevealed && (
                            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                              <p className="text-gray-700 font-medium pt-3">
                                {clue.text}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Progress Indicator */}
              {gameData.clues.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-lg p-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>
                      Progress: {revealedClues.size} of {gameData.clues.length} clues revealed
                    </span>
                    <span>
                      {Math.round((revealedClues.size / gameData.clues.length) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(revealedClues.size / gameData.clues.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
