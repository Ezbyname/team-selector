# TODO: Pre-Production Improvements

**Status:** Not blocking beta testing  
**Priority:** Fix after initial real-user feedback  

This document tracks technical cleanup, UX improvements, and growth features that should be implemented **after** the critical pre-beta fixes are complete and real users have tested the app.

---

## Later Technical Cleanup

### High Priority (Post-Beta)

- [ ] **Consolidate duplicate country selector code** (920+ lines across 3 files)
  - Extract to `/frontend/components/country-selector.html`
  - Update all references to use shared component
  - Effort: 1 hour

- [ ] **Unify auth pages and remove duplicate login flows**
  - Merge `index.html` and `login.html` auth logic
  - Create `/frontend/lib/auth.js` shared module
  - Unify token storage (currently 3 different keys: `authToken`, `token`, `jwtToken`)
  - Effort: 5 hours

- [ ] **Create shared frontend API client**
  - Extract repeated fetch calls to `/frontend/lib/api-client.js`
  - Consistent error handling and auth header management
  - Effort: 4 hours

- [ ] **Reduce inline JavaScript/CSS**
  - Move inline scripts to separate .js files
  - Move inline styles to .css files
  - Improves caching and enables CSP
  - Effort: 20 hours

### Medium Priority

- [ ] **Add frontend E2E tests** (Playwright or Cypress)
  - Critical user flows: login → join team → view teams
  - Invite link flow: share → join → success
  - Admin flows: create team → manage invites → transfer ownership
  - Effort: 8 hours

- [ ] **Improve CORS allowlist**
  - Replace wildcard `*` with specific allowed origins
  - Add environment variable `ALLOWED_ORIGINS`
  - Dynamic origin validation
  - Effort: 1 hour

- [ ] **Add request logging / monitoring**
  - Implement Vercel Log Drains or similar
  - Alert on 500 errors, rate limit violations
  - Track API usage patterns
  - Effort: 2 hours

- [ ] **Clean up dual table model or add proper transaction strategy**
  - Either: consolidate `groups` + `permanent_groups` into single table
  - Or: implement Supabase transactions for atomic writes
  - Prevents orphaned records on failure
  - Effort: 6 hours (consolidation) or 3 hours (transactions)

### Low Priority

- [ ] **Fix migration numbering conflict**
  - Two "004" migrations exist:
    - `004_groups_players_sessions.sql`
    - `004_unique_active_membership.sql`
  - Renumber migrations sequentially
  - Effort: 30 minutes

- [ ] **Implement proper test framework** (Vitest or Jest)
  - Current: plain Node.js test scripts
  - Move to structured test framework with coverage reporting
  - Effort: 4 hours

- [ ] **Standardize error response format**
  - Inconsistent `{ error }` vs `{ success, error }` patterns
  - Create unified error response structure
  - Effort: 2 hours

---

## Later Product / UX

### High Priority (Post-Beta)

- [ ] **Finish invite link share flow**
  - Currently: functional but needs polish
  - Add: success animations, better error states
  - Effort: 2 hours

- [ ] **Team settings page**
  - View full member list with roles and join dates
  - Remove member action (soft delete)
  - Edit team name and sport
  - Effort: 6 hours

- [ ] **Member management UI**
  - Promote user to sub_admin
  - Demote sub_admin to user
  - Visual role badges
  - Effort: 4 hours

- [ ] **Role management UI**
  - Change member roles from UI
  - Currently: only via API
  - Effort: 3 hours

### Medium Priority

- [ ] **Better onboarding**
  - "What is Team Selector?" intro screen
  - "Join a team first" suggestion (lower friction than create)
  - Skip button for returning users
  - Effort: 3 hours

- [ ] **Improved empty states**
  - "No teams yet" → "Join with Code" button
  - "No sessions yet" → "Ask admin to create one"
  - Guide users to next logical action
  - Effort: 2 hours

- [ ] **Mobile UX polish**
  - Increase touch targets to 44×44px minimum
  - Bottom-aligned primary actions (thumb zone)
  - Swipe gestures for navigation
  - Effort: 4 hours

- [ ] **Hebrew/RTL final polish**
  - Replace physical CSS properties with logical properties
  - Test with actual Hebrew content
  - Mirror icons and layouts
  - Effort: 4 hours

### Low Priority

- [ ] **Visual redesign refinement**
  - Fix color contrast ratios (currently 2.8:1, need 4.5:1 for WCAG AA)
  - Choose primary color (NBA orange OR purple, not both)
  - Standardize button patterns (currently 3+ variants)
  - Effort: 10 hours

---

## Later Growth Features

### Phase 3: Retention & Engagement (Sprint 5-6, ~2 weeks)

**Goal:** Keep users coming back

- [ ] **Session RSVP system** [HIGHEST PRIORITY NEXT FEATURE]
  - "I'm coming" / "I'm out" buttons
  - Show attendance count before generating teams
  - Notify admins when threshold reached
  - **Impact:** Solves "admins don't know who's coming" pain point
  - Effort: 8 hours

- [ ] **Guest player support**
  - "Invite Guest" for single session
  - No account required for one-time players
  - Temporary rating assignment
  - **Impact:** Removes friction, increases session attendance
  - Effort: 6 hours

- [ ] **Session history**
  - Past team compositions
  - Win/loss tracking (optional)
  - "Generate Similar Teams" button
  - **Impact:** Users want to remember past teams
  - Effort: 4 hours

### Phase 4: Polish & Accessibility (Sprint 7, ~1 week)

- [ ] **Color system overhaul**
  - Achieve WCAG AA compliance
  - Define primary, secondary, accent, success, error colors
  - Effort: 4 hours

- [ ] **Component library standardization**
  - Unified button, card, form input designs
  - Document design system
  - Effort: 6 hours

- [ ] **Accessibility audit fixes**
  - Screen reader testing
  - Keyboard navigation
  - Focus indicators
  - Effort: 4 hours

### Phase 5: Growth & Monetization (Sprint 8-10, ~3 weeks)

**Goal:** Launch freemium model, grow user base

- [ ] **Freemium tier implementation**
  - Free: 2 teams, 10 sessions/month
  - Pro: Unlimited teams, unlimited sessions, $10/month
  - Usage tracking and enforcement
  - Effort: 6 hours

- [ ] **Payment integration** (Stripe)
  - Subscription flow
  - Upgrade/downgrade logic
  - Invoice management
  - Effort: 12 hours

- [ ] **Viral loops**
  - "Share Team Selector" incentive
  - Referral tracking
  - Admin invite analytics
  - Effort: 8 hours

- [ ] **Landing page**
  - Product marketing
  - Pricing page
  - Sign-up conversion optimization
  - Effort: 8 hours

### Optional Future Features (No Timeline)

- [ ] **Player connection preferences UI**
  - Already partially implemented (keep-together/keep-apart)
  - Add UI for managing connections
  - Effort: 6 hours

- [ ] **Anonymous rating system**
  - Crowdsource ratings to remove admin bias
  - Requires moderation to prevent abuse
  - Effort: 12 hours

- [ ] **Mobile PWA with push notifications**
  - Add to home screen prompt
  - Offline fallback page
  - Push notifications for session reminders
  - Effort: 8 hours

- [ ] **Admin analytics dashboard**
  - Team engagement metrics
  - Active vs. inactive members
  - Session frequency trends
  - Effort: 10 hours

---

## Features to AVOID (Scope Creep)

These features were considered but should NOT be implemented:

❌ **In-App Chat / Messaging**
- Users already use WhatsApp/Telegram/iMessage
- Effort: 40+ hours, moderation burden
- Alternative: Integrate with existing platforms

❌ **Social Feed / Activity Stream**
- Not core to team balancing
- Effort: 30+ hours
- Alternative: Focus on core product value

❌ **Fantasy Sports Integration**
- Completely different product
- Legal/licensing complexity
- Effort: 200+ hours

❌ **Video Highlights / Game Recording**
- Storage costs explode
- Effort: 100+ hours
- Alternative: Partner with Hudl/Veo if demand exists

❌ **Built-In Payment System for Team Fees**
- Complex regulatory burden
- Effort: 60+ hours
- Alternative: Suggest Venmo/PayPal in team notes

❌ **Multi-Sport Scheduling Calendar**
- Competing with mature products (TeamSnap)
- Effort: 80+ hours
- Alternative: Export to Google Calendar

---

## Maintenance & Monitoring

### Ongoing Tasks (Post-Launch)

- [ ] Monitor Upstash Redis usage and costs
- [ ] Review rate limit effectiveness (429 responses)
- [ ] Track API response times (target: P95 < 500ms)
- [ ] Monitor error rates (target: < 1% of requests)
- [ ] Review user support tickets for patterns
- [ ] Update dependencies quarterly
- [ ] Review and optimize database queries

---

**Last Updated:** 2026-04-25  
**Next Review:** After initial beta user feedback (Week 6)
