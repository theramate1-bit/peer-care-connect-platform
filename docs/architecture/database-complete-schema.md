# Complete Database Schema – Every Table

**Source:** Supabase MCP (`execute_sql` on `information_schema.columns`), project `aikqnvltuwwgifuocvto`  
**Generated:** 2026-03-15

This document lists **every table and view** in the `public` schema with full column structure: name, data type, nullability, and default value.

**Quick links:** [database-schema.md](./database-schema.md) (overview) · [database-tables-mcp-reference.md](./database-tables-mcp-reference.md) (core tables) · [database-mcp-metadata.md](./database-mcp-metadata.md) (comments, PKs, FKs, RLS)

---

## Table of contents

<details>
<summary>All tables (click to expand)</summary>

| Table                                                                         | Table                                                   | Table                                                             | Table                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| [achievements](#achievements)                                                 | [activities](#activities)                               | [add_on_services](#add_on_services)                               | [admin_users](#admin_users)                                       |
| [agent_conversations](#agent_conversations)                                   | [agent_memory](#agent_memory)                           | [agent_state](#agent_state)                                       | [alert_notifications](#alert_notifications)                       |
| [analytics_alerts](#analytics_alerts)                                         | [analytics_dashboards](#analytics_dashboards)           | [analytics_data_points](#analytics_data_points)                   | [analytics_events](#analytics_events)                             |
| [analytics_metrics](#analytics_metrics)                                       | [app_config](#app_config)                               | [audit_logs](#audit_logs)                                         | [availability_slots](#availability_slots)                         |
| [background_checks](#background_checks)                                       | [bank_reconciliation](#bank_reconciliation)             | [billing_statements](#billing_statements)                         | [booking_attempts_log](#booking_attempts_log)                     |
| [business_stats](#business_stats)                                             | [calendar_events](#calendar_events)                     | [calendar_sync_configs](#calendar_sync_configs)                   | [cancellation_policies](#cancellation_policies)                   |
| [categories](#categories)                                                     | [challenges](#challenges)                               | [checkout_sessions](#checkout_sessions)                           | [client_favorites](#client_favorites)                             |
| [client_notes](#client_notes)                                                 | [client_profiles](#client_profiles)                     | [client_sessions](#client_sessions)                               | [connect_accounts](#connect_accounts)                             |
| [conversation_keys](#conversation_keys)                                       | [conversation_participants](#conversation_participants) | [conversations](#conversations)                                   | [cpd_courses](#cpd_courses)                                       |
| [cpd_enrollments](#cpd_enrollments)                                           | [cpd_registrations](#cpd_registrations)                 | [cpd_sessions](#cpd_sessions)                                     | [credentialing_workflow](#credentialing_workflow)                 |
| [credit_allocations](#credit_allocations)                                     | [credit_rates](#credit_rates)                           | [credit_transactions](#credit_transactions)                       | [credits](#credits)                                               |
| [csrf_tokens](#csrf_tokens)                                                   | [custom_reports](#custom_reports)                       | [customers](#customers)                                           | [daily_operations_log](#daily_operations_log)                     |
| [dashboard_widgets](#dashboard_widgets)                                       | [data_quality_alerts](#data_quality_alerts)             | [data_quality_checks](#data_quality_checks)                       | [data_quality_rules](#data_quality_rules)                         |
| [data_quality_violations](#data_quality_violations)                           | [data_validation_logs](#data_validation_logs)           | [detailed_ratings](#detailed_ratings)                             | [dsar_requests](#dsar_requests)                                   |
| [email_logs](#email_logs)                                                     | [email_rate_limit](#email_rate_limit)                   | [email_system_stats](#email_system_stats)                         | [emergency_contacts](#emergency_contacts)                         |
| [engagement_analytics](#engagement_analytics)                                 | [error_logs](#error_logs)                               | [exercise_library](#exercise_library)                             | [exercise_program_progress](#exercise_program_progress)           |
| [financial_analytics](#financial_analytics)                                   | [forum_posts](#forum_posts)                             | [forum_replies](#forum_replies)                                   | [geography_columns](#geography_columns)                           |
| [geometry_columns](#geometry_columns)                                         | [goals](#goals)                                         | [habits](#habits)                                                 | [home_exercise_program_versions](#home_exercise_program_versions) |
| [home_exercise_programs](#home_exercise_programs)                             | [insights](#insights)                                   | [insurance_claims](#insurance_claims)                             | [ip_tracking_log](#ip_tracking_log)                               |
| [journal_entries](#journal_entries)                                           | [location_consents](#location_consents)                 | [marketplace_bookings](#marketplace_bookings)                     | [marketplace_practitioners](#marketplace_practitioners)           |
| [message_attachments](#message_attachments)                                   | [message_notifications](#message_notifications)         | [message_status_tracking](#message_status_tracking)               | [messages](#messages)                                             |
| [mobile_booking_requests](#mobile_booking_requests)                           | [moods](#moods)                                         | [mutual_exchange_sessions](#mutual_exchange_sessions)             | [notification_preferences](#notification_preferences)             |
| [notifications](#notifications)                                               | [onboarding_progress](#onboarding_progress)             | [patient_balances](#patient_balances)                             | [patient_history_requests](#patient_history_requests)             |
| [payment_adjustments](#payment_adjustments)                                   | [payment_disputes](#payment_disputes)                   | [payment_intents](#payment_intents)                               | [payment_plan_installments](#payment_plan_installments)           |
| [payment_plans](#payment_plans)                                               | [payment_transactions](#payment_transactions)           | [payments](#payments)                                             | [payouts](#payouts)                                               |
| [peer_sessions](#peer_sessions)                                               | [peer_treatment_sessions](#peer_treatment_sessions)     | [performance_metrics](#performance_metrics)                       | [platform_revenue](#platform_revenue)                             |
| [practitioner_ai_preferences](#practitioner_ai_preferences)                   | [practitioner_availability](#practitioner_availability) | [practitioner_client_stats](#practitioner_client_stats)           | [practitioner_cpd](#practitioner_cpd)                             |
| [practitioner_credentials](#practitioner_credentials)                         | [practitioner_insurance](#practitioner_insurance)       | [practitioner_product_durations](#practitioner_product_durations) | [practitioner_products](#practitioner_products)                   |
| [practitioner_qualification_documents](#practitioner_qualification_documents) | [practitioner_ratings](#practitioner_ratings)           | [practitioner_services](#practitioner_services)                   | [practitioner_specializations](#practitioner_specializations)     |
| [pre_assessment_forms](#pre_assessment_forms)                                 | [product_templates](#product_templates)                 | [profile_completeness_scores](#profile_completeness_scores)       | [profiles](#profiles)                                             |
| [progress_goals](#progress_goals)                                             | [progress_insights](#progress_insights)                 | [progress_metrics](#progress_metrics)                             | [project_analytics](#project_analytics)                           |
| [project_documents](#project_documents)                                       | [project_messages](#project_messages)                   | [project_payments](#project_payments)                             | [project_phases](#project_phases)                                 |
| [project_reviews](#project_reviews)                                           | [projects](#projects)                                   | [qualifications](#qualifications)                                 | [rate_limits](#rate_limits)                                       |
| [recordings](#recordings)                                                     | [refund_management](#refund_management)                 | [refunds](#refunds)                                               | [reminders](#reminders)                                           |
| [report_deliveries](#report_deliveries)                                       | [revenue_tracking](#revenue_tracking)                   | [review_flags](#review_flags)                                     | [review_notifications](#review_notifications)                     |
| [review_votes](#review_votes)                                                 | [reviews](#reviews)                                     | [security_events](#security_events)                               | [service_packages](#service_packages)                             |
| [service_reviews](#service_reviews)                                           | [session_attendance](#session_attendance)               | [session_feedback](#session_feedback)                             | [session_recordings](#session_recordings)                         |
| [slot_holds](#slot_holds)                                                     | [sms_logs](#sms_logs)                                   | [soap_templates](#soap_templates)                                 | [spatial_ref_sys](#spatial_ref_sys)                               |
| [specializations](#specializations)                                           | [stripe_connect_accounts](#stripe_connect_accounts)     | [stripe_payments](#stripe_payments)                               | [subscribers](#subscribers)                                       |
| [subscriptions](#subscriptions)                                               | [tasks](#tasks)                                         | [therapist_profiles](#therapist_profiles)                         | [treatment_exchange_requests](#treatment_exchange_requests)       |
| [treatment_notes](#treatment_notes)                                           | [treatment_projects](#treatment_projects)               | [trend_analysis](#trend_analysis)                                 | [user_favorites](#user_favorites)                                 |
| [user_messages](#user_messages)                                               | [user_presence](#user_presence)                         | [user_profiles](#user_profiles)                                   | [users](#users)                                                   |
| [webhook_events](#webhook_events)                                             |                                                         |                                                                   |                                                                   |

</details>

---

## `achievements`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`     | uuid                     | NO       | —                 |
| 3   | `type`        | text                     | NO       | —                 |
| 4   | `title`       | text                     | NO       | —                 |
| 5   | `description` | text                     | YES      | —                 |
| 6   | `points`      | integer                  | YES      | 0                 |
| 7   | `unlocked_at` | timestamp with time zone | YES      | now()             |

## `activities`

| #   | Column        | Type                     | Nullable | Default            |
| --- | ------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`          | uuid                     | NO       | uuid_generate_v4() |
| 2   | `user_id`     | uuid                     | YES      | —                  |
| 3   | `type`        | USER-DEFINED             | NO       | —                  |
| 4   | `title`       | character varying        | NO       | —                  |
| 5   | `description` | text                     | NO       | —                  |
| 6   | `metadata`    | jsonb                    | YES      | '{}'::jsonb        |
| 7   | `created_at`  | timestamp with time zone | YES      | now()              |

## `add_on_services`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `therapist_id`        | uuid                     | NO       | —                 |
| 3   | `service_name`        | character varying        | NO       | —                 |
| 4   | `service_description` | text                     | YES      | —                 |
| 5   | `duration_minutes`    | integer                  | YES      | —                 |
| 6   | `price`               | numeric                  | NO       | —                 |
| 7   | `is_active`           | boolean                  | YES      | true              |
| 8   | `created_at`          | timestamp with time zone | YES      | now()             |

## `admin_users`

| #   | Column        | Type                     | Nullable | Default                       |
| --- | ------------- | ------------------------ | -------- | ----------------------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid()             |
| 2   | `user_id`     | uuid                     | NO       | —                             |
| 3   | `admin_level` | character varying        | YES      | 'standard'::character varying |
| 4   | `permissions` | jsonb                    | YES      | '{}'::jsonb                   |
| 5   | `last_login`  | timestamp with time zone | YES      | —                             |
| 6   | `created_at`  | timestamp with time zone | YES      | now()                         |
| 7   | `updated_at`  | timestamp with time zone | YES      | now()                         |

## `agent_conversations`

**Comment:** Tracks AI agent conversations per user and context

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`             | uuid                     | NO       | —                 |
| 3   | `interface_type`      | text                     | NO       | —                 |
| 4   | `context_id`          | uuid                     | YES      | —                 |
| 5   | `context_type`        | text                     | YES      | —                 |
| 6   | `title`               | text                     | YES      | —                 |
| 7   | `metadata`            | jsonb                    | YES      | '{}'::jsonb       |
| 8   | `created_at`          | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`          | timestamp with time zone | YES      | now()             |
| 10  | `last_interaction_at` | timestamp with time zone | YES      | now()             |

## `agent_memory`

**Comment:** Stores every AI interaction, feedback, and correction for learning

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `conversation_id`    | uuid                     | YES      | —                 |
| 3   | `user_id`            | uuid                     | NO       | —                 |
| 4   | `role`               | text                     | NO       | —                 |
| 5   | `content`            | text                     | NO       | —                 |
| 6   | `content_type`       | text                     | YES      | 'text'::text      |
| 7   | `metadata`           | jsonb                    | YES      | '{}'::jsonb       |
| 8   | `feedback_score`     | integer                  | YES      | —                 |
| 9   | `feedback_notes`     | text                     | YES      | —                 |
| 10  | `was_corrected`      | boolean                  | YES      | false             |
| 11  | `correction_content` | text                     | YES      | —                 |
| 12  | `correction_reason`  | text                     | YES      | —                 |
| 13  | `parent_memory_id`   | uuid                     | YES      | —                 |
| 14  | `created_at`         | timestamp with time zone | YES      | now()             |

## `agent_state`

**Comment:** Persistent state storage across sessions for agent continuity

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                     | NO       | —                 |
| 3   | `state_key`  | text                     | NO       | —                 |
| 4   | `state_data` | jsonb                    | NO       | —                 |
| 5   | `expires_at` | timestamp with time zone | YES      | —                 |
| 6   | `created_at` | timestamp with time zone | YES      | now()             |
| 7   | `updated_at` | timestamp with time zone | YES      | now()             |

## `alert_notifications`

| #   | Column                 | Type                     | Nullable | Default           |
| --- | ---------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                   | uuid                     | NO       | gen_random_uuid() |
| 2   | `alert_id`             | uuid                     | NO       | —                 |
| 3   | `triggered_at`         | timestamp with time zone | YES      | now()             |
| 4   | `current_value`        | numeric                  | YES      | —                 |
| 5   | `threshold_value`      | numeric                  | YES      | —                 |
| 6   | `notification_sent`    | boolean                  | YES      | false             |
| 7   | `notification_method`  | text                     | YES      | —                 |
| 8   | `notification_sent_at` | timestamp with time zone | YES      | —                 |
| 9   | `created_at`           | timestamp with time zone | YES      | now()             |

## `analytics_alerts`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`           | uuid                     | NO       | —                 |
| 3   | `alert_name`        | text                     | NO       | —                 |
| 4   | `alert_description` | text                     | YES      | —                 |
| 5   | `metric_id`         | uuid                     | NO       | —                 |
| 6   | `alert_condition`   | text                     | NO       | —                 |
| 7   | `threshold_value`   | numeric                  | YES      | —                 |
| 8   | `alert_frequency`   | text                     | YES      | 'immediate'::text |
| 9   | `is_active`         | boolean                  | YES      | true              |
| 10  | `last_triggered_at` | timestamp with time zone | YES      | —                 |
| 11  | `created_at`        | timestamp with time zone | YES      | now()             |
| 12  | `updated_at`        | timestamp with time zone | YES      | now()             |

## `analytics_dashboards`

| #   | Column           | Type                     | Nullable | Default           |
| --- | ---------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`             | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`        | uuid                     | NO       | —                 |
| 3   | `dashboard_name` | text                     | NO       | —                 |
| 4   | `dashboard_type` | text                     | NO       | —                 |
| 5   | `layout_config`  | jsonb                    | YES      | —                 |
| 6   | `is_default`     | boolean                  | YES      | false             |
| 7   | `created_at`     | timestamp with time zone | YES      | now()             |
| 8   | `updated_at`     | timestamp with time zone | YES      | now()             |

## `analytics_data_points`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `metric_id`    | uuid                     | NO       | —                 |
| 3   | `user_id`      | uuid                     | YES      | —                 |
| 4   | `project_id`   | uuid                     | YES      | —                 |
| 5   | `metric_value` | numeric                  | YES      | —                 |
| 6   | `metric_date`  | date                     | NO       | —                 |
| 7   | `metric_hour`  | integer                  | YES      | —                 |
| 8   | `context_data` | jsonb                    | YES      | —                 |
| 9   | `created_at`   | timestamp with time zone | YES      | now()             |

## `analytics_events`

| #   | Column       | Type                        | Nullable | Default           |
| --- | ------------ | --------------------------- | -------- | ----------------- |
| 1   | `id`         | uuid                        | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                        | YES      | —                 |
| 3   | `event_type` | character varying           | NO       | —                 |
| 4   | `event_name` | character varying           | NO       | —                 |
| 5   | `properties` | jsonb                       | YES      | —                 |
| 6   | `session_id` | character varying           | YES      | —                 |
| 7   | `page_url`   | text                        | YES      | —                 |
| 8   | `user_agent` | text                        | YES      | —                 |
| 9   | `ip_address` | inet                        | YES      | —                 |
| 10  | `created_at` | timestamp without time zone | YES      | now()             |
| 11  | `metadata`   | jsonb                       | YES      | '{}'::jsonb       |

## `analytics_metrics`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `metric_name`        | text                     | NO       | —                 |
| 3   | `metric_description` | text                     | YES      | —                 |
| 4   | `metric_type`        | USER-DEFINED             | NO       | —                 |
| 5   | `metric_unit`        | text                     | YES      | —                 |
| 6   | `metric_category`    | text                     | NO       | —                 |
| 7   | `calculation_logic`  | text                     | YES      | —                 |
| 8   | `data_source`        | text                     | YES      | —                 |
| 9   | `is_custom`          | boolean                  | YES      | false             |
| 10  | `created_at`         | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`         | timestamp with time zone | YES      | now()             |

## `app_config`

**Comment:** Application configuration settings

| #   | Column        | Type                     | Nullable | Default |
| --- | ------------- | ------------------------ | -------- | ------- |
| 1   | `key`         | text                     | NO       | —       |
| 2   | `value`       | text                     | NO       | —       |
| 3   | `description` | text                     | YES      | —       |
| 4   | `updated_at`  | timestamp with time zone | NO       | now()   |
| 5   | `updated_by`  | text                     | YES      | —       |

## `audit_logs`

| #   | Column          | Type                     | Nullable | Default           |
| --- | --------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`            | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`       | uuid                     | YES      | —                 |
| 3   | `action`        | character varying        | NO       | —                 |
| 4   | `resource_type` | character varying        | NO       | —                 |
| 5   | `resource_id`   | uuid                     | YES      | —                 |
| 6   | `old_values`    | jsonb                    | YES      | —                 |
| 7   | `new_values`    | jsonb                    | YES      | —                 |
| 8   | `ip_address`    | inet                     | YES      | —                 |
| 9   | `user_agent`    | text                     | YES      | —                 |
| 10  | `session_id`    | character varying        | YES      | —                 |
| 11  | `created_at`    | timestamp with time zone | YES      | now()             |

## `availability_slots`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `therapist_id`     | uuid                     | NO       | —                 |
| 3   | `day_of_week`      | integer                  | NO       | —                 |
| 4   | `start_time`       | time without time zone   | NO       | —                 |
| 5   | `end_time`         | time without time zone   | NO       | —                 |
| 6   | `duration_minutes` | integer                  | NO       | 60                |
| 7   | `is_available`     | boolean                  | YES      | true              |
| 8   | `created_at`       | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`       | timestamp with time zone | YES      | now()             |

## `background_checks`

| #   | Column               | Type                     | Nullable | Default                      |
| --- | -------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid()            |
| 2   | `practitioner_id`    | uuid                     | YES      | —                            |
| 3   | `check_type`         | character varying        | NO       | —                            |
| 4   | `provider`           | character varying        | NO       | —                            |
| 5   | `reference_number`   | character varying        | YES      | —                            |
| 6   | `check_date`         | date                     | NO       | —                            |
| 7   | `expiry_date`        | date                     | YES      | —                            |
| 8   | `renewal_date`       | date                     | YES      | —                            |
| 9   | `status`             | character varying        | YES      | 'pending'::character varying |
| 10  | `result_details`     | text                     | YES      | —                            |
| 11  | `risk_level`         | character varying        | YES      | —                            |
| 12  | `certificate_url`    | text                     | YES      | —                            |
| 13  | `report_url`         | text                     | YES      | —                            |
| 14  | `verified_at`        | timestamp with time zone | YES      | —                            |
| 15  | `verified_by`        | uuid                     | YES      | —                            |
| 16  | `verification_notes` | text                     | YES      | —                            |
| 17  | `created_at`         | timestamp with time zone | YES      | now()                        |
| 18  | `updated_at`         | timestamp with time zone | YES      | now()                        |

## `bank_reconciliation`

| #   | Column                   | Type                     | Nullable | Default                        |
| --- | ------------------------ | ------------------------ | -------- | ------------------------------ |
| 1   | `id`                     | uuid                     | NO       | gen_random_uuid()              |
| 2   | `bank_statement_date`    | date                     | NO       | —                              |
| 3   | `bank_reference`         | character varying        | NO       | —                              |
| 4   | `amount_pence`           | integer                  | NO       | —                              |
| 5   | `currency`               | character varying        | YES      | 'GBP'::character varying       |
| 6   | `matched_transaction_id` | uuid                     | YES      | —                              |
| 7   | `match_status`           | character varying        | YES      | 'unmatched'::character varying |
| 8   | `match_date`             | timestamp with time zone | YES      | —                              |
| 9   | `match_notes`            | text                     | YES      | —                              |
| 10  | `bank_account`           | character varying        | YES      | —                              |
| 11  | `bank_name`              | character varying        | YES      | —                              |
| 12  | `created_at`             | timestamp with time zone | YES      | now()                          |
| 13  | `created_by`             | uuid                     | YES      | —                              |

## `billing_statements`

| #   | Column                    | Type                     | Nullable | Default                   |
| --- | ------------------------- | ------------------------ | -------- | ------------------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid()         |
| 2   | `patient_id`              | uuid                     | YES      | —                         |
| 3   | `practitioner_id`         | uuid                     | YES      | —                         |
| 4   | `statement_number`        | character varying        | NO       | —                         |
| 5   | `statement_date`          | date                     | NO       | —                         |
| 6   | `due_date`                | date                     | NO       | —                         |
| 7   | `previous_balance_pence`  | integer                  | YES      | 0                         |
| 8   | `new_charges_pence`       | integer                  | YES      | 0                         |
| 9   | `payments_received_pence` | integer                  | YES      | 0                         |
| 10  | `adjustments_pence`       | integer                  | YES      | 0                         |
| 11  | `current_balance_pence`   | integer                  | NO       | —                         |
| 12  | `status`                  | character varying        | YES      | 'sent'::character varying |
| 13  | `sent_date`               | timestamp with time zone | YES      | —                         |
| 14  | `viewed_date`             | timestamp with time zone | YES      | —                         |
| 15  | `paid_date`               | timestamp with time zone | YES      | —                         |
| 16  | `email_sent`              | boolean                  | YES      | false                     |
| 17  | `email_sent_date`         | timestamp with time zone | YES      | —                         |
| 18  | `postal_sent`             | boolean                  | YES      | false                     |
| 19  | `postal_sent_date`        | timestamp with time zone | YES      | —                         |
| 20  | `statement_pdf_url`       | text                     | YES      | —                         |
| 21  | `created_at`              | timestamp with time zone | YES      | now()                     |
| 22  | `created_by`              | uuid                     | YES      | —                         |

## `booking_attempts_log`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `therapist_id`     | uuid                     | YES      | —                 |
| 3   | `client_id`        | uuid                     | YES      | —                 |
| 4   | `session_date`     | date                     | NO       | —                 |
| 5   | `start_time`       | time without time zone   | NO       | —                 |
| 6   | `duration_minutes` | integer                  | NO       | —                 |
| 7   | `attempt_status`   | text                     | NO       | —                 |
| 8   | `error_message`    | text                     | YES      | —                 |
| 9   | `error_code`       | text                     | YES      | —                 |
| 10  | `idempotency_key`  | text                     | YES      | —                 |
| 11  | `session_id`       | uuid                     | YES      | —                 |
| 12  | `is_peer_booking`  | boolean                  | YES      | false             |
| 13  | `created_at`       | timestamp with time zone | YES      | now()             |

## `business_stats`

| #   | Column            | Type                     | Nullable | Default            |
| --- | ----------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`              | uuid                     | NO       | uuid_generate_v4() |
| 2   | `user_id`         | uuid                     | YES      | —                  |
| 3   | `date`            | date                     | NO       | —                  |
| 4   | `total_clients`   | integer                  | YES      | 0                  |
| 5   | `active_clients`  | integer                  | YES      | 0                  |
| 6   | `monthly_revenue` | numeric                  | YES      | 0                  |
| 7   | `sessions_count`  | integer                  | YES      | 0                  |
| 8   | `average_rating`  | numeric                  | YES      | 0                  |
| 9   | `created_at`      | timestamp with time zone | YES      | now()              |

## `calendar_events`

| #   | Column              | Type                     | Nullable | Default             |
| --- | ------------------- | ------------------------ | -------- | ------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()   |
| 2   | `user_id`           | uuid                     | NO       | —                   |
| 3   | `external_id`       | text                     | YES      | —                   |
| 4   | `title`             | text                     | NO       | —                   |
| 5   | `start_time`        | timestamp with time zone | NO       | —                   |
| 6   | `end_time`          | timestamp with time zone | NO       | —                   |
| 7   | `description`       | text                     | YES      | —                   |
| 8   | `location`          | text                     | YES      | —                   |
| 9   | `status`            | text                     | YES      | 'confirmed'::text   |
| 10  | `source`            | text                     | YES      | 'external'::text    |
| 11  | `attendees`         | jsonb                    | YES      | '[]'::jsonb         |
| 12  | `created_at`        | timestamp with time zone | YES      | now()               |
| 13  | `updated_at`        | timestamp with time zone | YES      | now()               |
| 14  | `external_event_id` | text                     | YES      | —                   |
| 15  | `internal_event_id` | uuid                     | YES      | —                   |
| 16  | `event_type`        | text                     | YES      | 'appointment'::text |
| 17  | `provider`          | text                     | YES      | 'internal'::text    |
| 18  | `last_synced_at`    | timestamp with time zone | YES      | —                   |
| 19  | `metadata`          | jsonb                    | YES      | '{}'::jsonb         |

## `calendar_sync_configs`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`          | uuid                     | NO       | —                 |
| 3   | `provider`         | text                     | NO       | —                 |
| 4   | `enabled`          | boolean                  | YES      | false             |
| 5   | `sync_interval`    | integer                  | YES      | 30                |
| 6   | `last_sync`        | timestamp with time zone | YES      | —                 |
| 7   | `calendar_id`      | text                     | YES      | —                 |
| 8   | `access_token`     | text                     | YES      | —                 |
| 9   | `refresh_token`    | text                     | YES      | —                 |
| 10  | `created_at`       | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`       | timestamp with time zone | YES      | now()             |
| 12  | `token_expires_at` | timestamp with time zone | YES      | —                 |
| 13  | `sync_direction`   | text                     | YES      | 'two-way'::text   |

## `cancellation_policies`

| #   | Column                   | Type                     | Nullable | Default           |
| --- | ------------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`                     | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id`        | uuid                     | NO       | —                 |
| 3   | `advance_notice_hours`   | integer                  | YES      | 24                |
| 4   | `full_refund_hours`      | integer                  | YES      | 24                |
| 5   | `partial_refund_hours`   | integer                  | YES      | 12                |
| 6   | `partial_refund_percent` | numeric                  | YES      | 50.00             |
| 7   | `no_refund_hours`        | integer                  | YES      | 12                |
| 8   | `is_active`              | boolean                  | YES      | true              |
| 9   | `created_at`             | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`             | timestamp with time zone | YES      | now()             |

## `categories`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `name`        | character varying        | NO       | —                 |
| 3   | `description` | text                     | YES      | —                 |
| 4   | `icon`        | character varying        | YES      | —                 |
| 5   | `color`       | character varying        | YES      | —                 |
| 6   | `is_active`   | boolean                  | YES      | true              |
| 7   | `created_at`  | timestamp with time zone | YES      | now()             |

## `challenges`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`     | uuid                     | NO       | —                 |
| 3   | `title`       | text                     | NO       | —                 |
| 4   | `description` | text                     | YES      | —                 |
| 5   | `start_date`  | date                     | YES      | CURRENT_DATE      |
| 6   | `end_date`    | date                     | YES      | —                 |
| 7   | `completed`   | boolean                  | YES      | false             |
| 8   | `created_at`  | timestamp with time zone | YES      | now()             |

## `checkout_sessions`

**Comment:** Tracks Stripe checkout sessions to prevent double bookings through idempotency keys

| #   | Column                       | Type                     | Nullable | Default           |
| --- | ---------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                         | uuid                     | NO       | gen_random_uuid() |
| 2   | `stripe_checkout_session_id` | text                     | NO       | —                 |
| 3   | `idempotency_key`            | text                     | NO       | —                 |
| 4   | `practitioner_id`            | uuid                     | YES      | —                 |
| 5   | `client_email`               | text                     | NO       | —                 |
| 6   | `client_name`                | text                     | YES      | —                 |
| 7   | `session_id`                 | uuid                     | YES      | —                 |
| 8   | `status`                     | text                     | YES      | 'pending'::text   |
| 9   | `created_at`                 | timestamp with time zone | YES      | now()             |
| 10  | `expires_at`                 | timestamp with time zone | YES      | —                 |

## `client_favorites`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`    | uuid                     | NO       | —                 |
| 3   | `therapist_id` | uuid                     | NO       | —                 |
| 4   | `created_at`   | timestamp with time zone | YES      | now()             |

## `client_notes`

**Comment:** DEPRECATED: Client notes have been migrated to treatment_notes table. This table is kept for rollback purposes only.

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id` | uuid                     | NO       | —                 |
| 3   | `client_id`       | uuid                     | YES      | —                 |
| 4   | `client_email`    | text                     | NO       | —                 |
| 5   | `client_name`     | text                     | NO       | —                 |
| 6   | `notes`           | text                     | YES      | —                 |
| 7   | `health_goals`    | jsonb                    | YES      | '[]'::jsonb       |
| 8   | `medical_history` | jsonb                    | YES      | '{}'::jsonb       |
| 9   | `preferences`     | jsonb                    | YES      | '{}'::jsonb       |
| 10  | `created_at`      | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`      | timestamp with time zone | YES      | now()             |

## `client_profiles`

| #   | Column                  | Type                     | Nullable | Default           |
| --- | ----------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                    | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`             | uuid                     | YES      | —                 |
| 3   | `practitioner_id`       | uuid                     | YES      | —                 |
| 4   | `total_sessions`        | integer                  | YES      | 0                 |
| 5   | `completed_sessions`    | integer                  | YES      | 0                 |
| 6   | `cancelled_sessions`    | integer                  | YES      | 0                 |
| 7   | `no_show_sessions`      | integer                  | YES      | 0                 |
| 8   | `total_spent_pence`     | integer                  | YES      | 0                 |
| 9   | `last_session_date`     | timestamp with time zone | YES      | —                 |
| 10  | `next_session_date`     | timestamp with time zone | YES      | —                 |
| 11  | `first_session_date`    | timestamp with time zone | YES      | —                 |
| 12  | `active_treatment_plan` | boolean                  | YES      | false             |
| 13  | `active_goals_count`    | integer                  | YES      | 0                 |
| 14  | `status`                | text                     | YES      | 'active'::text    |
| 15  | `created_at`            | timestamp with time zone | YES      | now()             |
| 16  | `updated_at`            | timestamp with time zone | YES      | now()             |
| 17  | `client_email`          | text                     | YES      | —                 |
| 18  | `client_name`           | text                     | YES      | —                 |

## `client_sessions`

| #   | Column                     | Type                     | Nullable | Default                      |
| --- | -------------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                       | uuid                     | NO       | uuid_generate_v4()           |
| 2   | `therapist_id`             | uuid                     | YES      | —                            |
| 3   | `client_name`              | character varying        | NO       | —                            |
| 4   | `client_email`             | character varying        | YES      | —                            |
| 5   | `client_phone`             | character varying        | YES      | —                            |
| 6   | `session_date`             | date                     | NO       | —                            |
| 7   | `start_time`               | time without time zone   | NO       | —                            |
| 8   | `duration_minutes`         | integer                  | NO       | —                            |
| 9   | `session_type`             | character varying        | YES      | —                            |
| 10  | `status`                   | USER-DEFINED             | YES      | 'scheduled'::session_status  |
| 11  | `notes`                    | text                     | YES      | —                            |
| 12  | `price`                    | numeric                  | YES      | —                            |
| 13  | `payment_status`           | character varying        | YES      | 'pending'::character varying |
| 14  | `created_at`               | timestamp with time zone | YES      | now()                        |
| 15  | `updated_at`               | timestamp with time zone | YES      | now()                        |
| 16  | `has_recording`            | boolean                  | YES      | false                        |
| 17  | `recording_consent`        | boolean                  | YES      | false                        |
| 18  | `stripe_payment_intent_id` | text                     | YES      | —                            |
| 19  | `platform_fee_amount`      | numeric                  | YES      | 0                            |
| 20  | `practitioner_amount`      | numeric                  | YES      | 0                            |
| 21  | `payment_method`           | text                     | YES      | —                            |
| 22  | `payment_date`             | timestamp with time zone | YES      | —                            |
| 23  | `credit_cost`              | integer                  | YES      | 0                            |
| 24  | `is_peer_booking`          | boolean                  | YES      | false                        |
| 25  | `client_id`                | uuid                     | YES      | —                            |
| 26  | `credit_earned`            | integer                  | YES      | 0                            |
| 27  | `expires_at`               | timestamp with time zone | YES      | —                            |
| 28  | `cancellation_reason`      | text                     | YES      | —                            |
| 29  | `cancelled_by`             | uuid                     | YES      | —                            |
| 30  | `cancelled_at`             | timestamp with time zone | YES      | —                            |
| 31  | `refund_amount`            | numeric                  | YES      | —                            |
| 32  | `refund_percentage`        | numeric                  | YES      | —                            |
| 33  | `session_number`           | integer                  | YES      | —                            |
| 34  | `idempotency_key`          | text                     | YES      | —                            |
| 35  | `pre_assessment_required`  | boolean                  | YES      | true                         |
| 36  | `pre_assessment_completed` | boolean                  | YES      | false                        |
| 37  | `pre_assessment_form_id`   | uuid                     | YES      | —                            |
| 38  | `client_attended`          | boolean                  | YES      | true                         |
| 39  | `requires_approval`        | boolean                  | YES      | false                        |
| 40  | `approval_expires_at`      | timestamp with time zone | YES      | —                            |
| 41  | `decline_reason`           | text                     | YES      | —                            |
| 42  | `is_guest_booking`         | boolean                  | NO       | false                        |
| 43  | `guest_view_token`         | text                     | YES      | —                            |
| 44  | `appointment_type`         | text                     | NO       | 'clinic'::text               |
| 45  | `visit_address`            | text                     | YES      | —                            |

## `connect_accounts`

| #   | Column              | Type                     | Nullable | Default                           |
| --- | ------------------- | ------------------------ | -------- | --------------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()                 |
| 2   | `user_id`           | uuid                     | NO       | —                                 |
| 3   | `stripe_account_id` | text                     | NO       | —                                 |
| 4   | `account_status`    | USER-DEFINED             | YES      | 'pending'::connect_account_status |
| 5   | `charges_enabled`   | boolean                  | YES      | false                             |
| 6   | `payouts_enabled`   | boolean                  | YES      | false                             |
| 7   | `details_submitted` | boolean                  | YES      | false                             |
| 8   | `requirements`      | jsonb                    | YES      | —                                 |
| 9   | `capabilities`      | jsonb                    | YES      | —                                 |
| 10  | `business_type`     | text                     | YES      | —                                 |
| 11  | `company`           | jsonb                    | YES      | —                                 |
| 12  | `individual`        | jsonb                    | YES      | —                                 |
| 13  | `created_at`        | timestamp with time zone | YES      | now()                             |
| 14  | `updated_at`        | timestamp with time zone | YES      | now()                             |

## `conversation_keys`

| #   | Column                  | Type                     | Nullable | Default           |
| --- | ----------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                    | uuid                     | NO       | gen_random_uuid() |
| 2   | `conversation_id`       | uuid                     | NO       | —                 |
| 3   | `user_id`               | uuid                     | NO       | —                 |
| 4   | `encrypted_private_key` | text                     | NO       | —                 |
| 5   | `public_key`            | text                     | NO       | —                 |
| 6   | `key_version`           | integer                  | YES      | 1                 |
| 7   | `created_at`            | timestamp with time zone | YES      | now()             |
| 8   | `expires_at`            | timestamp with time zone | YES      | —                 |

## `conversation_participants`

| #   | Column                 | Type                     | Nullable | Default           |
| --- | ---------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                   | uuid                     | NO       | gen_random_uuid() |
| 2   | `conversation_id`      | uuid                     | NO       | —                 |
| 3   | `user_id`              | uuid                     | NO       | —                 |
| 4   | `is_archived`          | boolean                  | YES      | false             |
| 5   | `is_muted`             | boolean                  | YES      | false             |
| 6   | `last_read_message_id` | uuid                     | YES      | —                 |
| 7   | `last_read_at`         | timestamp with time zone | YES      | —                 |
| 8   | `joined_at`            | timestamp with time zone | YES      | now()             |

## `conversations`

| #   | Column                     | Type                     | Nullable | Default                       |
| --- | -------------------------- | ------------------------ | -------- | ----------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()             |
| 2   | `conversation_key`         | text                     | NO       | —                             |
| 3   | `participant1_id`          | uuid                     | NO       | —                             |
| 4   | `participant2_id`          | uuid                     | YES      | —                             |
| 5   | `last_message_at`          | timestamp with time zone | YES      | now()                         |
| 6   | `last_message_id`          | uuid                     | YES      | —                             |
| 7   | `conversation_status`      | USER-DEFINED             | YES      | 'active'::conversation_status |
| 8   | `created_at`               | timestamp with time zone | YES      | now()                         |
| 9   | `updated_at`               | timestamp with time zone | YES      | now()                         |
| 10  | `guest_email`              | text                     | YES      | —                             |
| 11  | `pending_account_creation` | boolean                  | YES      | false                         |

## `cpd_courses`

| #   | Column           | Type                     | Nullable | Default                        |
| --- | ---------------- | ------------------------ | -------- | ------------------------------ |
| 1   | `id`             | uuid                     | NO       | gen_random_uuid()              |
| 2   | `title`          | character varying        | NO       | —                              |
| 3   | `description`    | text                     | NO       | —                              |
| 4   | `duration_hours` | numeric                  | NO       | —                              |
| 5   | `course_type`    | character varying        | NO       | —                              |
| 6   | `start_date`     | date                     | NO       | —                              |
| 7   | `end_date`       | date                     | NO       | —                              |
| 8   | `status`         | character varying        | YES      | 'published'::character varying |
| 9   | `created_at`     | timestamp with time zone | YES      | now()                          |

## `cpd_enrollments`

| #   | Column               | Type                     | Nullable | Default                       |
| --- | -------------------- | ------------------------ | -------- | ----------------------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid()             |
| 2   | `course_id`          | uuid                     | YES      | —                             |
| 3   | `practitioner_id`    | uuid                     | YES      | —                             |
| 4   | `enrollment_date`    | timestamp with time zone | YES      | now()                         |
| 5   | `status`             | character varying        | YES      | 'enrolled'::character varying |
| 6   | `completion_date`    | timestamp with time zone | YES      | —                             |
| 7   | `certificate_issued` | boolean                  | YES      | false                         |
| 8   | `created_at`         | timestamp with time zone | YES      | now()                         |

## `cpd_registrations`

| #   | Column              | Type                     | Nullable | Default            |
| --- | ------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                | uuid                     | NO       | uuid_generate_v4() |
| 2   | `user_id`           | uuid                     | YES      | —                  |
| 3   | `session_id`        | uuid                     | YES      | —                  |
| 4   | `registration_date` | timestamp with time zone | YES      | now()              |
| 5   | `attended`          | boolean                  | YES      | false              |
| 6   | `certificate_url`   | character varying        | YES      | —                  |

## `cpd_sessions`

| #   | Column                   | Type                     | Nullable | Default            |
| --- | ------------------------ | ------------------------ | -------- | ------------------ |
| 1   | `id`                     | uuid                     | NO       | uuid_generate_v4() |
| 2   | `title`                  | character varying        | NO       | —                  |
| 3   | `description`            | text                     | YES      | —                  |
| 4   | `instructor_name`        | character varying        | NO       | —                  |
| 5   | `instructor_credentials` | text                     | YES      | —                  |
| 6   | `date`                   | date                     | NO       | —                  |
| 7   | `start_time`             | time without time zone   | NO       | —                  |
| 8   | `duration_minutes`       | integer                  | NO       | —                  |
| 9   | `max_attendees`          | integer                  | YES      | —                  |
| 10  | `current_attendees`      | integer                  | YES      | 0                  |
| 11  | `price`                  | numeric                  | YES      | 0                  |
| 12  | `is_live`                | boolean                  | YES      | true               |
| 13  | `recording_url`          | character varying        | YES      | —                  |
| 14  | `materials_url`          | character varying        | YES      | —                  |
| 15  | `created_at`             | timestamp with time zone | YES      | now()              |
| 16  | `updated_at`             | timestamp with time zone | YES      | now()              |

## `credentialing_workflow`

| #   | Column                | Type                     | Nullable | Default                      |
| --- | --------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid()            |
| 2   | `practitioner_id`     | uuid                     | YES      | —                            |
| 3   | `workflow_type`       | character varying        | NO       | —                            |
| 4   | `status`              | character varying        | YES      | 'pending'::character varying |
| 5   | `required_documents`  | ARRAY                    | YES      | —                            |
| 6   | `submitted_documents` | ARRAY                    | YES      | —                            |
| 7   | `missing_documents`   | ARRAY                    | YES      | —                            |
| 8   | `assigned_reviewer`   | uuid                     | YES      | —                            |
| 9   | `review_deadline`     | date                     | YES      | —                            |
| 10  | `review_notes`        | text                     | YES      | —                            |
| 11  | `approved_at`         | timestamp with time zone | YES      | —                            |
| 12  | `approved_by`         | uuid                     | YES      | —                            |
| 13  | `approval_notes`      | text                     | YES      | —                            |
| 14  | `rejected_at`         | timestamp with time zone | YES      | —                            |
| 15  | `rejected_by`         | uuid                     | YES      | —                            |
| 16  | `rejection_reason`    | text                     | YES      | —                            |
| 17  | `created_at`          | timestamp with time zone | YES      | now()                        |
| 18  | `updated_at`          | timestamp with time zone | YES      | now()                        |

## `credit_allocations`

| #   | Column            | Type                     | Nullable | Default                      |
| --- | ----------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()            |
| 2   | `user_id`         | uuid                     | NO       | —                            |
| 3   | `subscription_id` | uuid                     | YES      | —                            |
| 4   | `amount`          | integer                  | NO       | —                            |
| 5   | `allocation_type` | character varying        | NO       | 'monthly'::character varying |
| 6   | `period_start`    | timestamp with time zone | NO       | —                            |
| 7   | `period_end`      | timestamp with time zone | NO       | —                            |
| 8   | `allocated_at`    | timestamp with time zone | YES      | now()                        |
| 9   | `created_at`      | timestamp with time zone | YES      | now()                        |

## `credit_rates`

| #   | Column           | Type                     | Nullable | Default           |
| --- | ---------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`             | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_type`   | text                     | NO       | —                 |
| 3   | `credit_cost`    | integer                  | NO       | —                 |
| 4   | `credit_earning` | integer                  | NO       | —                 |
| 5   | `is_active`      | boolean                  | YES      | true              |
| 6   | `created_at`     | timestamp with time zone | YES      | now()             |
| 7   | `updated_at`     | timestamp with time zone | YES      | now()             |

## `credit_transactions`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`          | uuid                     | YES      | —                 |
| 3   | `amount`           | integer                  | NO       | —                 |
| 4   | `transaction_type` | text                     | NO       | —                 |
| 5   | `description`      | text                     | YES      | —                 |
| 6   | `balance_after`    | integer                  | NO       | —                 |
| 7   | `session_id`       | uuid                     | YES      | —                 |
| 8   | `metadata`         | jsonb                    | YES      | —                 |
| 9   | `created_at`       | timestamp with time zone | YES      | now()             |
| 10  | `balance_before`   | integer                  | YES      | —                 |

## `credits`

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`         | uuid                     | YES      | —                 |
| 3   | `current_balance` | integer                  | YES      | 0                 |
| 4   | `total_earned`    | integer                  | YES      | 0                 |
| 5   | `total_spent`     | integer                  | YES      | 0                 |
| 6   | `created_at`      | timestamp with time zone | YES      | now()             |
| 7   | `updated_at`      | timestamp with time zone | YES      | now()             |
| 8   | `balance`         | integer                  | YES      | 0                 |

## `csrf_tokens`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                     | NO       | —                 |
| 3   | `token`      | text                     | NO       | —                 |
| 4   | `expires_at` | timestamp with time zone | NO       | —                 |
| 5   | `created_at` | timestamp with time zone | YES      | now()             |
| 6   | `updated_at` | timestamp with time zone | YES      | now()             |

## `custom_reports`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`            | uuid                     | NO       | —                 |
| 3   | `report_name`        | text                     | NO       | —                 |
| 4   | `report_description` | text                     | YES      | —                 |
| 5   | `report_type`        | text                     | NO       | —                 |
| 6   | `report_config`      | jsonb                    | NO       | —                 |
| 7   | `schedule_frequency` | USER-DEFINED             | YES      | —                 |
| 8   | `schedule_config`    | jsonb                    | YES      | —                 |
| 9   | `last_generated_at`  | timestamp with time zone | YES      | —                 |
| 10  | `next_generation_at` | timestamp with time zone | YES      | —                 |
| 11  | `is_active`          | boolean                  | YES      | true              |
| 12  | `created_at`         | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`         | timestamp with time zone | YES      | now()             |

## `customers`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`            | uuid                     | YES      | —                 |
| 3   | `stripe_customer_id` | text                     | NO       | —                 |
| 4   | `email`              | text                     | YES      | —                 |
| 5   | `name`               | text                     | YES      | —                 |
| 6   | `phone`              | text                     | YES      | —                 |
| 7   | `address`            | jsonb                    | YES      | —                 |
| 8   | `created_at`         | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`         | timestamp with time zone | YES      | now()             |

## `daily_operations_log`

| #   | Column           | Type                     | Nullable | Default                      |
| --- | ---------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`             | uuid                     | NO       | gen_random_uuid()            |
| 2   | `operation_type` | character varying        | NO       | —                            |
| 3   | `operation_data` | jsonb                    | YES      | —                            |
| 4   | `status`         | character varying        | YES      | 'pending'::character varying |
| 5   | `error_message`  | text                     | YES      | —                            |
| 6   | `executed_at`    | timestamp with time zone | YES      | —                            |
| 7   | `created_at`     | timestamp with time zone | YES      | now()                        |

## `dashboard_widgets`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `dashboard_id`     | uuid                     | NO       | —                 |
| 3   | `widget_type`      | text                     | NO       | —                 |
| 4   | `widget_title`     | text                     | NO       | —                 |
| 5   | `widget_config`    | jsonb                    | YES      | —                 |
| 6   | `position_x`       | integer                  | YES      | 0                 |
| 7   | `position_y`       | integer                  | YES      | 0                 |
| 8   | `width`            | integer                  | YES      | 1                 |
| 9   | `height`           | integer                  | YES      | 1                 |
| 10  | `refresh_interval` | integer                  | YES      | 300               |
| 11  | `is_active`        | boolean                  | YES      | true              |
| 12  | `created_at`       | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`       | timestamp with time zone | YES      | now()             |

## `data_quality_alerts`

| #   | Column              | Type                     | Nullable | Default                     |
| --- | ------------------- | ------------------------ | -------- | --------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()           |
| 2   | `user_id`           | uuid                     | YES      | —                           |
| 3   | `alert_type`        | character varying        | NO       | —                           |
| 4   | `alert_level`       | character varying        | NO       | —                           |
| 5   | `title`             | character varying        | NO       | —                           |
| 6   | `message`           | text                     | NO       | —                           |
| 7   | `related_table`     | character varying        | YES      | —                           |
| 8   | `related_record_id` | uuid                     | YES      | —                           |
| 9   | `related_field`     | character varying        | YES      | —                           |
| 10  | `status`            | character varying        | YES      | 'unread'::character varying |
| 11  | `read_at`           | timestamp with time zone | YES      | —                           |
| 12  | `acknowledged_at`   | timestamp with time zone | YES      | —                           |
| 13  | `resolved_at`       | timestamp with time zone | YES      | —                           |
| 14  | `action_required`   | boolean                  | YES      | false                       |
| 15  | `action_url`        | text                     | YES      | —                           |
| 16  | `action_text`       | character varying        | YES      | —                           |
| 17  | `created_at`        | timestamp with time zone | YES      | now()                       |

## `data_quality_checks`

| #   | Column                  | Type                     | Nullable | Default                        |
| --- | ----------------------- | ------------------------ | -------- | ------------------------------ |
| 1   | `id`                    | uuid                     | NO       | gen_random_uuid()              |
| 2   | `rule_id`               | uuid                     | YES      | —                              |
| 3   | `check_type`            | character varying        | NO       | —                              |
| 4   | `check_timestamp`       | timestamp with time zone | YES      | now()                          |
| 5   | `total_records_checked` | integer                  | YES      | 0                              |
| 6   | `records_passed`        | integer                  | YES      | 0                              |
| 7   | `records_failed`        | integer                  | YES      | 0                              |
| 8   | `failure_rate`          | numeric                  | YES      | 0                              |
| 9   | `status`                | character varying        | YES      | 'completed'::character varying |
| 10  | `check_details`         | jsonb                    | YES      | —                              |
| 11  | `error_message`         | text                     | YES      | —                              |
| 12  | `created_at`            | timestamp with time zone | YES      | now()                          |

## `data_quality_rules`

| #   | Column              | Type                     | Nullable | Default                      |
| --- | ------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()            |
| 2   | `rule_name`         | character varying        | NO       | —                            |
| 3   | `rule_description`  | text                     | NO       | —                            |
| 4   | `table_name`        | character varying        | NO       | —                            |
| 5   | `column_name`       | character varying        | YES      | —                            |
| 6   | `rule_type`         | character varying        | NO       | —                            |
| 7   | `rule_config`       | jsonb                    | NO       | —                            |
| 8   | `severity`          | character varying        | YES      | 'warning'::character varying |
| 9   | `enforcement_level` | character varying        | YES      | 'soft'::character varying    |
| 10  | `is_active`         | boolean                  | YES      | true                         |
| 11  | `created_at`        | timestamp with time zone | YES      | now()                        |
| 12  | `created_by`        | uuid                     | YES      | —                            |

## `data_quality_violations`

| #   | Column              | Type                     | Nullable | Default                      |
| --- | ------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()            |
| 2   | `check_id`          | uuid                     | YES      | —                            |
| 3   | `rule_id`           | uuid                     | YES      | —                            |
| 4   | `table_name`        | character varying        | NO       | —                            |
| 5   | `record_id`         | uuid                     | NO       | —                            |
| 6   | `column_name`       | character varying        | YES      | —                            |
| 7   | `field_value`       | text                     | YES      | —                            |
| 8   | `violation_type`    | character varying        | NO       | —                            |
| 9   | `violation_message` | text                     | NO       | —                            |
| 10  | `severity`          | character varying        | YES      | 'warning'::character varying |
| 11  | `status`            | character varying        | YES      | 'open'::character varying    |
| 12  | `resolved_at`       | timestamp with time zone | YES      | —                            |
| 13  | `resolved_by`       | uuid                     | YES      | —                            |
| 14  | `resolution_notes`  | text                     | YES      | —                            |
| 15  | `created_at`        | timestamp with time zone | YES      | now()                        |

## `data_validation_logs`

| #   | Column                 | Type                     | Nullable | Default           |
| --- | ---------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                   | uuid                     | NO       | gen_random_uuid() |
| 2   | `operation_type`       | character varying        | NO       | —                 |
| 3   | `table_name`           | character varying        | NO       | —                 |
| 4   | `record_id`            | uuid                     | YES      | —                 |
| 5   | `validation_passed`    | boolean                  | YES      | true              |
| 6   | `validation_errors`    | jsonb                    | YES      | —                 |
| 7   | `validation_warnings`  | jsonb                    | YES      | —                 |
| 8   | `user_id`              | uuid                     | YES      | —                 |
| 9   | `session_id`           | uuid                     | YES      | —                 |
| 10  | `operation_timestamp`  | timestamp with time zone | YES      | now()             |
| 11  | `validation_timestamp` | timestamp with time zone | YES      | now()             |

## `detailed_ratings`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `review_id`    | uuid                     | NO       | —                 |
| 3   | `rating_type`  | USER-DEFINED             | NO       | —                 |
| 4   | `rating_value` | integer                  | NO       | —                 |
| 5   | `created_at`   | timestamp with time zone | YES      | now()             |

## `dsar_requests`

| #   | Column                         | Type                     | Nullable | Default           |
| --- | ------------------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`                           | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                      | uuid                     | YES      | —                 |
| 3   | `request_date`                 | timestamp with time zone | YES      | now()             |
| 4   | `request_method`               | text                     | YES      | —                 |
| 5   | `identity_verified`            | boolean                  | YES      | false             |
| 6   | `identity_verification_method` | text                     | YES      | —                 |
| 7   | `data_collected_date`          | timestamp with time zone | YES      | —                 |
| 8   | `response_date`                | timestamp with time zone | YES      | —                 |
| 9   | `status`                       | text                     | YES      | 'pending'::text   |
| 10  | `data_categories`              | ARRAY                    | YES      | —                 |
| 11  | `notes`                        | text                     | YES      | —                 |
| 12  | `created_at`                   | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`                   | timestamp with time zone | YES      | now()             |

## `email_logs`

| #   | Column              | Type                        | Nullable | Default                      |
| --- | ------------------- | --------------------------- | -------- | ---------------------------- |
| 1   | `id`                | uuid                        | NO       | gen_random_uuid()            |
| 2   | `user_id`           | uuid                        | YES      | —                            |
| 3   | `email_type`        | character varying           | NO       | —                            |
| 4   | `recipient_email`   | character varying           | NO       | —                            |
| 5   | `subject`           | text                        | NO       | —                            |
| 6   | `resend_email_id`   | text                        | YES      | —                            |
| 7   | `status`            | character varying           | YES      | 'pending'::character varying |
| 8   | `sent_at`           | timestamp without time zone | YES      | —                            |
| 9   | `delivered_at`      | timestamp without time zone | YES      | —                            |
| 10  | `opened_at`         | timestamp without time zone | YES      | —                            |
| 11  | `clicked_at`        | timestamp without time zone | YES      | —                            |
| 12  | `error_message`     | text                        | YES      | —                            |
| 13  | `metadata`          | jsonb                       | YES      | —                            |
| 14  | `created_at`        | timestamp without time zone | YES      | now()                        |
| 15  | `maileroo_email_id` | text                        | YES      | —                            |
| 16  | `recipient_name`    | text                        | YES      | —                            |
| 17  | `retry_count`       | integer                     | YES      | 0                            |
| 18  | `last_retry_at`     | timestamp with time zone    | YES      | —                            |
| 19  | `email_data`        | jsonb                       | YES      | —                            |

## `email_rate_limit`

**Comment:** Tracks last email send time for rate limiting across function invocations

| #   | Column           | Type                     | Nullable | Default        |
| --- | ---------------- | ------------------------ | -------- | -------------- |
| 1   | `id`             | text                     | NO       | 'global'::text |
| 2   | `last_send_time` | timestamp with time zone | NO       | now()          |
| 3   | `updated_at`     | timestamp with time zone | NO       | now()          |

## `email_system_stats`

**Comment:** Email system statistics by hour, type, and status

| #   | Column                      | Type                        | Nullable | Default |
| --- | --------------------------- | --------------------------- | -------- | ------- |
| 1   | `hour`                      | timestamp without time zone | YES      | —       |
| 2   | `email_type`                | character varying           | YES      | —       |
| 3   | `status`                    | character varying           | YES      | —       |
| 4   | `count`                     | bigint                      | YES      | —       |
| 5   | `rate_limited_count`        | bigint                      | YES      | —       |
| 6   | `avg_delivery_time_seconds` | numeric                     | YES      | —       |

## `emergency_contacts`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `name`        | character varying        | NO       | —                 |
| 3   | `phone`       | character varying        | NO       | —                 |
| 4   | `type`        | character varying        | NO       | —                 |
| 5   | `description` | text                     | YES      | —                 |
| 6   | `is_active`   | boolean                  | YES      | true              |
| 7   | `priority`    | integer                  | YES      | 0                 |
| 8   | `created_at`  | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`  | timestamp with time zone | YES      | now()             |

## `engagement_analytics`

| #   | Column                     | Type                     | Nullable | Default           |
| --- | -------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                  | uuid                     | NO       | —                 |
| 3   | `metric_date`              | date                     | NO       | —                 |
| 4   | `login_frequency`          | integer                  | YES      | 0                 |
| 5   | `session_duration_minutes` | integer                  | YES      | 0                 |
| 6   | `features_used`            | ARRAY                    | YES      | —                 |
| 7   | `messages_sent`            | integer                  | YES      | 0                 |
| 8   | `documents_uploaded`       | integer                  | YES      | 0                 |
| 9   | `reviews_submitted`        | integer                  | YES      | 0                 |
| 10  | `support_tickets`          | integer                  | YES      | 0                 |
| 11  | `created_at`               | timestamp with time zone | YES      | now()             |

## `error_logs`

| #   | Column            | Type                     | Nullable | Default                    |
| --- | ----------------- | ------------------------ | -------- | -------------------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()          |
| 2   | `user_id`         | uuid                     | YES      | —                          |
| 3   | `error_type`      | character varying        | NO       | —                          |
| 4   | `error_message`   | text                     | NO       | —                          |
| 5   | `stack_trace`     | text                     | YES      | —                          |
| 6   | `request_url`     | text                     | YES      | —                          |
| 7   | `request_method`  | character varying        | YES      | —                          |
| 8   | `request_headers` | jsonb                    | YES      | —                          |
| 9   | `request_body`    | jsonb                    | YES      | —                          |
| 10  | `response_status` | integer                  | YES      | —                          |
| 11  | `response_body`   | text                     | YES      | —                          |
| 12  | `severity`        | character varying        | YES      | 'error'::character varying |
| 13  | `resolved`        | boolean                  | YES      | false                      |
| 14  | `resolved_at`     | timestamp with time zone | YES      | —                          |
| 15  | `resolved_by`     | uuid                     | YES      | —                          |
| 16  | `created_at`      | timestamp with time zone | YES      | now()                      |

## `exercise_library`

**Comment:** Library of exercises that practitioners can prescribe

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `name`               | text                     | NO       | —                 |
| 3   | `description`        | text                     | YES      | —                 |
| 4   | `category`           | text                     | NO       | —                 |
| 5   | `instructions`       | text                     | NO       | —                 |
| 6   | `video_url`          | text                     | YES      | —                 |
| 7   | `image_url`          | text                     | YES      | —                 |
| 8   | `duration_minutes`   | integer                  | YES      | 10                |
| 9   | `difficulty_level`   | text                     | YES      | 'beginner'::text  |
| 10  | `muscle_groups`      | ARRAY                    | YES      | —                 |
| 11  | `equipment_needed`   | ARRAY                    | YES      | —                 |
| 12  | `contraindications`  | text                     | YES      | —                 |
| 13  | `created_by`         | uuid                     | YES      | —                 |
| 14  | `is_system_exercise` | boolean                  | YES      | true              |
| 15  | `is_active`          | boolean                  | YES      | true              |
| 16  | `created_at`         | timestamp with time zone | YES      | now()             |
| 17  | `updated_at`         | timestamp with time zone | YES      | now()             |

## `exercise_program_progress`

**Comment:** Client progress tracking for exercise programs

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `program_id`        | uuid                     | NO       | —                 |
| 3   | `client_id`         | uuid                     | NO       | —                 |
| 4   | `exercise_id`       | uuid                     | YES      | —                 |
| 5   | `exercise_name`     | text                     | NO       | —                 |
| 6   | `completed_date`    | date                     | NO       | —                 |
| 7   | `completed_at`      | timestamp with time zone | YES      | now()             |
| 8   | `sets_completed`    | integer                  | YES      | —                 |
| 9   | `reps_completed`    | integer                  | YES      | —                 |
| 10  | `duration_minutes`  | integer                  | YES      | —                 |
| 11  | `client_notes`      | text                     | YES      | —                 |
| 12  | `pain_level`        | integer                  | YES      | —                 |
| 13  | `difficulty_rating` | integer                  | YES      | —                 |
| 14  | `created_at`        | timestamp with time zone | YES      | now()             |
| 15  | `session_id`        | uuid                     | YES      | —                 |

## `financial_analytics`

| #   | Column                    | Type                     | Nullable | Default           |
| --- | ------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                 | uuid                     | NO       | —                 |
| 3   | `period_start`            | date                     | NO       | —                 |
| 4   | `period_end`              | date                     | NO       | —                 |
| 5   | `total_revenue`           | numeric                  | YES      | 0                 |
| 6   | `total_expenses`          | numeric                  | YES      | 0                 |
| 7   | `net_profit`              | numeric                  | YES      | 0                 |
| 8   | `profit_margin`           | numeric                  | YES      | —                 |
| 9   | `average_project_value`   | numeric                  | YES      | —                 |
| 10  | `payment_collection_rate` | numeric                  | YES      | —                 |
| 11  | `outstanding_invoices`    | numeric                  | YES      | 0                 |
| 12  | `created_at`              | timestamp with time zone | YES      | now()             |

## `forum_posts`

| #   | Column              | Type                     | Nullable | Default                      |
| --- | ------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                | uuid                     | NO       | uuid_generate_v4()           |
| 2   | `author_id`         | uuid                     | YES      | —                            |
| 3   | `title`             | character varying        | NO       | —                            |
| 4   | `content`           | text                     | NO       | —                            |
| 5   | `category`          | USER-DEFINED             | YES      | 'general'::post_category     |
| 6   | `is_pinned`         | boolean                  | YES      | false                        |
| 7   | `is_locked`         | boolean                  | YES      | false                        |
| 8   | `is_moderated`      | boolean                  | YES      | false                        |
| 9   | `moderation_status` | USER-DEFINED             | YES      | 'pending'::moderation_status |
| 10  | `views`             | integer                  | YES      | 0                            |
| 11  | `likes_count`       | integer                  | YES      | 0                            |
| 12  | `replies_count`     | integer                  | YES      | 0                            |
| 13  | `last_activity_at`  | timestamp with time zone | YES      | now()                        |
| 14  | `created_at`        | timestamp with time zone | YES      | now()                        |
| 15  | `updated_at`        | timestamp with time zone | YES      | now()                        |

## `forum_replies`

| #   | Column              | Type                     | Nullable | Default                      |
| --- | ------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                | uuid                     | NO       | uuid_generate_v4()           |
| 2   | `post_id`           | uuid                     | YES      | —                            |
| 3   | `author_id`         | uuid                     | YES      | —                            |
| 4   | `parent_reply_id`   | uuid                     | YES      | —                            |
| 5   | `content`           | text                     | NO       | —                            |
| 6   | `is_moderated`      | boolean                  | YES      | false                        |
| 7   | `moderation_status` | USER-DEFINED             | YES      | 'pending'::moderation_status |
| 8   | `likes_count`       | integer                  | YES      | 0                            |
| 9   | `created_at`        | timestamp with time zone | YES      | now()                        |
| 10  | `updated_at`        | timestamp with time zone | YES      | now()                        |

## `geography_columns`

| #   | Column               | Type    | Nullable | Default |
| --- | -------------------- | ------- | -------- | ------- |
| 1   | `f_table_catalog`    | name    | YES      | —       |
| 2   | `f_table_schema`     | name    | YES      | —       |
| 3   | `f_table_name`       | name    | YES      | —       |
| 4   | `f_geography_column` | name    | YES      | —       |
| 5   | `coord_dimension`    | integer | YES      | —       |
| 6   | `srid`               | integer | YES      | —       |
| 7   | `type`               | text    | YES      | —       |

## `geometry_columns`

| #   | Column              | Type              | Nullable | Default |
| --- | ------------------- | ----------------- | -------- | ------- |
| 1   | `f_table_catalog`   | character varying | YES      | —       |
| 2   | `f_table_schema`    | name              | YES      | —       |
| 3   | `f_table_name`      | name              | YES      | —       |
| 4   | `f_geometry_column` | name              | YES      | —       |
| 5   | `coord_dimension`   | integer           | YES      | —       |
| 6   | `srid`              | integer           | YES      | —       |
| 7   | `type`              | character varying | YES      | —       |

## `goals`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`     | uuid                     | NO       | —                 |
| 3   | `title`       | text                     | NO       | —                 |
| 4   | `description` | text                     | YES      | —                 |
| 5   | `target_date` | date                     | YES      | —                 |
| 6   | `completed`   | boolean                  | YES      | false             |
| 7   | `progress`    | integer                  | YES      | 0                 |
| 8   | `created_at`  | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`  | timestamp with time zone | YES      | now()             |

## `habits`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`      | uuid                     | NO       | —                 |
| 3   | `title`        | text                     | NO       | —                 |
| 4   | `description`  | text                     | YES      | —                 |
| 5   | `frequency`    | text                     | YES      | 'daily'::text     |
| 6   | `streak_count` | integer                  | YES      | 0                 |
| 7   | `created_at`   | timestamp with time zone | YES      | now()             |
| 8   | `updated_at`   | timestamp with time zone | YES      | now()             |

## `home_exercise_program_versions`

**Comment:** Tracks historical versions of home exercise programs for audit trail

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `program_id`         | uuid                     | NO       | —                 |
| 3   | `version_number`     | integer                  | NO       | —                 |
| 4   | `exercises`          | jsonb                    | NO       | —                 |
| 5   | `title`              | text                     | YES      | —                 |
| 6   | `description`        | text                     | YES      | —                 |
| 7   | `instructions`       | text                     | YES      | —                 |
| 8   | `frequency_per_week` | integer                  | YES      | —                 |
| 9   | `changed_by`         | uuid                     | YES      | —                 |
| 10  | `changed_at`         | timestamp with time zone | YES      | now()             |
| 11  | `change_notes`       | text                     | YES      | —                 |
| 12  | `created_at`         | timestamp with time zone | YES      | now()             |

## `home_exercise_programs`

**Comment:** Home exercise programs prescribed by practitioners to clients

| #   | Column                     | Type                     | Nullable | Default           |
| --- | -------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id`          | uuid                     | NO       | —                 |
| 3   | `client_id`                | uuid                     | NO       | —                 |
| 4   | `session_id`               | uuid                     | YES      | —                 |
| 5   | `title`                    | text                     | NO       | —                 |
| 6   | `description`              | text                     | YES      | —                 |
| 7   | `exercises`                | jsonb                    | NO       | —                 |
| 8   | `instructions`             | text                     | YES      | —                 |
| 9   | `start_date`               | date                     | YES      | CURRENT_DATE      |
| 10  | `end_date`                 | date                     | YES      | —                 |
| 11  | `frequency_per_week`       | integer                  | YES      | 3                 |
| 12  | `status`                   | text                     | YES      | 'active'::text    |
| 13  | `delivered_via`            | text                     | YES      | 'messaging'::text |
| 14  | `delivered_at`             | timestamp with time zone | YES      | —                 |
| 15  | `created_at`               | timestamp with time zone | YES      | now()             |
| 16  | `updated_at`               | timestamp with time zone | YES      | now()             |
| 17  | `original_practitioner_id` | uuid                     | YES      | —                 |
| 18  | `transferred_at`           | timestamp with time zone | YES      | —                 |
| 19  | `transfer_notes`           | text                     | YES      | —                 |

## `insights`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                     | NO       | —                 |
| 3   | `type`       | text                     | NO       | —                 |
| 4   | `title`      | text                     | NO       | —                 |
| 5   | `content`    | text                     | YES      | —                 |
| 6   | `data`       | jsonb                    | YES      | —                 |
| 7   | `created_at` | timestamp with time zone | YES      | now()             |

## `insurance_claims`

| #   | Column                         | Type                     | Nullable | Default                        |
| --- | ------------------------------ | ------------------------ | -------- | ------------------------------ |
| 1   | `id`                           | uuid                     | NO       | gen_random_uuid()              |
| 2   | `patient_id`                   | uuid                     | YES      | —                              |
| 3   | `practitioner_id`              | uuid                     | YES      | —                              |
| 4   | `session_id`                   | uuid                     | YES      | —                              |
| 5   | `claim_number`                 | character varying        | NO       | —                              |
| 6   | `insurance_provider`           | character varying        | NO       | —                              |
| 7   | `policy_number`                | character varying        | YES      | —                              |
| 8   | `group_number`                 | character varying        | YES      | —                              |
| 9   | `billed_amount_pence`          | integer                  | NO       | —                              |
| 10  | `allowed_amount_pence`         | integer                  | YES      | —                              |
| 11  | `paid_amount_pence`            | integer                  | YES      | 0                              |
| 12  | `patient_responsibility_pence` | integer                  | YES      | 0                              |
| 13  | `status`                       | character varying        | YES      | 'submitted'::character varying |
| 14  | `submission_date`              | date                     | NO       | —                              |
| 15  | `response_date`                | date                     | YES      | —                              |
| 16  | `processing_notes`             | text                     | YES      | —                              |
| 17  | `denial_reason`                | text                     | YES      | —                              |
| 18  | `appeal_date`                  | date                     | YES      | —                              |
| 19  | `appeal_status`                | character varying        | YES      | —                              |
| 20  | `created_at`                   | timestamp with time zone | YES      | now()                          |
| 21  | `created_by`                   | uuid                     | YES      | —                              |

## `ip_tracking_log`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`          | uuid                     | YES      | —                 |
| 3   | `session_id`       | text                     | YES      | —                 |
| 4   | `ip_address`       | text                     | NO       | —                 |
| 5   | `general_location` | jsonb                    | YES      | —                 |
| 6   | `purpose`          | text                     | NO       | —                 |
| 7   | `consent_status`   | text                     | YES      | —                 |
| 8   | `user_agent`       | text                     | YES      | —                 |
| 9   | `endpoint`         | text                     | YES      | —                 |
| 10  | `metadata`         | jsonb                    | YES      | '{}'::jsonb       |
| 11  | `anonymized`       | boolean                  | YES      | false             |
| 12  | `anonymized_at`    | timestamp with time zone | YES      | —                 |
| 13  | `collected_at`     | timestamp with time zone | NO       | now()             |

## `journal_entries`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                     | NO       | —                 |
| 3   | `title`      | text                     | NO       | —                 |
| 4   | `content`    | text                     | NO       | —                 |
| 5   | `mood`       | text                     | YES      | —                 |
| 6   | `tags`       | ARRAY                    | YES      | —                 |
| 7   | `created_at` | timestamp with time zone | YES      | now()             |
| 8   | `updated_at` | timestamp with time zone | YES      | now()             |

## `location_consents`

| #   | Column           | Type                     | Nullable | Default           |
| --- | ---------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`             | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`        | uuid                     | NO       | —                 |
| 3   | `consented`      | boolean                  | NO       | false             |
| 4   | `consented_at`   | timestamp with time zone | YES      | —                 |
| 5   | `withdrawn_at`   | timestamp with time zone | YES      | —                 |
| 6   | `consent_method` | text                     | NO       | —                 |
| 7   | `ip_address`     | text                     | YES      | —                 |
| 8   | `user_agent`     | text                     | YES      | —                 |
| 9   | `created_at`     | timestamp with time zone | NO       | now()             |
| 10  | `updated_at`     | timestamp with time zone | NO       | now()             |

## `marketplace_bookings`

| #   | Column                       | Type                     | Nullable | Default            |
| --- | ---------------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                         | uuid                     | NO       | uuid_generate_v4() |
| 2   | `client_id`                  | uuid                     | YES      | —                  |
| 3   | `practitioner_id`            | uuid                     | YES      | —                  |
| 4   | `product_id`                 | uuid                     | YES      | —                  |
| 5   | `stripe_checkout_session_id` | text                     | YES      | —                  |
| 6   | `stripe_payment_intent_id`   | text                     | YES      | —                  |
| 7   | `stripe_charge_id`           | text                     | YES      | —                  |
| 8   | `amount_paid`                | integer                  | NO       | —                  |
| 9   | `platform_fee`               | integer                  | NO       | —                  |
| 10  | `practitioner_amount`        | integer                  | NO       | —                  |
| 11  | `currency`                   | text                     | YES      | 'gbp'::text        |
| 12  | `status`                     | text                     | YES      | 'pending'::text    |
| 13  | `booking_date`               | timestamp with time zone | YES      | —                  |
| 14  | `session_date`               | timestamp with time zone | YES      | —                  |
| 15  | `client_email`               | text                     | YES      | —                  |
| 16  | `client_name`                | text                     | YES      | —                  |
| 17  | `product_name`               | text                     | YES      | —                  |
| 18  | `product_description`        | text                     | YES      | —                  |
| 19  | `created_at`                 | timestamp with time zone | YES      | now()              |
| 20  | `updated_at`                 | timestamp with time zone | YES      | now()              |
| 21  | `has_review`                 | boolean                  | YES      | false              |

## `marketplace_practitioners`

**Comment:** Marketplace practitioners view - public read access for browsing

| #   | Column                   | Type                     | Nullable | Default |
| --- | ------------------------ | ------------------------ | -------- | ------- |
| 1   | `id`                     | uuid                     | YES      | —       |
| 2   | `user_id`                | uuid                     | YES      | —       |
| 3   | `first_name`             | character varying        | YES      | —       |
| 4   | `last_name`              | character varying        | YES      | —       |
| 5   | `bio`                    | text                     | YES      | —       |
| 6   | `location`               | character varying        | YES      | —       |
| 7   | `specializations`        | ARRAY                    | YES      | —       |
| 8   | `experience_years`       | integer                  | YES      | —       |
| 9   | `hourly_rate`            | numeric                  | YES      | —       |
| 10  | `average_rating`         | numeric                  | YES      | —       |
| 11  | `total_reviews`          | integer                  | YES      | —       |
| 12  | `professional_statement` | text                     | YES      | —       |
| 13  | `treatment_philosophy`   | text                     | YES      | —       |
| 14  | `response_time_hours`    | integer                  | YES      | —       |
| 15  | `profile_photo_url`      | text                     | YES      | —       |
| 16  | `verification_status`    | USER-DEFINED             | YES      | —       |
| 17  | `is_active`              | boolean                  | YES      | —       |
| 18  | `last_active`            | timestamp with time zone | YES      | —       |

## `message_attachments`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `message_id`          | uuid                     | NO       | —                 |
| 3   | `file_name`           | text                     | NO       | —                 |
| 4   | `file_type`           | text                     | NO       | —                 |
| 5   | `file_size`           | bigint                   | NO       | —                 |
| 6   | `encrypted_file_path` | text                     | NO       | —                 |
| 7   | `file_hash`           | text                     | NO       | —                 |
| 8   | `thumbnail_url`       | text                     | YES      | —                 |
| 9   | `is_virus_scanned`    | boolean                  | YES      | false             |
| 10  | `virus_scan_result`   | text                     | YES      | —                 |
| 11  | `created_at`          | timestamp with time zone | YES      | now()             |

## `message_notifications`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`           | uuid                     | NO       | —                 |
| 3   | `conversation_id`   | uuid                     | NO       | —                 |
| 4   | `message_id`        | uuid                     | NO       | —                 |
| 5   | `notification_type` | text                     | NO       | —                 |
| 6   | `is_read`           | boolean                  | YES      | false             |
| 7   | `created_at`        | timestamp with time zone | YES      | now()             |

## `message_status_tracking`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `message_id`        | uuid                     | NO       | —                 |
| 3   | `recipient_id`      | uuid                     | NO       | —                 |
| 4   | `message_status`    | USER-DEFINED             | NO       | —                 |
| 5   | `status_updated_at` | timestamp with time zone | YES      | now()             |
| 6   | `device_info`       | jsonb                    | YES      | —                 |
| 7   | `created_at`        | timestamp with time zone | YES      | now()             |

## `messages`

| #   | Column                | Type                     | Nullable | Default                |
| --- | --------------------- | ------------------------ | -------- | ---------------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid()      |
| 2   | `conversation_id`     | uuid                     | NO       | —                      |
| 3   | `sender_id`           | uuid                     | NO       | —                      |
| 4   | `message_type`        | USER-DEFINED             | YES      | 'text'::message_type   |
| 5   | `encrypted_content`   | text                     | NO       | —                      |
| 6   | `content_hash`        | text                     | NO       | —                      |
| 7   | `message_status`      | USER-DEFINED             | YES      | 'sent'::message_status |
| 8   | `is_edited`           | boolean                  | YES      | false                  |
| 9   | `edited_at`           | timestamp with time zone | YES      | —                      |
| 10  | `reply_to_message_id` | uuid                     | YES      | —                      |
| 11  | `created_at`          | timestamp with time zone | YES      | now()                  |
| 12  | `updated_at`          | timestamp with time zone | YES      | now()                  |

## `mobile_booking_requests`

**Comment:** Booking requests for mobile therapists. Payment is held until practitioner accepts.

| #   | Column                        | Type                     | Nullable | Default           |
| --- | ----------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                          | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`                   | uuid                     | YES      | —                 |
| 3   | `practitioner_id`             | uuid                     | YES      | —                 |
| 4   | `product_id`                  | uuid                     | YES      | —                 |
| 5   | `service_type`                | text                     | NO       | —                 |
| 6   | `requested_date`              | date                     | NO       | —                 |
| 7   | `requested_start_time`        | time without time zone   | NO       | —                 |
| 8   | `duration_minutes`            | integer                  | NO       | —                 |
| 9   | `client_address`              | text                     | YES      | —                 |
| 10  | `client_latitude`             | numeric                  | YES      | —                 |
| 11  | `client_longitude`            | numeric                  | YES      | —                 |
| 12  | `total_price_pence`           | integer                  | NO       | —                 |
| 13  | `platform_fee_pence`          | integer                  | NO       | —                 |
| 14  | `practitioner_earnings_pence` | integer                  | NO       | —                 |
| 15  | `stripe_payment_intent_id`    | text                     | YES      | —                 |
| 16  | `payment_status`              | text                     | YES      | 'pending'::text   |
| 17  | `status`                      | text                     | YES      | 'pending'::text   |
| 18  | `decline_reason`              | text                     | YES      | —                 |
| 19  | `alternate_date`              | date                     | YES      | —                 |
| 20  | `alternate_start_time`        | time without time zone   | YES      | —                 |
| 21  | `alternate_suggestions`       | jsonb                    | YES      | '[]'::jsonb       |
| 22  | `client_notes`                | text                     | YES      | —                 |
| 23  | `practitioner_notes`          | text                     | YES      | —                 |
| 24  | `expires_at`                  | timestamp with time zone | YES      | —                 |
| 25  | `accepted_at`                 | timestamp with time zone | YES      | —                 |
| 26  | `declined_at`                 | timestamp with time zone | YES      | —                 |
| 27  | `created_at`                  | timestamp with time zone | YES      | now()             |
| 28  | `updated_at`                  | timestamp with time zone | YES      | now()             |
| 29  | `session_id`                  | uuid                     | YES      | —                 |
| 30  | `expired_notified_at`         | timestamp with time zone | YES      | —                 |
| 31  | `expired_email_sent_at`       | timestamp with time zone | YES      | —                 |
| 32  | `pre_assessment_payload`      | jsonb                    | YES      | —                 |

## `moods`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`    | uuid                     | NO       | —                 |
| 3   | `mood`       | text                     | NO       | —                 |
| 4   | `intensity`  | integer                  | YES      | —                 |
| 5   | `notes`      | text                     | YES      | —                 |
| 6   | `created_at` | timestamp with time zone | YES      | now()             |

## `mutual_exchange_sessions`

| #   | Column                    | Type                     | Nullable | Default           |
| --- | ------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid() |
| 2   | `exchange_request_id`     | uuid                     | NO       | —                 |
| 3   | `practitioner_a_id`       | uuid                     | NO       | —                 |
| 4   | `practitioner_b_id`       | uuid                     | NO       | —                 |
| 5   | `session_date`            | date                     | NO       | —                 |
| 6   | `start_time`              | time without time zone   | NO       | —                 |
| 7   | `end_time`                | time without time zone   | NO       | —                 |
| 8   | `duration_minutes`        | integer                  | NO       | —                 |
| 9   | `session_type`            | text                     | YES      | —                 |
| 10  | `location`                | text                     | YES      | —                 |
| 11  | `status`                  | text                     | NO       | 'scheduled'::text |
| 12  | `practitioner_a_notes`    | text                     | YES      | —                 |
| 13  | `practitioner_b_notes`    | text                     | YES      | —                 |
| 14  | `practitioner_a_rating`   | integer                  | YES      | —                 |
| 15  | `practitioner_b_rating`   | integer                  | YES      | —                 |
| 16  | `practitioner_a_feedback` | text                     | YES      | —                 |
| 17  | `practitioner_b_feedback` | text                     | YES      | —                 |
| 18  | `credits_exchanged`       | integer                  | NO       | 0                 |
| 19  | `created_at`              | timestamp with time zone | YES      | now()             |
| 20  | `updated_at`              | timestamp with time zone | YES      | now()             |
| 21  | `practitioner_a_booked`   | boolean                  | YES      | false             |
| 22  | `practitioner_b_booked`   | boolean                  | YES      | false             |
| 23  | `credits_deducted`        | boolean                  | YES      | false             |
| 24  | `conversation_id`         | uuid                     | YES      | —                 |
| 25  | `cancelled_at`            | timestamp with time zone | YES      | —                 |
| 26  | `cancelled_by`            | uuid                     | YES      | —                 |
| 27  | `cancellation_reason`     | text                     | YES      | —                 |
| 28  | `refund_percentage`       | numeric                  | YES      | 0                 |
| 29  | `refund_processed`        | boolean                  | YES      | false             |

## `notification_preferences`

**Comment:** Notification channel preferences per user

| #   | Column                   | Type                     | Nullable | Default           |
| --- | ------------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`                     | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                | uuid                     | NO       | —                 |
| 3   | `email_reminders`        | boolean                  | YES      | true              |
| 4   | `sms_reminders`          | boolean                  | YES      | false             |
| 5   | `push_reminders`         | boolean                  | YES      | true              |
| 6   | `reminder_advance_hours` | integer                  | YES      | 24                |
| 7   | `email_address`          | character varying        | YES      | —                 |
| 8   | `phone_number`           | character varying        | YES      | —                 |
| 9   | `created_at`             | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`             | timestamp with time zone | YES      | now()             |
| 11  | `in_app`                 | boolean                  | YES      | true              |
| 12  | `email`                  | boolean                  | YES      | true              |
| 13  | `push`                   | boolean                  | YES      | false             |
| 14  | `sms`                    | boolean                  | YES      | false             |
| 15  | `quiet_hours`            | jsonb                    | YES      | '{}'::jsonb       |

## `notifications`

**Comment:** In-app notifications for users

| #   | Column                | Type                        | Nullable | Default            |
| --- | --------------------- | --------------------------- | -------- | ------------------ |
| 1   | `id`                  | uuid                        | NO       | uuid_generate_v4() |
| 2   | `user_id`             | uuid                        | YES      | —                  |
| 3   | `type`                | USER-DEFINED                | NO       | —                  |
| 4   | `title`               | character varying           | NO       | —                  |
| 5   | `message`             | text                        | NO       | —                  |
| 6   | `read`                | boolean                     | YES      | false              |
| 7   | `metadata`            | jsonb                       | YES      | '{}'::jsonb        |
| 8   | `created_at`          | timestamp with time zone    | YES      | now()              |
| 9   | `updated_at`          | timestamp with time zone    | YES      | now()              |
| 10  | `notification_type`   | text                        | YES      | 'general'::text    |
| 11  | `related_entity_id`   | uuid                        | YES      | —                  |
| 12  | `related_entity_type` | text                        | YES      | —                  |
| 13  | `action_required`     | boolean                     | YES      | false              |
| 14  | `expires_at`          | timestamp without time zone | YES      | —                  |
| 15  | `recipient_id`        | uuid                        | YES      | —                  |
| 16  | `body`                | text                        | YES      | —                  |
| 17  | `payload`             | jsonb                       | YES      | '{}'::jsonb        |
| 18  | `priority`            | text                        | YES      | 'normal'::text     |
| 19  | `channel_hint`        | text                        | YES      | —                  |
| 20  | `source_type`         | text                        | YES      | —                  |
| 21  | `source_id`           | text                        | YES      | —                  |
| 22  | `read_at`             | timestamp with time zone    | YES      | —                  |
| 23  | `dismissed_at`        | timestamp with time zone    | YES      | —                  |

## `onboarding_progress`

**Comment:** Stores practitioner onboarding progress to allow resuming from where they left off

| #   | Column            | Type                     | Nullable | Default            |
| --- | ----------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()  |
| 2   | `user_id`         | uuid                     | NO       | —                  |
| 3   | `current_step`    | integer                  | NO       | 1                  |
| 4   | `total_steps`     | integer                  | NO       | 6                  |
| 5   | `form_data`       | jsonb                    | NO       | '{}'::jsonb        |
| 6   | `completed_steps` | ARRAY                    | YES      | ARRAY[]::integer[] |
| 7   | `last_saved_at`   | timestamp with time zone | YES      | now()              |
| 8   | `created_at`      | timestamp with time zone | YES      | now()              |
| 9   | `updated_at`      | timestamp with time zone | YES      | now()              |

## `patient_balances`

| #   | Column                      | Type                     | Nullable | Default                     |
| --- | --------------------------- | ------------------------ | -------- | --------------------------- |
| 1   | `id`                        | uuid                     | NO       | gen_random_uuid()           |
| 2   | `patient_id`                | uuid                     | YES      | —                           |
| 3   | `practitioner_id`           | uuid                     | YES      | —                           |
| 4   | `outstanding_balance_pence` | integer                  | YES      | 0                           |
| 5   | `total_charges_pence`       | integer                  | YES      | 0                           |
| 6   | `total_payments_pence`      | integer                  | YES      | 0                           |
| 7   | `total_adjustments_pence`   | integer                  | YES      | 0                           |
| 8   | `status`                    | character varying        | YES      | 'active'::character varying |
| 9   | `last_payment_date`         | timestamp with time zone | YES      | —                           |
| 10  | `last_statement_date`       | timestamp with time zone | YES      | —                           |
| 11  | `payment_terms_days`        | integer                  | YES      | 30                          |
| 12  | `grace_period_days`         | integer                  | YES      | 7                           |
| 13  | `collections_status`        | character varying        | YES      | 'none'::character varying   |
| 14  | `collections_date`          | timestamp with time zone | YES      | —                           |
| 15  | `collections_notes`         | text                     | YES      | —                           |
| 16  | `created_at`                | timestamp with time zone | YES      | now()                       |
| 17  | `updated_at`                | timestamp with time zone | YES      | now()                       |

## `patient_history_requests`

**Comment:** Tracks requests from new practitioners to access patient history from previous practitioners

| #   | Column                       | Type                     | Nullable | Default           |
| --- | ---------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                         | uuid                     | NO       | gen_random_uuid() |
| 2   | `requesting_practitioner_id` | uuid                     | NO       | —                 |
| 3   | `previous_practitioner_id`   | uuid                     | NO       | —                 |
| 4   | `client_id`                  | uuid                     | NO       | —                 |
| 5   | `status`                     | text                     | NO       | 'pending'::text   |
| 6   | `request_notes`              | text                     | YES      | —                 |
| 7   | `response_notes`             | text                     | YES      | —                 |
| 8   | `requested_at`               | timestamp with time zone | YES      | now()             |
| 9   | `responded_at`               | timestamp with time zone | YES      | —                 |
| 10  | `created_at`                 | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`                 | timestamp with time zone | YES      | now()             |

## `payment_adjustments`

| #   | Column                    | Type                     | Nullable | Default                      |
| --- | ------------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid()            |
| 2   | `original_transaction_id` | uuid                     | YES      | —                            |
| 3   | `adjustment_type`         | character varying        | NO       | —                            |
| 4   | `amount_pence`            | integer                  | NO       | —                            |
| 5   | `reason`                  | text                     | NO       | —                            |
| 6   | `status`                  | character varying        | YES      | 'pending'::character varying |
| 7   | `processed_at`            | timestamp with time zone | YES      | —                            |
| 8   | `processed_by`            | uuid                     | YES      | —                            |
| 9   | `approval_notes`          | text                     | YES      | —                            |
| 10  | `created_at`              | timestamp with time zone | YES      | now()                        |
| 11  | `created_by`              | uuid                     | YES      | —                            |

## `payment_disputes`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `payment_id`        | uuid                     | NO       | —                 |
| 3   | `stripe_dispute_id` | text                     | YES      | —                 |
| 4   | `amount`            | integer                  | NO       | —                 |
| 5   | `currency`          | text                     | YES      | 'gbp'::text       |
| 6   | `reason`            | text                     | YES      | —                 |
| 7   | `status`            | text                     | YES      | —                 |
| 8   | `evidence`          | jsonb                    | YES      | —                 |
| 9   | `created_at`        | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`        | timestamp with time zone | YES      | now()             |

## `payment_intents`

| #   | Column                     | Type                     | Nullable | Default           |
| --- | -------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`               | uuid                     | YES      | —                 |
| 3   | `client_id`                | uuid                     | YES      | —                 |
| 4   | `practitioner_id`          | uuid                     | YES      | —                 |
| 5   | `amount`                   | integer                  | NO       | —                 |
| 6   | `currency`                 | text                     | YES      | 'gbp'::text       |
| 7   | `status`                   | text                     | YES      | 'initiated'::text |
| 8   | `client_secret`            | text                     | YES      | —                 |
| 9   | `stripe_payment_intent_id` | text                     | YES      | —                 |
| 10  | `idempotency_key`          | text                     | YES      | —                 |
| 11  | `metadata`                 | jsonb                    | YES      | —                 |
| 12  | `created_at`               | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`               | timestamp with time zone | YES      | now()             |

## `payment_plan_installments`

| #   | Column               | Type                     | Nullable | Default                      |
| --- | -------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid()            |
| 2   | `payment_plan_id`    | uuid                     | YES      | —                            |
| 3   | `installment_number` | integer                  | NO       | —                            |
| 4   | `due_date`           | date                     | NO       | —                            |
| 5   | `amount_pence`       | integer                  | NO       | —                            |
| 6   | `paid_date`          | timestamp with time zone | YES      | —                            |
| 7   | `paid_amount_pence`  | integer                  | YES      | 0                            |
| 8   | `payment_method`     | character varying        | YES      | —                            |
| 9   | `payment_reference`  | character varying        | YES      | —                            |
| 10  | `status`             | character varying        | YES      | 'pending'::character varying |
| 11  | `late_fee_pence`     | integer                  | YES      | 0                            |
| 12  | `created_at`         | timestamp with time zone | YES      | now()                        |

## `payment_plans`

| #   | Column                     | Type                     | Nullable | Default                     |
| --- | -------------------------- | ------------------------ | -------- | --------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()           |
| 2   | `patient_id`               | uuid                     | YES      | —                           |
| 3   | `practitioner_id`          | uuid                     | YES      | —                           |
| 4   | `balance_id`               | uuid                     | YES      | —                           |
| 5   | `plan_name`                | character varying        | NO       | —                           |
| 6   | `total_amount_pence`       | integer                  | NO       | —                           |
| 7   | `installment_amount_pence` | integer                  | NO       | —                           |
| 8   | `installment_frequency`    | character varying        | NO       | —                           |
| 9   | `number_of_installments`   | integer                  | NO       | —                           |
| 10  | `start_date`               | date                     | NO       | —                           |
| 11  | `end_date`                 | date                     | NO       | —                           |
| 12  | `next_payment_date`        | date                     | NO       | —                           |
| 13  | `status`                   | character varying        | YES      | 'active'::character varying |
| 14  | `payments_made`            | integer                  | YES      | 0                           |
| 15  | `payments_remaining`       | integer                  | NO       | —                           |
| 16  | `late_fee_pence`           | integer                  | YES      | 0                           |
| 17  | `grace_period_days`        | integer                  | YES      | 3                           |
| 18  | `created_at`               | timestamp with time zone | YES      | now()                       |
| 19  | `created_by`               | uuid                     | YES      | —                           |

## `payment_transactions`

| #   | Column                     | Type                     | Nullable | Default                           |
| --- | -------------------------- | ------------------------ | -------- | --------------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()                 |
| 2   | `session_id`               | uuid                     | YES      | —                                 |
| 3   | `practitioner_id`          | uuid                     | YES      | —                                 |
| 4   | `client_id`                | uuid                     | YES      | —                                 |
| 5   | `amount_pence`             | integer                  | NO       | —                                 |
| 6   | `currency`                 | character varying        | YES      | 'GBP'::character varying          |
| 7   | `payment_method`           | character varying        | NO       | —                                 |
| 8   | `payment_status`           | character varying        | NO       | 'pending'::character varying      |
| 9   | `stripe_payment_intent_id` | character varying        | YES      | —                                 |
| 10  | `stripe_charge_id`         | character varying        | YES      | —                                 |
| 11  | `stripe_transfer_id`       | character varying        | YES      | —                                 |
| 12  | `bank_reference`           | character varying        | YES      | —                                 |
| 13  | `reconciliation_status`    | character varying        | YES      | 'unreconciled'::character varying |
| 14  | `reconciliation_date`      | timestamp with time zone | YES      | —                                 |
| 15  | `reconciliation_notes`     | text                     | YES      | —                                 |
| 16  | `created_at`               | timestamp with time zone | YES      | now()                             |
| 17  | `updated_at`               | timestamp with time zone | YES      | now()                             |
| 18  | `created_by`               | uuid                     | YES      | —                                 |
| 19  | `updated_by`               | uuid                     | YES      | —                                 |

## `payments`

| #   | Column                     | Type                     | Nullable | Default                   |
| --- | -------------------------- | ------------------------ | -------- | ------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()         |
| 2   | `user_id`                  | uuid                     | NO       | —                         |
| 3   | `therapist_id`             | uuid                     | YES      | —                         |
| 4   | `project_id`               | uuid                     | YES      | —                         |
| 5   | `session_id`               | uuid                     | YES      | —                         |
| 6   | `stripe_payment_intent_id` | text                     | YES      | —                         |
| 7   | `stripe_charge_id`         | text                     | YES      | —                         |
| 8   | `amount`                   | integer                  | NO       | —                         |
| 9   | `currency`                 | text                     | YES      | 'gbp'::text               |
| 10  | `payment_type`             | USER-DEFINED             | NO       | —                         |
| 11  | `payment_status`           | USER-DEFINED             | YES      | 'pending'::payment_status |
| 12  | `application_fee`          | integer                  | YES      | 0                         |
| 13  | `transfer_amount`          | integer                  | YES      | —                         |
| 14  | `metadata`                 | jsonb                    | YES      | —                         |
| 15  | `created_at`               | timestamp with time zone | YES      | now()                     |
| 16  | `updated_at`               | timestamp with time zone | YES      | now()                     |
| 17  | `marketplace_fee`          | integer                  | YES      | 0                         |
| 18  | `practitioner_payout`      | integer                  | YES      | 0                         |
| 19  | `fee_rate`                 | numeric                  | YES      | 0.03                      |
| 20  | `product_category`         | text                     | YES      | —                         |
| 21  | `therapist_type`           | text                     | YES      | —                         |
| 22  | `stripe_product_id`        | text                     | YES      | —                         |
| 23  | `stripe_price_id`          | text                     | YES      | —                         |
| 24  | `checkout_session_id`      | text                     | YES      | —                         |
| 25  | `platform_fee_amount`      | integer                  | YES      | 0                         |
| 26  | `practitioner_amount`      | integer                  | YES      | 0                         |
| 27  | `idempotency_key`          | text                     | YES      | —                         |

## `payouts`

| #   | Column               | Type                     | Nullable | Default                  |
| --- | -------------------- | ------------------------ | -------- | ------------------------ |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid()        |
| 2   | `connect_account_id` | uuid                     | NO       | —                        |
| 3   | `stripe_payout_id`   | text                     | YES      | —                        |
| 4   | `amount`             | integer                  | NO       | —                        |
| 5   | `currency`           | text                     | YES      | 'gbp'::text              |
| 6   | `status`             | USER-DEFINED             | YES      | 'pending'::payout_status |
| 7   | `arrival_date`       | timestamp with time zone | YES      | —                        |
| 8   | `type`               | text                     | YES      | 'bank_account'::text     |
| 9   | `method`             | text                     | YES      | —                        |
| 10  | `destination`        | text                     | YES      | —                        |
| 11  | `metadata`           | jsonb                    | YES      | —                        |
| 12  | `created_at`         | timestamp with time zone | YES      | now()                    |
| 13  | `updated_at`         | timestamp with time zone | YES      | now()                    |

## `peer_sessions`

| #   | Column             | Type                     | Nullable | Default                      |
| --- | ------------------ | ------------------------ | -------- | ---------------------------- |
| 1   | `id`               | uuid                     | NO       | uuid_generate_v4()           |
| 2   | `requester_id`     | uuid                     | YES      | —                            |
| 3   | `provider_id`      | uuid                     | YES      | —                            |
| 4   | `session_date`     | date                     | NO       | —                            |
| 5   | `start_time`       | time without time zone   | NO       | —                            |
| 6   | `duration_minutes` | integer                  | NO       | —                            |
| 7   | `session_type`     | character varying        | YES      | —                            |
| 8   | `status`           | USER-DEFINED             | YES      | 'scheduled'::session_status  |
| 9   | `notes`            | text                     | YES      | —                            |
| 10  | `price`            | numeric                  | YES      | —                            |
| 11  | `payment_status`   | character varying        | YES      | 'pending'::character varying |
| 12  | `created_at`       | timestamp with time zone | YES      | now()                        |
| 13  | `updated_at`       | timestamp with time zone | YES      | now()                        |

## `peer_treatment_sessions`

| #   | Column             | Type                     | Nullable | Default                        |
| --- | ------------------ | ------------------------ | -------- | ------------------------------ |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid()              |
| 2   | `practitioner_id`  | uuid                     | NO       | —                              |
| 3   | `client_id`        | uuid                     | NO       | —                              |
| 4   | `session_date`     | date                     | NO       | —                              |
| 5   | `start_time`       | time without time zone   | NO       | —                              |
| 6   | `duration_minutes` | integer                  | NO       | 60                             |
| 7   | `session_type`     | character varying        | NO       | —                              |
| 8   | `credit_cost`      | integer                  | NO       | 0                              |
| 9   | `status`           | character varying        | NO       | 'scheduled'::character varying |
| 10  | `notes`            | text                     | YES      | —                              |
| 11  | `created_at`       | timestamp with time zone | YES      | now()                          |
| 12  | `updated_at`       | timestamp with time zone | YES      | now()                          |

## `performance_metrics`

| #   | Column                      | Type                     | Nullable | Default           |
| --- | --------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                        | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                   | uuid                     | NO       | —                 |
| 3   | `metric_date`               | date                     | NO       | —                 |
| 4   | `project_completion_rate`   | numeric                  | YES      | —                 |
| 5   | `average_project_duration`  | numeric                  | YES      | —                 |
| 6   | `client_satisfaction_score` | numeric                  | YES      | —                 |
| 7   | `response_time_hours`       | numeric                  | YES      | —                 |
| 8   | `project_success_rate`      | numeric                  | YES      | —                 |
| 9   | `total_projects_completed`  | integer                  | YES      | —                 |
| 10  | `total_revenue`             | numeric                  | YES      | —                 |
| 11  | `created_at`                | timestamp with time zone | YES      | now()             |

## `platform_revenue`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`          | uuid                     | YES      | —                 |
| 3   | `practitioner_id`     | uuid                     | YES      | —                 |
| 4   | `client_id`           | uuid                     | YES      | —                 |
| 5   | `total_amount`        | numeric                  | NO       | —                 |
| 6   | `platform_fee`        | numeric                  | NO       | —                 |
| 7   | `practitioner_amount` | numeric                  | NO       | —                 |
| 8   | `stripe_session_id`   | text                     | YES      | —                 |
| 9   | `payment_date`        | timestamp with time zone | YES      | now()             |
| 10  | `created_at`          | timestamp with time zone | YES      | now()             |

## `practitioner_ai_preferences`

**Comment:** Learns and stores each practitioner's AI style preferences

| #   | Column                    | Type                     | Nullable | Default          |
| --- | ------------------------- | ------------------------ | -------- | ---------------- |
| 1   | `user_id`                 | uuid                     | NO       | —                |
| 2   | `soap_style`              | jsonb                    | YES      | '{}'::jsonb      |
| 3   | `common_phrases`          | ARRAY                    | YES      | '{}'::text[]     |
| 4   | `preferred_structure`     | jsonb                    | YES      | '{}'::jsonb      |
| 5   | `corrections_history`     | jsonb                    | YES      | '[]'::jsonb      |
| 6   | `terminology_preferences` | jsonb                    | YES      | '{}'::jsonb      |
| 7   | `detail_level`            | text                     | YES      | 'moderate'::text |
| 8   | `learning_enabled`        | boolean                  | YES      | true             |
| 9   | `last_learned_at`         | timestamp with time zone | YES      | —                |
| 10  | `created_at`              | timestamp with time zone | YES      | now()            |
| 11  | `updated_at`              | timestamp with time zone | YES      | now()            |

## `practitioner_availability`

| #   | Column                     | Type                     | Nullable | Default                                                    |
| --- | -------------------------- | ------------------------ | -------- | ---------------------------------------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()                                          |
| 2   | `user_id`                  | uuid                     | NO       | —                                                          |
| 3   | `working_hours`            | jsonb                    | NO       | '{"friday": {"end": "17:00", "start": "09:00", "enabled":… |
| 4   | `timezone`                 | text                     | YES      | 'Europe/London'::text                                      |
| 5   | `created_at`               | timestamp with time zone | YES      | now()                                                      |
| 6   | `updated_at`               | timestamp with time zone | YES      | now()                                                      |
| 7   | `default_session_time`     | time without time zone   | YES      | '10:00:00'::time without time zone                         |
| 8   | `default_duration_minutes` | integer                  | YES      | 60                                                         |
| 9   | `default_session_type`     | text                     | YES      | 'Treatment Session'::text                                  |

## `practitioner_client_stats`

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id` | uuid                     | NO       | —                 |
| 3   | `client_id`       | uuid                     | YES      | —                 |
| 4   | `client_email`    | text                     | NO       | —                 |
| 5   | `client_name`     | text                     | NO       | —                 |
| 6   | `total_sessions`  | integer                  | YES      | 0                 |
| 7   | `total_spent`     | numeric                  | YES      | 0.00              |
| 8   | `last_session`    | timestamp with time zone | YES      | —                 |
| 9   | `average_rating`  | numeric                  | YES      | 0.00              |
| 10  | `status`          | text                     | YES      | 'active'::text    |
| 11  | `notes`           | text                     | YES      | —                 |
| 12  | `created_at`      | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`      | timestamp with time zone | YES      | now()             |

## `practitioner_cpd`

| #   | Column                | Type                     | Nullable | Default                         |
| --- | --------------------- | ------------------------ | -------- | ------------------------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid()               |
| 2   | `practitioner_id`     | uuid                     | YES      | —                               |
| 3   | `activity_type`       | character varying        | NO       | —                               |
| 4   | `activity_name`       | character varying        | NO       | —                               |
| 5   | `provider`            | character varying        | NO       | —                               |
| 6   | `start_date`          | date                     | NO       | —                               |
| 7   | `end_date`            | date                     | YES      | —                               |
| 8   | `completion_date`     | date                     | YES      | —                               |
| 9   | `cpd_hours`           | numeric                  | NO       | —                               |
| 10  | `cpd_points`          | integer                  | YES      | —                               |
| 11  | `certificate_url`     | text                     | YES      | —                               |
| 12  | `evidence_url`        | text                     | YES      | —                               |
| 13  | `status`              | character varying        | YES      | 'completed'::character varying  |
| 14  | `verification_status` | character varying        | YES      | 'unverified'::character varying |
| 15  | `verified_at`         | timestamp with time zone | YES      | —                               |
| 16  | `verified_by`         | uuid                     | YES      | —                               |
| 17  | `verification_notes`  | text                     | YES      | —                               |
| 18  | `created_at`          | timestamp with time zone | YES      | now()                           |
| 19  | `updated_at`          | timestamp with time zone | YES      | now()                           |

## `practitioner_credentials`

| #   | Column                      | Type                     | Nullable | Default                         |
| --- | --------------------------- | ------------------------ | -------- | ------------------------------- |
| 1   | `id`                        | uuid                     | NO       | gen_random_uuid()               |
| 2   | `practitioner_id`           | uuid                     | YES      | —                               |
| 3   | `qualification_type`        | character varying        | NO       | —                               |
| 4   | `qualification_name`        | character varying        | NO       | —                               |
| 5   | `issuing_body`              | character varying        | NO       | —                               |
| 6   | `qualification_number`      | character varying        | YES      | —                               |
| 7   | `issue_date`                | date                     | NO       | —                               |
| 8   | `expiry_date`               | date                     | YES      | —                               |
| 9   | `renewal_date`              | date                     | YES      | —                               |
| 10  | `certificate_url`           | text                     | YES      | —                               |
| 11  | `verification_document_url` | text                     | YES      | —                               |
| 12  | `status`                    | character varying        | YES      | 'pending'::character varying    |
| 13  | `verification_status`       | character varying        | YES      | 'unverified'::character varying |
| 14  | `verified_at`               | timestamp with time zone | YES      | —                               |
| 15  | `verified_by`               | uuid                     | YES      | —                               |
| 16  | `verification_notes`        | text                     | YES      | —                               |
| 17  | `verification_method`       | character varying        | YES      | —                               |
| 18  | `created_at`                | timestamp with time zone | YES      | now()                           |
| 19  | `updated_at`                | timestamp with time zone | YES      | now()                           |
| 20  | `created_by`                | uuid                     | YES      | —                               |
| 21  | `updated_by`                | uuid                     | YES      | —                               |

## `practitioner_insurance`

| #   | Column                  | Type                     | Nullable | Default                         |
| --- | ----------------------- | ------------------------ | -------- | ------------------------------- |
| 1   | `id`                    | uuid                     | NO       | gen_random_uuid()               |
| 2   | `practitioner_id`       | uuid                     | YES      | —                               |
| 3   | `insurance_provider`    | character varying        | NO       | —                               |
| 4   | `policy_number`         | character varying        | NO       | —                               |
| 5   | `coverage_amount_pence` | bigint                   | NO       | —                               |
| 6   | `coverage_type`         | character varying        | NO       | —                               |
| 7   | `policy_start_date`     | date                     | NO       | —                               |
| 8   | `policy_end_date`       | date                     | NO       | —                               |
| 9   | `renewal_date`          | date                     | YES      | —                               |
| 10  | `policy_document_url`   | text                     | YES      | —                               |
| 11  | `certificate_url`       | text                     | YES      | —                               |
| 12  | `status`                | character varying        | YES      | 'active'::character varying     |
| 13  | `verification_status`   | character varying        | YES      | 'unverified'::character varying |
| 14  | `verified_at`           | timestamp with time zone | YES      | —                               |
| 15  | `verified_by`           | uuid                     | YES      | —                               |
| 16  | `verification_notes`    | text                     | YES      | —                               |
| 17  | `created_at`            | timestamp with time zone | YES      | now()                           |
| 18  | `updated_at`            | timestamp with time zone | YES      | now()                           |

## `practitioner_product_durations`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `service_id`       | uuid                     | NO       | —                 |
| 3   | `duration_minutes` | integer                  | NO       | —                 |
| 4   | `price_amount`     | integer                  | NO       | —                 |
| 5   | `is_active`        | boolean                  | NO       | true              |
| 6   | `created_at`       | timestamp with time zone | NO       | now()             |
| 7   | `updated_at`       | timestamp with time zone | NO       | now()             |

## `practitioner_products`

**Comment:** Products/packages that practitioners offer. Auto-migrated from hourly_rate for practitioners without packages.

| #   | Column                  | Type                     | Nullable | Default            |
| --- | ----------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                    | uuid                     | NO       | uuid_generate_v4() |
| 2   | `practitioner_id`       | uuid                     | YES      | —                  |
| 3   | `stripe_product_id`     | text                     | YES      | —                  |
| 4   | `stripe_price_id`       | text                     | YES      | —                  |
| 5   | `name`                  | text                     | NO       | —                  |
| 6   | `description`           | text                     | YES      | —                  |
| 7   | `price_amount`          | integer                  | NO       | —                  |
| 8   | `currency`              | text                     | YES      | 'gbp'::text        |
| 9   | `duration_minutes`      | integer                  | YES      | —                  |
| 10  | `is_active`             | boolean                  | YES      | true               |
| 11  | `created_at`            | timestamp with time zone | YES      | now()              |
| 12  | `updated_at`            | timestamp with time zone | YES      | now()              |
| 13  | `category`              | text                     | YES      | —                  |
| 14  | `service_category`      | text                     | YES      | —                  |
| 15  | `recommendation_reason` | text                     | YES      | —                  |
| 16  | `pricing_rationale`     | text                     | YES      | —                  |
| 17  | `popularity_score`      | integer                  | YES      | 0                  |
| 18  | `recommended_for`       | ARRAY                    | YES      | —                  |
| 19  | `service_type`          | text                     | YES      | 'clinic'::text     |

## `practitioner_qualification_documents`

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id` | uuid                     | NO       | —                 |
| 3   | `file_url`        | text                     | NO       | —                 |
| 4   | `file_name`       | text                     | YES      | —                 |
| 5   | `file_type`       | text                     | YES      | —                 |
| 6   | `file_size_bytes` | integer                  | YES      | —                 |
| 7   | `created_at`      | timestamp with time zone | YES      | now()             |

## `practitioner_ratings`

| #   | Column            | Type                     | Nullable | Default                     |
| --- | ----------------- | ------------------------ | -------- | --------------------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()           |
| 2   | `practitioner_id` | uuid                     | YES      | —                           |
| 3   | `client_id`       | uuid                     | YES      | —                           |
| 4   | `session_id`      | uuid                     | YES      | —                           |
| 5   | `rating`          | integer                  | NO       | —                           |
| 6   | `review_text`     | text                     | YES      | —                           |
| 7   | `status`          | character varying        | YES      | 'active'::character varying |
| 8   | `created_at`      | timestamp with time zone | YES      | now()                       |
| 9   | `updated_at`      | timestamp with time zone | YES      | now()                       |

## `practitioner_services`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `practitioner_id`  | uuid                     | NO       | —                 |
| 3   | `name`             | text                     | NO       | —                 |
| 4   | `description`      | text                     | YES      | —                 |
| 5   | `duration_minutes` | integer                  | NO       | —                 |
| 6   | `price_minor`      | integer                  | NO       | —                 |
| 7   | `active`           | boolean                  | NO       | true              |
| 8   | `created_at`       | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`       | timestamp with time zone | YES      | now()             |

## `practitioner_specializations`

| #   | Column              | Type                     | Nullable | Default            |
| --- | ------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                | uuid                     | NO       | uuid_generate_v4() |
| 2   | `practitioner_id`   | uuid                     | NO       | —                  |
| 3   | `specialization_id` | uuid                     | NO       | —                  |
| 4   | `years_experience`  | integer                  | YES      | —                  |
| 5   | `is_primary`        | boolean                  | YES      | false              |
| 6   | `created_at`        | timestamp with time zone | YES      | now()              |

## `pre_assessment_forms`

**Comment:** Pre-assessment forms for client screening before sessions. Mandatory for guests every time, mandatory for clients on first session, optional for subsequent sessions.

| #   | Column                       | Type                     | Nullable | Default           |
| --- | ---------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                         | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`                 | uuid                     | NO       | —                 |
| 3   | `client_id`                  | uuid                     | YES      | —                 |
| 4   | `client_email`               | text                     | NO       | —                 |
| 5   | `client_name`                | text                     | NO       | —                 |
| 6   | `name`                       | text                     | YES      | —                 |
| 7   | `date_of_birth`              | date                     | YES      | —                 |
| 8   | `contact_email`              | text                     | YES      | —                 |
| 9   | `contact_phone`              | text                     | YES      | —                 |
| 10  | `gp_name`                    | text                     | YES      | —                 |
| 11  | `gp_address`                 | text                     | YES      | —                 |
| 12  | `current_medical_conditions` | text                     | YES      | —                 |
| 13  | `past_medical_history`       | text                     | YES      | —                 |
| 14  | `area_of_body`               | text                     | YES      | —                 |
| 15  | `time_scale`                 | text                     | YES      | —                 |
| 16  | `how_issue_began`            | text                     | YES      | —                 |
| 17  | `activities_affected`        | text                     | YES      | —                 |
| 18  | `body_map_markers`           | jsonb                    | YES      | '[]'::jsonb       |
| 19  | `is_guest_booking`           | boolean                  | YES      | false             |
| 20  | `is_initial_session`         | boolean                  | YES      | false             |
| 21  | `completed_at`               | timestamp with time zone | YES      | —                 |
| 22  | `created_at`                 | timestamp with time zone | YES      | now()             |
| 23  | `updated_at`                 | timestamp with time zone | YES      | now()             |

## `product_templates`

| #   | Column                     | Type                     | Nullable | Default            |
| --- | -------------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                       | uuid                     | NO       | uuid_generate_v4() |
| 2   | `practitioner_id`          | uuid                     | YES      | —                  |
| 3   | `service_category`         | text                     | NO       | —                  |
| 4   | `template_name`            | text                     | NO       | —                  |
| 5   | `name_template`            | text                     | NO       | —                  |
| 6   | `description_template`     | text                     | YES      | —                  |
| 7   | `default_duration_minutes` | integer                  | NO       | —                  |
| 8   | `suggested_price_per_hour` | integer                  | YES      | —                  |
| 9   | `pricing_type`             | text                     | YES      | 'hourly'::text     |
| 10  | `min_duration_minutes`     | integer                  | YES      | —                  |
| 11  | `max_duration_minutes`     | integer                  | YES      | —                  |
| 12  | `is_platform_template`     | boolean                  | YES      | false              |
| 13  | `is_active`                | boolean                  | YES      | true               |
| 14  | `created_at`               | timestamp with time zone | YES      | now()              |
| 15  | `updated_at`               | timestamp with time zone | YES      | now()              |

## `profile_completeness_scores`

| #   | Column                    | Type                     | Nullable | Default                         |
| --- | ------------------------- | ------------------------ | -------- | ------------------------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid()               |
| 2   | `user_id`                 | uuid                     | YES      | —                               |
| 3   | `overall_score`           | numeric                  | YES      | 0                               |
| 4   | `max_possible_score`      | numeric                  | YES      | 100                             |
| 5   | `basic_info_score`        | numeric                  | YES      | 0                               |
| 6   | `professional_info_score` | numeric                  | YES      | 0                               |
| 7   | `qualifications_score`    | numeric                  | YES      | 0                               |
| 8   | `insurance_score`         | numeric                  | YES      | 0                               |
| 9   | `documentation_score`     | numeric                  | YES      | 0                               |
| 10  | `missing_fields`          | ARRAY                    | YES      | —                               |
| 11  | `incomplete_sections`     | ARRAY                    | YES      | —                               |
| 12  | `status`                  | character varying        | YES      | 'incomplete'::character varying |
| 13  | `last_calculated`         | timestamp with time zone | YES      | now()                           |
| 14  | `last_updated`            | timestamp with time zone | YES      | now()                           |
| 15  | `created_at`              | timestamp with time zone | YES      | now()                           |

## `profiles`

| #   | Column        | Type                     | Nullable | Default |
| --- | ------------- | ------------------------ | -------- | ------- |
| 1   | `id`          | uuid                     | NO       | —       |
| 2   | `email`       | text                     | NO       | —       |
| 3   | `first_name`  | text                     | YES      | —       |
| 4   | `last_name`   | text                     | YES      | —       |
| 5   | `avatar_url`  | text                     | YES      | —       |
| 6   | `level`       | integer                  | YES      | 1       |
| 7   | `points`      | integer                  | YES      | 0       |
| 8   | `streak_days` | integer                  | YES      | 0       |
| 9   | `created_at`  | timestamp with time zone | YES      | now()   |
| 10  | `updated_at`  | timestamp with time zone | YES      | now()   |

## `progress_goals`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`           | uuid                     | YES      | —                 |
| 3   | `practitioner_id`     | uuid                     | YES      | —                 |
| 4   | `goal_name`           | text                     | NO       | —                 |
| 5   | `description`         | text                     | YES      | ''::text          |
| 6   | `target_value`        | numeric                  | NO       | —                 |
| 7   | `current_value`       | numeric                  | YES      | 0                 |
| 8   | `target_date`         | date                     | NO       | —                 |
| 9   | `status`              | text                     | YES      | 'active'::text    |
| 10  | `created_at`          | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`          | timestamp with time zone | YES      | now()             |
| 12  | `linked_metric_name`  | text                     | YES      | —                 |
| 13  | `linked_metric_type`  | text                     | YES      | —                 |
| 14  | `auto_update_enabled` | boolean                  | YES      | true              |

## `progress_insights`

**Comment:** Caches calculated progress insights to improve performance. Insights can be recalculated periodically or on-demand.

| #   | Column          | Type                     | Nullable | Default           |
| --- | --------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`            | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`     | uuid                     | NO       | —                 |
| 3   | `insight_type`  | text                     | NO       | —                 |
| 4   | `insight_data`  | jsonb                    | NO       | '{}'::jsonb       |
| 5   | `calculated_at` | timestamp with time zone | YES      | now()             |
| 6   | `expires_at`    | timestamp with time zone | YES      | —                 |
| 7   | `created_at`    | timestamp with time zone | YES      | now()             |

## `progress_metrics`

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`       | uuid                     | YES      | —                 |
| 3   | `practitioner_id` | uuid                     | YES      | —                 |
| 4   | `session_id`      | uuid                     | YES      | —                 |
| 5   | `metric_type`     | text                     | NO       | —                 |
| 6   | `metric_name`     | text                     | NO       | —                 |
| 7   | `value`           | numeric                  | NO       | —                 |
| 8   | `max_value`       | numeric                  | NO       | —                 |
| 9   | `unit`            | text                     | YES      | ''::text          |
| 10  | `notes`           | text                     | YES      | ''::text          |
| 11  | `session_date`    | date                     | NO       | —                 |
| 12  | `created_at`      | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`      | timestamp with time zone | YES      | now()             |
| 14  | `metadata`        | jsonb                    | YES      | '{}'::jsonb       |

## `project_analytics`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `project_id`        | uuid                     | NO       | —                 |
| 3   | `metric_name`       | text                     | NO       | —                 |
| 4   | `metric_value`      | numeric                  | YES      | —                 |
| 5   | `metric_unit`       | text                     | YES      | —                 |
| 6   | `metric_category`   | text                     | YES      | —                 |
| 7   | `measurement_date`  | date                     | YES      | CURRENT_DATE      |
| 8   | `comparison_period` | text                     | YES      | —                 |
| 9   | `trend_direction`   | text                     | YES      | —                 |
| 10  | `notes`             | text                     | YES      | —                 |
| 11  | `created_at`        | timestamp with time zone | YES      | now()             |

## `project_documents`

| #   | Column            | Type                     | Nullable | Default                  |
| --- | ----------------- | ------------------------ | -------- | ------------------------ |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()        |
| 2   | `project_id`      | uuid                     | NO       | —                        |
| 3   | `phase_id`        | uuid                     | YES      | —                        |
| 4   | `document_name`   | text                     | NO       | —                        |
| 5   | `document_type`   | USER-DEFINED             | NO       | —                        |
| 6   | `document_status` | USER-DEFINED             | YES      | 'draft'::document_status |
| 7   | `file_path`       | text                     | YES      | —                        |
| 8   | `file_size`       | integer                  | YES      | —                        |
| 9   | `file_type`       | text                     | YES      | —                        |
| 10  | `version`         | text                     | YES      | '1.0'::text              |
| 11  | `uploaded_by`     | uuid                     | NO       | —                        |
| 12  | `uploaded_at`     | timestamp with time zone | YES      | now()                    |
| 13  | `reviewed_by`     | uuid                     | YES      | —                        |
| 14  | `reviewed_at`     | timestamp with time zone | YES      | —                        |
| 15  | `review_notes`    | text                     | YES      | —                        |
| 16  | `is_required`     | boolean                  | YES      | false                    |
| 17  | `due_date`        | date                     | YES      | —                        |
| 18  | `tags`            | ARRAY                    | YES      | —                        |
| 19  | `metadata`        | jsonb                    | YES      | —                        |
| 20  | `created_at`      | timestamp with time zone | YES      | now()                    |
| 21  | `updated_at`      | timestamp with time zone | YES      | now()                    |

## `project_messages`

| #   | Column              | Type                     | Nullable | Default                         |
| --- | ------------------- | ------------------------ | -------- | ------------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()               |
| 2   | `project_id`        | uuid                     | NO       | —                               |
| 3   | `conversation_id`   | uuid                     | YES      | —                               |
| 4   | `message_type`      | USER-DEFINED             | YES      | 'general'::project_message_type |
| 5   | `sender_id`         | uuid                     | NO       | —                               |
| 6   | `recipient_id`      | uuid                     | YES      | —                               |
| 7   | `subject`           | text                     | YES      | —                               |
| 8   | `message_content`   | text                     | NO       | —                               |
| 9   | `is_urgent`         | boolean                  | YES      | false                           |
| 10  | `requires_response` | boolean                  | YES      | false                           |
| 11  | `response_deadline` | timestamp with time zone | YES      | —                               |
| 12  | `is_read`           | boolean                  | YES      | false                           |
| 13  | `read_at`           | timestamp with time zone | YES      | —                               |
| 14  | `parent_message_id` | uuid                     | YES      | —                               |
| 15  | `attachments`       | jsonb                    | YES      | —                               |
| 16  | `created_at`        | timestamp with time zone | YES      | now()                           |
| 17  | `updated_at`        | timestamp with time zone | YES      | now()                           |

## `project_payments`

| #   | Column                     | Type                     | Nullable | Default                   |
| --- | -------------------------- | ------------------------ | -------- | ------------------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid()         |
| 2   | `project_id`               | uuid                     | NO       | —                         |
| 3   | `phase_id`                 | uuid                     | YES      | —                         |
| 4   | `payment_type`             | text                     | NO       | —                         |
| 5   | `amount`                   | numeric                  | NO       | —                         |
| 6   | `currency`                 | text                     | YES      | 'USD'::text               |
| 7   | `payment_status`           | USER-DEFINED             | YES      | 'pending'::payment_status |
| 8   | `payment_method`           | text                     | YES      | —                         |
| 9   | `transaction_id`           | text                     | YES      | —                         |
| 10  | `stripe_payment_intent_id` | text                     | YES      | —                         |
| 11  | `payment_date`             | timestamp with time zone | YES      | —                         |
| 12  | `due_date`                 | date                     | YES      | —                         |
| 13  | `description`              | text                     | YES      | —                         |
| 14  | `invoice_number`           | text                     | YES      | —                         |
| 15  | `receipt_url`              | text                     | YES      | —                         |
| 16  | `refund_amount`            | numeric                  | YES      | —                         |
| 17  | `refund_reason`            | text                     | YES      | —                         |
| 18  | `refund_date`              | timestamp with time zone | YES      | —                         |
| 19  | `created_at`               | timestamp with time zone | YES      | now()                     |
| 20  | `updated_at`               | timestamp with time zone | YES      | now()                     |

## `project_phases`

| #   | Column                    | Type                     | Nullable | Default                             |
| --- | ------------------------- | ------------------------ | -------- | ----------------------------------- |
| 1   | `id`                      | uuid                     | NO       | gen_random_uuid()                   |
| 2   | `project_id`              | uuid                     | NO       | —                                   |
| 3   | `phase_name`              | text                     | NO       | —                                   |
| 4   | `phase_description`       | text                     | YES      | —                                   |
| 5   | `phase_order`             | integer                  | NO       | —                                   |
| 6   | `phase_status`            | USER-DEFINED             | YES      | 'not_started'::project_phase_status |
| 7   | `start_date`              | date                     | YES      | —                                   |
| 8   | `end_date`                | date                     | YES      | —                                   |
| 9   | `estimated_duration_days` | integer                  | YES      | —                                   |
| 10  | `actual_duration_days`    | integer                  | YES      | —                                   |
| 11  | `deliverables`            | ARRAY                    | YES      | —                                   |
| 12  | `acceptance_criteria`     | ARRAY                    | YES      | —                                   |
| 13  | `phase_notes`             | text                     | YES      | —                                   |
| 14  | `phase_rating`            | numeric                  | YES      | —                                   |
| 15  | `phase_feedback`          | text                     | YES      | —                                   |
| 16  | `created_at`              | timestamp with time zone | YES      | now()                               |
| 17  | `updated_at`              | timestamp with time zone | YES      | now()                               |

## `project_reviews`

| #   | Column                 | Type                     | Nullable | Default           |
| --- | ---------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                   | uuid                     | NO       | gen_random_uuid() |
| 2   | `project_id`           | uuid                     | NO       | —                 |
| 3   | `client_id`            | uuid                     | NO       | —                 |
| 4   | `therapist_id`         | uuid                     | NO       | —                 |
| 5   | `overall_rating`       | numeric                  | NO       | —                 |
| 6   | `review_text`          | text                     | YES      | —                 |
| 7   | `project_satisfaction` | integer                  | YES      | —                 |
| 8   | `communication_rating` | integer                  | YES      | —                 |
| 9   | `quality_rating`       | integer                  | YES      | —                 |
| 10  | `value_rating`         | integer                  | YES      | —                 |
| 11  | `would_recommend`      | boolean                  | YES      | —                 |
| 12  | `review_status`        | text                     | YES      | 'pending'::text   |
| 13  | `is_verified`          | boolean                  | YES      | false             |
| 14  | `helpful_votes`        | integer                  | YES      | 0                 |
| 15  | `unhelpful_votes`      | integer                  | YES      | 0                 |
| 16  | `created_at`           | timestamp with time zone | YES      | now()             |
| 17  | `updated_at`           | timestamp with time zone | YES      | now()             |

## `projects`

| #   | Column                      | Type                     | Nullable | Default                    |
| --- | --------------------------- | ------------------------ | -------- | -------------------------- |
| 1   | `id`                        | uuid                     | NO       | gen_random_uuid()          |
| 2   | `client_id`                 | uuid                     | NO       | —                          |
| 3   | `therapist_id`              | uuid                     | NO       | —                          |
| 4   | `project_name`              | text                     | NO       | —                          |
| 5   | `project_description`       | text                     | YES      | —                          |
| 6   | `project_type`              | text                     | NO       | —                          |
| 7   | `project_status`            | USER-DEFINED             | YES      | 'planning'::project_status |
| 8   | `start_date`                | date                     | YES      | —                          |
| 9   | `end_date`                  | date                     | YES      | —                          |
| 10  | `estimated_duration_weeks`  | integer                  | YES      | —                          |
| 11  | `actual_duration_weeks`     | integer                  | YES      | —                          |
| 12  | `budget_range`              | jsonb                    | YES      | —                          |
| 13  | `actual_cost`               | numeric                  | YES      | —                          |
| 14  | `project_goals`             | ARRAY                    | YES      | —                          |
| 15  | `success_metrics`           | jsonb                    | YES      | —                          |
| 16  | `special_requirements`      | ARRAY                    | YES      | —                          |
| 17  | `location_preference`       | text                     | YES      | —                          |
| 18  | `scheduling_preferences`    | jsonb                    | YES      | —                          |
| 19  | `communication_preferences` | jsonb                    | YES      | —                          |
| 20  | `risk_assessment`           | jsonb                    | YES      | —                          |
| 21  | `quality_assurance`         | jsonb                    | YES      | —                          |
| 22  | `created_at`                | timestamp with time zone | YES      | now()                      |
| 23  | `updated_at`                | timestamp with time zone | YES      | now()                      |

## `qualifications`

| #   | Column              | Type                     | Nullable | Default            |
| --- | ------------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`                | uuid                     | NO       | uuid_generate_v4() |
| 2   | `practitioner_id`   | uuid                     | NO       | —                  |
| 3   | `name`              | character varying        | NO       | —                  |
| 4   | `institution`       | character varying        | YES      | —                  |
| 5   | `year_obtained`     | integer                  | YES      | —                  |
| 6   | `certificate_url`   | text                     | YES      | —                  |
| 7   | `verified`          | boolean                  | YES      | false              |
| 8   | `verification_date` | timestamp with time zone | YES      | —                  |
| 9   | `created_at`        | timestamp with time zone | YES      | now()              |
| 10  | `updated_at`        | timestamp with time zone | YES      | now()              |

## `rate_limits`

| #   | Column       | Type                     | Nullable | Default |
| --- | ------------ | ------------------------ | -------- | ------- |
| 1   | `key`        | text                     | NO       | —       |
| 2   | `count`      | integer                  | NO       | 0       |
| 3   | `reset_at`   | timestamp with time zone | NO       | —       |
| 4   | `created_at` | timestamp with time zone | YES      | now()   |
| 5   | `updated_at` | timestamp with time zone | YES      | now()   |

## `recordings`

| #   | Column          | Type                     | Nullable | Default           |
| --- | --------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`            | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`       | uuid                     | NO       | —                 |
| 3   | `title`         | text                     | YES      | —                 |
| 4   | `storage_path`  | text                     | NO       | —                 |
| 5   | `duration`      | integer                  | YES      | —                 |
| 6   | `transcript`    | text                     | YES      | —                 |
| 7   | `mood_analysis` | text                     | YES      | —                 |
| 8   | `created_at`    | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`    | timestamp with time zone | YES      | now()             |

## `refund_management`

| #   | Column                | Type                     | Nullable | Default                      |
| --- | --------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid()            |
| 2   | `original_payment_id` | uuid                     | YES      | —                            |
| 3   | `patient_id`          | uuid                     | YES      | —                            |
| 4   | `practitioner_id`     | uuid                     | YES      | —                            |
| 5   | `refund_amount_pence` | integer                  | NO       | —                            |
| 6   | `refund_reason`       | text                     | NO       | —                            |
| 7   | `refund_type`         | character varying        | NO       | —                            |
| 8   | `status`              | character varying        | YES      | 'pending'::character varying |
| 9   | `approval_date`       | timestamp with time zone | YES      | —                            |
| 10  | `processed_date`      | timestamp with time zone | YES      | —                            |
| 11  | `approved_by`         | uuid                     | YES      | —                            |
| 12  | `processed_by`        | uuid                     | YES      | —                            |
| 13  | `processing_notes`    | text                     | YES      | —                            |
| 14  | `refund_method`       | character varying        | YES      | —                            |
| 15  | `refund_reference`    | character varying        | YES      | —                            |
| 16  | `created_at`          | timestamp with time zone | YES      | now()                        |
| 17  | `created_by`          | uuid                     | YES      | —                            |

## `refunds`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `payment_id`       | uuid                     | NO       | —                 |
| 3   | `stripe_refund_id` | text                     | YES      | —                 |
| 4   | `amount`           | integer                  | NO       | —                 |
| 5   | `currency`         | text                     | YES      | 'gbp'::text       |
| 6   | `reason`           | text                     | YES      | —                 |
| 7   | `status`           | text                     | YES      | —                 |
| 8   | `created_at`       | timestamp with time zone | YES      | now()             |

## `reminders`

| #   | Column          | Type                     | Nullable | Default                      |
| --- | --------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`            | uuid                     | NO       | gen_random_uuid()            |
| 2   | `session_id`    | uuid                     | NO       | —                            |
| 3   | `reminder_type` | character varying        | NO       | —                            |
| 4   | `reminder_time` | timestamp with time zone | NO       | —                            |
| 5   | `message`       | text                     | YES      | —                            |
| 6   | `status`        | character varying        | YES      | 'pending'::character varying |
| 7   | `sent_at`       | timestamp with time zone | YES      | —                            |
| 8   | `error_message` | text                     | YES      | —                            |
| 9   | `created_at`    | timestamp with time zone | YES      | now()                        |
| 10  | `updated_at`    | timestamp with time zone | YES      | now()                        |

## `report_deliveries`

| #   | Column            | Type                     | Nullable | Default                    |
| --- | ----------------- | ------------------------ | -------- | -------------------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()          |
| 2   | `report_id`       | uuid                     | NO       | —                          |
| 3   | `delivery_date`   | timestamp with time zone | YES      | now()                      |
| 4   | `delivery_method` | text                     | NO       | —                          |
| 5   | `delivery_status` | USER-DEFINED             | YES      | 'generated'::report_status |
| 6   | `recipient_email` | text                     | YES      | —                          |
| 7   | `file_path`       | text                     | YES      | —                          |
| 8   | `file_size`       | integer                  | YES      | —                          |
| 9   | `delivery_notes`  | text                     | YES      | —                          |
| 10  | `created_at`      | timestamp with time zone | YES      | now()                      |

## `revenue_tracking`

| #   | Column                      | Type                     | Nullable | Default                      |
| --- | --------------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                        | uuid                     | NO       | gen_random_uuid()            |
| 2   | `practitioner_id`           | uuid                     | YES      | —                            |
| 3   | `period_start`              | date                     | NO       | —                            |
| 4   | `period_end`                | date                     | NO       | —                            |
| 5   | `period_type`               | character varying        | YES      | 'monthly'::character varying |
| 6   | `gross_revenue_pence`       | integer                  | YES      | 0                            |
| 7   | `net_revenue_pence`         | integer                  | YES      | 0                            |
| 8   | `platform_fee_pence`        | integer                  | YES      | 0                            |
| 9   | `stripe_fee_pence`          | integer                  | YES      | 0                            |
| 10  | `total_sessions`            | integer                  | YES      | 0                            |
| 11  | `completed_sessions`        | integer                  | YES      | 0                            |
| 12  | `cancelled_sessions`        | integer                  | YES      | 0                            |
| 13  | `total_payments_pence`      | integer                  | YES      | 0                            |
| 14  | `pending_payments_pence`    | integer                  | YES      | 0                            |
| 15  | `refunded_payments_pence`   | integer                  | YES      | 0                            |
| 16  | `reconciled_amount_pence`   | integer                  | YES      | 0                            |
| 17  | `unreconciled_amount_pence` | integer                  | YES      | 0                            |
| 18  | `created_at`                | timestamp with time zone | YES      | now()                        |
| 19  | `updated_at`                | timestamp with time zone | YES      | now()                        |

## `review_flags`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `review_id`    | uuid                     | NO       | —                 |
| 3   | `flagged_by`   | uuid                     | NO       | —                 |
| 4   | `flag_reason`  | text                     | NO       | —                 |
| 5   | `flag_details` | text                     | YES      | —                 |
| 6   | `is_resolved`  | boolean                  | YES      | false             |
| 7   | `resolved_by`  | uuid                     | YES      | —                 |
| 8   | `resolved_at`  | timestamp with time zone | YES      | —                 |
| 9   | `created_at`   | timestamp with time zone | YES      | now()             |

## `review_notifications`

| #   | Column              | Type                     | Nullable | Default           |
| --- | ------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid() |
| 2   | `review_id`         | uuid                     | NO       | —                 |
| 3   | `recipient_id`      | uuid                     | NO       | —                 |
| 4   | `notification_type` | text                     | NO       | —                 |
| 5   | `sent_at`           | timestamp with time zone | YES      | now()             |
| 6   | `read_at`           | timestamp with time zone | YES      | —                 |
| 7   | `delivery_method`   | text                     | YES      | 'email'::text     |
| 8   | `delivery_status`   | text                     | YES      | 'sent'::text      |

## `review_votes`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `review_id`  | uuid                     | NO       | —                 |
| 3   | `voter_id`   | uuid                     | NO       | —                 |
| 4   | `is_helpful` | boolean                  | NO       | —                 |
| 5   | `created_at` | timestamp with time zone | YES      | now()             |

## `reviews`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `client_id`           | uuid                     | NO       | —                 |
| 3   | `therapist_id`        | uuid                     | NO       | —                 |
| 4   | `session_id`          | uuid                     | YES      | —                 |
| 5   | `overall_rating`      | integer                  | NO       | —                 |
| 6   | `title`               | character varying        | YES      | —                 |
| 7   | `comment`             | text                     | YES      | —                 |
| 8   | `is_anonymous`        | boolean                  | YES      | false             |
| 9   | `created_at`          | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`          | timestamp with time zone | YES      | now()             |
| 11  | `review_status`       | text                     | YES      | 'pending'::text   |
| 12  | `is_verified_session` | boolean                  | YES      | false             |
| 13  | `helpful_votes`       | integer                  | YES      | 0                 |
| 14  | `unhelpful_votes`     | integer                  | YES      | 0                 |
| 15  | `moderated_at`        | timestamp with time zone | YES      | —                 |
| 16  | `moderated_by`        | uuid                     | YES      | —                 |
| 17  | `moderation_notes`    | text                     | YES      | —                 |

## `security_events`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`             | uuid                     | YES      | —                 |
| 3   | `event_type`          | character varying        | NO       | —                 |
| 4   | `event_description`   | text                     | YES      | —                 |
| 5   | `ip_address`          | inet                     | YES      | —                 |
| 6   | `user_agent`          | text                     | YES      | —                 |
| 7   | `location_data`       | jsonb                    | YES      | —                 |
| 8   | `risk_score`          | integer                  | YES      | 0                 |
| 9   | `blocked`             | boolean                  | YES      | false             |
| 10  | `investigation_notes` | text                     | YES      | —                 |
| 11  | `created_at`          | timestamp with time zone | YES      | now()             |

## `service_packages`

| #   | Column                | Type                     | Nullable | Default           |
| --- | --------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                  | uuid                     | NO       | gen_random_uuid() |
| 2   | `therapist_id`        | uuid                     | NO       | —                 |
| 3   | `package_name`        | character varying        | NO       | —                 |
| 4   | `package_description` | text                     | YES      | —                 |
| 5   | `duration_minutes`    | integer                  | NO       | —                 |
| 6   | `base_price`          | numeric                  | NO       | —                 |
| 7   | `discounted_price`    | numeric                  | YES      | —                 |
| 8   | `is_active`           | boolean                  | YES      | true              |
| 9   | `created_at`          | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`          | timestamp with time zone | YES      | now()             |

## `service_reviews`

| #   | Column             | Type                     | Nullable | Default            |
| --- | ------------------ | ------------------------ | -------- | ------------------ |
| 1   | `id`               | uuid                     | NO       | uuid_generate_v4() |
| 2   | `product_id`       | uuid                     | YES      | —                  |
| 3   | `booking_id`       | uuid                     | YES      | —                  |
| 4   | `client_id`        | uuid                     | YES      | —                  |
| 5   | `practitioner_id`  | uuid                     | YES      | —                  |
| 6   | `overall_rating`   | integer                  | NO       | —                  |
| 7   | `service_quality`  | integer                  | YES      | —                  |
| 8   | `value_for_money`  | integer                  | YES      | —                  |
| 9   | `review_title`     | text                     | YES      | —                  |
| 10  | `review_text`      | text                     | YES      | —                  |
| 11  | `review_status`    | text                     | YES      | 'published'::text  |
| 12  | `moderation_notes` | text                     | YES      | —                  |
| 13  | `created_at`       | timestamp with time zone | YES      | now()              |
| 14  | `updated_at`       | timestamp with time zone | YES      | now()              |

## `session_attendance`

| #   | Column                     | Type                     | Nullable | Default           |
| --- | -------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`               | uuid                     | NO       | —                 |
| 3   | `client_checked_in_at`     | timestamp with time zone | YES      | —                 |
| 4   | `therapist_checked_in_at`  | timestamp with time zone | YES      | —                 |
| 5   | `client_checked_out_at`    | timestamp with time zone | YES      | —                 |
| 6   | `therapist_checked_out_at` | timestamp with time zone | YES      | —                 |
| 7   | `session_duration_minutes` | integer                  | YES      | —                 |
| 8   | `notes`                    | text                     | YES      | —                 |
| 9   | `created_at`               | timestamp with time zone | YES      | now()             |
| 10  | `updated_at`               | timestamp with time zone | YES      | now()             |

## `session_feedback`

| #   | Column       | Type                     | Nullable | Default           |
| --- | ------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`         | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id` | uuid                     | YES      | —                 |
| 3   | `client_id`  | uuid                     | YES      | —                 |
| 4   | `rating`     | integer                  | NO       | —                 |
| 5   | `feedback`   | text                     | YES      | ''::text          |
| 6   | `created_at` | timestamp with time zone | YES      | now()             |
| 7   | `updated_at` | timestamp with time zone | YES      | now()             |

## `session_recordings`

| #   | Column                 | Type                     | Nullable | Default           |
| --- | ---------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                   | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`           | uuid                     | YES      | —                 |
| 3   | `practitioner_id`      | uuid                     | YES      | —                 |
| 4   | `client_id`            | uuid                     | YES      | —                 |
| 5   | `recording_url`        | text                     | YES      | —                 |
| 6   | `transcript`           | text                     | YES      | —                 |
| 7   | `ai_summary`           | text                     | YES      | —                 |
| 8   | `ai_key_points`        | ARRAY                    | YES      | —                 |
| 9   | `ai_action_items`      | ARRAY                    | YES      | —                 |
| 10  | `status`               | text                     | YES      | 'recording'::text |
| 11  | `duration_seconds`     | integer                  | YES      | —                 |
| 12  | `created_at`           | timestamp with time zone | YES      | now()             |
| 13  | `updated_at`           | timestamp with time zone | YES      | now()             |
| 14  | `soap_subjective`      | text                     | YES      | —                 |
| 15  | `soap_objective`       | text                     | YES      | —                 |
| 16  | `soap_assessment`      | text                     | YES      | —                 |
| 17  | `soap_plan`            | text                     | YES      | —                 |
| 18  | `chief_complaint`      | text                     | YES      | —                 |
| 19  | `session_goals`        | ARRAY                    | YES      | —                 |
| 20  | `transcription_method` | text                     | YES      | 'browser'::text   |
| 21  | `session_notes`        | text                     | YES      | —                 |

## `slot_holds`

| #   | Column              | Type                        | Nullable | Default           |
| --- | ------------------- | --------------------------- | -------- | ----------------- |
| 1   | `id`                | uuid                        | NO       | gen_random_uuid() |
| 2   | `practitioner_id`   | uuid                        | YES      | —                 |
| 3   | `request_id`        | uuid                        | YES      | —                 |
| 4   | `session_date`      | date                        | NO       | —                 |
| 5   | `start_time`        | time without time zone      | NO       | —                 |
| 6   | `end_time`          | time without time zone      | NO       | —                 |
| 7   | `duration_minutes`  | integer                     | NO       | —                 |
| 8   | `expires_at`        | timestamp without time zone | NO       | —                 |
| 9   | `status`            | text                        | YES      | 'active'::text    |
| 10  | `created_at`        | timestamp without time zone | YES      | now()             |
| 11  | `updated_at`        | timestamp without time zone | YES      | now()             |
| 12  | `mobile_request_id` | uuid                        | YES      | —                 |

## `sms_logs`

**Comment:** Logs of SMS messages sent for session reminders and notifications

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `phone_number`       | text                     | NO       | —                 |
| 3   | `message`            | text                     | NO       | —                 |
| 4   | `session_id`         | uuid                     | YES      | —                 |
| 5   | `reminder_type`      | text                     | YES      | —                 |
| 6   | `twilio_message_sid` | text                     | YES      | —                 |
| 7   | `status`             | text                     | YES      | 'queued'::text    |
| 8   | `sent_at`            | timestamp with time zone | YES      | now()             |
| 9   | `delivered_at`       | timestamp with time zone | YES      | —                 |
| 10  | `failed_at`          | timestamp with time zone | YES      | —                 |
| 11  | `error_message`      | text                     | YES      | —                 |
| 12  | `metadata`           | jsonb                    | YES      | '{}'::jsonb       |
| 13  | `created_at`         | timestamp with time zone | YES      | now()             |

## `soap_templates`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `name`               | text                     | NO       | —                 |
| 3   | `description`        | text                     | YES      | —                 |
| 4   | `subjective_prompts` | ARRAY                    | YES      | —                 |
| 5   | `objective_prompts`  | ARRAY                    | YES      | —                 |
| 6   | `assessment_prompts` | ARRAY                    | YES      | —                 |
| 7   | `plan_prompts`       | ARRAY                    | YES      | —                 |
| 8   | `is_default`         | boolean                  | YES      | false             |
| 9   | `created_by`         | uuid                     | YES      | —                 |
| 10  | `created_at`         | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`         | timestamp with time zone | YES      | now()             |

## `spatial_ref_sys`

| #   | Column      | Type              | Nullable | Default |
| --- | ----------- | ----------------- | -------- | ------- |
| 1   | `srid`      | integer           | NO       | —       |
| 2   | `auth_name` | character varying | YES      | —       |
| 3   | `auth_srid` | integer           | YES      | —       |
| 4   | `srtext`    | character varying | YES      | —       |
| 5   | `proj4text` | character varying | YES      | —       |

## `specializations`

| #   | Column        | Type                     | Nullable | Default            |
| --- | ------------- | ------------------------ | -------- | ------------------ |
| 1   | `id`          | uuid                     | NO       | uuid_generate_v4() |
| 2   | `name`        | character varying        | NO       | —                  |
| 3   | `description` | text                     | YES      | —                  |
| 4   | `category`    | character varying        | YES      | —                  |
| 5   | `created_at`  | timestamp with time zone | YES      | now()              |

## `stripe_connect_accounts`

| #   | Column              | Type                     | Nullable | Default                      |
| --- | ------------------- | ------------------------ | -------- | ---------------------------- |
| 1   | `id`                | uuid                     | NO       | gen_random_uuid()            |
| 2   | `user_id`           | uuid                     | NO       | —                            |
| 3   | `stripe_account_id` | character varying        | NO       | —                            |
| 4   | `account_type`      | character varying        | YES      | 'express'::character varying |
| 5   | `charges_enabled`   | boolean                  | YES      | false                        |
| 6   | `payouts_enabled`   | boolean                  | YES      | false                        |
| 7   | `details_submitted` | boolean                  | YES      | false                        |
| 8   | `requirements`      | jsonb                    | YES      | —                            |
| 9   | `capabilities`      | jsonb                    | YES      | —                            |
| 10  | `country`           | character varying        | YES      | —                            |
| 11  | `email`             | character varying        | YES      | —                            |
| 12  | `created_at`        | timestamp with time zone | YES      | now()                        |
| 13  | `updated_at`        | timestamp with time zone | YES      | now()                        |

## `stripe_payments`

| #   | Column                     | Type                     | Nullable | Default           |
| --- | -------------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                       | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                  | uuid                     | YES      | —                 |
| 3   | `stripe_payment_intent_id` | text                     | YES      | —                 |
| 4   | `stripe_session_id`        | text                     | YES      | —                 |
| 5   | `amount`                   | numeric                  | NO       | —                 |
| 6   | `currency`                 | text                     | YES      | 'usd'::text       |
| 7   | `status`                   | text                     | NO       | —                 |
| 8   | `payment_method`           | text                     | YES      | —                 |
| 9   | `description`              | text                     | YES      | —                 |
| 10  | `metadata`                 | jsonb                    | YES      | —                 |
| 11  | `created_at`               | timestamp with time zone | YES      | now()             |
| 12  | `updated_at`               | timestamp with time zone | YES      | now()             |

## `subscribers`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`            | uuid                     | YES      | —                 |
| 3   | `email`              | text                     | NO       | —                 |
| 4   | `stripe_customer_id` | text                     | YES      | —                 |
| 5   | `subscribed`         | boolean                  | NO       | false             |
| 6   | `subscription_tier`  | text                     | YES      | —                 |
| 7   | `subscription_end`   | timestamp with time zone | YES      | —                 |
| 8   | `updated_at`         | timestamp with time zone | NO       | now()             |
| 9   | `created_at`         | timestamp with time zone | NO       | now()             |

## `subscriptions`

| #   | Column                   | Type                     | Nullable | Default           |
| --- | ------------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`                     | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`                | uuid                     | YES      | —                 |
| 3   | `stripe_subscription_id` | text                     | YES      | —                 |
| 4   | `plan`                   | text                     | NO       | —                 |
| 5   | `billing_cycle`          | text                     | NO       | —                 |
| 6   | `status`                 | text                     | NO       | —                 |
| 7   | `current_period_start`   | timestamp with time zone | YES      | —                 |
| 8   | `current_period_end`     | timestamp with time zone | YES      | —                 |
| 9   | `subscription_end`       | timestamp with time zone | YES      | —                 |
| 10  | `created_at`             | timestamp with time zone | YES      | now()             |
| 11  | `updated_at`             | timestamp with time zone | YES      | now()             |
| 12  | `monthly_credits`        | integer                  | YES      | 0                 |
| 13  | `last_credit_allocation` | timestamp with time zone | YES      | —                 |
| 14  | `stripe_customer_id`     | text                     | YES      | —                 |
| 15  | `price_id`               | text                     | YES      | —                 |
| 16  | `quantity`               | integer                  | YES      | 1                 |
| 17  | `cancel_at_period_end`   | boolean                  | YES      | false             |
| 18  | `ended_at`               | timestamp with time zone | YES      | —                 |
| 19  | `credits_allocated_at`   | timestamp with time zone | YES      | —                 |
| 20  | `next_credit_allocation` | timestamp with time zone | YES      | —                 |

## `tasks`

| #   | Column        | Type                     | Nullable | Default           |
| --- | ------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`          | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`     | uuid                     | NO       | —                 |
| 3   | `title`       | text                     | NO       | —                 |
| 4   | `description` | text                     | YES      | —                 |
| 5   | `priority`    | text                     | YES      | 'medium'::text    |
| 6   | `completed`   | boolean                  | YES      | false             |
| 7   | `due_date`    | date                     | YES      | —                 |
| 8   | `created_at`  | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`  | timestamp with time zone | YES      | now()             |

## `therapist_profiles`

| #   | Column                      | Type                     | Nullable | Default                                 |
| --- | --------------------------- | ------------------------ | -------- | --------------------------------------- |
| 1   | `id`                        | uuid                     | NO       | uuid_generate_v4()                      |
| 2   | `user_id`                   | uuid                     | YES      | —                                       |
| 3   | `bio`                       | text                     | YES      | —                                       |
| 4   | `location`                  | character varying        | YES      | —                                       |
| 5   | `specializations`           | ARRAY                    | YES      | —                                       |
| 6   | `professional_body`         | USER-DEFINED             | YES      | —                                       |
| 7   | `insurance_details`         | text                     | YES      | —                                       |
| 8   | `qualifications`            | ARRAY                    | YES      | —                                       |
| 9   | `experience_years`          | integer                  | YES      | —                                       |
| 10  | `hourly_rate`               | numeric                  | YES      | —                                       |
| 11  | `is_active`                 | boolean                  | YES      | true                                    |
| 12  | `website`                   | character varying        | YES      | —                                       |
| 13  | `linkedin`                  | character varying        | YES      | —                                       |
| 14  | `certifications`            | ARRAY                    | YES      | —                                       |
| 15  | `availability`              | jsonb                    | YES      | —                                       |
| 16  | `created_at`                | timestamp with time zone | YES      | now()                                   |
| 17  | `updated_at`                | timestamp with time zone | YES      | now()                                   |
| 18  | `registration_number`       | character varying        | YES      | —                                       |
| 19  | `profile_completion_status` | USER-DEFINED             | YES      | 'incomplete'::profile_completion_status |
| 20  | `verification_status`       | USER-DEFINED             | YES      | 'pending'::verification_status          |
| 21  | `profile_score`             | integer                  | YES      | 0                                       |
| 22  | `response_time_hours`       | integer                  | YES      | —                                       |
| 23  | `total_sessions`            | integer                  | YES      | 0                                       |
| 24  | `average_rating`            | numeric                  | YES      | 0.00                                    |
| 25  | `total_reviews`             | integer                  | YES      | 0                                       |
| 26  | `profile_views`             | integer                  | YES      | 0                                       |
| 27  | `last_active`               | timestamp with time zone | YES      | now()                                   |
| 28  | `languages`                 | ARRAY                    | YES      | —                                       |
| 29  | `insurance_info`            | jsonb                    | YES      | —                                       |
| 30  | `emergency_contact`         | jsonb                    | YES      | —                                       |
| 31  | `profile_photo_url`         | text                     | YES      | —                                       |
| 32  | `cover_photo_url`           | text                     | YES      | —                                       |
| 33  | `portfolio_photos`          | ARRAY                    | YES      | —                                       |
| 34  | `video_introduction_url`    | text                     | YES      | —                                       |
| 35  | `professional_statement`    | text                     | YES      | —                                       |
| 36  | `treatment_philosophy`      | text                     | YES      | —                                       |
| 37  | `continuing_education`      | ARRAY                    | YES      | —                                       |
| 38  | `awards_certifications`     | ARRAY                    | YES      | —                                       |
| 39  | `published_works`           | ARRAY                    | YES      | —                                       |
| 40  | `media_appearances`         | ARRAY                    | YES      | —                                       |
| 41  | `profile_verified_at`       | timestamp with time zone | YES      | —                                       |
| 42  | `profile_verified_by`       | uuid                     | YES      | —                                       |
| 43  | `verification_notes`        | text                     | YES      | —                                       |

## `treatment_exchange_requests`

| #   | Column                         | Type                     | Nullable | Default                        |
| --- | ------------------------------ | ------------------------ | -------- | ------------------------------ |
| 1   | `id`                           | uuid                     | NO       | gen_random_uuid()              |
| 2   | `requester_id`                 | uuid                     | NO       | —                              |
| 3   | `recipient_id`                 | uuid                     | NO       | —                              |
| 4   | `requested_session_date`       | date                     | NO       | —                              |
| 5   | `requested_start_time`         | time without time zone   | NO       | —                              |
| 6   | `requested_end_time`           | time without time zone   | NO       | —                              |
| 7   | `duration_minutes`             | integer                  | NO       | 60                             |
| 8   | `session_type`                 | text                     | YES      | —                              |
| 9   | `requester_notes`              | text                     | YES      | —                              |
| 10  | `recipient_notes`              | text                     | YES      | —                              |
| 11  | `status`                       | text                     | NO       | 'pending'::text                |
| 12  | `expires_at`                   | timestamp with time zone | NO       | (now() + '24:00:00'::interval) |
| 13  | `accepted_at`                  | timestamp with time zone | YES      | —                              |
| 14  | `declined_at`                  | timestamp with time zone | YES      | —                              |
| 15  | `created_at`                   | timestamp with time zone | YES      | now()                          |
| 16  | `updated_at`                   | timestamp with time zone | YES      | now()                          |
| 17  | `recipient_can_book_back`      | boolean                  | YES      | true                           |
| 18  | `recipient_booking_request_id` | uuid                     | YES      | —                              |

## `treatment_notes`

| #   | Column            | Type                     | Nullable | Default           |
| --- | ----------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid() |
| 2   | `session_id`      | uuid                     | YES      | —                 |
| 3   | `practitioner_id` | uuid                     | YES      | —                 |
| 4   | `client_id`       | uuid                     | YES      | —                 |
| 5   | `note_type`       | text                     | NO       | —                 |
| 6   | `content`         | text                     | NO       | —                 |
| 7   | `timestamp`       | timestamp with time zone | YES      | now()             |
| 8   | `created_at`      | timestamp with time zone | YES      | now()             |
| 9   | `updated_at`      | timestamp with time zone | YES      | now()             |
| 10  | `template_type`   | text                     | YES      | 'FREE_TEXT'::text |
| 11  | `status`          | text                     | YES      | 'draft'::text     |

## `treatment_projects`

| #   | Column            | Type                     | Nullable | Default                       |
| --- | ----------------- | ------------------------ | -------- | ----------------------------- |
| 1   | `id`              | uuid                     | NO       | gen_random_uuid()             |
| 2   | `practitioner_id` | uuid                     | NO       | —                             |
| 3   | `client_id`       | uuid                     | NO       | —                             |
| 4   | `title`           | character varying        | NO       | —                             |
| 5   | `description`     | text                     | YES      | —                             |
| 6   | `status`          | character varying        | NO       | 'planning'::character varying |
| 7   | `start_date`      | date                     | NO       | —                             |
| 8   | `end_date`        | date                     | YES      | —                             |
| 9   | `goals`           | ARRAY                    | YES      | '{}'::text[]                  |
| 10  | `treatment_plan`  | text                     | YES      | —                             |
| 11  | `progress_notes`  | text                     | YES      | —                             |
| 12  | `created_at`      | timestamp with time zone | YES      | now()                         |
| 13  | `updated_at`      | timestamp with time zone | YES      | now()                         |

## `trend_analysis`

| #   | Column               | Type                     | Nullable | Default           |
| --- | -------------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`                 | uuid                     | NO       | gen_random_uuid() |
| 2   | `metric_id`          | uuid                     | NO       | —                 |
| 3   | `user_id`            | uuid                     | YES      | —                 |
| 4   | `project_id`         | uuid                     | YES      | —                 |
| 5   | `trend_period`       | text                     | NO       | —                 |
| 6   | `trend_start_date`   | date                     | NO       | —                 |
| 7   | `trend_end_date`     | date                     | NO       | —                 |
| 8   | `trend_direction`    | USER-DEFINED             | NO       | —                 |
| 9   | `trend_strength`     | numeric                  | YES      | —                 |
| 10  | `change_percentage`  | numeric                  | YES      | —                 |
| 11  | `confidence_level`   | numeric                  | YES      | —                 |
| 12  | `seasonality_factor` | numeric                  | YES      | —                 |
| 13  | `created_at`         | timestamp with time zone | YES      | now()             |

## `user_favorites`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `user_id`      | uuid                     | NO       | —                 |
| 3   | `therapist_id` | uuid                     | NO       | —                 |
| 4   | `created_at`   | timestamp with time zone | YES      | now()             |

## `user_messages`

| #   | Column         | Type                     | Nullable | Default           |
| --- | -------------- | ------------------------ | -------- | ----------------- |
| 1   | `id`           | uuid                     | NO       | gen_random_uuid() |
| 2   | `sender_id`    | uuid                     | NO       | —                 |
| 3   | `recipient_id` | uuid                     | NO       | —                 |
| 4   | `content`      | text                     | NO       | —                 |
| 5   | `created_at`   | timestamp with time zone | YES      | now()             |
| 6   | `read_at`      | timestamp with time zone | YES      | —                 |

## `user_presence`

| #   | Column         | Type                     | Nullable | Default |
| --- | -------------- | ------------------------ | -------- | ------- |
| 1   | `user_id`      | uuid                     | NO       | —       |
| 2   | `online_at`    | timestamp with time zone | NO       | —       |
| 3   | `last_seen_at` | timestamp with time zone | NO       | —       |

## `user_profiles`

**Comment:** User profiles table with RLS policies for secure access

| #   | Column               | Type                     | Nullable | Default         |
| --- | -------------------- | ------------------------ | -------- | --------------- |
| 1   | `id`                 | uuid                     | NO       | —               |
| 2   | `email`              | character varying        | NO       | —               |
| 3   | `first_name`         | character varying        | NO       | —               |
| 4   | `last_name`          | character varying        | NO       | —               |
| 5   | `user_role`          | text                     | YES      | 'client'::text  |
| 6   | `onboarding_status`  | text                     | YES      | 'pending'::text |
| 7   | `profile_completed`  | boolean                  | YES      | false           |
| 8   | `phone`              | character varying        | YES      | —               |
| 9   | `created_at`         | timestamp with time zone | YES      | now()           |
| 10  | `updated_at`         | timestamp with time zone | YES      | now()           |
| 11  | `avatar_preferences` | jsonb                    | YES      | —               |
| 12  | `location`           | text                     | YES      | —               |

## `users`

| #   | Column                           | Type                     | Nullable | Default                                                    |
| --- | -------------------------------- | ------------------------ | -------- | ---------------------------------------------------------- |
| 1   | `id`                             | uuid                     | NO       | uuid_generate_v4()                                         |
| 2   | `email`                          | character varying        | NO       | —                                                          |
| 3   | `first_name`                     | character varying        | NO       | —                                                          |
| 4   | `last_name`                      | character varying        | NO       | —                                                          |
| 5   | `is_verified`                    | boolean                  | YES      | false                                                      |
| 6   | `is_active`                      | boolean                  | YES      | true                                                       |
| 7   | `email_verified_at`              | timestamp with time zone | YES      | —                                                          |
| 8   | `last_login_at`                  | timestamp with time zone | YES      | —                                                          |
| 9   | `created_at`                     | timestamp with time zone | YES      | now()                                                      |
| 10  | `updated_at`                     | timestamp with time zone | YES      | now()                                                      |
| 11  | `user_role`                      | USER-DEFINED             | YES      | 'sports_therapist'::user_role                              |
| 12  | `onboarding_status`              | USER-DEFINED             | YES      | 'pending'::onboarding_status                               |
| 13  | `phone`                          | character varying        | YES      | —                                                          |
| 14  | `profile_completed`              | boolean                  | YES      | false                                                      |
| 15  | `registration_number`            | character varying        | YES      | —                                                          |
| 16  | `professional_body`              | character varying        | YES      | —                                                          |
| 17  | `preferences`                    | jsonb                    | YES      | '{}'::jsonb                                                |
| 18  | `avatar_preferences`             | jsonb                    | YES      | —                                                          |
| 19  | `oauth_completed`                | boolean                  | YES      | false                                                      |
| 20  | `terms_accepted`                 | boolean                  | YES      | false                                                      |
| 21  | `terms_accepted_at`              | timestamp with time zone | YES      | —                                                          |
| 22  | `full_name`                      | text                     | YES      | —                                                          |
| 23  | `bio`                            | text                     | YES      | —                                                          |
| 24  | `location`                       | text                     | YES      | —                                                          |
| 25  | `qualification_type`             | text                     | YES      | —                                                          |
| 26  | `qualification_file_url`         | text                     | YES      | —                                                          |
| 27  | `qualification_expiry`           | date                     | YES      | —                                                          |
| 28  | `professional_body_other`        | text                     | YES      | —                                                          |
| 29  | `hourly_rate`                    | integer                  | YES      | 80                                                         |
| 30  | `specializations`                | ARRAY                    | YES      | '{}'::text[]                                               |
| 31  | `experience_years`               | integer                  | YES      | —                                                          |
| 32  | `membership_number`              | character varying        | YES      | —                                                          |
| 33  | `itmmif_status`                  | boolean                  | YES      | false                                                      |
| 34  | `atmmif_status`                  | boolean                  | YES      | false                                                      |
| 35  | `pitch_side_trauma`              | boolean                  | YES      | false                                                      |
| 36  | `goc_registration`               | boolean                  | YES      | false                                                      |
| 37  | `cnhc_registration`              | boolean                  | YES      | false                                                      |
| 38  | `credit_settings`                | jsonb                    | YES      | '{"credit_cost_per_hour": 10, "peer_booking_enabled": tru… |
| 39  | `latitude`                       | numeric                  | YES      | —                                                          |
| 40  | `longitude`                      | numeric                  | YES      | —                                                          |
| 41  | `service_radius_km`              | integer                  | YES      | 25                                                         |
| 42  | `treatment_exchange_enabled`     | boolean                  | YES      | false                                                      |
| 43  | `treatment_exchange_preferences` | jsonb                    | YES      | '{"auto_accept": false, "max_distance_km": 50, "rating_th… |
| 44  | `services_offered`               | jsonb                    | NO       | '[]'::jsonb                                                |
| 45  | `profile_views`                  | integer                  | YES      | 0                                                          |
| 46  | `response_time_hours`            | integer                  | YES      | 24                                                         |
| 47  | `stripe_connect_account_id`      | text                     | YES      | —                                                          |
| 48  | `profile_photo_url`              | text                     | YES      | —                                                          |
| 49  | `clinic_address`                 | text                     | YES      | —                                                          |
| 50  | `clinic_latitude`                | numeric                  | YES      | —                                                          |
| 51  | `clinic_longitude`               | numeric                  | YES      | —                                                          |
| 52  | `average_rating`                 | numeric                  | YES      | 0.00                                                       |
| 53  | `total_reviews`                  | integer                  | YES      | 0                                                          |
| 54  | `has_liability_insurance`        | boolean                  | YES      | false                                                      |
| 55  | `treatment_exchange_opt_in`      | boolean                  | YES      | false                                                      |
| 56  | `booking_slug`                   | character varying        | YES      | —                                                          |
| 57  | `clinic_image_url`               | text                     | YES      | —                                                          |
| 58  | `therapist_type`                 | USER-DEFINED             | YES      | 'clinic_based'::therapist_type                             |
| 59  | `base_address`                   | text                     | YES      | —                                                          |
| 60  | `base_latitude`                  | numeric                  | YES      | —                                                          |
| 61  | `base_longitude`                 | numeric                  | YES      | —                                                          |
| 62  | `mobile_service_radius_km`       | integer                  | YES      | 25                                                         |
| 63  | `address_line1`                  | character varying        | YES      | —                                                          |
| 64  | `address_line2`                  | character varying        | YES      | —                                                          |
| 65  | `address_city`                   | character varying        | YES      | —                                                          |
| 66  | `address_county`                 | character varying        | YES      | —                                                          |
| 67  | `address_postcode`               | character varying        | YES      | —                                                          |
| 68  | `address_country`                | character varying        | YES      | 'GB'::character varying                                    |
| 69  | `monthly_earnings_goal`          | numeric                  | YES      | —                                                          |

## `v_client_stats`

| #   | Column          | Type             | Nullable | Default |
| --- | --------------- | ---------------- | -------- | ------- |
| 1   | `client_id`     | uuid             | YES      | —       |
| 2   | `full_name`     | text             | YES      | —       |
| 3   | `paid_sessions` | bigint           | YES      | —       |
| 4   | `revenue_cents` | bigint           | YES      | —       |
| 5   | `avg_rating`    | double precision | YES      | —       |
| 6   | `is_active`     | boolean          | YES      | —       |

## `v_paid_sessions`

| #   | Column         | Type    | Nullable | Default |
| --- | -------------- | ------- | -------- | ------- |
| 1   | `session_id`   | uuid    | YES      | —       |
| 2   | `client_id`    | uuid    | YES      | —       |
| 3   | `session_date` | date    | YES      | —       |
| 4   | `amount_cents` | integer | YES      | —       |
| 5   | `currency`     | text    | YES      | —       |

## `v_practice_totals`

| #   | Column                | Type             | Nullable | Default |
| --- | --------------------- | ---------------- | -------- | ------- |
| 1   | `total_clients`       | bigint           | YES      | —       |
| 2   | `active_clients`      | bigint           | YES      | —       |
| 3   | `total_paid_sessions` | bigint           | YES      | —       |
| 4   | `total_revenue_cents` | bigint           | YES      | —       |
| 5   | `avg_rating`          | double precision | YES      | —       |

## `webhook_events`

| #   | Column             | Type                     | Nullable | Default           |
| --- | ------------------ | ------------------------ | -------- | ----------------- |
| 1   | `id`               | uuid                     | NO       | gen_random_uuid() |
| 2   | `stripe_event_id`  | text                     | NO       | —                 |
| 3   | `event_type`       | text                     | NO       | —                 |
| 4   | `event_data`       | jsonb                    | NO       | —                 |
| 5   | `processed`        | boolean                  | YES      | false             |
| 6   | `processing_error` | text                     | YES      | —                 |
| 7   | `created_at`       | timestamp with time zone | YES      | now()             |
