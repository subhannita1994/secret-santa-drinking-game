// Temporary types until Prisma client is generated
// These will be replaced by the actual generated types after running 'prisma generate'

export interface Participant {
  id: string
  gameId: string
  name: string
  email: string
  gender: string
  yearMoved: number
}

export interface Game {
  id: string
  organizerEmail: string
  name: string
  partyDate: Date
  giftBudget: string
  customMessage?: string | null
  createdAt: Date
}

export interface Assignment {
  id: string
  gameId: string
  assignmentHash: string
  createdAt: Date
}

export interface Clue {
  id: string
  gameId: string
  clueText: string
  clueType: string
  selectedForReminder: boolean
}
