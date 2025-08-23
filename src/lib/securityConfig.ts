/**
 * Security Configuration Helper
 * 
 * This module provides secure configuration management for the application.
 * It ensures that sensitive data is properly handled and not exposed.
 */

interface SecurityConfig {
  isProduction: boolean;
  enableSecurityLogging: boolean;
  rateLimitWindow: number;
  maxEnrollmentAttempts: number;
  sessionTimeout: number;
}

// Security configuration
export const SECURITY_CONFIG: SecurityConfig = {
  isProduction: import.meta.env.PROD,
  enableSecurityLogging: true,
  rateLimitWindow: 60 * 60 * 1000, // 1 hour in milliseconds
  maxEnrollmentAttempts: 5,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
};

/**
 * Security utilities for the application
 */
export class SecurityUtils {
  /**
   * Validate if an operation should be logged for security monitoring
   */
  static shouldLogSecurityEvent(eventType: string): boolean {
    if (!SECURITY_CONFIG.enableSecurityLogging) {
      return false;
    }

    const criticalEvents = [
      'role_change',
      'enrollment_attempt',
      'failed_authentication',
      'permission_denied',
      'suspicious_activity'
    ];

    return criticalEvents.includes(eventType);
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Generate a secure random string for temporary tokens
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Check if a timestamp is within the allowed time window
   */
  static isWithinTimeWindow(timestamp: string, windowMs: number): boolean {
    const now = Date.now();
    const eventTime = new Date(timestamp).getTime();
    return (now - eventTime) <= windowMs;
  }

  /**
   * Validate email format for security
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
  }

  /**
   * Check if a role change is authorized
   */
  static isAuthorizedRoleChange(currentUserRole: string, targetRole: string): boolean {
    // Only admins can change roles
    if (currentUserRole !== 'admin') {
      return false;
    }

    // Define allowed role transitions
    const allowedRoles = ['student', 'instructor', 'admin'];
    return allowedRoles.includes(targetRole);
  }

  /**
   * Log security events (placeholder for future implementation)
   */
  static async logSecurityEvent(
    eventType: string, 
    details: Record<string, any>
  ): Promise<void> {
    if (!this.shouldLogSecurityEvent(eventType)) {
      return;
    }

    try {
      // In a real implementation, this would send to a security monitoring service
      console.log(`[SECURITY] ${eventType}:`, {
        timestamp: new Date().toISOString(),
        ...details
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Check for suspicious patterns in user behavior
   */
  static detectSuspiciousActivity(activities: Array<{
    timestamp: string;
    action: string;
    success: boolean;
  }>): boolean {
    if (activities.length < 3) return false;

    const recentActivities = activities.filter(
      activity => this.isWithinTimeWindow(activity.timestamp, 5 * 60 * 1000) // 5 minutes
    );

    // Check for rapid failed attempts
    const failedAttempts = recentActivities.filter(a => !a.success);
    if (failedAttempts.length >= 5) {
      return true;
    }

    // Check for unusual patterns (placeholder for more sophisticated detection)
    const uniqueActions = new Set(recentActivities.map(a => a.action));
    if (uniqueActions.size > 10) { // Too many different actions in short time
      return true;
    }

    return false;
  }

  /**
   * Create a security headers object for API requests
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }
}

/**
 * Environment validation to ensure secure configuration
 */
export function validateEnvironment(): boolean {
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY'
  ];

  const missing = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }

  // Check for common misconfigurations
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl.startsWith('https://')) {
    console.error('Supabase URL must use HTTPS');
    return false;
  }

  return true;
}

// Initialize environment validation
if (!validateEnvironment()) {
  throw new Error('Invalid environment configuration detected');
}