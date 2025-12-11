import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateClues } from '@/lib/clues'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }

    // Verify the user is the organizer of this game
    const game = await prisma.game.findUnique({
      where: { 
        id: gameId,
        organizerEmail: session.user.email
      },
      include: {
        participants: true,
        assignments: true
      }
    })

    if (!game) {
      return NextResponse.json({ 
        error: 'Game not found or you are not the organizer' 
      }, { status: 404 })
    }

    if (!game.assignments || game.assignments.length === 0) {
      return NextResponse.json({ 
        error: 'No assignments found for this game. Cannot regenerate clues without assignments.' 
      }, { status: 400 })
    }

    if (game.participants.length === 0) {
      return NextResponse.json({ 
        error: 'No participants found for this game.' 
      }, { status: 400 })
    }

    // Get exclusions from the original game creation (if any)
    // For now, we'll assume no exclusions, but this could be enhanced to store exclusions
    const exclusions: Array<{participant1: string, participant2: string}> = []

    // Get the encrypted assignments
    const encryptedAssignments = game.assignments[0].assignmentHash

    // Delete existing clues
    await prisma.clue.deleteMany({
      where: { gameId }
    })

    // Generate new clues using the enhanced logic
    const clueData = generateClues(encryptedAssignments, game.participants, exclusions)
    
    // Store new clues (all unselected by default)
    const newClues = await Promise.all(
      clueData.map(clue =>
        prisma.clue.create({
          data: {
            gameId: game.id,
            clueText: clue.text,
            clueType: clue.type,
            selectedForReminder: false
          }
        })
      )
    )

    console.log(`✅ Regenerated ${newClues.length} clues for game: ${game.name}`)

    return NextResponse.json({
      success: true,
      message: `Successfully regenerated ${newClues.length} intelligent clues`,
      clues: newClues.map(clue => ({
        id: clue.id,
        text: clue.clueText,
        type: clue.clueType,
        selected: clue.selectedForReminder
      }))
    })

  } catch (error) {
    console.error('Failed to regenerate clues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
