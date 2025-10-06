# Mosque Deletion with Admin Data Retention - Implementation Summary

## Overview

When a mosque is deleted, the associated admin accounts are **NOT deleted**. Instead, they are marked with a new status `mosque_deleted` and can reapply to manage another mosque.

## Changes Made

### 1. Backend - Admin Model (`BackEnd/src/models/Admin.js`)

**Added new status:**

- Updated status enum to include `'mosque_deleted'`
- Status options: `['pending', 'approved', 'rejected', 'mosque_deleted']`

**Added new fields for mosque deletion tracking:**

```javascript
mosque_deletion_reason: String; // Reason why mosque was deleted
mosque_deletion_date: Date; // When the mosque was deleted
deleted_mosque_name: String; // Store deleted mosque name for reference
deleted_mosque_location: String; // Store deleted mosque location for reference
```

### 2. Backend - Mosque Deletion Routes (`BackEnd/src/routes/superadmin.js`)

**Updated Single Mosque Deletion (`DELETE /mosque/:id`):**

- Instead of deleting admin accounts, they are now updated to `mosque_deleted` status
- Admin data preserved with deletion context
- `can_reapply` set to `true` by default
- Mosque association (`mosque_id`) removed
- Verification code cleared

**Updated Bulk Mosque Deletion (`POST /mosques/bulk-delete`):**

- Same behavior as single deletion for each mosque
- All admins associated with deleted mosques are preserved with new status

### 3. Backend - Login Route (`BackEnd/src/routes/auth.js`)

**Added `mosque_deleted` status handling:**

- Issues a limited token (30 days validity) for status page access
- Returns detailed mosque deletion information
- Response includes:
  - Deletion reason
  - Deletion date
  - Deleted mosque name and location
  - Reapplication eligibility (`can_reapply`)

**Updated Admin Profile Endpoint (`GET /admin/me`):**

- Added `mosque_deletion_info` to response when status is `mosque_deleted`
- Includes all mosque deletion details for display on status page

**Updated Reapplication Endpoint (`POST /admin/reapplication`):**

- Now accepts both `rejected` and `mosque_deleted` admins
- Validation updated to check for either status

### 4. Frontend - Type Definitions (`Frontend/Mosque Frontend/src/lib/types.ts`)

**Updated AdminStatus type:**

```typescript
export type AdminStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "mosque_deleted";
```

**Added mosque_deletion_info to AdminProfile:**

```typescript
mosque_deletion_info?: {
    mosque_deletion_reason: string;
    mosque_deletion_date: string;
    deleted_mosque_name: string;
    deleted_mosque_location: string;
    can_reapply: boolean;
};
```

### 5. Frontend - Admin Status Page (`Frontend/Mosque Frontend/src/pages/AdminStatusPage.tsx`)

**Added new status display for `mosque_deleted`:**

- Orange/amber themed UI (different from rejection's red theme)
- Shows:
  - Deleted mosque name and location
  - Deletion reason
  - Deletion date
  - Reapplication option (if allowed)
- Reapplication button links to `/admin/reapply`

### 6. Frontend - Reapplication Page (`Frontend/Mosque Frontend/src/pages/AdminReapplicationPage.tsx`)

**Updated info banner:**

- Added note that page is for both rejected admins and admins whose mosques were deleted

## User Flow

### When a Mosque is Deleted:

1. **Super Admin deletes mosque** (single or bulk)
2. **System updates all associated admins:**
   - Status changed to `mosque_deleted`
   - Mosque association removed
   - Deletion details stored (reason, date, mosque name/location)
   - `can_reapply` set to `true`
3. **Admin data is preserved** in the database

### When Admin Tries to Login:

1. **Admin enters credentials**
2. **System recognizes `mosque_deleted` status**
3. **Returns 403 with limited token** (30 days validity)
4. **Frontend redirects to Status Page**

### On Status Page:

1. **Shows orange-themed "Mosque Deleted" status**
2. **Displays:**
   - Deleted mosque information
   - Deletion reason
   - Deletion date
   - Admin account details
3. **Shows reapplication option** with "Apply for Another Mosque" button

### Reapplication Process:

1. **Admin clicks "Apply for Another Mosque"**
2. **Redirected to Reapplication Page**
3. **Admin enters:**
   - New mosque verification code
   - Optional application notes
4. **System validates:**
   - Admin status (must be `rejected` or `mosque_deleted`)
   - `can_reapply` is true
   - New mosque exists
   - Verification code is valid and not expired
5. **Admin status reset to `pending`**
6. **Waits for Super Admin approval**

## Benefits

1. **Data Preservation:** Admin data is not lost when mosques are deleted
2. **Audit Trail:** Complete history of mosque deletions and admin associations
3. **User Experience:** Admins can easily reapply without re-registering
4. **Transparency:** Clear communication about what happened and next steps
5. **Flexibility:** Super Admin can still control reapplication permissions

## Database Impact

- **No data loss:** Admin records are preserved
- **Status tracking:** New status value added
- **Historical data:** Deletion context stored for reference
- **Reapplication support:** Existing reapplication flow works for both rejected and mosque_deleted admins

## API Endpoints Modified

1. `DELETE /api/superadmin/mosque/:id` - Single mosque deletion
2. `POST /api/superadmin/mosques/bulk-delete` - Bulk mosque deletion
3. `POST /api/auth/admin/login` - Admin login with mosque_deleted handling
4. `GET /api/auth/admin/me` - Admin profile with mosque_deletion_info
5. `POST /api/auth/admin/reapplication` - Reapplication for rejected/mosque_deleted admins

## Testing Recommendations

1. **Test mosque deletion:**

   - Delete single mosque with approved admin
   - Delete multiple mosques in bulk
   - Verify admin status changes to `mosque_deleted`
   - Check all deletion details are stored

2. **Test login flow:**

   - Login as mosque_deleted admin
   - Verify status page displays correctly
   - Check reapplication button appears

3. **Test reapplication:**

   - Submit reapplication with new mosque code
   - Verify status changes to `pending`
   - Check Super Admin can approve/reject

4. **Edge cases:**
   - Mosque without admin (should delete normally)
   - Mosque with pending admins (verify all get updated)
   - Invalid verification codes
   - Expired verification codes

## Migration Notes

**Existing Data:**

- Any existing `rejected` admins continue to work as before
- The new `mosque_deleted` status only applies to future deletions
- No database migration required for existing records

**Backward Compatibility:**

- All existing functionality for rejected admins remains unchanged
- Reapplication flow works for both statuses seamlessly
