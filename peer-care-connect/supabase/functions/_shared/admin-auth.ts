/**
 * Admin Authentication Utility
 * Verifies admin access for service functions
 * Cyber Essentials Plus 2026 Compliance
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AdminAuthResult {
  isAdmin: boolean
  error?: string
  user?: any
}

/**
 * Verify admin access using service role key
 * These functions are called by cron jobs or admin tools
 * They use SUPABASE_SERVICE_ROLE_KEY instead of JWT
 */
export async function verifyAdminAccess(
  req: Request,
  allowedOrigins?: string[]
): Promise<AdminAuthResult> {
  try {
    // Check origin if provided
    if (allowedOrigins && allowedOrigins.length > 0) {
      const origin = req.headers.get('Origin')
      if (!origin || !allowedOrigins.includes(origin)) {
        return {
          isAdmin: false,
          error: 'Unauthorized origin'
        }
      }
    }

    // Verify service role key is present
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!authHeader || !serviceRoleKey) {
      return {
        isAdmin: false,
        error: 'Missing authentication'
      }
    }

    // Verify service role key matches
    const providedKey = authHeader.replace('Bearer ', '')
    if (providedKey !== serviceRoleKey) {
      return {
        isAdmin: false,
        error: 'Invalid service role key'
      }
    }

    // Additional check: Verify request is from allowed source
    // For cron jobs, check for specific header or IP
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret) {
      const cronHeader = req.headers.get('X-Cron-Secret')
      if (cronHeader !== cronSecret) {
        return {
          isAdmin: false,
          error: 'Invalid cron secret'
        }
      }
    }

    return {
      isAdmin: true
    }
  } catch (error: any) {
    return {
      isAdmin: false,
      error: error.message || 'Authentication error'
    }
  }
}

/**
 * Verify admin user access (for user-initiated admin actions)
 * Requires JWT token with admin role
 */
export async function verifyAdminUser(req: Request): Promise<AdminAuthResult> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return {
        isAdmin: false,
        error: 'Missing authorization header'
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        isAdmin: false,
        error: userError?.message || 'User not authenticated'
      }
    }

    // Check if user has admin role
    const { data: userData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (roleError || !userData) {
      return {
        isAdmin: false,
        error: 'Unable to verify admin role'
      }
    }

    // Check admin role (adjust based on your role system)
    const isAdmin = userData.role === 'admin' || userData.role === 'super_admin'

    return {
      isAdmin,
      user: isAdmin ? user : undefined,
      error: isAdmin ? undefined : 'User does not have admin privileges'
    }
  } catch (error: any) {
    return {
      isAdmin: false,
      error: error.message || 'Authentication error'
    }
  }
}
