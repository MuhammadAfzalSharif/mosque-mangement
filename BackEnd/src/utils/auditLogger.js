import AuditLog from '../models/AuditLog.js';

class AuditLogger {
    constructor(req) {
        this.req = req;
        this.user = req?.user;
        this.ip_address = req?.ip || req?.connection?.remoteAddress;
        this.user_agent = req?.get('User-Agent');
    }

    // Helper to get user info from request
    getUserInfo() {
        if (!this.user) {
            return {
                user_id: null,
                user_type: 'system',
                user_email: 'system',
                user_name: 'System'
            };
        }

        return {
            user_id: this.user.userId,
            user_type: this.user.role === 'super_admin' ? 'super_admin' : 'admin',
            user_email: this.user.email || 'unknown',
            user_name: this.user.name || 'Unknown User'
        };
    }

    // Log mosque creation
    async logMosqueCreated(mosqueData) {
        return await AuditLog.logAction({
            action_type: 'mosque_created',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'mosque',
                target_id: mosqueData._id,
                target_name: mosqueData.name
            },
            action_details: {
                mosque_data: {
                    name: mosqueData.name,
                    location: mosqueData.location,
                    description: mosqueData.description,
                    contact_phone: mosqueData.contact_phone,
                    contact_email: mosqueData.contact_email,
                    admin_instructions: mosqueData.admin_instructions,
                    verification_code: mosqueData.verification_code,
                    verification_code_expires: mosqueData.verification_code_expires
                },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log mosque deletion
    async logMosqueDeleted(mosqueData, adminData = null) {
        const auditData = {
            action_type: 'mosque_deleted',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'mosque',
                target_id: mosqueData._id,
                target_name: mosqueData.name
            },
            action_details: {
                mosque_data: {
                    name: mosqueData.name,
                    location: mosqueData.location,
                    description: mosqueData.description,
                    contact_phone: mosqueData.contact_phone,
                    contact_email: mosqueData.contact_email,
                    admin_instructions: mosqueData.admin_instructions,
                    verification_code: mosqueData.verification_code,
                    verification_code_expires: mosqueData.verification_code_expires
                },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        };

        // Include admin data if mosque had an admin
        if (adminData) {
            auditData.action_details.admin_data = {
                name: adminData.name,
                email: adminData.email,
                phone: adminData.phone,
                status: adminData.status,
                mosque_id: adminData.mosque_id,
                mosque_name: mosqueData.name,
                mosque_location: mosqueData.location,
                verification_code_used: adminData.verification_code_used,
                application_notes: adminData.application_notes,
                super_admin_notes: adminData.super_admin_notes
            };
        }

        return await AuditLog.logAction(auditData);
    }

    // Log admin registration
    async logAdminRegistered(adminData, mosqueData) {
        return await AuditLog.logAction({
            action_type: 'admin_registered',
            performed_by: {
                user_id: adminData._id,
                user_type: 'admin',
                user_email: adminData.email,
                user_name: adminData.name
            },
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    mosque_id: adminData.mosque_id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    verification_code_used: adminData.verification_code_used,
                    application_notes: adminData.application_notes
                },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log admin approval
    async logAdminApproved(adminData, mosqueData, notes = '') {
        return await AuditLog.logAction({
            action_type: 'admin_approved',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    mosque_id: adminData.mosque_id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    verification_code_used: adminData.verification_code_used,
                    application_notes: adminData.application_notes,
                    super_admin_notes: notes
                },
                notes: notes,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log admin assignment (by super admin)
    async logAdminAssigned(adminData, mosqueData, notes = '') {
        return await AuditLog.logAction({
            action_type: 'admin_assigned',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    mosque_id: adminData.mosque_id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    verification_code_used: adminData.verification_code_used,
                    application_notes: adminData.application_notes,
                    super_admin_notes: notes
                },
                notes: notes,
                assignment_type: 'direct_assignment',
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log admin rejection
    async logAdminRejected(adminData, mosqueData, reason = '') {
        return await AuditLog.logAction({
            action_type: 'admin_rejected',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    mosque_id: adminData.mosque_id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    verification_code_used: adminData.verification_code_used,
                    application_notes: adminData.application_notes
                },
                reason: reason,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log admin allowed to reapply
    async logAdminAllowedReapply(adminData, mosqueData, notes = '') {
        return await AuditLog.logAction({
            action_type: 'admin_allowed_reapply',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    mosque_id: adminData.mosque_id,
                    mosque_name: mosqueData?.name || 'Unknown Mosque',
                    mosque_location: mosqueData?.location || 'Unknown Location',
                    rejection_count: adminData.rejection_count,
                    can_reapply: adminData.can_reapply
                },
                notes: notes,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log verification code regeneration
    async logVerificationCodeRegenerated(mosqueData, oldCode, newCode, adminRemoved = null) {
        const auditData = {
            action_type: 'verification_code_regenerated',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'verification_code',
                target_id: mosqueData._id,
                target_name: mosqueData.name
            },
            action_details: {
                mosque_data: {
                    name: mosqueData.name,
                    location: mosqueData.location,
                    verification_code: newCode,
                    verification_code_expires: mosqueData.verification_code_expires
                },
                before_data: { verification_code: oldCode },
                after_data: { verification_code: newCode },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        };

        if (adminRemoved) {
            auditData.action_details.admin_data = {
                name: adminRemoved.name,
                email: adminRemoved.email,
                phone: adminRemoved.phone,
                status: adminRemoved.status,
                mosque_id: adminRemoved.mosque_id,
                mosque_name: mosqueData.name,
                mosque_location: mosqueData.location,
                verification_code_used: adminRemoved.verification_code_used
            };
            auditData.action_details.notes = 'Admin removed due to code regeneration';
        }

        return await AuditLog.logAction(auditData);
    }

    // Log prayer times update
    async logPrayerTimesUpdated(mosqueData, oldTimes, newTimes) {
        return await AuditLog.logAction({
            action_type: 'prayer_times_updated',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'prayer_times',
                target_id: mosqueData._id,
                target_name: mosqueData.name
            },
            action_details: {
                mosque_data: {
                    name: mosqueData.name,
                    location: mosqueData.location
                },
                before_data: { prayer_times: oldTimes },
                after_data: { prayer_times: newTimes },
                prayer_times: newTimes,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log mosque details update
    async logMosqueDetailsUpdated(mosqueData, beforeData, afterData) {
        return await AuditLog.logAction({
            action_type: 'mosque_details_updated',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'mosque',
                target_id: mosqueData._id,
                target_name: mosqueData.name
            },
            action_details: {
                mosque_data: {
                    name: mosqueData.name,
                    location: mosqueData.location,
                    description: mosqueData.description,
                    contact_phone: mosqueData.contact_phone,
                    contact_email: mosqueData.contact_email,
                    admin_instructions: mosqueData.admin_instructions
                },
                before_data: beforeData,
                after_data: afterData,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log admin removal
    async logAdminRemoved(adminData, mosqueData, reason = '') {
        return await AuditLog.logAction({
            action_type: 'admin_removed',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    name: adminData.name,
                    email: adminData.email,
                    phone: adminData.phone,
                    status: adminData.status,
                    removal_reason: reason
                },
                mosque_data: {
                    mosque_id: mosqueData.id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location
                },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log login attempts
    async logLogin(userData, loginType = 'admin') {
        return await AuditLog.logAction({
            action_type: loginType === 'super_admin' ? 'superadmin_login' : 'admin_login',
            performed_by: {
                user_id: userData.id,
                user_type: loginType,
                user_email: userData.email,
                user_name: userData.name || 'Unknown'
            },
            target: {
                target_type: 'admin',
                target_id: userData.id,
                target_name: userData.name || userData.email
            },
            action_details: {
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log errors
    async logError(errorData) {
        return await AuditLog.logAction({
            action_type: 'error_logged',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'system',
                target_name: 'System Error'
            },
            action_details: {
                error_data: {
                    action: errorData.action,
                    error_message: errorData.errorMessage,
                    endpoint: errorData.endpoint,
                    method: errorData.method,
                    status_code: errorData.statusCode
                },
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: 'failed'
        });
    }

    // Log super admin creation
    async logSuperAdminCreated(superAdminData, createdBy = 'existing_super_admin') {
        return await AuditLog.logAction({
            action_type: 'super_admin_created',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'super_admin',
                target_id: superAdminData._id,
                target_name: superAdminData.name
            },
            action_details: {
                super_admin_data: {
                    name: superAdminData.name,
                    email: superAdminData.email
                },
                created_by: createdBy,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log super admin deletion
    async logSuperAdminDeleted(superAdminData, deletedBy = 'existing_super_admin') {
        return await AuditLog.logAction({
            action_type: 'super_admin_deleted',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'super_admin',
                target_id: superAdminData._id,
                target_name: superAdminData.name
            },
            action_details: {
                super_admin_data: {
                    name: superAdminData.name,
                    email: superAdminData.email,
                    created_at: superAdminData.createdAt
                },
                deleted_by: deletedBy,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            }
        });
    }

    // Log individual code regeneration
    async logCodeRegenerated(mosque, oldCode, newCode, newExpiry) {
        return await AuditLog.logAction({
            action_type: 'code_regenerated',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'mosque',
                target_id: mosque._id,
                target_name: mosque.name
            },
            action_details: {
                mosque_name: mosque.name,
                mosque_location: mosque.location,
                old_verification_code: oldCode,
                new_verification_code: newCode,
                new_expiry_date: newExpiry,
                regeneration_reason: 'Manual regeneration by super admin',
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: 'success'
        });
    }

    // Log bulk code regeneration
    async logBulkCodeRegeneration(successCount, failedCount, expiryDays) {
        return await AuditLog.logAction({
            action_type: 'bulk_code_regeneration',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'system',
                target_id: null,
                target_name: 'Multiple Mosques'
            },
            action_details: {
                total_successful: successCount,
                total_failed: failedCount,
                expiry_days: expiryDays,
                operation_type: 'BULK CODE REGENERATION COMPLETED',
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: successCount > 0 ? 'success' : 'failed'
        });
    }

    // Log admin code validation (when code_regenerated admin successfully validates mosque code)
    async logAdminCodeValidated(adminData, mosqueData, validatedCode) {
        return await AuditLog.logAction({
            action_type: 'admin_code_validated',
            performed_by: {
                user_id: adminData._id,
                user_type: 'admin',
                user_email: adminData.email,
                user_name: adminData.name
            },
            target: {
                target_type: 'admin',
                target_id: adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    admin_id: adminData._id,
                    admin_name: adminData.name,
                    admin_email: adminData.email,
                    admin_phone: adminData.phone,
                    previous_status: 'code_regenerated',
                    new_status: 'approved'
                },
                mosque_data: {
                    mosque_id: mosqueData._id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    validated_code: validatedCode
                },
                action_summary: `Admin ${adminData.name} (${adminData.email}) successfully validated mosque code and status changed from 'code_regenerated' to 'approved'`,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: 'success'
        });
    }

    // Log admin code regeneration (when admin status is changed to code_regenerated)
    async logAdminCodeRegenerated(adminData, mosqueData, oldCode, newCode) {
        return await AuditLog.logAction({
            action_type: 'admin_code_regenerated',
            performed_by: this.getUserInfo(),
            target: {
                target_type: 'admin',
                target_id: adminData.admin_id || adminData._id,
                target_name: adminData.name
            },
            action_details: {
                admin_data: {
                    admin_id: adminData.admin_id || adminData._id,
                    admin_name: adminData.name,
                    admin_email: adminData.email,
                    admin_phone: adminData.phone,
                    previous_status: 'approved',
                    new_status: 'code_regenerated'
                },
                mosque_data: {
                    mosque_id: mosqueData._id,
                    mosque_name: mosqueData.name,
                    mosque_location: mosqueData.location,
                    old_verification_code: oldCode,
                    new_verification_code: newCode
                },
                action_summary: `Admin ${adminData.name} (${adminData.email}) status changed to 'code_regenerated' due to mosque code regeneration for ${mosqueData.name}`,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: 'success'
        });
    }

    // Generic log method for custom audit actions
    async log(auditData) {
        return await AuditLog.logAction({
            action_type: auditData.action.toLowerCase().replace(/_/g, '_'),
            performed_by: this.getUserInfo(),
            target: {
                target_type: auditData.targetModel ? auditData.targetModel.toLowerCase() : 'system',
                target_id: auditData.targetId,
                target_name: auditData.details?.target_name || auditData.details?.mosque_name || 'Unknown'
            },
            action_details: {
                ...auditData.details,
                ip_address: this.ip_address,
                user_agent: this.user_agent
            },
            status: 'success'
        });
    }
}

export default AuditLogger;