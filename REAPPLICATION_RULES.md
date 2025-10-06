# Reapplication Business Rules: Rejected vs Mosque_Deleted Admins

## Overview

Different rules apply for reapplication depending on why the admin is no longer associated with a mosque.

## Business Rules

### ✅ Rejected Admins CAN Reapply to the SAME Mosque

**Reasoning:**

- The admin was rejected due to issues with their application
- They may have improved their qualifications
- The mosque still exists and may still need an admin
- Gives admins a second chance to prove themselves

**Example Scenario:**

```
1. Admin applies to "Central Mosque" → Rejected (incomplete application)
2. Admin improves their application
3. Admin reapplies to "Central Mosque" → ✅ ALLOWED
4. Super Admin can review the improved application
```

**Database Tracking:**

- Previous rejections stored in `previous_mosque_ids` array
- `rejection_count` incremented
- BUT they can still apply again to the same mosque

### ✅ Mosque_Deleted Admins CAN Apply to NEW Mosques

**Reasoning:**

- The mosque was deleted by Super Admin (not the admin's fault)
- Admin wants to continue as a mosque admin
- They can manage a different mosque
- No restrictions on which new mosque they choose

**Example Scenario:**

```
1. Admin manages "Central Mosque" → Mosque deleted by Super Admin
2. Admin status → "mosque_deleted"
3. Admin applies to "North Mosque" → ✅ ALLOWED
4. Admin applies to "South Mosque" → ✅ ALLOWED
5. Admin applies to any other mosque → ✅ ALLOWED
```

### ❌ Mosque_Deleted Admins CANNOT Apply to the Same Deleted Mosque

**Reasoning:**

- The mosque no longer exists in the database
- Physically impossible to apply to a deleted record
- They must choose a different mosque

**Example Scenario:**

```
1. Admin manages "Central Mosque" (ID: 123)
2. "Central Mosque" deleted by Super Admin
3. Admin tries to use old verification code for "Central Mosque"
   → ❌ FAILS: Mosque not found (404)
   → The mosque doesn't exist anymore
```

## Implementation Details

### Reapplication Endpoint Logic

```javascript
// File: BackEnd/src/routes/auth.js - /admin/reapplication endpoint

const previousStatus = admin.status;
const wasMosqueDeleted = previousStatus === "mosque_deleted";
const wasRejected = previousStatus === "rejected";

if (wasMosqueDeleted) {
  // Mosque_deleted admins can only apply to NEW mosques
  // The deleted mosque doesn't exist in the system anymore
  // No additional restrictions needed - they can apply to any active mosque
} else if (wasRejected) {
  // Rejected admins CAN reapply to the SAME mosque OR a different one
  // We ALLOW this because they might have improved their application

  const previouslyRejectedFromThisMosque = admin.previous_mosque_ids.some(
    (pm) => pm.mosque_id && pm.mosque_id.toString() === mosque_id.toString()
  );

  if (previouslyRejectedFromThisMosque) {
    // ✅ ALLOW the reapplication - they can try again
    console.log("Admin reapplying to previously rejected mosque");
  }
}
```

### No Blocking for Rejected Admins

**Previous Code (REMOVED):**

```javascript
// ❌ OLD CODE - Blocked reapplication to same mosque
if (previouslyRejectedFromThisMosque) {
  return res.status(400).json({
    error: "You were previously rejected from this mosque",
    code: "PREVIOUSLY_REJECTED_MOSQUE",
  });
}
```

**New Code:**

```javascript
// ✅ NEW CODE - Allow reapplication to same mosque
if (previouslyRejectedFromThisMosque) {
  console.log("Rejected admin reapplying to previously rejected mosque");
  // ALLOW - no error thrown
}
```

## Comparison Table

| Scenario                       | Rejected Admin                | Mosque_Deleted Admin                     |
| ------------------------------ | ----------------------------- | ---------------------------------------- |
| Apply to same mosque           | ✅ Allowed                    | ❌ Not possible (mosque deleted)         |
| Apply to different mosque      | ✅ Allowed                    | ✅ Allowed                               |
| Apply to any new mosque        | ✅ Allowed                    | ✅ Allowed                               |
| Tracked in previous_mosque_ids | ✅ Yes                        | ❌ No (mosque was deleted, not rejected) |
| Can be blocked by Super Admin  | ✅ Yes (via can_reapply flag) | ✅ Yes (via can_reapply flag)            |

## Use Cases

### Use Case 1: Rejected Admin Improves Application

**Scenario:**

- Admin "John" applies to "Central Mosque" with minimal notes
- Super Admin rejects: "Application too brief, please provide more details"
- John rewrites application with detailed experience
- John reapplies to "Central Mosque" with improved application

**Result:** ✅ **Allowed** - Super Admin can review improved application

### Use Case 2: Rejected Admin Tries Different Mosque

**Scenario:**

- Admin "Sarah" applies to "Central Mosque"
- Super Admin rejects: "We need someone with more experience for this large mosque"
- Sarah applies to "Small Community Mosque" instead

**Result:** ✅ **Allowed** - Can apply to any other mosque

### Use Case 3: Mosque_Deleted Admin Applies to New Mosque

**Scenario:**

- Admin "Ahmed" manages "Old Mosque"
- Super Admin deletes "Old Mosque" (building sold, no longer a mosque)
- Ahmed applies to "New Mosque"

**Result:** ✅ **Allowed** - Can manage a different mosque

### Use Case 4: Mosque_Deleted Admin Tries to Use Old Code

**Scenario:**

- Admin "Fatima" managed "Central Mosque" (deleted)
- Fatima tries to use the old verification code from "Central Mosque"

**Result:** ❌ **Blocked** - Mosque not found error (mosque doesn't exist)

## Super Admin Control

Super Admin can still control reapplication for BOTH types:

```javascript
// Super Admin can set can_reapply flag
admin.can_reapply = false; // Block all reapplications
admin.can_reapply = true; // Allow reapplication
```

**When to use:**

- Block permanently problematic admins
- Allow good admins who had one bad application
- Flexible control regardless of rejected vs mosque_deleted status

## API Responses

### Rejected Admin Reapplying to Same Mosque

**Request:**

```json
POST /api/auth/admin/reapplication
{
  "mosque_id": "67035...",  // Same mosque they were rejected from
  "new_verification_code": "ABC123",
  "reason_for_reapplication": "I have improved my application with more details..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Reapplication submitted successfully",
  "admin": {
    "status": "pending",
    "mosque": {
      "name": "Central Mosque" // Same mosque as before
    }
  },
  "previous_status": "rejected"
}
```

### Mosque_Deleted Admin Applying to New Mosque

**Request:**

```json
POST /api/auth/admin/reapplication
{
  "mosque_id": "67036...",  // Different mosque
  "new_verification_code": "XYZ789",
  "reason_for_reapplication": "My previous mosque was deleted. I want to manage this mosque..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Reapplication submitted successfully. You are now applying for a new mosque.",
  "admin": {
    "status": "pending",
    "mosque": {
      "name": "North Mosque" // New mosque
    }
  },
  "previous_status": "mosque_deleted"
}
```

## Summary

✅ **Key Points:**

1. Rejected admins can reapply to the SAME mosque (second chance)
2. Mosque_deleted admins can apply to ANY new mosque
3. Mosque_deleted admins cannot apply to their deleted mosque (it doesn't exist)
4. Super Admin has final control via `can_reapply` flag
5. All reapplications are tracked in audit logs

This flexible system balances giving admins opportunities while maintaining control and data integrity.
