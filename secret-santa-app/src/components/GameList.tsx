'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, MessageSquare, ExternalLink, Copy, Check, Mail, Save, RefreshCw } from 'lucide-react'

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
    selected?: boolean
  }>
  _count: {
    participants: number
    clues: number
  }
}

interface ClueSelectionProps {
  game: Game
  onUpdateSelection: (gameId: string, selectedClueIds: string[]) => Promise<void>
  isUpdating: boolean
}

function ClueSelection({ game, onUpdateSelection, isUpdating }: ClueSelectionProps) {
  const [selectedClues, setSelectedClues] = useState<Set<string>>(new Set())

  // Initialize selected clues based on the game data
  useEffect(() => {
    const initialSelected = new Set(
      game.clues
        .filter(clue => clue.selected === true)
        .map(clue => clue.id)
    )
    setSelectedClues(initialSelected)
  }, [game.clues])

  const toggleClue = (clueId: string) => {
    const newSelected = new Set(selectedClues)
    if (newSelected.has(clueId)) {
      newSelected.delete(clueId)
    } else {
      newSelected.add(clueId)
    }
    setSelectedClues(newSelected)
  }

  const handleSaveSelection = () => {
    onUpdateSelection(game.id, Array.from(selectedClues))
  }

  const selectedCount = selectedClues.size
  const hasChanges = selectedCount !== game.clues.filter(clue => clue.selected === true).length ||
    !Array.from(selectedClues).every(id => game.clues.find(clue => clue.id === id)?.selected === true)

  if (game.clues.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <p className="text-gray-600 text-center">
          No clues available. Use the "Regenerate 10 Smart Clues" button above to generate clues for this game.
        </p>
      </div>
    )
  }

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center justify-between">
        <div className="flex items-center">
          <span>Select Clues for Reminders ({selectedCount}/{game.clues.length} selected)</span>
          <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform duration-200">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Select which clues to include in reminder emails.</strong> Only selected clues will be sent to participants.
          </p>
        </div>
        
        {game.clues.map((clue, index) => (
          <div key={clue.id} className={`border p-3 rounded transition-colors ${
            selectedClues.has(clue.id) 
              ? 'bg-green-50 border-green-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedClues.has(clue.id)}
                onChange={() => toggleClue(clue.id)}
                className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-block text-white text-xs px-2 py-1 rounded-full ${
                    clue.clueType === 'gender' ? 'bg-pink-600' :
                    clue.clueType === 'year' ? 'bg-blue-600' :
                    clue.clueType === 'count' ? 'bg-purple-600' :
                    'bg-gray-600'
                  }`}>
                    {clue.clueType}
                  </span>
                  <span className="font-medium text-gray-800">Clue #{index + 1}</span>
                  {selectedClues.has(clue.id) && (
                    <span className="text-green-600 text-xs">✓ Selected for reminders</span>
                  )}
                </div>
                <p className="text-gray-700">{clue.clueText}</p>
              </div>
            </div>
          </div>
        ))}

        {hasChanges && (
          <div className="pt-3 border-t">
            <button
              onClick={handleSaveSelection}
              disabled={isUpdating || selectedCount === 0}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isUpdating || selectedCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Selection ({selectedCount} clue{selectedCount !== 1 ? 's' : ''})</span>
                </>
              )}
            </button>
            {selectedCount === 0 && (
              <p className="text-red-600 text-sm mt-1">Please select at least one clue.</p>
            )}
          </div>
        )}
      </div>
    </details>
  )
}

export default function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedGameId, setCopiedGameId] = useState<string | null>(null)
  const [sendingReminder, setSendingReminder] = useState<string | null>(null)
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null)
  const [updatingClueSelection, setUpdatingClueSelection] = useState<string | null>(null)
  const [regeneratingClues, setRegeneratingClues] = useState<string | null>(null)

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

  const sendReminderEmail = async (gameId: string) => {
    setSendingReminder(gameId)
    setReminderSuccess(null)
    
    try {
      const response = await fetch(`/api/games/${gameId}/send-reminder`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to send reminder emails')
      }
      
      const result = await response.json()
      setReminderSuccess(gameId)
      
      // Clear success message after 3 seconds
      setTimeout(() => setReminderSuccess(null), 3000)
      
    } catch (error) {
      console.error('Error sending reminder emails:', error)
      // Could add error state here if needed
    } finally {
      setSendingReminder(null)
    }
  }

  const updateClueSelection = async (gameId: string, selectedClueIds: string[]) => {
    if (selectedClueIds.length === 0) {
      alert('Please select at least one clue to send in reminder emails.')
      return
    }

    setUpdatingClueSelection(gameId)
    
    try {
      const response = await fetch(`/api/games/${gameId}/clues/selection`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selectedClueIds })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update clue selection')
      }
      
      // Refresh games to get updated selection
      await fetchGames()
      
    } catch (error) {
      console.error('Error updating clue selection:', error)
      alert('Failed to update clue selection. Please try again.')
    } finally {
      setUpdatingClueSelection(null)
    }
  }

  const regenerateClues = async (gameId: string) => {
    if (!confirm('This will replace all existing clues with 10 new intelligent clues. Are you sure?')) {
      return
    }

    setRegeneratingClues(gameId)
    
    try {
      const response = await fetch(`/api/games/${gameId}/regenerate-clues`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate clues')
      }
      
      const result = await response.json()
      
      // Refresh games to get new clues
      await fetchGames()
      
      alert(`✅ ${result.message}! You can now select which clues to send in reminder emails.`)
      
    } catch (error) {
      console.error('Error regenerating clues:', error)
      alert(`Failed to regenerate clues: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRegeneratingClues(null)
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
                
                <div className="flex space-x-2 flex-wrap">
                  <button
                    onClick={() => sendReminderEmail(game.id)}
                    disabled={sendingReminder === game.id}
                    className={`inline-flex items-center px-3 py-2 rounded-lg text-sm transition duration-200 ${
                      reminderSuccess === game.id 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : sendingReminder === game.id
                        ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {sendingReminder === game.id ? (
                      <>
                        <div className="animate-spin w-4 h-4 mr-1 border border-blue-600 border-t-transparent rounded-full"></div>
                        Sending...
                      </>
                    ) : reminderSuccess === game.id ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-1" />
                        Send Reminders
                      </>
                    )}
                  </button>
                  
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

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-800">Game Clues</h4>
                    <button
                      onClick={() => regenerateClues(game.id)}
                      disabled={regeneratingClues === game.id}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition duration-200 ${
                        regeneratingClues === game.id
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      {regeneratingClues === game.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate 10 Smart Clues
                        </>
                      )}
                    </button>
                  </div>
                  
                  {game.clues.length > 0 ? (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-3">
                      <p className="text-sm text-blue-800">
                        <strong>Current:</strong> This game has {game.clues.length} clue{game.clues.length !== 1 ? 's' : ''}. 
                        {game.clues.length < 10 && ' Click "Regenerate" to get 10 intelligent clues with the new enhanced system.'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-3">
                      <p className="text-sm text-yellow-800">
                        <strong>No clues yet.</strong> Click "Regenerate 10 Smart Clues" to generate intelligent clues for this game.
                      </p>
                    </div>
                  )}
                </div>

                <ClueSelection 
                  game={game} 
                  onUpdateSelection={updateClueSelection}
                  isUpdating={updatingClueSelection === game.id}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
