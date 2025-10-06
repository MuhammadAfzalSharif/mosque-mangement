# Fix Summary: Mosque Deleted Admin Login Redirect

## Problem

When an admin whose mosque was deleted tried to login, they received the error "Your mosque has been deleted" but were NOT automatically redirected to the status page to see the details and reapplication option.

## Root Cause

The login handler in `AdminApplicationPage.tsx` was only checking for two error codes:

- `ACCOUNT_REJECTED` (for rejected admins)
- `PENDING_APPROVAL` (for pending admins)

It was **missing** the handler for:

- `MOSQUE_DELETED` (for admins whose mosques were deleted)

## Solution Applied

### File: `Frontend/Mosque Frontend/src/pages/AdminApplicationPage.tsx`

**Added new error code handler:**

```typescript
if (errorResponse.response?.data?.code === "MOSQUE_DELETED") {
  const data = errorResponse.response.data;

  // CRITICAL: Clear ALL storage first to remove old tokens
  localStorage.clear();
  sessionStorage.clear();

  // Store token and user info for status page access
  if (data.token) {
    localStorage.setItem("token", data.token);
    console.log("Saved mosque_deleted admin token:", data.token);
  }
  if (data.admin) {
    localStorage.setItem("user", JSON.stringify(data.admin));
    console.log("Saved mosque_deleted admin user:", data.admin);
  }
  localStorage.setItem("user_type", "admin");

  // Redirect to status page where full profile will be loaded
  window.location.href = "/admin/status";
  return;
}
```

## Flow Diagram

### Before Fix ❌

```
Admin Login (mosque_deleted)
    ↓
Backend returns 403 with MOSQUE_DELETED code
    ↓
Frontend shows error: "Your mosque has been deleted"
    ↓
❌ User stuck on login page
    ❌ Cannot see details
    ❌ Cannot access reapplication
```

### After Fix ✅

```
Admin Login (mosque_deleted)
    ↓
Backend returns 403 with MOSQUE_DELETED code + token
    ↓
Frontend catches MOSQUE_DELETED error code
    ↓
Clears localStorage
    ↓
Saves new token and admin data
    ↓
✅ Automatically redirects to /admin/status
    ↓
Status page loads with mosque_deleted UI
    ↓
Shows:
  ✅ Deleted mosque details
  ✅ Deletion reason and date
  ✅ "Apply for Another Mosque" button
```

## What Happens Now

1. **Login Attempt:**

   - Admin enters email and password
   - Backend recognizes `mosque_deleted` status
   - Returns 403 with error code `MOSQUE_DELETED`

2. **Token Handling:**

   - Frontend receives 30-day valid token
   - Clears all old storage
   - Saves new token and admin info

3. **Automatic Redirect:**

   - No manual navigation needed
   - Automatically goes to `/admin/status`

4. **Status Page Display:**

   - Orange/amber theme (not red like rejection)
   - Shows all deletion details
   - Displays reapplication button

5. **Reapplication:**
   - Click "Apply for Another Mosque"
   - Enter new mosque verification code
   - Submit and wait for approval

## Testing

### Quick Test:

1. Create an admin with approved status
2. Delete their mosque as super admin
3. Try to login with that admin's credentials
4. **Expected:** Automatically redirected to status page showing mosque deletion info

### Console Output:

```
Saved mosque_deleted admin token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Saved mosque_deleted admin user: {_id: "...", status: "mosque_deleted", ...}
Redirecting to /admin/status
```

## Files Modified

1. ✅ `Frontend/Mosque Frontend/src/pages/AdminApplicationPage.tsx`

   - Added MOSQUE_DELETED error code handler
   - Saves token and redirects to status page

2. ✅ `Frontend/Mosque Frontend/src/lib/types.ts`

   - Already has `mosque_deleted` in AdminStatus type
   - Already has `mosque_deletion_info` interface

3. ✅ `Frontend/Mosque Frontend/src/pages/AdminStatusPage.tsx`

   - Already has mosque_deleted status UI

4. ✅ `BackEnd/src/routes/auth.js`
   - Already returns MOSQUE_DELETED error code with token

## All Error Codes Now Handled

✅ `ACCOUNT_REJECTED` → Status Page (rejected UI)
✅ `MOSQUE_DELETED` → Status Page (mosque deleted UI) **[NEW]**
✅ `PENDING_APPROVAL` → Status Page (pending UI)
✅ Success (approved) → Admin Dashboard

## Benefits

1. **Seamless UX:** No confusion, automatic navigation
2. **Informative:** Users immediately see what happened
3. **Actionable:** Clear path to reapply
4. **Consistent:** Same pattern as rejected/pending admins
5. **Secure:** Token-based authentication maintained
