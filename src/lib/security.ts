/**
 * Security Service
 * Handles data protection, validation, and security measures
 */

export interface SecurityConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxLoginAttempts: number;
  sessionTimeout: number;
  encryptionKey: string;
}

export class SecurityService {
  private static config: SecurityConfig = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ],
    maxLoginAttempts: 5,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    encryptionKey: 'theramate-secure-key-2024'
  };

  /**
   * Sanitize user input
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      feedback.push('Password must contain at least one number');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  }

  /**
   * Validate file upload
   */
  static validateFile(file: File): {
    isValid: boolean;
    error?: string;
  } {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds limit of ${this.formatFileSize(this.config.maxFileSize)}`
      };
    }

    // Check file type
    if (!this.config.allowedFileTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      return {
        isValid: false,
        error: 'File name is required'
      };
    }

    // Check for malicious file names
    if (this.containsMaliciousContent(file.name)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters'
      };
    }

    return { isValid: true };
  }

  /**
   * Check for malicious content
   */
  private static containsMaliciousContent(input: string): boolean {
    const maliciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // Script tags
      /javascript:/i, // JavaScript protocol
      /vbscript:/i, // VBScript protocol
      /onload/i, // Event handlers
      /onerror/i,
      /onclick/i
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string): string {
    try {
      // Simple encryption for demo purposes
      // In production, use a proper encryption library
      const encoded = btoa(data);
      return encoded;
    } catch (error) {
      console.error('Encryption error:', error);
      return data;
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      return decoded;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedData;
    }
  }

  /**
   * Generate secure token
   */
  static generateToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Hash password
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const passwordHash = await this.hashPassword(password);
      return passwordHash === hash;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Rate limiting
   */
  static createRateLimiter(
    maxRequests: number,
    windowMs: number
  ): (identifier: string) => boolean {
    const requests = new Map<string, number[]>();

    return (identifier: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return false; // Rate limit exceeded
      }
      
      // Add current request
      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      return true; // Request allowed
    };
  }

  /**
   * Content Security Policy
   */
  static getCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Validate session
   */
  static validateSession(sessionData: any): boolean {
    if (!sessionData || !sessionData.userId || !sessionData.token) {
      return false;
    }

    // Check if session is expired
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    event: string,
    details: any,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.warn('Security Event:', logEntry);
    
    // In production, send to security monitoring service
    // this.sendToSecurityService(logEntry);
  }

  /**
   * Detect suspicious activity
   */
  static detectSuspiciousActivity(
    action: string,
    context: any
  ): boolean {
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_file_uploads',
      'rapid_api_calls',
      'suspicious_navigation'
    ];

    // Implement detection logic based on action and context
    switch (action) {
      case 'login_attempt':
        return context.failedAttempts > 3;
      case 'file_upload':
        return context.fileSize > this.config.maxFileSize * 2;
      case 'api_call':
        return context.frequency > 100; // More than 100 calls per minute
      default:
        return false;
    }
  }

  /**
   * Format file size
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get security headers
   */
  static getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };
  }

  /**
   * Validate API request
   */
  static validateApiRequest(
    request: Request,
    requiredPermissions: string[] = []
  ): boolean {
    // Check if request is from allowed origin
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://theramate.com',
      'https://app.theramate.com'
    ];

    if (origin && !allowedOrigins.includes(origin)) {
      this.logSecurityEvent('suspicious_origin', { origin }, 'high');
      return false;
    }

    // Check for required headers
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || userAgent.length < 10) {
      this.logSecurityEvent('missing_user_agent', { userAgent }, 'medium');
      return false;
    }

    return true;
  }
}