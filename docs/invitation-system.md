# Multi-Tenant User Invitation System

## Overview

The Figgy invitation system allows team owners and administrators to invite new members to their organisation (tenant) via email. The system is built with security, scalability, and user experience in mind.

## Architecture

### Components

1. **Email Service** (`@figgy/email`)
   - Resend integration for email delivery
   - React Email templates for beautiful, responsive emails
   - Type-safe email operations

2. **Tenant Package** (`@figgy/tenant`)
   - Invitation management actions
   - Member role management
   - Permission queries

3. **TRPC API** (`@figgy/trpc`)
   - Invitation router with secure endpoints
   - Permission-based access control
   - Tenant isolation

4. **Frontend** (Nuxt/Vue)
   - Team management page
   - Invitation acceptance flow
   - Permission-aware UI

## Key Features

### Security
- Token-based invitation links (32-character secure tokens)
- 7-day expiration for invitations
- Single-use invitations
- Email verification
- Row-Level Security (RLS) policies
- Permission-based access control

### User Experience
- Beautiful email templates with Figgy branding
- Clear role descriptions
- Graceful error handling
- Invitation resend capability
- Real-time updates

### Business Logic
- Multiple roles: Owner, Admin, Member, Viewer
- Prevents duplicate invitations
- Prevents removing last owner
- Supports multiple tenants per user (future)

## Implementation Details

### Database Schema

```sql
-- Invitations table (existing)
invitations (
  id: uuid
  tenant_id: uuid
  email: text
  role: member_role
  invited_by: uuid
  token: text (unique)
  expires_at: timestamp
  accepted_at: timestamp (nullable)
  created_at: timestamp
)

-- Unique constraint for pending invitations
UNIQUE (tenant_id, email) WHERE accepted_at IS NULL
```

### Email Configuration

Add to your `.env`:
```bash
RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM_ADDRESS=hello@figgy.com
EMAIL_FROM_NAME=Figgy
INVITATION_BASE_URL=https://app.figgy.com
```

### API Endpoints

#### Send Invitation
```typescript
await $api.invitations.send.mutate({
  email: 'colleague@company.com',
  role: 'member' // 'viewer' | 'member' | 'admin'
});
```

#### List Invitations
```typescript
const invitations = await $api.invitations.list.query();
```

#### Accept Invitation
```typescript
await $api.invitations.accept.mutate({
  token: 'invitation_token_here',
  name: 'John Doe' // optional
});
```

### Frontend Routes

- `/settings/team` - Team management page
- `/auth/accept-invite?token=xxx` - Invitation acceptance page

## Permission Model

### Roles and Permissions

#### Owner
- All permissions
- Cannot be removed if last owner
- Can transfer ownership

#### Admin
- Invite/manage members
- Update tenant settings
- Manage integrations
- Cannot remove owners

#### Member
- View and edit data
- Execute syncs
- Send communications

#### Viewer
- Read-only access to data
- View communications
- View integrations

### Using Permissions in Frontend

```vue
<script setup>
const { can } = usePermissions();

// Check specific permissions
if (can.inviteMembers.value) {
  // Show invite button
}

// Check role levels
const { isOwner, isAdmin, isMember } = usePermissions();
</script>
```

## Email Templates

The invitation email includes:
- Personalised greeting with inviter's name
- Organisation name
- Role description
- Expiration date
- Secure acceptance link
- Figgy branding

## Security Considerations

1. **Tenant Isolation**: All queries automatically filter by tenant
2. **Email Verification**: Only the invited email can accept
3. **Rate Limiting**: Consider adding rate limits for invitation sends
4. **Audit Trail**: All invitations are logged
5. **RLS Policies**: Database-level security enforcement

## Testing

### Manual Testing
1. Send invitation from team page
2. Check email delivery
3. Accept invitation with different scenarios:
   - New user signup
   - Existing user
   - Wrong email
   - Expired invitation

### Integration Tests
```typescript
// Test invitation flow
test('should send and accept invitation', async () => {
  // Send invitation
  const invitation = await inviteMember({
    tenantId: 'test-tenant',
    email: 'test@example.com',
    role: 'member',
    invitedBy: 'user-123'
  });
  
  // Accept invitation
  const member = await acceptInvitation(invitation.token, {
    id: 'new-user-id',
    email: 'test@example.com',
    name: 'Test User'
  });
  
  expect(member.role).toBe('member');
});
```

## Future Enhancements

1. **Bulk Invitations**: Send multiple invitations at once
2. **Custom Invitation Messages**: Allow personalised messages
3. **Domain Whitelisting**: Auto-approve specific email domains
4. **Invitation Analytics**: Track acceptance rates
5. **SSO Integration**: Automatic provisioning via SAML/OIDC
6. **Invitation Templates**: Save common role/permission sets
7. **Scheduled Invitations**: Send invitations at specific times

## Troubleshooting

### Common Issues

1. **Email not received**
   - Check Resend API key
   - Verify domain in Resend dashboard
   - Check spam folder

2. **Invitation already exists**
   - Cancel existing invitation first
   - Or resend existing invitation

3. **Permission denied**
   - Verify user has admin/owner role
   - Check tenant membership status

4. **Expired invitation**
   - Resend invitation from team page
   - Consider extending expiration period

## Monitoring

Track these metrics:
- Invitation send rate
- Acceptance rate
- Time to acceptance
- Failed invitations
- Email bounce rate

Use logging for:
- All invitation operations
- Permission checks
- Email send status
- Error scenarios