import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

/**
 * Send reminder email with clues to all participants of a specific game
 * Sends one group email to all participants since clues are the same for everyone
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: gameId } = await params

    if (!gameId) {
      return NextResponse.json({ error: 'Game ID required' }, { status: 400 })
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY || !resend) {
      return NextResponse.json({ 
        error: 'Email service not configured',
        message: 'Resend API key is not set up'
      }, { status: 500 })
    }

    // Fetch the game with participants and selected clues
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        participants: true,
        clues: {
          where: { selectedForReminder: true }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.participants.length === 0) {
      return NextResponse.json({ error: 'No participants found' }, { status: 400 })
    }

    if (game.clues.length === 0) {
      return NextResponse.json({ error: 'No clues selected for reminder emails. Please select clues first.' }, { status: 400 })
    }

    // Prepare email data
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'santa@secretsanta.bar'
    const participantEmails = game.participants.map(p => p.email)
    
    const formattedDate = new Date(game.partyDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Generate email content
    const cluesList = game.clues.map((clue, index) => `
      <div class="clue-item">
        <span class="clue-number">${index + 1}</span>
        <span class="clue-text">${clue.clueText}</span>
      </div>
    `).join('')

    const cluesText = game.clues.map((clue, index) => `${index + 1}. ${clue.clueText}`).join('\n')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Secret Santa Party Clues</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .clues-section { background: white; border-radius: 8px; padding: 25px; margin: 20px 0; border: 2px solid #28a745; }
          .clue-item { display: flex; align-items: center; margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; }
          .clue-number { background: #007bff; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
          .clue-text { font-size: 16px; }
          .game-rules { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .party-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-item { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }
          .game-link { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 15px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
          .emoji-large { font-size: 2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="emoji-large">🕵️</div>
          <h1>Secret Santa Clues!</h1>
          <h2>${game.name}</h2>
        </div>
        
        <div class="content">
          <p>Hello Secret Santa participants!</p>
          
          <div class="party-details">
            <h3>🎊 Party Details</h3>
            <div class="detail-item">
              <strong>📅 Date:</strong> ${formattedDate}
            </div>
            ${game.partyAddress ? `
            <div class="detail-item">
              <strong>📍 Address:</strong> ${game.partyAddress}
            </div>
            ` : ''}
            <div class="detail-item">
              <strong>💰 Gift Budget:</strong> ${game.giftBudget}
            </div>
            ${game.customMessage ? `
            <div class="detail-item">
              <strong>📝 Message from organizer:</strong><br>
              ${game.customMessage}
            </div>
            ` : ''}
          </div>
          
          <div class="clues-section">
            <h3>🕵️ Your Detective Clues</h3>
            <p><strong>Use these clues to figure out who your Secret Santa is!</strong></p>
            ${cluesList}
          </div>

          <div class="game-rules">
            <h4>🍻 Drinking Game Rules:</h4>
            <ul>
              <li><strong>Guess correctly:</strong> Your Secret Santa drinks!</li>
              <li><strong>Guess wrong:</strong> You drink!</li>
              <li><strong>Strategy:</strong> Use the clues to narrow down the possibilities</li>
            </ul>
            <p><strong>Remember:</strong> Everyone will guess at the same time during the party!</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL || 'https://secretsanta.bar'}/party/${game.id}" class="game-link">
              🎯 View Live Clues at Party
            </a>
            <p><small>Bookmark this link for the party!</small></p>
          </div>
          
          <div class="footer">
            <p>🎁 Don't forget to bring your wrapped gift!</p>
            <p>May the odds (and clues) be ever in your favor! 🥳</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
🕵️ SECRET SANTA CLUES - ${game.name}

Hello Secret Santa participants!

PARTY DETAILS:
📅 Date: ${formattedDate}
${game.partyAddress ? `📍 Address: ${game.partyAddress}` : ''}
💰 Gift Budget: ${game.giftBudget}
${game.customMessage ? `📝 Message: ${game.customMessage}` : ''}

YOUR DETECTIVE CLUES:
Use these clues to figure out who your Secret Santa is!

${cluesText}

🍻 DRINKING GAME RULES:
• Guess correctly: Your Secret Santa drinks!
• Guess wrong: You drink!
• Strategy: Use the clues to narrow down the possibilities
• Remember: Everyone will guess at the same time during the party!

🎯 View Live Clues: ${process.env.NEXTAUTH_URL || 'https://secretsanta.bar'}/party/${game.id}

🎁 Don't forget to bring your wrapped gift!
May the odds (and clues) be ever in your favor! 🥳
    `

    // Send the email to all participants
    const { data, error } = await resend.emails.send({
      from: `Secret Santa <${fromEmail}>`,
      to: participantEmails,
      subject: `🕵️ ${game.name} - Party Clues Inside!`,
      html,
      text
    })

    if (error) {
      console.error('Resend API error:', error)
      return NextResponse.json({ 
        error: 'Failed to send emails',
        details: error
      }, { status: 500 })
    }

    console.log(`✅ Reminder email sent to ${participantEmails.length} participants for game: ${game.name}`)

    return NextResponse.json({
      success: true,
      message: `Reminder email sent to ${participantEmails.length} participants`,
      recipientCount: participantEmails.length,
      gameId: game.id,
      gameName: game.name
    })

  } catch (error) {
    console.error('Error in send-reminder API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
