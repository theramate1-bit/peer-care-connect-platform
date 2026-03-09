/**
 * Email System Diagnostic Script
 * 
 * Run: node scripts/diagnose-email-system.js
 * 
 * This script checks:
 * 1. Email logs for recent activity
 * 2. Database triggers and functions
 * 3. Configuration settings
 * 4. Common failure points
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set these in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseEmailSystem() {
  console.log('🔍 Email System Diagnostic\n');
  console.log('='.repeat(60));
  
  // 1. Check email logs
  console.log('\n1️⃣ Checking Email Logs...');
  try {
    const { data: recentEmails, error } = await supabase
      .from('email_logs')
      .select('email_type, recipient_email, status, sent_at, error_message')
      .order('sent_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.log('⚠️  Could not query email_logs:', error.message);
      console.log('   → Table may not exist. Check migrations.');
    } else {
      console.log(`✅ Found ${recentEmails.length} recent email logs`);
      
      const byType = {};
      const byStatus = {};
      recentEmails.forEach(email => {
        byType[email.email_type] = (byType[email.email_type] || 0) + 1;
        byStatus[email.status] = (byStatus[email.status] || 0) + 1;
      });
      
      console.log('\n   Email Types Sent:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
      
      console.log('\n   Status Breakdown:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
      
      const failed = recentEmails.filter(e => e.status === 'failed' || e.error_message);
      if (failed.length > 0) {
        console.log('\n   ⚠️  Failed Emails:');
        failed.forEach(email => {
          console.log(`   - ${email.email_type} to ${email.recipient_email}`);
          console.log(`     Error: ${email.error_message || 'Unknown'}`);
        });
      }
    }
  } catch (err) {
    console.log('❌ Error checking email logs:', err.message);
  }
  
  // 2. Check database triggers
  console.log('\n2️⃣ Checking Database Triggers...');
  try {
    const { data: triggers, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          tgname AS trigger_name,
          tgrelid::regclass AS table_name,
          CASE tgenabled 
            WHEN 'O' THEN 'enabled'
            WHEN 'D' THEN 'disabled'
            ELSE 'unknown'
          END AS status
        FROM pg_trigger
        WHERE tgname LIKE '%email%' 
           OR tgname LIKE '%welcome%' 
           OR tgname LIKE '%same_day%'
        ORDER BY tgname;
      `
    });
    
    if (error) {
      console.log('⚠️  Could not query triggers (may need exec_sql function)');
      console.log('   → Check manually: SELECT * FROM pg_trigger WHERE tgname LIKE \'%email%\';');
    } else {
      console.log(`✅ Found ${triggers.length} email-related triggers`);
      triggers.forEach(trigger => {
        const status = trigger.status === 'enabled' ? '✅' : '❌';
        console.log(`   ${status} ${trigger.trigger_name} on ${trigger.table_name}`);
      });
    }
  } catch (err) {
    console.log('⚠️  Could not check triggers:', err.message);
  }
  
  // 3. Check pg_net extension
  console.log('\n3️⃣ Checking pg_net Extension...');
  try {
    const { data: extensions, error } = await supabase.rpc('exec_sql', {
      query: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
    });
    
    if (error) {
      console.log('⚠️  Could not check pg_net (may need exec_sql function)');
      console.log('   → Check manually: SELECT * FROM pg_extension WHERE extname = \'pg_net\';');
    } else if (extensions && extensions.length > 0) {
      console.log('✅ pg_net extension is enabled');
    } else {
      console.log('❌ pg_net extension is NOT enabled');
      console.log('   → Run: CREATE EXTENSION IF NOT EXISTS pg_net;');
    }
  } catch (err) {
    console.log('⚠️  Could not check pg_net:', err.message);
  }
  
  // 4. Check database settings
  console.log('\n4️⃣ Checking Database Settings...');
  try {
    const { data: settings, error } = await supabase.rpc('exec_sql', {
      query: `SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';`
    });
    
    if (error) {
      console.log('⚠️  Could not check settings (may need exec_sql function)');
      console.log('   → Check manually: SELECT name, setting FROM pg_settings WHERE name LIKE \'app.settings.%\';');
    } else if (settings && settings.length > 0) {
      console.log('✅ Found database settings:');
      settings.forEach(setting => {
        const value = setting.setting.length > 50 
          ? setting.setting.substring(0, 50) + '...' 
          : setting.setting;
        console.log(`   - ${setting.name}: ${value}`);
      });
    } else {
      console.log('❌ No app.settings.* configured');
      console.log('   → Database triggers may not work correctly');
      console.log('   → Set: ALTER DATABASE postgres SET app.settings.edge_function_url = \'...\';');
    }
  } catch (err) {
    console.log('⚠️  Could not check settings:', err.message);
  }
  
  // 5. Check reminders
  console.log('\n5️⃣ Checking Session Reminders...');
  try {
    const { data: pendingReminders, error: pendingError } = await supabase
      .from('reminders')
      .select('id, reminder_time, status, message')
      .eq('status', 'pending')
      .order('reminder_time', { ascending: true })
      .limit(10);
    
    const { data: sentReminders, error: sentError } = await supabase
      .from('reminders')
      .select('id, reminder_time, status, sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(10);
    
    const { data: failedReminders, error: failedError } = await supabase
      .from('reminders')
      .select('id, reminder_time, status, error_message')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (pendingError || sentError || failedError) {
      console.log('⚠️  Could not query reminders table');
    } else {
      console.log(`✅ Pending reminders: ${pendingReminders.length}`);
      console.log(`✅ Sent reminders: ${sentReminders.length}`);
      console.log(`⚠️  Failed reminders: ${failedReminders.length}`);
      
      if (pendingReminders.length > 0) {
        console.log('\n   Next reminders due:');
        pendingReminders.slice(0, 5).forEach(reminder => {
          console.log(`   - ${reminder.reminder_time}: ${reminder.message}`);
        });
      }
      
      if (failedReminders.length > 0) {
        console.log('\n   ⚠️  Failed reminders:');
        failedReminders.slice(0, 5).forEach(reminder => {
          console.log(`   - ${reminder.reminder_time}: ${reminder.error_message || 'Unknown error'}`);
        });
      }
    }
  } catch (err) {
    console.log('⚠️  Could not check reminders:', err.message);
  }
  
  // 6. Check same-day bookings
  console.log('\n6️⃣ Checking Same-Day Bookings...');
  try {
    const { data: sameDayBookings, error } = await supabase
      .from('client_sessions')
      .select('id, status, requires_approval, created_at')
      .eq('requires_approval', true)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('⚠️  Could not query client_sessions:', error.message);
    } else {
      console.log(`✅ Found ${sameDayBookings.length} same-day bookings`);
      
      const byStatus = {};
      sameDayBookings.forEach(booking => {
        byStatus[booking.status] = (byStatus[booking.status] || 0) + 1;
      });
      
      console.log('\n   Status Breakdown:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
      
      const pending = sameDayBookings.filter(b => b.status === 'pending_approval');
      if (pending.length > 0) {
        console.log(`\n   ⚠️  ${pending.length} bookings pending approval`);
      }
    }
  } catch (err) {
    console.log('⚠️  Could not check same-day bookings:', err.message);
  }
  
  // 7. Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary & Recommendations:\n');
  console.log('1. Check Supabase Dashboard → Edge Functions → send-email → Logs');
  console.log('2. Verify RESEND_API_KEY is set in Edge Function secrets');
  console.log('3. Check email_logs table for recent failures');
  console.log('4. Verify pg_net extension is enabled');
  console.log('5. Set app.settings.* database settings if missing');
  console.log('6. Schedule process-reminders cron job if not scheduled');
  console.log('\nFor detailed walkthrough, see: EMAIL_SENDING_COMPLETE_WALKTHROUGH.md');
}

diagnoseEmailSystem().catch(err => {
  console.error('❌ Diagnostic failed:', err);
  process.exit(1);
});
