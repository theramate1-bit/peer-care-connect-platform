// Fix Practitioner Pricing Database
// This script will update the database to remove the Basic Practitioner Plan

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase key');
  console.error('Please set VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPractitionerPricing() {
  try {
    console.log('🔧 FIXING PRACTITIONER PRICING IN DATABASE...');
    console.log('Removing Basic Practitioner Plan, keeping Professional and Premium\n');

    // 1. Check current plans
    console.log('📋 Current practitioner subscription plans:');
    const { data: currentPlans, error: fetchError } = await supabase
      .from('practitioner_subscription_plans')
      .select('*')
      .order('monthly_fee', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching plans:', fetchError);
      return;
    }

    console.log(`Found ${currentPlans.length} plans:`);
    currentPlans.forEach(plan => {
      console.log(`- ${plan.plan_name} (${plan.plan_tier}): £${plan.monthly_fee}/month - Active: ${plan.is_active}`);
    });

    // 2. Deactivate Basic Practitioner Plan
    console.log('\n🗑️ Deactivating Basic Practitioner Plan...');
    const { error: deactivateError } = await supabase
      .from('practitioner_subscription_plans')
      .update({ is_active: false })
      .eq('plan_tier', 'basic')
      .eq('plan_name', 'Basic Practitioner Plan');

    if (deactivateError) {
      console.error('❌ Error deactivating Basic plan:', deactivateError);
      return;
    }
    console.log('✅ Basic Practitioner Plan deactivated');

    // 3. Update Professional Plan with new Stripe IDs
    console.log('\n🔄 Updating Professional Practitioner Plan...');
    const { error: updateProfessionalError } = await supabase
      .from('practitioner_subscription_plans')
      .update({
        stripe_product_id: 'prod_T3lh86M0PSoksn',
        stripe_price_id: 'price_1S7eAKFk77knaVvaWcHSypjx',
        updated_at: new Date().toISOString()
      })
      .eq('plan_tier', 'professional')
      .eq('plan_name', 'Professional Practitioner Plan');

    if (updateProfessionalError) {
      console.error('❌ Error updating Professional plan:', updateProfessionalError);
      return;
    }
    console.log('✅ Professional Practitioner Plan updated');

    // 4. Update Premium Plan with new Stripe IDs
    console.log('\n🔄 Updating Premium Practitioner Plan...');
    const { error: updatePremiumError } = await supabase
      .from('practitioner_subscription_plans')
      .update({
        stripe_product_id: 'prod_T3lh9cQHjenztM',
        stripe_price_id: 'price_1S7eANFk77knaVva8L3m7l2Y',
        updated_at: new Date().toISOString()
      })
      .eq('plan_tier', 'premium')
      .eq('plan_name', 'Premium Practitioner Plan');

    if (updatePremiumError) {
      console.error('❌ Error updating Premium plan:', updatePremiumError);
      return;
    }
    console.log('✅ Premium Practitioner Plan updated');

    // 5. Verify the changes
    console.log('\n✅ VERIFICATION: Updated practitioner subscription plans');
    const { data: updatedPlans, error: verifyError } = await supabase
      .from('practitioner_subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_fee', { ascending: true });

    if (verifyError) {
      console.error('❌ Error verifying changes:', verifyError);
      return;
    }

    console.log(`\n📊 Active practitioner plans (${updatedPlans.length}):`);
    updatedPlans.forEach(plan => {
      console.log(`✅ ${plan.plan_name}: £${plan.monthly_fee}/month (${plan.marketplace_fee_percentage}% fee)`);
      console.log(`   Stripe Product ID: ${plan.stripe_product_id}`);
      console.log(`   Stripe Price ID: ${plan.stripe_price_id}`);
    });

    console.log('\n🎉 Practitioner pricing fixed successfully!');
    console.log('✅ Only Professional (£79.99) and Premium (£199.99) plans remain active');
    console.log('✅ Database updated with new Stripe product and price IDs');

  } catch (error) {
    console.error('❌ Error fixing practitioner pricing:', error.message);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixPractitionerPricing()
    .then(() => {
      console.log('\n🏁 Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixPractitionerPricing };