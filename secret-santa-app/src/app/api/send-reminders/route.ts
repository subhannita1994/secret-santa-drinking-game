import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminderEmails } from '@/lib/email'

/**
 * Manually send reminder emails for games with party date tomorrow
 * This is a temporary solution - ideally this would be automated with cron jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Get tomorrow's date (party date)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Start of tomorrow

    const dayAfterTomorrow = new Date(tomorrow)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1)

    // Find all games with party date tomorrow
    const games = await prisma.game.findMany({
      where: {
        partyDate: {
          gte: tomorrow,
          lt: dayAfterTomorrow
        }
      },
      include: {
        participants: true,
        clues: true
      }
    })

    if (games.length === 0) {
      return NextResponse.json({ 
        message: 'No games found with party date tomorrow',
        date: tomorrow.toISOString().split('T')[0]
      })
    }

    let emailsSent = 0
    const results = []

    // Send reminder emails for each game
    for (const game of games) {
      try {
        const emailData = {
          gameName: game.name,
          partyDate: game.partyDate.toISOString(),
          partyAddress: game.partyAddress || 'Address TBD',
          giftBudget: game.giftBudget,
          customMessage: game.customMessage,
          gameUrl: `${process.env.NEXTAUTH_URL || 'https://secretsanta.bar'}/party/${game.id}`
        }

        await sendReminderEmails(
          game.participants.map(p => ({
            id: p.id,
            gameId: p.gameId,
            name: p.name,
            email: p.email,
            gender: p.gender,
            yearMoved: p.yearMoved
          })),
          game.clues.map(c => ({
            clue_text: c.clueText,
            clue_type: c.clueType
          })),
          emailData
        )

        emailsSent += game.participants.length
        results.push({
          gameId: game.id,
          gameName: game.name,
          participantCount: game.participants.length,
          status: 'success'
        })

        console.log(`✅ Reminder emails sent for game: ${game.name} (${game.participants.length} participants)`)

      } catch (error) {
        console.error(`❌ Failed to send reminders for game ${game.name}:`, error)
        results.push({
          gameId: game.id,
          gameName: game.name,
          participantCount: game.participants.length,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Reminder email process completed',
      gamesProcessed: games.length,
      totalEmailsSent: emailsSent,
      results
    })

  } catch (error) {
    console.error('❌ Error in send-reminders API:', error)
    return NextResponse.json(
      { error: 'Failed to process reminder emails' },
      { status: 500 }
    )
  }
}
