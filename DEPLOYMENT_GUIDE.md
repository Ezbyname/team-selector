# Deployment & Setup Guide

## Current Status

✅ **Code pushed to GitHub**: https://github.com/Ezbyname/team-selector
✅ **All tests passing**: Backend (12/12), Unit tests (18/18)
⚠️ **Vercel deployment blocked**: Hobby plan limited to 12 serverless functions (app has 28+ route handlers)

## Option 1: Upgrade Vercel Plan (Recommended for Production)

**Immediate deployment to share with friends:**

1. Upgrade to Vercel Pro plan: https://vercel.com/pricing
   - Cost: $20/month per user
   - Unlimited serverless functions
   - Custom domains
   - Better performance limits

2. Once upgraded, deploy:
   ```bash
   cd "C:\Codes\team selector"
   vercel --prod
   ```

3. Your app will be live at: `https://team-selector-[yourname].vercel.app`

## Option 2: Alternative Free Hosting

### A. Use Vercel Dev Server (Temporary Sharing)

**For testing with friends locally:**

1. Start the server:
   ```bash
   cd "C:\Codes\team selector"
   vercel dev
   ```

2. Use ngrok to expose it publicly:
   ```bash
   ngrok http 3000
   ```

3. Share the ngrok URL with your friends (temporary, resets when you close it)

### B. Deploy to Railway (Free tier alternative)

Railway offers 500 hours/month free (enough for testing):

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

3. Add environment variables in Railway dashboard:
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
   - JWT_SECRET
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_PHONE_NUMBER

### C. Deploy to Render (Free tier)

1. Go to https://render.com
2. Connect your GitHub repo
3. Create a new "Web Service"
4. Set build command: `npm install`
5. Set start command: `node api/index.js` (requires creating a consolidated entry point)
6. Add environment variables

## Setup Steps Once Deployed

### 1. Register as Admin

1. Visit your deployed URL
2. Click "Start New Session"  
3. Enter your phone number
4. Complete OTP verification
5. Create your account

### 2. Promote Yourself to Admin

Run this SQL in Supabase SQL Editor:

```sql
-- Replace 'YOUR_PHONE' with your actual phone number
UPDATE auth_users 
SET role = 'admin', can_grade_players = true
WHERE phone_normalized = 'YOUR_PHONE';
```

### 3. Create Sub-Admins

Use the admin API endpoint or run SQL:

```sql
-- Make another user a sub-admin with grading permission
UPDATE auth_users 
SET role = 'sub_admin', can_grade_players = true
WHERE phone_normalized = 'FRIEND_PHONE';
```

Or via API (after logging in as admin):

```bash
curl -X POST https://your-app.vercel.app/api/admin/create-sub-admin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "friend-user-id"}'
```

### 4. Create Your First Group

1. Login to the app
2. Go to session setup
3. Click "Create Group" (you may need to add this UI button, or use API):

```bash
curl -X POST https://your-app.vercel.app/api/groups/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Friday Basketball", "location": "Community Center", "sport": "basketball"}'
```

### 5. Add Players to Group

Via API:

```bash
curl -X POST https://your-app.vercel.app/api/players/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"groupId": "GROUP_ID", "name": "Player Name", "position": "Guard", "defaultRating": 7}'
```

Add all your regular players (10-15 players recommended).

### 6. Grade Players

Sub-admins can grade players:

```bash
curl -X POST https://your-app.vercel.app/api/players/grade \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"playerId": "PLAYER_ID", "grade": 8}'
```

Ratings:
- 1-3: Beginner
- 4-6: Intermediate
- 7-8: Advanced
- 9-10: Elite

Multiple people can grade each player - the system averages ratings with a ceiling bias.

### 7. Generate Teams for Game Day

1. Go to "Start New Session"
2. Select your group
3. Check which players are present
4. Set team size (e.g., 5 for full court basketball)
5. Click "Generate Teams"
6. Teams are balanced automatically!
7. Click "Regenerate" for different fair matchups

## Quick Start (For Today)

**Fastest way to share with friends RIGHT NOW:**

1. Start local server:
   ```bash
   cd "C:\Codes\team selector"
   vercel dev
   ```

2. In a new terminal, expose publicly:
   ```bash
   ngrok http 3000
   ```

3. Share the ngrok URL (e.g., `https://abc123.ngrok.io`)

4. Tell your friends to:
   - Visit the URL
   - Register with their phone numbers
   - You'll promote them to sub-admin via SQL

5. Create a group and add players together

6. Start generating balanced teams!

## Limitations by Plan

| Feature | Hobby (Free) | Pro ($20/mo) |
|---------|-------------|--------------|
| Serverless Functions | 12 max | Unlimited |
| Execution Time | 10s | 300s |
| Bandwidth | 100GB | 1TB |
| Builds per Day | 100 | 6000 |
| Team Members | 1 | Unlimited |

## Troubleshooting

### "No more than 12 functions" error
- Solution: Upgrade to Pro plan OR use alternative hosting (Railway/Render)

### OTP not received
- Check Twilio account balance
- Verify TWILIO_PHONE_NUMBER is verified
- Check phone number format (use international format with country code)

### "Session not found" error
- Ensure you're logged in
- Clear browser cache and re-login

### Teams not balanced
- Check that players have been graded OR have different default ratings
- Verify at least 4+ players selected
- Regenerate multiple times to see different balanced options

## Support

- Report issues: https://github.com/Ezbyname/team-selector/issues
- Local testing: `vercel dev` on http://localhost:3000
- Test credentials: phone `058-000-0000`, password `AdminPass123!` (development only)
