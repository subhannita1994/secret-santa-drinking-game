// Using Participant type from Prisma - will be available after prisma generate
type Participant = {
  id: string
  gameId: string
  name: string
  email: string
  gender: string
  yearMoved: number
}
import { Assignment, encryptAssignments } from './crypto'

export interface AssignmentConstraint {
  type: 'no_same_gender' | 'no_couples' | 'custom'
  data?: {
    participant1: string
    participant2: string 
    reason?: string
  }
}

/**
 * Generate random Secret Santa assignments
 */
export function generateAssignments(
  participants: Participant[],
  constraints: AssignmentConstraint[] = []
): string {
  if (participants.length < 2) {
    throw new Error('Need at least 2 participants for Secret Santa')
  }

  const maxAttempts = 100
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      const assignments = attemptAssignment(participants, constraints)
      return encryptAssignments(assignments)
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) {
        console.warn('Using relaxed constraints after max attempts')
        // Fallback: try with relaxed constraints
        const assignments = attemptAssignment(participants, [])
        return encryptAssignments(assignments)
      }
    }
  }

  throw new Error('Could not generate valid assignments')
}

function attemptAssignment(
  participants: Participant[],
  constraints: AssignmentConstraint[]
): Assignment[] {
  const givers = [...participants]
  const receivers = [...participants]
  const assignments: Assignment[] = []

  // Shuffle receivers
  for (let i = receivers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[receivers[i], receivers[j]] = [receivers[j], receivers[i]]
  }

  for (const giver of givers) {
    let validReceiver: Participant | null = null
    
    for (let i = 0; i < receivers.length; i++) {
      const receiver = receivers[i]
      
      // Check if this assignment is valid
      if (isValidAssignment(giver, receiver, assignments, constraints)) {
        validReceiver = receiver
        receivers.splice(i, 1) // Remove receiver from available pool
        break
      }
    }

    if (!validReceiver) {
      throw new Error('No valid receiver found for giver: ' + giver.name)
    }

    assignments.push({
      giverId: giver.id,
      receiverId: validReceiver.id
    })
  }

  return assignments
}

function isValidAssignment(
  giver: Participant,
  receiver: Participant,
  existingAssignments: Assignment[],
  constraints: AssignmentConstraint[]
): boolean {
  // Cannot assign to self
  if (giver.id === receiver.id) {
    return false
  }

  // Check custom constraints
  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'no_same_gender':
        if (giver.gender === receiver.gender) {
          return false
        }
        break
      case 'no_couples':
        if (constraint.data) {
          const { participant1, participant2 } = constraint.data
          // Check if giver->receiver is an excluded pair
          if ((giver.name === participant1 && receiver.name === participant2) ||
              (giver.name === participant2 && receiver.name === participant1)) {
            return false
          }
        }
        break
      default:
        break
    }
  }

  return true
}

/**
 * Validate that assignments are circular (everyone gets exactly one gift)
 */
export function validateAssignments(assignments: Assignment[], participants: Participant[]): boolean {
  const givers = new Set(assignments.map(a => a.giverId))
  const receivers = new Set(assignments.map(a => a.receiverId))
  const participantIds = new Set(participants.map(p => p.id))

  // Check that all participants are givers and receivers
  return givers.size === participants.length &&
         receivers.size === participants.length &&
         [...givers].every(id => participantIds.has(id)) &&
         [...receivers].every(id => participantIds.has(id))
}
