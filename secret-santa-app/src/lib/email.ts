import { Resend } from 'resend'
// Using Participant type from Prisma - will be available after prisma generate
type Participant = {
  id: string
  gameId: string
  name: string
  email: string
  gender: string
  yearMoved: number
}
import { getAssignmentForParticipant } from './crypto'

// Initialize Resend only if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface EmailData {
  gameName: string
  partyDate: string
  partyAddress: string
  giftBudget: string
  customMessage?: string
  gameUrl: string
}

/**
 * Send Secret Santa assignment emails to all participants
 */
export async function sendAssignmentEmails(
  participants: Participant[],
  encryptedAssignments: string,
  emailData: EmailData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured - skipping email sending')
    return // Skip email sending gracefully
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'santa@secretsanta.bar'
  const participantMap = new Map(participants.map(p => [p.id, p]))

  // Send emails sequentially with delays to avoid rate limiting (2 requests/second limit)
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]
    const receiverId = getAssignmentForParticipant(encryptedAssignments, participant.id)
    
    if (!receiverId) {
      console.error(`No assignment found for participant ${participant.name}`)
      continue
    }

    const receiver = participantMap.get(receiverId)
    if (!receiver) {
      console.error(`Receiver not found for ID ${receiverId}`)
      continue
    }

    const emailContent = generateEmailContent(participant, receiver, emailData)
    
    try {
      if (!resend) {
        throw new Error('Resend client not initialized')
      }
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [participant.email],
        subject: emailData.gameName,
        html: emailContent.html,
        text: emailContent.text
      })

      if (error) {
        throw error
      }
      
      console.log(`Assignment email sent to ${participant.email}`)
      
      // Add delay between emails to respect rate limit (500ms = 2 requests/second)
      if (i < participants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    } catch (error) {
      console.error(`Failed to send email to ${participant.email}:`, error)
      // Continue sending other emails even if one fails
    }
  }
}

/**
 * Generate email content for Secret Santa assignment
 */
function generateEmailContent(
  giver: Participant,
  receiver: Participant,
  emailData: EmailData
): { html: string; text: string } {
  const formattedDate = new Date(emailData.partyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Secret Santa Assignment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 10px; }
        .assignment-box { background: white; border: 2px solid #28a745; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .receiver-name { font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0; }
        .details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-item { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 5px; }
        .game-rules { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="content">
        <p>Hi ${giver.name}!</p>
        
        <div class="assignment-box">
          <p>Your Secret Santa assignment is:</p>
          <div class="receiver-name">🎁 ${receiver.name} 🎁</div>
          <p><em>Remember to keep it secret!</em></p>
        </div>
        
        <div class="details">
          <h3>🎊 Party Details</h3>
          <div class="detail-item">
            <strong>📅 Date:</strong> ${formattedDate}
          </div>
          <div class="detail-item">
            <strong>📍 Address:</strong> ${emailData.partyAddress}
          </div>
          <div class="detail-item">
            <strong>💰 Gift Budget:</strong> ${emailData.giftBudget}
          </div>
          ${emailData.customMessage ? `
          <div class="detail-item">
            <strong>📝 Message from organizer:</strong><br>
            ${emailData.customMessage}
          </div>
          ` : ''}
        </div>

        <div class="game-rules">
          <h4>🎯 Game Rules:</h4>
          <ul>
            <li><strong>🎁 Wrap your gift</strong> to keep it a surprise!</li>
            <li><strong>🤐 Keep it secret</strong> even from your partner or roommate</li>
            <li><strong>🕵️ Get ready to guess:</strong> You'll receive clues the day before the party to help you figure out who YOUR Secret Santa is</li>
            <li><strong>🍻 Drinking rules:</strong> If you guess your Santa correctly, they drink! If you guess wrong, you drink!</li>
          </ul>
          <p><strong>Remember:</strong> This is a guessing game - everyone will try to figure out who their Secret Santa is at the party!</p>
        </div>
        
        <div class="footer">
          <p>Keep this email safe and secret! 🤐</p>
          <p>Can't wait to see you at the party! 🎉</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
${emailData.gameName}

Hi ${giver.name}!

Your Secret Santa assignment is: ${receiver.name}

🎊 PARTY DETAILS:
📅 Date: ${formattedDate}
📍 Address: ${emailData.partyAddress}
💰 Gift Budget: ${emailData.giftBudget}
${emailData.customMessage ? `📝 Message: ${emailData.customMessage}` : ''}

🎯 GAME RULES:
• 🎁 Wrap your gift to keep it a surprise!
• 🤐 Keep it secret even from your partner or roommate
• 🕵️ Get ready to guess: You'll receive clues the day before the party to help you figure out who YOUR Secret Santa is
• 🍻 Drinking rules: If you guess your Santa correctly, they drink! If you guess wrong, you drink!

Remember: This is a guessing game - everyone will try to figure out who their Secret Santa is at the party!

Keep this email safe and secret! 🤐
Can't wait to see you at the party! 🎉
  `

  return { html, text }
}

/**
 * Send reminder emails with clues the day before the party
 */
export async function sendReminderEmails(
  participants: Participant[],
  clues: Array<{ clue_text: string; clue_type: string }>,
  emailData: EmailData
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key not configured - skipping reminder email sending')
    return // Skip email sending gracefully
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'santa@secretsanta.bar'

  // Send emails sequentially with delays to avoid rate limiting (2 requests/second limit)
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]
    const emailContent = generateReminderEmailContent(participant, clues, emailData)
    
    try {
      if (!resend) {
        throw new Error('Resend client not initialized')
      }
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [participant.email],
        subject: `${emailData.gameName} - Party tomorrow!`,
        html: emailContent.html,
        text: emailContent.text
      })

      if (error) {
        throw error
      }
      
      console.log(`Reminder email sent to ${participant.email}`)
      
      // Add delay between emails to respect rate limit (600ms = ~1.6 requests/second)
      if (i < participants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    } catch (error) {
      console.error(`Failed to send reminder email to ${participant.email}:`, error)
      // Continue sending other emails even if one fails
    }
  }
}

/**
 * Generate reminder email content with clues
 */
function generateReminderEmailContent(
  participant: Participant,
  clues: Array<{ clue_text: string; clue_type: string }>,
  emailData: EmailData
): { html: string; text: string } {
  const formattedDate = new Date(emailData.partyDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const cluesList = clues.map((clue, index) => `
    <div class="clue-item">
      <span class="clue-number">${index + 1}</span>
      <span class="clue-text">${clue.clue_text}</span>
    </div>
  `).join('')

  const cluesText = clues.map((clue, index) => `${index + 1}. ${clue.clue_text}`).join('\n')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Secret Santa Party Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .countdown-box { background: #ff6b6b; color: white; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .countdown-text { font-size: 24px; font-weight: bold; }
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
        <div class="emoji-large">🎉</div>
        <h1>Party Tomorrow!</h1>
        <h2>${emailData.gameName}</h2>
      </div>
      
      <div class="content">
        <p>Hi ${participant.name}!</p>
        
        <div class="countdown-box">
          <div class="countdown-text">⏰ Less than 24 hours to go!</div>
          <p>Get ready to play detective! 🕵️</p>
        </div>

        <div class="party-details">
          <h3>🎊 Party Reminder</h3>
          <div class="detail-item">
            <strong>📅 Tomorrow:</strong> ${formattedDate}
          </div>
          <div class="detail-item">
            <strong>📍 Address:</strong> ${emailData.partyAddress}
          </div>
          <div class="detail-item">
            <strong>💰 Gift Budget:</strong> ${emailData.giftBudget}
          </div>
        </div>
        
        <div class="clues-section">
          <h3>🕵️ Your Detective Clues</h3>
          <p><strong>Use these clues to figure out who your Secret Santa is!</strong></p>
          ${cluesList}
        </div>

        <div class="game-rules">
          <h4>🍻 Drinking Game Rules Reminder:</h4>
          <ul>
            <li><strong>Guess correctly:</strong> Your Secret Santa drinks!</li>
            <li><strong>Guess wrong:</strong> You drink!</li>
            <li><strong>Strategy:</strong> Use the clues to narrow down the possibilities</li>
          </ul>
          <p><strong>Remember:</strong> Everyone will guess at the same time during the party!</p>
        </div>

        <div style="text-align: center;">
          <a href="${emailData.gameUrl}" class="game-link">
            🎯 View Live Clues at Party
          </a>
          <p><small>Bookmark this link for tomorrow!</small></p>
        </div>
        
        <div class="footer">
          <p>🎁 Don't forget to bring your gift for <strong>[Hidden until party!]</strong></p>
          <p>May the odds (and clues) be ever in your favor! 🥳</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
🎉 PARTY TOMORROW! - ${emailData.gameName}

Hi ${participant.name}!

⏰ Less than 24 hours to go! Get ready to play detective! 🕵️

📅 Tomorrow: ${formattedDate}
📍 Address: ${emailData.partyAddress}
💰 Gift Budget: ${emailData.giftBudget}

🕵️ YOUR DETECTIVE CLUES:
Use these clues to figure out who your Secret Santa is!

${cluesText}

🍻 DRINKING GAME RULES REMINDER:
• Guess correctly: Your Secret Santa drinks!
• Guess wrong: You drink!
• Strategy: Use the clues to narrow down the possibilities
• Remember: Everyone will guess at the same time during the party!

🎯 Live Clues: ${emailData.gameUrl}
(Bookmark this link for tomorrow!)

🎁 Don't forget to bring your gift!
May the odds (and clues) be ever in your favor! 🥳
  `

  return { html, text }
}
