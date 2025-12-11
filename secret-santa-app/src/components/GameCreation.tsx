'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Calendar, DollarSign, MessageSquare, Users } from 'lucide-react'

const gameSchema = z.object({
  name: z.string().min(1, 'Game name is required').max(255),
  partyDate: z.string().min(1, 'Party date is required'),
  partyAddress: z.string().min(1, 'Party address is required').max(500),
  giftBudget: z.string().min(1, 'Gift budget is required').max(100),
  customMessage: z.string().optional(),
  participants: z.array(z.object({
    name: z.string().min(1, 'Name is required').max(255),
    email: z.string().email('Valid email is required'),
    gender: z.enum(['male', 'female', 'other']),
    yearMoved: z.number()
      .int()
      .min(1900, 'Year must be after 1900')
      .max(new Date().getFullYear(), 'Year cannot be in the future')
  })).min(3, 'At least 3 participants required').max(30, 'Maximum 30 participants allowed'),
  exclusions: z.array(z.object({
    participant1: z.string(),
    participant2: z.string(),
    reason: z.string().optional()
  })).default([])
})

type GameFormData = z.infer<typeof gameSchema>

export default function GameCreation() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exclusions, setExclusions] = useState<Array<{participant1: string, participant2: string, reason?: string}>>([])
  const [newExclusion, setNewExclusion] = useState({participant1: '', participant2: '', reason: 'Partners/Couple'})

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<GameFormData>({
    resolver: zodResolver(gameSchema),
    defaultValues: {
      name: '',
      partyDate: '',
      partyAddress: '',
      giftBudget: '',
      customMessage: '',
      participants: [
        { name: '', email: '', gender: 'male', yearMoved: new Date().getFullYear() },
        { name: '', email: '', gender: 'female', yearMoved: new Date().getFullYear() },
        { name: '', email: '', gender: 'male', yearMoved: new Date().getFullYear() }
      ],
      exclusions: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants'
  })

  const onSubmit = async (data: GameFormData) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          exclusions
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create game')
      }

      const result = await response.json()
      setSuccessMessage(
        `Game "${result.name}" created successfully! ` +
        `${result.participantCount} participants registered and ${result.clueCount} clues generated. ` +
        `Share the party link: ${window.location.origin}/party/${result.gameId}`
      )
      reset()
    } catch (error) {
      console.error('Failed to create game:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create game')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addParticipant = () => {
    append({ 
      name: '', 
      email: '', 
      gender: 'male', 
      yearMoved: new Date().getFullYear() 
    })
  }

  const removeParticipant = (index: number) => {
    if (fields.length > 3) {
      remove(index)
    }
  }

  const participantCount = fields.length

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Create Secret Santa Game
        </h2>
        <p className="text-gray-600">
          Set up your holiday drinking game with clues and email notifications
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Game Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="inline w-4 h-4 mr-1" />
              Game Name
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Montreal House Party Secret Santa"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Party Date
            </label>
            <input
              type="date"
              {...register('partyDate')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.partyDate && (
              <p className="mt-1 text-sm text-red-600">{errors.partyDate.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Party Address
          </label>
          <input
            type="text"
            {...register('partyAddress')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., 123 Rue Saint-Laurent, Montreal, QC H2X 2S9"
          />
          {errors.partyAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.partyAddress.message}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Gift Budget
            </label>
            <input
              type="text"
              {...register('giftBudget')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., $20 CAD"
            />
            {errors.giftBudget && (
              <p className="mt-1 text-sm text-red-600">{errors.giftBudget.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="inline w-4 h-4 mr-1" />
              Participants ({participantCount})
            </label>
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
              {participantCount >= 3 ? `${participantCount} participants` : 'Minimum 3 participants required'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message (Optional)
          </label>
          <textarea
            {...register('customMessage')}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Add any special instructions or notes for participants..."
          />
        </div>

        {/* Participants */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Participants</h3>
            <button
              type="button"
              onClick={addParticipant}
              disabled={participantCount >= 30}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Participant
            </button>
          </div>

          {errors.participants?.root && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errors.participants.root.message}</p>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-800">Participant {index + 1}</h4>
                  {participantCount > 3 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      {...register(`participants.${index}.name`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Full name"
                    />
                    {errors.participants?.[index]?.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.participants[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      {...register(`participants.${index}.email`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="email@example.com"
                    />
                    {errors.participants?.[index]?.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.participants[index]?.email?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Gender
                    </label>
                    <select
                      {...register(`participants.${index}.gender`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.participants?.[index]?.gender && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.participants[index]?.gender?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Year Moved to Montreal
                    </label>
                    <input
                      type="number"
                      {...register(`participants.${index}.yearMoved`, { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="1900"
                      max={new Date().getFullYear()}
                      placeholder="2020"
                    />
                    {errors.participants?.[index]?.yearMoved && (
                      <p className="mt-1 text-xs text-red-600">
                        {errors.participants[index]?.yearMoved?.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exclusions */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Partner Exclusions</h3>
              <p className="text-sm text-gray-600">Prevent certain participants from being matched together (e.g., couples, roommates)</p>
            </div>
          </div>

          {exclusions.length > 0 && (
            <div className="mb-4 space-y-2">
              {exclusions.map((exclusion, index) => (
                <div key={index} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-800">
                      {exclusion.participant1} ↔ {exclusion.participant2}
                    </span>
                    {exclusion.reason && (
                      <span className="text-sm text-gray-600">({exclusion.reason})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExclusions(exclusions.filter((_, i) => i !== index))}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {fields.length >= 2 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Add Exclusion</h4>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    First Person
                  </label>
                  <select
                    value={newExclusion.participant1}
                    onChange={(e) => setNewExclusion({...newExclusion, participant1: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select participant...</option>
                    {fields.map((field, index) => {
                      const name = watch(`participants.${index}.name`)
                      return name ? (
                        <option key={field.id} value={name}>{name}</option>
                      ) : null
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Second Person
                  </label>
                  <select
                    value={newExclusion.participant2}
                    onChange={(e) => setNewExclusion({...newExclusion, participant2: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select participant...</option>
                    {fields.map((field, index) => {
                      const name = watch(`participants.${index}.name`)
                      return name && name !== newExclusion.participant1 ? (
                        <option key={field.id} value={name}>{name}</option>
                      ) : null
                    })}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (newExclusion.participant1 && newExclusion.participant2) {
                        setExclusions([...exclusions, newExclusion])
                        setNewExclusion({participant1: '', participant2: '', reason: 'Partners/Couple'})
                      }
                    }}
                    disabled={!newExclusion.participant1 || !newExclusion.participant2}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition duration-200"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg text-lg transition duration-200"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Creating Game & Sending Emails...
              </div>
            ) : (
              `🎄 Create Game & Send Emails (${participantCount} participants)`
            )}
          </button>
          <p className="text-sm text-gray-600 text-center mt-2">
            Each participant will receive an email with their Secret Santa assignment
          </p>
        </div>
      </form>
    </div>
  )
}
