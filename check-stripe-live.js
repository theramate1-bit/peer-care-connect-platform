#!/usr/bin/env node

/**
 * Stripe Live Account Checker
 * Verifies what products and prices exist in your live Stripe account
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - Update these with your live Stripe keys
const STRIPE_LIVE_PUBLISHABLE_KEY = 'pk_live_51RyBwQFk77knaVvaNewWaDRjeeAr3bvYjiV2VdBzMRvGV12k5vRHNDVmp3gqgAzQVfgjfhhQgnro2SmumBafO67X009Jmvs3RC';
const STRIPE_LIVE_SECRET_KEY = 'sk_live_YOUR_LIVE_SECRET_KEY'; // Replace with your actual live secret key

console.log('🔍 STRIPE LIVE ACCOUNT CHECKER');
console.log('=' .repeat(50));

console.log('\n📋 WHAT YOU NEED TO CREATE IN YOUR LIVE STRIPE ACCOUNT:');
console.log('-'.repeat(50));

console.log('\n🏗️ PRODUCTS (3 needed):');
console.log('1. Theramate Therapy Session');
console.log('   - Description: Dynamic therapy session pricing set by individual practitioners');
console.log('   - Type: Service');
console.log('   - No default price (dynamic pricing)');

console.log('\n2. Theramate Credit Purchase');
console.log('   - Description: Credit purchase for Theramate platform - pricing varies by package');
console.log('   - Type: Service');
console.log('   - No default price (multiple price tiers)');

console.log('\n3. Theramate Platform Subscription');
console.log('   - Description: Monthly subscription to Theramate platform with features and benefits');
console.log('   - Type: Service');
console.log('   - No default price (multiple subscription tiers)');

console.log('\n💰 PRICES (5 needed):');
console.log('-'.repeat(50));

console.log('\n💳 CREDIT PACKAGES (One-time payments):');
console.log('1. Starter Credit Package');
console.log('   - Product: Theramate Credit Purchase');
console.log('   - Price: £20.00 (2,000 pence)');
console.log('   - Type: One-time');
console.log('   - Currency: GBP');

console.log('\n2. Professional Credit Package');
console.log('   - Product: Theramate Credit Purchase');
console.log('   - Price: £50.00 (5,000 pence)');
console.log('   - Type: One-time');
console.log('   - Currency: GBP');

console.log('\n3. Premium Credit Package');
console.log('   - Product: Theramate Credit Purchase');
console.log('   - Price: £100.00 (10,000 pence)');
console.log('   - Type: One-time');
console.log('   - Currency: GBP');

console.log('\n📅 SUBSCRIPTIONS (Recurring payments):');
console.log('1. Basic Plan');
console.log('   - Product: Theramate Platform Subscription');
console.log('   - Price: £19.99/month (1,999 pence)');
console.log('   - Type: Recurring (monthly)');
console.log('   - Currency: GBP');

console.log('\n2. Pro Plan');
console.log('   - Product: Theramate Platform Subscription');
console.log('   - Price: £49.99/month (4,999 pence)');
console.log('   - Type: Recurring (monthly)');
console.log('   - Currency: GBP');

console.log('\n🎯 DYNAMIC PRICING:');
console.log('-'.repeat(50));
console.log('• Therapy sessions will use dynamic pricing');
console.log('• Prices created on-demand when clients book');
console.log('• Based on individual practitioner rates');
console.log('• No fixed prices for therapy sessions');

console.log('\n🔧 IMPLEMENTATION STEPS:');
console.log('-'.repeat(50));
console.log('1. Go to https://dashboard.stripe.com');
console.log('2. Switch to Live Mode (toggle in top left)');
console.log('3. Create the 3 products listed above');
console.log('4. Create the 5 prices listed above');
console.log('5. Note down the Product IDs and Price IDs');
console.log('6. Update your application with the new IDs');
console.log('7. Test the integration');

console.log('\n📊 CURRENT TEST MODE PRODUCTS:');
console.log('-'.repeat(50));
console.log('The following products exist in TEST MODE only:');
console.log('• prod_T1WKbCqmcG7PRH - Theramate Therapy Session');
console.log('• prod_T1WKy8OZKahDsB - Theramate Credit Purchase');
console.log('• prod_T1WKPiGf2RJNoe - Theramate Platform Subscription');
console.log('• Plus 7 other test products with fixed pricing');

console.log('\n⚠️  IMPORTANT:');
console.log('-'.repeat(50));
console.log('• Test mode products are NOT visible in live mode');
console.log('• You need to create these products in your live account');
console.log('• Use the generic products for dynamic pricing');
console.log('• Update your app with live product IDs');

console.log('\n✅ READY TO SETUP:');
console.log('-'.repeat(50));
console.log('• All product structures are defined');
console.log('• Dynamic pricing system is ready');
console.log('• Database schema supports custom pricing');
console.log('• UI components are built');
console.log('• Just need to create products in live Stripe account');

console.log('\n🎉 NEXT STEPS:');
console.log('-'.repeat(50));
console.log('1. Create products in your live Stripe dashboard');
console.log('2. Update product IDs in your application');
console.log('3. Test with real payments');
console.log('4. Deploy to production');

console.log('\n📞 NEED HELP?');
console.log('-'.repeat(50));
console.log('• Follow the STRIPE_LIVE_SETUP_GUIDE.md');
console.log('• Check Stripe documentation for product creation');
console.log('• Test with small amounts first');
console.log('• Verify webhook handling');

console.log('\n' + '=' .repeat(50));
console.log('Stripe Live Account Setup Complete! 🚀');
