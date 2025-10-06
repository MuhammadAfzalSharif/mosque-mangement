# Testing Mosque Deletion with Admin Data Retention

## Test Scenario: Admin Login After Mosque Deletion

### Prerequisites

1. Have an approved admin associated with a mosque
2. Super admin access to delete mosques

### Test Steps

#### Step 1: Setup

1. Login as an admin with approved status
2. Note down the admin's email and password
3. Note down the mosque name and ID

#### Step 2: Delete the Mosque

1. Login as Super Admin
2. Go to "Delete Mosques" section
3. Find the mosque with the approved admin
4. Delete the mosque with a reason (e.g., "Testing mosque deletion flow")
5. Verify the success message says: "Mosque deleted successfully. Associated admins have been notified and can reapply."

#### Step 3: Backend Verification

Check the database to verify:

```javascript
// Admin should NOT be deleted
// Admin status should be "mosque_deleted"
db.admins.findOne({ email: "admin@example.com" })

// Expected fields:
{
  status: "mosque_deleted",
  mosque_id: null,  // Cleared
  mosque_deletion_reason: "Testing mosque deletion flow",
  mosque_deletion_date: ISODate("2025-10-06..."),
  deleted_mosque_name: "Original Mosque Name",
  deleted_mosque_location: "Original Mosque Location",
  can_reapply: true,
  verification_code_used: null  // Cleared
}
```

#### Step 4: Admin Login Flow

1. Logout (clear all localStorage)
2. Go to the login page (e.g., `/mosques/{id}/apply` or direct login)
3. Enter the admin's email and password
4. Click "Login"

**Expected Result:**

- Login returns 403 status code with `MOSQUE_DELETED` error code
- Frontend receives the error response with:
  - `token` (30-day validity)
  - `admin` object with id, name, email, status
  - `mosque_deletion_reason`
  - `mosque_deletion_date`
  - `deleted_mosque_name`
  - `deleted_mosque_location`
  - `can_reapply: true`
- localStorage is cleared
- New token and admin data is saved
- **Automatically redirects to `/admin/status`**

#### Step 5: Status Page Display

On the status page, verify the following is displayed:

**Visual Elements:**

- Orange/amber gradient background (different from red rejection)
- "Mosque Deleted" header
- Alert icon

**Information Displayed:**

1. **Mosque Deletion Details Section:**

   - Deleted mosque name
   - Deleted mosque location
   - Deletion reason
   - Deletion date (formatted)

2. **Account Information Section:**

   - Admin name
   - Admin email
   - Admin phone
   - Status badge: "Mosque Deleted" (orange theme)

3. **Reapplication Option:**

   - Green success box with "Reapplication Available"
   - Message: "You can apply to manage a different mosque..."
   - **"Apply for Another Mosque" button** (green)

4. **Actions:**
   - "Back to Home" button
   - "Logout" button

#### Step 6: Reapplication Flow

1. Click "Apply for Another Mosque" button
2. Verify redirect to `/admin/reapply`
3. On reapplication page, verify:

   - Info banner mentions "rejected admins and admins whose mosques were deleted"
   - Verification code input field
   - Optional application notes field
   - Warning about multiple rejections

4. Enter a NEW mosque verification code (different mosque)
5. Add optional notes
6. Submit reapplication

**Expected Result:**

- API accepts the reapplication (status check allows `mosque_deleted`)
- Admin status changes to `pending`
- Admin associated with new mosque
- Success message displayed
- Redirects to login page

#### Step 7: Post-Reapplication

1. Login again with same credentials
2. Should now show "Pending Approval" status page
3. Wait for Super Admin approval
4. Once approved, login should redirect to admin dashboard

## Error Code Flow Chart

```
Admin Login
    ↓
Check Admin Status
    ↓
┌─────────────────────┐
│ Status              │
├─────────────────────┤
│ approved           │ → Dashboard
│ pending            │ → Status Page (PENDING_APPROVAL code)
│ rejected           │ → Status Page (ACCOUNT_REJECTED code)
│ mosque_deleted     │ → Status Page (MOSQUE_DELETED code) ✅ NEW
└─────────────────────┘
```

## API Response Examples

### Login Response for mosque_deleted Admin

**Request:**

```json
POST /api/auth/admin/login
{
  "email": "admin@gmail.com",
  "password": "Password123!"
}
```

**Response (403 Forbidden):**

```json
{
  "error": "Your mosque has been deleted",
  "code": "MOSQUE_DELETED",
  "status": "mosque_deleted",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "_id": "67034abcd1234567890",
    "name": "Admin Name",
    "email": "admin@gmail.com",
    "phone": "+923001234567",
    "status": "mosque_deleted",
    "mosque_id": null
  },
  "mosque_deletion_reason": "Testing mosque deletion flow",
  "mosque_deletion_date": "2025-10-06T10:30:00.000Z",
  "deleted_mosque_name": "Central Mosque",
  "deleted_mosque_location": "123 Main St, City",
  "can_reapply": true,
  "message": "Your mosque was deleted by the Super Admin. You can reapply for a different mosque."
}
```

### Get Admin Profile Response

**Request:**

```json
GET /api/auth/admin/me
Authorization: Bearer {token}
```

**Response:**

```json
{
  "success": true,
  "admin": {
    "id": "67034abcd1234567890",
    "name": "Admin Name",
    "email": "admin@gmail.com",
    "phone": "+923001234567",
    "status": "mosque_deleted",
    "mosque": null,
    "rejection_info": null,
    "mosque_deletion_info": {
      "mosque_deletion_reason": "Testing mosque deletion flow",
      "mosque_deletion_date": "2025-10-06T10:30:00.000Z",
      "deleted_mosque_name": "Central Mosque",
      "deleted_mosque_location": "123 Main St, City",
      "can_reapply": true
    },
    "created_at": "2025-10-01T08:15:00.000Z"
  }
}
```

## Checklist

- [ ] Mosque deletion doesn't delete admin records
- [ ] Admin status changes to `mosque_deleted`
- [ ] All deletion details are stored in admin record
- [ ] Login returns 403 with MOSQUE_DELETED code
- [ ] Token is provided in error response (30-day validity)
- [ ] Frontend saves token and redirects to status page
- [ ] Status page shows orange-themed "Mosque Deleted" UI
- [ ] All deletion details are displayed correctly
- [ ] Reapplication button is visible
- [ ] Reapplication page accepts mosque_deleted admins
- [ ] Reapplication changes status to pending
- [ ] Super admin can approve reapplication
- [ ] Console logs show correct token storage

## Common Issues & Solutions

### Issue 1: Doesn't redirect to status page

**Solution:** Check that `AdminApplicationPage.tsx` handles `MOSQUE_DELETED` error code

### Issue 2: Status page shows 401 error

**Solution:** Verify token is being saved to localStorage correctly

### Issue 3: Reapplication rejected

**Solution:** Check backend validation - should accept both `rejected` and `mosque_deleted` status

### Issue 4: TypeScript errors

**Solution:** Ensure `AdminStatus` type includes `"mosque_deleted"`

## Success Criteria

✅ Admin data preserved after mosque deletion
✅ Login shows appropriate error message
✅ Automatically redirects to status page
✅ Status page displays all deletion information
✅ Reapplication flow works seamlessly
✅ Admin can manage a new mosque after approval
