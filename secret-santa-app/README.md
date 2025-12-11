# 🎄 Secret Santa Drinking Game

A Next.js web application that creates the ultimate Secret Santa experience with a twist - it's a drinking game! Participants receive their assignments via email, and at the party, they use generated clues to guess their Secret Santa. Guess wrong? You drink! Guess right? They drink!

## 🎯 Features

- **Secure Assignment System**: Organizers can't see who is whose Secret Santa
- **Automatic Email Notifications**: Participants receive beautiful emails with their assignments
- **Smart Clue Generation**: AI-powered clues based on gender and year moved to Montreal
- **Mobile-Friendly Party Interface**: Easy-to-use clue interface for the party
- **Authentication**: Secure login for game organizers
- **Privacy First**: Encrypted assignments that even the organizer cannot decrypt

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- SendGrid account (free tier available)
- Google OAuth credentials (optional)

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/secretsanta"

# NextAuth.js
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Resend (Email Service)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="santa@secretsanta.bar"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App Configuration
APP_NAME="Secret Santa Game"
APP_URL="http://localhost:3000"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create database and run migrations
npx prisma db push

# Optional: View your database
npx prisma studio
```

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to see your Secret Santa game!

## 📧 Email Configuration

### Setting up Resend

1. Create a [Resend account](https://resend.com/) (free tier: 3,000 emails/month)
2. Generate an API key in Resend dashboard
3. Set up domain authentication (verify your domain or use onboarding domain)
4. Add your API key and verified sender email to `.env.local`

### Email Template

The app automatically sends beautiful HTML emails to participants with:
- Their Secret Santa assignment
- Party details (date, budget, custom message)
- Link to party clues interface
- Game rules explanation

## 🎮 How to Play

1. **Create Game**: Organizer sets up game with participant details
2. **Receive Assignments**: Everyone gets an email with their gift recipient
3. **Party Time**: Use the clue interface to figure out your Secret Santa
4. **Guess & Drink**: Make your guess - wrong guess drinks, right guess makes Santa drink!

## 🛠 Technical Architecture

- **Frontend**: Next.js 14 with React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with serverless functions
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with Google OAuth
- **Email**: Resend with custom HTML templates
- **Security**: Encrypted assignments using AES encryption
- **Hosting**: Designed for Vercel deployment

## 📱 Party Interface

The party interface (`/party/[gameId]`) provides:
- Responsive design for mobile use
- Progressive clue revelation
- Visual progress tracking
- Game rules and status display
- Real-time clue management

## 🔒 Privacy & Security

- **Encrypted Assignments**: Uses AES encryption to secure assignments
- **Organizer Blind**: Even game creators can't see the assignments
- **Email Privacy**: Participant emails are not stored beyond game duration
- **Secure Authentication**: NextAuth.js with OAuth providers

## 🚢 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

```env
DATABASE_URL="your-production-database-url"
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="santa@yourdomain.com"
# Add Google OAuth if using
```

### Database Options

- **Vercel Postgres**: Serverless PostgreSQL (free tier available)
- **Railway**: Simple PostgreSQL hosting
- **Supabase**: PostgreSQL with additional features
- **PlanetScale**: MySQL alternative (requires Prisma config changes)

## 🎨 Customization

### Adding New Clue Types

Edit `src/lib/clues.ts` to add new clue generation logic:

```typescript
// Add custom clue generators
function generateCustomClues(assignments, participantMap) {
  // Your custom logic here
}
```

### Email Template Customization

Modify `src/lib/email.ts` to customize the email template:

```typescript
// Update the HTML template in generateEmailContent()
```

### UI Themes

The app uses Tailwind CSS - customize colors in `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      // Add your custom colors
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and connection string is correct
2. **Email Not Sending**: Check Resend API key and domain verification
3. **Authentication Issues**: Verify NextAuth configuration and OAuth credentials
4. **Build Errors**: Run `npm run lint` and fix any TypeScript errors

### Development Tools

```bash
# Check database
npx prisma studio

# View logs
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 📊 Analytics & Monitoring

For production use, consider adding:
- Error tracking (Sentry)
- Analytics (Google Analytics, Vercel Analytics)
- Performance monitoring
- Database monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use for your own holiday parties!

## 🎄 Credits

Built with love for holiday parties everywhere! Perfect for office parties, friend groups, and family gatherings.

---

**Happy Holidays and Drink Responsibly! 🍻🎄**