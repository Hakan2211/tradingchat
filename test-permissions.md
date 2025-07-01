# Message Permission System Test Plan

## Overview

This test plan verifies that the message editing and deletion permissions are working correctly according to the role-based access control system.

## Permission Rules

### User Role (Default for new users)

- ✅ Can edit their own messages (`update:message:own`)
- ✅ Can delete their own messages (`delete:message:own`)
- ❌ Cannot edit other users' messages
- ❌ Cannot delete other users' messages

### Admin Role

- ✅ Can edit any message (`update:message:any`)
- ✅ Can delete any message (`delete:message:any`)
- ✅ Can edit their own messages
- ✅ Can delete their own messages

### Moderator Role

- ✅ Can edit any message (`update:message:any`)
- ✅ Can delete any message (`delete:message:any`)
- ✅ Can edit their own messages
- ✅ Can delete their own messages

## Test Scenarios

### Scenario 1: Regular User Permissions

**Setup:**

- User A: Regular user (user role)
- User B: Regular user (user role)
- Both users in the same chat room

**Test Cases:**

1. **User A tries to edit their own message**

   - ✅ Should see edit button
   - ✅ Should be able to edit successfully
   - ✅ Server should allow the action

2. **User A tries to edit User B's message**

   - ❌ Should NOT see edit button
   - ❌ If somehow triggered, server should return 403 Forbidden

3. **User A tries to delete their own message**

   - ✅ Should see delete button
   - ✅ Should be able to delete successfully
   - ✅ Server should allow the action

4. **User A tries to delete User B's message**
   - ❌ Should NOT see delete button
   - ❌ If somehow triggered, server should return 403 Forbidden

### Scenario 2: Admin User Permissions

**Setup:**

- User A: Admin user (admin role)
- User B: Regular user (user role)
- Both users in the same chat room

**Test Cases:**

1. **Admin tries to edit their own message**

   - ✅ Should see edit button
   - ✅ Should be able to edit successfully

2. **Admin tries to edit User B's message**

   - ✅ Should see edit button
   - ✅ Should be able to edit successfully

3. **Admin tries to delete their own message**

   - ✅ Should see delete button
   - ✅ Should be able to delete successfully

4. **Admin tries to delete User B's message**
   - ✅ Should see delete button
   - ✅ Should be able to delete successfully

### Scenario 3: Moderator User Permissions

**Setup:**

- User A: Moderator user (moderator role)
- User B: Regular user (user role)
- Both users in the same chat room

**Test Cases:**

1. **Moderator tries to edit their own message**

   - ✅ Should see edit button
   - ✅ Should be able to edit successfully

2. **Moderator tries to edit User B's message**

   - ✅ Should see edit button
   - ✅ Should be able to edit successfully

3. **Moderator tries to delete their own message**

   - ✅ Should see delete button
   - ✅ Should be able to delete successfully

4. **Moderator tries to delete User B's message**
   - ✅ Should see delete button
   - ✅ Should be able to delete successfully

## Implementation Verification

### Client-Side Checks (chat-message.tsx)

```typescript
const canEditAny = userHasPermission(currentUser, 'update:message:any');
const canEditOwn = userHasPermission(currentUser, 'update:message:own');
const canDeleteAny = userHasPermission(currentUser, 'delete:message:any');
const canDeleteOwn = userHasPermission(currentUser, 'delete:message:own');
const isOwner = message.user?.id === currentUser.id;

const showEditButton = canEditAny || (canEditOwn && isOwner);
const showDeleteButton = canDeleteAny || (canDeleteOwn && isOwner);
```

**Expected Behavior:**

- ✅ Regular users only see edit/delete buttons on their own messages
- ✅ Admins/Moderators see edit/delete buttons on all messages
- ✅ Permission checks work correctly for all role combinations

### Server-Side Checks (chat-room.tsx)

```typescript
// For editing messages
await requirePermission(request, 'update:message', message.userId || undefined);

// For deleting messages
await requirePermission(request, 'delete:message', message.userId || undefined);
```

**Expected Behavior:**

- ✅ Regular users can only edit/delete their own messages
- ✅ Admins/Moderators can edit/delete any message
- ✅ Server returns 403 Forbidden for unauthorized actions

## Database Verification

### Permissions Table

```sql
-- Check that message permissions exist
SELECT * FROM Permission WHERE entity = 'message';
```

**Expected Results:**

- `update:message:own`
- `update:message:any`
- `delete:message:own`
- `delete:message:any`

### Role-Permission Mappings

```sql
-- Check user role permissions
SELECT r.name, p.action, p.entity, p.access
FROM Role r
JOIN _PermissionToRole ptr ON r.id = ptr.B
JOIN Permission p ON ptr.A = p.id
WHERE r.name = 'user' AND p.entity = 'message';

-- Check admin role permissions
SELECT r.name, p.action, p.entity, p.access
FROM Role r
JOIN _PermissionToRole ptr ON r.id = ptr.B
JOIN Permission p ON ptr.A = p.id
WHERE r.name = 'admin' AND p.entity = 'message';
```

**Expected Results:**

- **User role**: `update:message:own`, `delete:message:own`
- **Admin role**: `update:message:own`, `update:message:any`, `delete:message:own`, `delete:message:any`

## Testing Commands

```bash
# Start the development server
npm run dev

# Test with multiple browser windows:
# Window 1: Admin user
# Window 2: Regular user
# Window 3: Another regular user

# Check console logs for:
# - Permission check results
# - 403 Forbidden errors for unauthorized actions
# - Successful edit/delete operations
```

## Success Criteria

All test scenarios should work correctly:

- ✅ **Regular users** can only edit/delete their own messages
- ✅ **Admins/Moderators** can edit/delete any message
- ✅ **UI correctly shows/hides** edit/delete buttons based on permissions
- ✅ **Server correctly enforces** permissions and returns appropriate errors
- ✅ **No unauthorized access** is possible through any means
- ✅ **Permission system is consistent** between client and server

## Troubleshooting

If permissions are not working:

1. **Check database**: Run `npm run db:seed` to ensure permissions are set up
2. **Check user roles**: Verify users have the correct roles assigned
3. **Check permission logic**: Verify `userHasPermission` function is working
4. **Check server logs**: Look for 403 errors or permission check failures
5. **Test with different users**: Try with admin vs regular user accounts
