import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { generateAssignments } from '@/lib/assignments'
import { generateClues } from '@/lib/clues'
import { sendAssignmentEmails } from '@/lib/email'
import authOptions from '@/lib/auth'

const createGameSchema = z.object({
  name: z.string().min(1).max(255),
  partyDate: z.string().transform((str) => new Date(str)),
  partyAddress: z.string().min(1).max(500),
  giftBudget: z.string().min(1).max(100),
  customMessage: z.string().optional(),
  participants: z.array(z.object({
    name: z.string().min(1).max(255),
    email: z.string().email(),
    gender: z.enum(['male', 'female', 'other']),
    yearMoved: z.number().int().min(1900).max(new Date().getFullYear())
  })).min(3).max(30),
  exclusions: z.array(z.object({
    participant1: z.string(),
    participant2: z.string(),
    reason: z.string().optional()
  })).optional().default([])
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createGameSchema.parse(body)

    // Create game in database
    const game = await prisma.game.create({
      data: {
        name: validatedData.name,
        organizerEmail: session.user.email,
        partyDate: validatedData.partyDate,
        partyAddress: validatedData.partyAddress,
        giftBudget: validatedData.giftBudget,
        customMessage: validatedData.customMessage,
      }
    })

    // Create participants
    const participants = await Promise.all(
      validatedData.participants.map(participant =>
        prisma.participant.create({
          data: {
            gameId: game.id,
            name: participant.name,
            email: participant.email,
            gender: participant.gender,
            yearMoved: participant.yearMoved
          }
        })
      )
    )

    // Generate assignments with exclusions
    const constraints = validatedData.exclusions?.map(exclusion => ({
      type: 'no_couples' as const,
      data: exclusion
    })) || []
    
    const encryptedAssignments = generateAssignments(participants, constraints)
    
    // Store encrypted assignments
    await prisma.assignment.create({
      data: {
        gameId: game.id,
        assignmentHash: encryptedAssignments
      }
    })

    // Generate clues (excluding obvious patterns based on constraints)
    const clueData = generateClues(encryptedAssignments, participants, validatedData.exclusions)
    
    // Store clues
    await Promise.all(
      clueData.map(clue =>
        prisma.clue.create({
          data: {
            gameId: game.id,
            clueText: clue.text,
            clueType: clue.type
          }
        })
      )
    )

    // Send assignment emails
    try {
      await sendAssignmentEmails(participants, encryptedAssignments, {
        gameName: game.name,
        partyDate: game.partyDate.toISOString(),
        partyAddress: game.partyAddress,
        giftBudget: game.giftBudget,
        customMessage: game.customMessage || undefined,
        gameUrl: `${process.env.NEXTAUTH_URL}/party/${game.id}`
      })
    } catch (emailError) {
      console.error('Failed to send emails:', emailError)
      // Don't fail the entire request if emails fail
    }

    return NextResponse.json({
      gameId: game.id,
      name: game.name,
      partyDate: game.partyDate,
      participantCount: participants.length,
      clueCount: clueData.length
    })

  } catch (error) {
    console.error('Failed to create game:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const games = await prisma.game.findMany({
      where: {
        organizerEmail: session.user.email
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            yearMoved: true
          }
        },
        clues: true,
        _count: {
          select: {
            participants: true,
            clues: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(games)

  } catch (error) {
    console.error('Failed to fetch games:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
