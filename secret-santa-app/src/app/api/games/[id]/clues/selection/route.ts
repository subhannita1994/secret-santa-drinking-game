import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateClueSelectionSchema = z.object({
  selectedClueIds: z.array(z.string()).min(1, "At least one clue must be selected").max(10, "Maximum 10 clues can be selected")
})

export async function PUT(
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
      }
    })

    if (!game) {
      return NextResponse.json({ 
        error: 'Game not found or you are not the organizer' 
      }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateClueSelectionSchema.parse(body)

    // First, set all clues for this game to not selected
    await prisma.clue.updateMany({
      where: { gameId },
      data: { selectedForReminder: false }
    })

    // Then, set the selected clues to true
    await prisma.clue.updateMany({
      where: {
        gameId,
        id: { in: validatedData.selectedClueIds }
      },
      data: { selectedForReminder: true }
    })

    // Return the updated clues
    const updatedClues = await prisma.clue.findMany({
      where: { gameId },
      select: {
        id: true,
        clueText: true,
        clueType: true,
        selectedForReminder: true
      },
      orderBy: { clueText: 'asc' }
    })

    return NextResponse.json({
      success: true,
      message: `${validatedData.selectedClueIds.length} clues selected for reminder emails`,
      clues: updatedClues.map(clue => ({
        id: clue.id,
        text: clue.clueText,
        type: clue.clueType,
        selected: clue.selectedForReminder
      }))
    })

  } catch (error) {
    console.error('Failed to update clue selection:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
