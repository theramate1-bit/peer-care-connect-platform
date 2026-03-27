# Database Metadata (MCP-Derived)

**Source:** Supabase MCP (`execute_sql`, `list_tables`), project `aikqnvltuwwgifuocvto`  
**Generated:** 2026-03-15

This document supplements [database-complete-schema.md](./database-complete-schema.md) with MCP-derived metadata: table comments, primary keys, foreign keys, RLS policy counts, and row counts.

---

## Table comments (pg_class)

Tables and views that have PostgreSQL `COMMENT ON TABLE`:

| Table                          | Comment                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| agent_conversations            | Tracks AI agent conversations per user and context                                                                                                                    |
| agent_memory                   | Stores every AI interaction, feedback, and correction for learning                                                                                                    |
| agent_state                    | Persistent state storage across sessions for agent continuity                                                                                                         |
| app_config                     | Application configuration settings                                                                                                                                    |
| checkout_sessions              | Tracks Stripe checkout sessions to prevent double bookings through idempotency keys                                                                                   |
| client_notes                   | DEPRECATED: Client notes have been migrated to treatment_notes table. This table is kept for rollback purposes only.                                                  |
| email_rate_limit               | Tracks last email send time for rate limiting across function invocations                                                                                             |
| email_system_stats             | Email system statistics by hour, type, and status                                                                                                                     |
| exercise_library               | Library of exercises that practitioners can prescribe                                                                                                                 |
| exercise_program_progress      | Client progress tracking for exercise programs                                                                                                                        |
| home_exercise_program_versions | Tracks historical versions of home exercise programs for audit trail                                                                                                  |
| home_exercise_programs         | Home exercise programs prescribed by practitioners to clients                                                                                                         |
| marketplace_practitioners      | Marketplace practitioners view - public read access for browsing                                                                                                      |
| mobile_booking_requests        | Booking requests for mobile therapists. Payment is held until practitioner accepts.                                                                                   |
| notification_preferences       | Notification channel preferences per user                                                                                                                             |
| notifications                  | In-app notifications for users                                                                                                                                        |
| onboarding_progress            | Stores practitioner onboarding progress to allow resuming from where they left off                                                                                    |
| patient_history_requests       | Tracks requests from new practitioners to access patient history from previous practitioners                                                                          |
| practitioner_ai_preferences    | Learns and stores each practitioner's AI style preferences                                                                                                            |
| practitioner_products          | Products/packages that practitioners offer. Auto-migrated from hourly_rate for practitioners without packages.                                                        |
| pre_assessment_forms           | Pre-assessment forms for client screening before sessions. Mandatory for guests every time, mandatory for clients on first session, optional for subsequent sessions. |
| progress_insights              | Caches calculated progress insights to improve performance. Insights can be recalculated periodically or on-demand.                                                   |
| sms_logs                       | Logs of SMS messages sent for session reminders and notifications                                                                                                     |
| user_profiles                  | User profiles table with RLS policies for secure access                                                                                                               |
| v_client_stats                 | Client statistics view - respects RLS on underlying tables                                                                                                            |
| v_paid_sessions                | Paid sessions view - respects RLS on underlying tables                                                                                                                |
| v_practice_totals              | Practice totals view - respects RLS on underlying tables                                                                                                              |

---

## RLS policy counts

All tables in `public` have RLS enabled except `spatial_ref_sys` (PostGIS). Policy count per table:

| Table                       | Policies    | Table                    | Policies |
| --------------------------- | ----------- | ------------------------ | -------- |
| users                       | 19          | client_sessions          | 10       |
| progress_goals              | 9           | progress_metrics         | 9        |
| user_profiles               | 8           | practitioner_products    | 7        |
| treatment_notes             | 8           | session_feedback         | 7        |
| home_exercise_programs      | 6           | product_templates        | 6        |
| checkout_sessions           | 4           | client_favorites         | 4        |
| client_notes                | 4           | cancellation_policies    | 5        |
| dsar_requests               | 4           | goals                    | 4        |
| habits                      | 4           | insights                 | 4        |
| journal_entries             | 4           | location_consents        | 4        |
| moods                       | 4           | mutual_exchange_sessions | 4        |
| notifications               | 4           | onboarding_progress      | 4        |
| patient_history_requests    | 5           | mobile_booking_requests  | 5        |
| messages                    | 5           | progress_insights        | 5        |
| treatment_exchange_requests | 5           | recordings               | 4        |
| therapist_profiles          | 4           | tasks                    | 4        |
| treatment_projects          | 4           | _others_                 | 1–3      |
| spatial_ref_sys             | 0 (RLS off) |                          |          |

---

## Row counts (list_tables)

Sample of populated tables (rows > 0):

| Table                    | Rows | Table                                | Rows |
| ------------------------ | ---- | ------------------------------------ | ---- |
| spatial_ref_sys          | 8500 | calendar_events                      | 730  |
| exercise_library         | 346  | analytics_events                     | 1123 |
| connect_accounts         | 34   | email_logs                           | 110  |
| marketplace_bookings     | 18   | mobile_booking_requests              | 18   |
| practitioner_products    | 15   | reminders                            | 15   |
| client_sessions          | 14   | payments                             | 14   |
| notification_preferences | 10   | booking_attempts_log                 | 10   |
| credits                  | 7    | credit_transactions                  | 8    |
| client_profiles          | 7    | qualifications                       | 8    |
| conversations            | 7    | credit_allocations                   | 7    |
| customers                | 7    | subscriptions                        | 7    |
| messages                 | 12   | message_notifications                | 12   |
| message_status_tracking  | 12   | slot_holds                           | 8    |
| treatment_notes          | 22   | practitioner_availability            | 6    |
| payment_intents          | 6    | treatment_exchange_requests          | 3    |
| pre_assessment_forms     | 3    | practitioner_qualification_documents | 3    |
| users                    | 26   | messages                             | 12   |
| app_config               | 2    | session_recordings                   | 2    |
| email_rate_limit         | 1    | home_exercise_programs               | 1    |

---

## Primary keys

| Table                                | PK column(s) |
| ------------------------------------ | ------------ |
| achievements                         | id           |
| activities                           | id           |
| add_on_services                      | id           |
| admin_users                          | id           |
| agent_conversations                  | id           |
| agent_memory                         | id           |
| agent_state                          | id           |
| alert_notifications                  | id           |
| analytics_alerts                     | id           |
| analytics_dashboards                 | id           |
| analytics_data_points                | id           |
| analytics_events                     | id           |
| analytics_metrics                    | id           |
| app_config                           | key          |
| audit_logs                           | id           |
| availability_slots                   | id           |
| background_checks                    | id           |
| bank_reconciliation                  | id           |
| billing_statements                   | id           |
| booking_attempts_log                 | id           |
| business_stats                       | id           |
| calendar_events                      | id           |
| calendar_sync_configs                | id           |
| cancellation_policies                | id           |
| categories                           | id           |
| challenges                           | id           |
| checkout_sessions                    | id           |
| client_favorites                     | id           |
| client_notes                         | id           |
| client_profiles                      | id           |
| client_sessions                      | id           |
| connect_accounts                     | id           |
| conversation_keys                    | id           |
| conversation_participants            | id           |
| conversations                        | id           |
| cpd_courses                          | id           |
| cpd_enrollments                      | id           |
| cpd_registrations                    | id           |
| cpd_sessions                         | id           |
| credentialing_workflow               | id           |
| credit_allocations                   | id           |
| credit_rates                         | id           |
| credit_transactions                  | id           |
| credits                              | id           |
| csrf_tokens                          | id           |
| custom_reports                       | id           |
| customers                            | id           |
| daily_operations_log                 | id           |
| dashboard_widgets                    | id           |
| data_quality_alerts                  | id           |
| data_quality_checks                  | id           |
| data_quality_rules                   | id           |
| data_quality_violations              | id           |
| data_validation_logs                 | id           |
| detailed_ratings                     | id           |
| dsar_requests                        | id           |
| email_logs                           | id           |
| email_rate_limit                     | id           |
| emergency_contacts                   | id           |
| engagement_analytics                 | id           |
| error_logs                           | id           |
| exercise_library                     | id           |
| exercise_program_progress            | id           |
| financial_analytics                  | id           |
| forum_posts                          | id           |
| forum_replies                        | id           |
| goals                                | id           |
| habits                               | id           |
| home_exercise_program_versions       | id           |
| home_exercise_programs               | id           |
| insights                             | id           |
| insurance_claims                     | id           |
| ip_tracking_log                      | id           |
| journal_entries                      | id           |
| location_consents                    | id           |
| marketplace_bookings                 | id           |
| message_attachments                  | id           |
| message_notifications                | id           |
| message_status_tracking              | id           |
| messages                             | id           |
| mobile_booking_requests              | id           |
| moods                                | id           |
| mutual_exchange_sessions             | id           |
| notification_preferences             | id           |
| notifications                        | id           |
| onboarding_progress                  | id           |
| patient_balances                     | id           |
| patient_history_requests             | id           |
| payment_adjustments                  | id           |
| payment_disputes                     | id           |
| payment_intents                      | id           |
| payment_plan_installments            | id           |
| payment_plans                        | id           |
| payment_transactions                 | id           |
| payments                             | id           |
| payouts                              | id           |
| peer_sessions                        | id           |
| peer_treatment_sessions              | id           |
| performance_metrics                  | id           |
| platform_revenue                     | id           |
| practitioner_ai_preferences          | user_id      |
| practitioner_availability            | id           |
| practitioner_client_stats            | id           |
| practitioner_cpd                     | id           |
| practitioner_credentials             | id           |
| practitioner_insurance               | id           |
| practitioner_product_durations       | id           |
| practitioner_products                | id           |
| practitioner_qualification_documents | id           |
| practitioner_ratings                 | id           |
| practitioner_services                | id           |
| practitioner_specializations         | id           |
| pre_assessment_forms                 | id           |
| product_templates                    | id           |
| profile_completeness_scores          | id           |
| profiles                             | id           |
| progress_goals                       | id           |
| progress_insights                    | id           |
| progress_metrics                     | id           |
| project_analytics                    | id           |
| project_documents                    | id           |
| project_messages                     | id           |
| project_payments                     | id           |
| project_phases                       | id           |
| project_reviews                      | id           |
| projects                             | id           |
| qualifications                       | id           |
| rate_limits                          | key          |
| recordings                           | id           |
| refund_management                    | id           |
| refunds                              | id           |
| reminders                            | id           |
| report_deliveries                    | id           |
| revenue_tracking                     | id           |
| review_flags                         | id           |
| review_notifications                 | id           |
| review_votes                         | id           |
| reviews                              | id           |
| security_events                      | id           |
| service_packages                     | id           |
| service_reviews                      | id           |
| session_attendance                   | id           |
| session_feedback                     | id           |
| session_recordings                   | id           |
| slot_holds                           | id           |
| sms_logs                             | id           |
| soap_templates                       | id           |
| spatial_ref_sys                      | srid         |
| specializations                      | id           |
| stripe_connect_accounts              | id           |
| stripe_payments                      | id           |
| subscribers                          | id           |
| subscriptions                        | id           |
| tasks                                | id           |
| therapist_profiles                   | id           |
| treatment_exchange_requests          | id           |
| treatment_notes                      | id           |
| treatment_projects                   | id           |
| trend_analysis                       | id           |
| user_favorites                       | id           |
| user_messages                        | id           |
| user_presence                        | user_id      |
| user_profiles                        | id           |
| users                                | id           |
| webhook_events                       | id           |

---

## Foreign keys (summary)

Key relationships (FK column → referenced table):

- **users** ← most tables (`user_id`, `client_id`, `therapist_id`, `practitioner_id`, `recipient_id`, etc.)
- **client_sessions** ← mobile_booking_requests, slot_holds, checkout_sessions, treatment_notes, etc.
- **practitioner_products** ← marketplace_bookings, mobile_booking_requests
- **treatment_exchange_requests** ← slot_holds, mutual_exchange_sessions
- **conversations** ← messages, conversation_keys
- **projects** ← project_phases, project_documents, project_messages, project_reviews, project_payments

Full FK list is available via MCP:

```sql
SELECT tc.table_name, tc.constraint_name, kcu.column_name,
       ccu.table_name AS ref_table, ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.ordinal_position;
```

---

## Related docs

- [database-complete-schema.md](./database-complete-schema.md) – Full column structure for every table
- [database-schema.md](./database-schema.md) – Overview and relationships
- [database-tables-mcp-reference.md](./database-tables-mcp-reference.md) – Core tables with code links
