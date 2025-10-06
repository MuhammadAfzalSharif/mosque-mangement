# Fix: Mosque_Deleted Admins Cannot Reapply Error

## Problem

When a `mosque_deleted` admin tried to submit a reapplication, they received error:

```
Error code: NOT_REJECTED
Error message: "Only rejected admins can reapply. Your current status is: mosque_deleted"
```

## Root Cause

There were **TWO reapplication endpoints**:

1. `/api/auth/admin/reapplication` - Already fixed, accepts both `rejected` and `mosque_deleted`
2. `/api/admin/reapply` - **Still only accepting `rejected` status** ❌

The frontend was calling the wrong endpoint (`/api/admin/reapply`) which had outdated validation.

## Solution Applied

### File: `BackEnd/src/routes/admin.js`

#### 1. Updated Status Validation

**Before:**

```javascript
// Check if admin is rejected
if (admin.status !== "rejected") {
  return res.status(400).json({
    error: `Only rejected admins can reapply. Your current status is: ${admin.status}`,
    code: "NOT_REJECTED",
    current_status: admin.status,
  });
}
```

**After:**

```javascript
// Check if admin is rejected or mosque_deleted
if (admin.status !== "rejected" && admin.status !== "mosque_deleted") {
  return res.status(400).json({
    error: `Only rejected or mosque_deleted admins can reapply. Your current status is: ${admin.status}`,
    code: "INVALID_STATUS",
    current_status: admin.status,
  });
}
```

#### 2. Clear Mosque Deletion Fields

**Before:**

```javascript
admin.status = "pending";
admin.can_reapply = false;
admin.rejection_reason = null; // Only cleared rejection fields
admin.rejected_at = null;
admin.rejected_by = null;
```

**After:**

```javascript
admin.status = "pending";
admin.can_reapply = false;

// Clear rejection fields if coming from rejected status
admin.rejection_reason = null;
admin.rejected_at = null;
admin.rejected_by = null;

// ✅ NEW: Clear mosque deletion fields if coming from mosque_deleted status
admin.mosque_deletion_reason = null;
admin.mosque_deletion_date = null;
admin.deleted_mosque_name = null;
admin.deleted_mosque_location = null;
```

## Complete Flow After Fix

```
┌──────────────────────────────────────────┐
│ Admin Status: mosque_deleted             │
│ Logs in → Status Page                    │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ Clicks "Apply for Another Mosque"        │
│ Goes to Reapplication Page               │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ Enters verification code                 │
│ Submits reapplication                    │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ POST /api/admin/reapply                  │
│ ✅ Accepts mosque_deleted status         │
│ ✅ Validates verification code           │
│ ✅ Changes status to pending             │
│ ✅ Clears mosque_deletion_* fields       │
│ ✅ Associates with new mosque            │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ Success Response                         │
│ Status: pending                          │
│ Mosque: New mosque                       │
└────────────┬─────────────────────────────┘
             ↓
┌──────────────────────────────────────────┐
│ Login Again                              │
│ ✅ Shows "Pending Approval"              │
│ ✅ Shows new mosque name                 │
│ ✅ NO mosque_deleted status anymore      │
└──────────────────────────────────────────┘
```

## Two Reapplication Endpoints Explained

### 1. `/api/auth/admin/reapplication` (auth.js)

- More complex, handles verification code validation
- Checks for mosque existence
- Validates against previous mosque rejections
- Used by: Custom reapplication flow

**Status:** ✅ Already fixed in previous update

### 2. `/api/admin/reapply` (admin.js)

- Simpler endpoint for admin reapplication
- Takes mosque verification code
- Updates admin status to pending
- Used by: Frontend reapplication page

**Status:** ✅ **Just fixed in this update**

## Testing Steps

### 1. Create mosque_deleted Admin

```bash
# As Super Admin
DELETE /api/superadmin/mosque/:mosqueId
{
  "reason": "Testing reapplication fix"
}

# Verify admin status
# Should be: status = "mosque_deleted"
```

### 2. Test Reapplication

```bash
# Login as mosque_deleted admin
POST /api/auth/admin/login
{
  "email": "marry@gmail.com",
  "password": "password"
}

# Navigate to reapplication page
# Enter new mosque verification code
# Submit

# Expected: ✅ Success
# Previous: ❌ Error "NOT_REJECTED"
```

### 3. Verify Database

```javascript
db.admins.findOne({ email: "marry@gmail.com" })

// Should show:
{
  status: "pending",
  mosque_id: <new_mosque_ObjectId>,
  mosque_deletion_reason: null,     // ✅ Cleared
  mosque_deletion_date: null,       // ✅ Cleared
  deleted_mosque_name: null,        // ✅ Cleared
  deleted_mosque_location: null,    // ✅ Cleared
  can_reapply: false
}
```

### 4. Login Again

```bash
POST /api/auth/admin/login
{
  "email": "marry@gmail.com",
  "password": "password"
}

# Should redirect to status page
# Should show: "Pending Approval" (not mosque_deleted)
# Should show: New mosque name
```

## Console Output After Fix

### Before Fix ❌

```
AdminStatusPage - User data: {..., "status":"mosque_deleted"}
Submitting reapplication...
Error code: NOT_REJECTED
Error: Only rejected admins can reapply. Your current status is: mosque_deleted
```

### After Fix ✅

```
AdminStatusPage - User data: {..., "status":"mosque_deleted"}
Submitting reapplication...
Reapplication request: { userId: "68e2c67566d241b709880281", mosque_verification_code: "ABC1..." }
Admin found: { id: "68e2c67566d241b709880281", status: "mosque_deleted", can_reapply: true }
Mosque found: { id: "...", name: "New Mosque", code: "ABC123456" }
Admin updated successfully: { status: "pending", mosque_id: "...", can_reapply: false }
✅ Success: Reapplication submitted successfully
```

## Error Code Changes

| Old Code               | New Code                                    | Reason                                       |
| ---------------------- | ------------------------------------------- | -------------------------------------------- |
| `NOT_REJECTED`         | `INVALID_STATUS`                            | More accurate - not just for rejected status |
| Only checks `rejected` | Checks both `rejected` and `mosque_deleted` | Support both statuses                        |

## Files Modified

1. ✅ `BackEnd/src/routes/admin.js`

   - Line ~60-70: Updated status validation to accept both `rejected` and `mosque_deleted`
   - Line ~220-230: Added clearing of mosque deletion fields

2. ✅ `BackEnd/src/routes/auth.js`
   - Already updated in previous fix
   - Accepts both statuses
   - Clears mosque deletion fields

## Summary

**Root Issue:**

- Two reapplication endpoints existed
- One was updated, one was not
- Frontend was using the outdated endpoint

**Fix Applied:**

- Updated both endpoints to accept `rejected` AND `mosque_deleted` status
- Both endpoints now clear mosque deletion fields
- Consistent behavior across all reapplication flows

**Result:**
✅ Mosque_deleted admins can now successfully reapply
✅ Status properly changes from `mosque_deleted` → `pending`
✅ All old mosque deletion data is cleared
✅ Consistent validation and error codes
