# Direct Messaging Flow Test Plan

## Test Scenarios

### Scenario A: The "Happy Path" - Creating a New DM for the First Time

**Setup:**

- User A (Sender) and User B (Receiver) are both logged in
- No existing DM between them

**Steps:**

1. User A clicks "Message" on User B's profile in the User List
2. Verify User A is immediately redirected to `/chat/[roomId]`
3. Verify User A's sidebar shows the new DM with "User B" instantly (even though it's empty)
4. Verify User B sees nothing - their sidebar doesn't change, no notifications
5. User A types "Hello!" and hits send
6. Verify "Hello!" appears in User A's chat window
7. Verify User B's sidebar now shows the DM with "User A" for the first time

**Expected Results:**

- ✅ User A gets redirected to new chat room
- ✅ User A's sidebar shows new DM immediately
- ✅ User B sees nothing until message is sent
- ✅ User B's sidebar shows DM after first message

### Scenario B: Edge Case 1 - Re-Engaging a "Deleted" Chat

**Setup:**

- User A and User B have existing chat history
- User B has previously "deleted" (hidden) this chat

**Steps:**

1. User A goes to the old chat and sends "Are you there?"
2. Verify User B's sidebar shows the chat with "User A" again
3. Verify the new message appears in User B's chat window

**Expected Results:**

- ✅ User B's sidebar shows the previously hidden chat
- ✅ New message appears in User B's chat

### Scenario C: Edge Case 2 - Deleting the Chat You Are Currently Viewing

**Setup:**

- User A is viewing their chat with User B (`/chat/123`)

**Steps:**

1. User A clicks the dropdown menu on the DM in sidebar
2. User A clicks "Delete Chat"
3. Verify User A is redirected to `/home`
4. Verify the DM with User B is gone from User A's sidebar

**Expected Results:**

- ✅ User A is redirected to home page
- ✅ DM disappears from User A's sidebar

### Scenario D: Multiple Users and Concurrent Actions

**Setup:**

- User A, User B, and User C are all online
- No existing DMs between any of them

**Steps:**

1. User A creates DM with User B
2. User B creates DM with User C (concurrently)
3. User A sends message to User B
4. User C sends message to User B
5. Verify all DMs appear correctly in respective sidebars

**Expected Results:**

- ✅ All DMs appear in correct sidebars
- ✅ Messages are delivered to correct recipients
- ✅ No cross-talk between different DMs

## Implementation Verification

### Key Components to Test:

1. **create-dm.tsx**

   - ✅ Creates/finds DM room correctly
   - ✅ Un-hides room for sender only
   - ✅ No socket events emitted
   - ✅ Redirects to chat room

2. **chat-room.tsx action**

   - ✅ Detects DM rooms correctly
   - ✅ Un-hides room for receiver
   - ✅ Emits `dm.activated` with actual DM data to receiver
   - ✅ Creates message and broadcasts to room

3. **app-layout.tsx loader**

   - ✅ Fetches DMs with correct OR logic
   - ✅ Shows current room even if empty
   - ✅ Excludes hidden rooms
   - ✅ Shows rooms with messages

4. **SocketProvider (Surgical State Updates)**

   - ✅ Listens for `dm.activated` event with DM data
   - ✅ Updates `directMessages` state directly (no revalidation)
   - ✅ Listens for `dm.hidden` event
   - ✅ Removes DMs from state directly
   - ✅ Fallback to revalidation if no data provided

5. **hide-dm.tsx**
   - ✅ Creates hidden room entry
   - ✅ Emits `dm.hidden` event
   - ✅ Redirects to home page

## Potential Issues to Check:

1. **Race Conditions**

   - Multiple users creating DMs simultaneously
   - Socket connection timing issues
   - Revalidation timing

2. **State Synchronization**

   - Sidebar not updating after revalidation
   - Socket state not syncing with loader data
   - Multiple browser tabs

3. **Edge Cases**
   - User disconnects during DM creation
   - Network issues during message sending
   - Invalid room IDs or user IDs

## Testing Commands:

```bash
# Start the development server
npm run dev

# In separate terminals, test with multiple users:
# Terminal 1: User A
# Terminal 2: User B
# Terminal 3: User C

# Check console logs for:
# - "AppLayout loader: Found DMs: X"
# - "SocketProvider: Sent request for user list"
# - "dm.activated" events
# - Room joining/leaving
```

## Success Criteria:

All scenarios should work without:

- ❌ Ghost DMs appearing for receivers before messages
- ❌ Sidebar not updating after actions
- ❌ Messages going to wrong recipients
- ❌ DMs not appearing after being unhidden
- ❌ Console errors or warnings
- ❌ Infinite revalidation loops
- ❌ **Unnecessary re-renders of UserList component**
- ❌ **Over-revalidation causing performance issues**
