import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }

    // Fetch game with clues and basic info
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        clues: {
          select: {
            id: true,
            clueText: true,
            clueType: true,
            selectedForReminder: true
          }
        },
        participants: {
          select: {
            name: true
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Show clues immediately after game creation
    // (Party participants will receive clues via reminder email the day before party)

    return NextResponse.json({
      gameId: game.id,
      name: game.name,
      partyDate: game.partyDate,
      participantCount: game.participants.length,
      clues: game.clues.map((clue: any) => ({
        id: clue.id,
        text: clue.clueText,
        type: clue.clueType,
        selected: clue.selectedForReminder
      }))
    })

  } catch (error) {
    console.error('Failed to fetch game clues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
