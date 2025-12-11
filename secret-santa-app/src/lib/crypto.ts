import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || 'fallback-secret-key'

export interface Assignment {
  giverId: string
  receiverId: string
}

/**
 * Encrypts an array of assignments into a hash that the organizer cannot decrypt
 */
export function encryptAssignments(assignments: Assignment[]): string {
  const assignmentData = JSON.stringify(assignments)
  const encrypted = CryptoJS.AES.encrypt(assignmentData, ENCRYPTION_KEY).toString()
  return encrypted
}

/**
 * Decrypts assignments (used only for clue generation and email sending)
 */
export function decryptAssignments(encryptedData: string): Assignment[] {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decryptedData)
  } catch (error) {
    console.error('Failed to decrypt assignments:', error)
    throw new Error('Invalid assignment data')
  }
}

/**
 * Get assignment for a specific participant (for email sending)
 */
export function getAssignmentForParticipant(
  encryptedData: string,
  participantId: string
): string | null {
  try {
    const assignments = decryptAssignments(encryptedData)
    const assignment = assignments.find(a => a.giverId === participantId)
    return assignment ? assignment.receiverId : null
  } catch {
    return null
  }
}
