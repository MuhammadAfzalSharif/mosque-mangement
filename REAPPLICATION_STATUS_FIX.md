# Fix: Reapplication Page Showing Rejected Status Instead of Mosque Deleted

## Problem

When a `mosque_deleted` admin submitted a reapplication with a new verification code, the system was working but when they logged in again, it was still showing "rejected" status data instead of clearing the mosque deletion fields properly.

## Root Cause

The reapplication endpoint was updating the admin status to `pending` but **NOT clearing** the mosque deletion fields:

- `mosque_deletion_reason`
- `mosque_deletion_date`
- `deleted_mosque_name`
- `deleted_mosque_location`

So the old data was persisting in the database even after reapplication.

## Fix Applied

### File: `BackEnd/src/routes/auth.js`

#### 1. Clear Mosque Deletion Fields on Reapplication

**Added field clearing logic:**

```javascript
// Update admin to pending status with new mosque
admin.status = "pending";
admin.mosque_id = mosque_id;
admin.verification_code_used = new_verification_code;
admin.can_reapply = false;
admin.application_notes = `REAPPLICATION: ${reason_for_reapplication.trim()}`;

// ✅ NEW: Clear mosque deletion fields if this was a mosque_deleted admin
if (admin.mosque_deletion_reason || admin.deleted_mosque_name) {
  admin.mosque_deletion_reason = null;
  admin.mosque_deletion_date = null;
  admin.deleted_mosque_name = null;
  admin.deleted_mosque_location = null;
}

await admin.save();
```

#### 2. Enhanced Audit Logging

**Store previous status for better tracking:**

```javascript
// Store the previous status for audit logging
const previousStatus = admin.status;
const wasMosqueDeleted = previousStatus === "mosque_deleted";
const previousMosqueInfo = wasMosqueDeleted
  ? {
      deleted_mosque_name: admin.deleted_mosque_name,
      deleted_mosque_location: admin.deleted_mosque_location,
      deletion_reason: admin.mosque_deletion_reason,
    }
  : null;

// ... update admin fields ...

// Audit log with previous status
await auditLogger.log({
  action: "ADMIN_REAPPLICATION_SUBMITTED",
  performedBy: admin._id,
  targetModel: "Admin",
  targetId: admin._id,
  details: {
    admin_name: admin.name,
    admin_email: admin.email,
    mosque_name: mosque.name,
    mosque_location: mosque.location,
    reason: reason_for_reapplication.trim(),
    previous_status: previousStatus, // ✅ NEW
    rejection_count: admin.rejection_count,
    ...(wasMosqueDeleted && previousMosqueInfo
      ? {
          previous_mosque_info: previousMosqueInfo, // ✅ NEW
        }
      : {}),
  },
});
```

#### 3. Updated Response Message

**More specific success message:**

```javascript
res.json({
    success: true,
    message: previousStatus === 'mosque_deleted'
        ? 'Reapplication submitted successfully. You are now applying for a new mosque.'
        : 'Reapplication submitted successfully',
    admin: { ... },
    previous_status: previousStatus,  // ✅ NEW: Client knows what status they came from
    next_steps: 'Your reapplication is now pending. Please wait for Super Admin approval.'
});
```

## What Changes in the Database

### Before Reapplication (mosque_deleted admin):

```json
{
  "_id": "67034...",
  "status": "mosque_deleted",
  "mosque_id": null,
  "mosque_deletion_reason": "Testing deletion flow",
  "mosque_deletion_date": "2025-10-06T10:30:00.000Z",
  "deleted_mosque_name": "Central Mosque",
  "deleted_mosque_location": "123 Main St",
  "can_reapply": true
}
```

### After Reapplication (now pending):

```json
{
  "_id": "67034...",
  "status": "pending",
  "mosque_id": "67035...", // ✅ New mosque
  "verification_code_used": "ABC12345", // ✅ New code
  "mosque_deletion_reason": null, // ✅ CLEARED
  "mosque_deletion_date": null, // ✅ CLEARED
  "deleted_mosque_name": null, // ✅ CLEARED
  "deleted_mosque_location": null, // ✅ CLEARED
  "can_reapply": false,
  "application_notes": "REAPPLICATION: Applying for new mosque..."
}
```

## User Flow After Fix

```
┌─────────────────────────────────────────┐
│ Admin with mosque_deleted status        │
│ Logs in → Sees deletion details         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Clicks "Apply for Another Mosque"       │
│ Redirected to /admin/reapply            │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Enters new mosque verification code     │
│ Submits reapplication                   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Backend:                                │
│ ✅ Changes status to "pending"          │
│ ✅ Associates with new mosque           │
│ ✅ CLEARS all mosque_deletion_* fields  │
│ ✅ Logs previous status in audit        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Success response with:                  │
│ • New status: "pending"                 │
│ • New mosque info                       │
│ • previous_status: "mosque_deleted"     │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Admin logs in again                     │
│ ✅ Shows "Pending Approval" status      │
│ ✅ NOT "mosque_deleted" anymore         │
│ ✅ Shows new mosque name                │
└─────────────────────────────────────────┘
```

## Testing Steps

### 1. Create mosque_deleted Admin

```bash
# As Super Admin, delete a mosque with an approved admin
DELETE /api/superadmin/mosque/:id
{
  "reason": "Testing reapplication fix"
}

# Verify admin status changed to mosque_deleted
db.admins.findOne({ _id: "..." })
# Should show:
# status: "mosque_deleted"
# mosque_deletion_reason: "Testing reapplication fix"
# deleted_mosque_name: "Original Mosque"
```

### 2. Test Reapplication

```bash
# Login as the admin
POST /api/auth/admin/login
{
  "email": "admin@gmail.com",
  "password": "password"
}

# Should redirect to status page showing mosque_deleted info

# Submit reapplication
POST /api/auth/admin/reapplication
Authorization: Bearer <token>
{
  "new_verification_code": "NEWCODE123",
  "reason_for_reapplication": "My previous mosque was deleted. I want to manage this new mosque...",
  "mosque_id": "67035..."
}

# Response should include:
# {
#   "success": true,
#   "message": "Reapplication submitted successfully. You are now applying for a new mosque.",
#   "admin": { "status": "pending", ... },
#   "previous_status": "mosque_deleted"
# }
```

### 3. Verify Database Update

```bash
# Check admin record
db.admins.findOne({ _id: "..." })

# ✅ Should show:
# status: "pending"
# mosque_id: <new mosque ObjectId>
# mosque_deletion_reason: null
# mosque_deletion_date: null
# deleted_mosque_name: null
# deleted_mosque_location: null
```

### 4. Login Again

```bash
# Login with same credentials
POST /api/auth/admin/login
{
  "email": "admin@gmail.com",
  "password": "password"
}

# ✅ Should redirect to status page with "Pending Approval"
# ✅ Should show new mosque name
# ✅ Should NOT show mosque deletion info
```

## Expected Results

### ✅ Before Fix (Wrong):

- Reapplication submitted
- Status changed to "pending"
- **BUT** mosque deletion fields still populated
- Login shows confusing mixed data

### ✅ After Fix (Correct):

- Reapplication submitted
- Status changed to "pending"
- **Mosque deletion fields cleared**
- Login shows clean "Pending Approval" status
- Audit log preserves history

## Audit Trail

The audit log will now show:

```json
{
  "action": "ADMIN_REAPPLICATION_SUBMITTED",
  "details": {
    "admin_name": "John Doe",
    "admin_email": "john@gmail.com",
    "mosque_name": "New Mosque Name",
    "mosque_location": "456 New Street",
    "reason": "My previous mosque was deleted...",
    "previous_status": "mosque_deleted", // ✅ Preserved
    "rejection_count": 0,
    "previous_mosque_info": {
      // ✅ History preserved
      "deleted_mosque_name": "Old Mosque",
      "deleted_mosque_location": "123 Old St",
      "deletion_reason": "Testing deletion"
    }
  }
}
```

## Benefits

1. ✅ **Clean State:** Mosque deletion data is cleared after reapplication
2. ✅ **No Confusion:** Status page shows correct current status
3. ✅ **Preserved History:** Audit log keeps track of previous mosque deletion
4. ✅ **Better UX:** Clear messaging about coming from mosque_deleted status
5. ✅ **Data Integrity:** No orphaned/stale data in admin records

## Files Modified

- ✅ `BackEnd/src/routes/auth.js` - Reapplication endpoint updated to clear mosque deletion fields
