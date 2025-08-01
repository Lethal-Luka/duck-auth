const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// Get current user profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                apiKey: user.apiKey,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin,
                lastApiKeyRegeneration: user.lastApiKeyRegeneration
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update profile (PATCH method for partial updates)
router.patch('/', authenticateToken, async (req, res) => {
    try {
        const { username, password } = req.body;
        const userId = req.user.userId;

        // Verify current password for any profile changes
        if (!password) {
            return res.status(400).json({ error: 'Current password is required for profile updates' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        const updates = {};
        const auditActions = [];

        // Handle username update
        if (username && username !== user.username) {
            // Validate username
            if (username.length < 3 || username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
            }

            // Check if username is already taken
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ error: 'Username is already taken' });
            }

            updates.username = username;
            auditActions.push({
                action: 'USERNAME_CHANGED',
                details: `Username changed from "${user.username}" to "${username}"`
            });
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            await User.findByIdAndUpdate(userId, updates);

            // Log audit events
            for (const auditAction of auditActions) {
                await AuditLog.create({
                    userId,
                    action: auditAction.action,
                    details: auditAction.details,
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent')
                });
            }
        }

        // Fetch updated user
        const updatedUser = await User.findById(userId).select('-password');

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                apiKey: updatedUser.apiKey,
                createdAt: updatedUser.createdAt,
                lastLogin: updatedUser.lastLogin,
                lastApiKeyRegeneration: updatedUser.lastApiKeyRegeneration
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.patch('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters long' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

        // Log audit event
        await AuditLog.create({
            userId,
            action: 'PASSWORD_CHANGED',
            details: 'Password changed successfully',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Initiate email change
router.post('/email/initiate', authenticateToken, async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const userId = req.user.userId;

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'New email and password are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Check if email is already in use
        const existingUser = await User.findOne({ email: newEmail, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already in use' });
        }

        // Generate verification codes
        const currentEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store pending email change
        user.pendingEmailChange = {
            newEmail,
            currentEmailCode,
            newEmailCode,
            codeExpires
        };
        await user.save();

        // Send verification code to current email
        await sendEmail({
            to: user.email,
            subject: 'Duck Auth - Email Change Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">Email Change Request</h2>
                    <p>Hi ${user.username},</p>
                    <p>You requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
                    <p>Your verification code for your current email is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="background-color: #f8f9fa; padding: 15px 25px; font-size: 24px; 
                                     font-weight: bold; letter-spacing: 3px; border-radius: 8px; 
                                     border: 2px solid #e9ecef;">${currentEmailCode}</span>
                    </div>
                    <p><strong>This code expires in 15 minutes.</strong></p>
                    <p>If you didn't request this change, please ignore this email and consider changing your password.</p>
                </div>
            `
        });

        // Send verification code to new email
        await sendEmail({
            to: newEmail,
            subject: 'Duck Auth - New Email Verification',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3498db;">New Email Verification</h2>
                    <p>Hi ${user.username},</p>
                    <p>You requested to change your email address to this email: <strong>${newEmail}</strong>.</p>
                    <p>Your verification code for this new email is:</p>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="background-color: #f8f9fa; padding: 15px 25px; font-size: 24px; 
                                     font-weight: bold; letter-spacing: 3px; border-radius: 8px; 
                                     border: 2px solid #e9ecef;">${newEmailCode}</span>
                    </div>
                    <p><strong>This code expires in 15 minutes.</strong></p>
                    <p>If you didn't request this change, please ignore this email.</p>
                </div>
            `
        });

        res.json({ 
            success: true, 
            message: 'Verification codes sent to both email addresses' 
        });

    } catch (error) {
        console.error('Email change initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate email change' });
    }
});

// Verify email change
router.post('/email/verify', authenticateToken, async (req, res) => {
    try {
        const { currentEmailCode, newEmailCode } = req.body;
        const userId = req.user.userId;

        if (!currentEmailCode || !newEmailCode) {
            return res.status(400).json({ error: 'Both verification codes are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.pendingEmailChange) {
            return res.status(400).json({ error: 'No pending email change found' });
        }

        // Check if codes have expired
        if (new Date() > user.pendingEmailChange.codeExpires) {
            user.pendingEmailChange = undefined;
            await user.save();
            return res.status(400).json({ error: 'Verification codes have expired' });
        }

        // Verify codes
        if (user.pendingEmailChange.currentEmailCode !== currentEmailCode ||
            user.pendingEmailChange.newEmailCode !== newEmailCode) {
            return res.status(400).json({ error: 'Invalid verification codes' });
        }

        // Update email
        const oldEmail = user.email;
        const newEmail = user.pendingEmailChange.newEmail;
        
        user.email = newEmail;
        user.pendingEmailChange = undefined;
        await user.save();

        // Log audit event
        await AuditLog.create({
            userId,
            action: 'EMAIL_CHANGED',
            details: `Email changed from "${oldEmail}" to "${newEmail}"`,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        // Send confirmation email to new email
        await sendEmail({
            to: newEmail,
            subject: 'Duck Auth - Email Changed Successfully',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #27ae60;">Email Changed Successfully</h2>
                    <p>Hi ${user.username},</p>
                    <p>Your email address has been successfully changed to <strong>${newEmail}</strong>.</p>
                    <p>If you didn't make this change, please contact our support team immediately.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999;">Duck Auth Security Team</p>
                </div>
            `
        });

        const updatedUser = await User.findById(userId).select('-password');

        res.json({
            success: true,
            message: 'Email changed successfully',
            user: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                apiKey: updatedUser.apiKey,
                createdAt: updatedUser.createdAt,
                lastLogin: updatedUser.lastLogin,
                lastApiKeyRegeneration: updatedUser.lastApiKeyRegeneration
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Failed to verify email change' });
    }
});

// Regenerate API key (with 1 week cooldown)
router.post('/regenerate-api-key', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Check if user has regenerated API key in the last week
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (user.lastApiKeyRegeneration && user.lastApiKeyRegeneration > oneWeekAgo) {
            const nextAllowedDate = new Date(user.lastApiKeyRegeneration.getTime() + 7 * 24 * 60 * 60 * 1000);
            return res.status(429).json({ 
                error: 'API key can only be regenerated once per week',
                nextAllowedDate: nextAllowedDate.toISOString()
            });
        }

        // Generate new API key
        const newApiKey = `dk_${crypto.randomBytes(32).toString('hex')}`;
        
        user.apiKey = newApiKey;
        user.lastApiKeyRegeneration = new Date();
        await user.save();

        // Log audit event
        await AuditLog.create({
            userId,
            action: 'API_KEY_REGENERATED',
            details: 'API key regenerated successfully',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        });

        // Send security notification email
        await sendEmail({
            to: user.email,
            subject: 'Duck Auth - API Key Regenerated',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f39c12;">Security Alert: API Key Regenerated</h2>
                    <p>Hi ${user.username},</p>
                    <p>Your API key has been regenerated successfully.</p>
                    <p><strong>Time:</strong> ${new Date().toUTCString()}</p>
                    <p><strong>IP Address:</strong> ${req.ip || 'Unknown'}</p>
                    <p>Your old API key has been invalidated and will no longer work.</p>
                    <p>If you didn't request this change, please contact our support team immediately.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #999;">Duck Auth Security Team</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'API key regenerated successfully',
            apiKey: newApiKey,
            nextAllowedRegeneration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

    } catch (error) {
        console.error('API key regeneration error:', error);
        res.status(500).json({ error: 'Failed to regenerate API key' });
    }
});

module.exports = router;