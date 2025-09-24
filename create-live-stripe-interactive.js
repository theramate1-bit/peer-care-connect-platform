#!/usr/bin/env node

/**
 * Interactive Stripe Live Products Creator
 * Prompts for your live Stripe secret key and creates all products
 */

import Stripe from 'stripe';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createLiveProducts() {
  console.log('🚀 STRIPE LIVE PRODUCTS CREATOR');
  console.log('=' .repeat(50));
  console.log('This script will create all necessary products in your LIVE Stripe account.');
  console.log('');

  // Get live secret key
  const secretKey = await askQuestion('Enter your LIVE Stripe secret key (sk_live_...): ');
  
  if (!secretKey.startsWith('sk_live_')) {
    console.log('❌ Error: Secret key must start with "sk_live_"');
    process.exit(1);
  }

  console.log('\n🔑 Using secret key:', secretKey.substring(0, 20) + '...');
  console.log('');

  // Initialize Stripe
  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-06-20',
  });

  try {
    console.log('🏗️ CREATING PRODUCTS...');
    console.log('-'.repeat(40));

    // 1. Create Theramate Therapy Session Product
    console.log('Creating: Theramate Therapy Session...');
    const therapySession = await stripe.products.create({
      name: 'Theramate Therapy Session',
      description: 'Dynamic therapy session pricing set by individual practitioners',
      type: 'service',
      active: true,
      metadata: {
        product_type: 'therapy_session',
        dynamic_pricing: 'true'
      }
    });
    console.log(`✅ Created: ${therapySession.id}`);

    // 2. Create Theramate Credit Purchase Product
    console.log('Creating: Theramate Credit Purchase...');
    const creditPurchase = await stripe.products.create({
      name: 'Theramate Credit Purchase',
      description: 'Credit purchase for Theramate platform - pricing varies by package',
      type: 'service',
      active: true,
      metadata: {
        product_type: 'credit_purchase',
        dynamic_pricing: 'false'
      }
    });
    console.log(`✅ Created: ${creditPurchase.id}`);

    // 3. Create Theramate Platform Subscription Product
    console.log('Creating: Theramate Platform Subscription...');
    const platformSubscription = await stripe.products.create({
      name: 'Theramate Platform Subscription',
      description: 'Monthly subscription to Theramate platform with features and benefits',
      type: 'service',
      active: true,
      metadata: {
        product_type: 'platform_subscription',
        dynamic_pricing: 'false'
      }
    });
    console.log(`✅ Created: ${platformSubscription.id}`);

    console.log('\n💰 CREATING PRICES...');
    console.log('-'.repeat(40));

    // Credit Package Prices
    console.log('Creating: Credit Package Prices...');
    
    // Starter Credit Package
    const starterPrice = await stripe.prices.create({
      product: creditPurchase.id,
      unit_amount: 2000, // £20.00
      currency: 'gbp',
      metadata: {
        package_type: 'starter',
        credits: '20',
        discount_percentage: '0'
      }
    });
    console.log(`✅ Starter Package: ${starterPrice.id} - £20.00 (20 credits)`);

    // Professional Credit Package
    const professionalPrice = await stripe.prices.create({
      product: creditPurchase.id,
      unit_amount: 5000, // £50.00
      currency: 'gbp',
      metadata: {
        package_type: 'professional',
        credits: '60',
        discount_percentage: '17'
      }
    });
    console.log(`✅ Professional Package: ${professionalPrice.id} - £50.00 (60 credits)`);

    // Premium Credit Package
    const premiumPrice = await stripe.prices.create({
      product: creditPurchase.id,
      unit_amount: 10000, // £100.00
      currency: 'gbp',
      metadata: {
        package_type: 'premium',
        credits: '150',
        discount_percentage: '33'
      }
    });
    console.log(`✅ Premium Package: ${premiumPrice.id} - £100.00 (150 credits)`);

    // Subscription Prices
    console.log('Creating: Subscription Prices...');
    
    // Basic Plan
    const basicPrice = await stripe.prices.create({
      product: platformSubscription.id,
      unit_amount: 1999, // £19.99
      currency: 'gbp',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'basic',
        credits_included: '2',
        features: 'basic_access'
      }
    });
    console.log(`✅ Basic Plan: ${basicPrice.id} - £19.99/month (2 credits)`);

    // Pro Plan
    const proPrice = await stripe.prices.create({
      product: platformSubscription.id,
      unit_amount: 4999, // £49.99
      currency: 'gbp',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan_type: 'pro',
        credits_included: '6',
        features: 'full_access'
      }
    });
    console.log(`✅ Pro Plan: ${proPrice.id} - £49.99/month (6 credits)`);

    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(50));
    console.log('✅ Products Created: 3');
    console.log('✅ Prices Created: 5');
    console.log('✅ All in LIVE MODE');

    console.log('\n🔑 PRODUCT IDs FOR YOUR APP:');
    console.log('-'.repeat(40));
    console.log(`Therapy Session: ${therapySession.id}`);
    console.log(`Credit Purchase: ${creditPurchase.id}`);
    console.log(`Platform Subscription: ${platformSubscription.id}`);

    console.log('\n💰 PRICE IDs FOR YOUR APP:');
    console.log('-'.repeat(40));
    console.log(`Starter Package: ${starterPrice.id}`);
    console.log(`Professional Package: ${professionalPrice.id}`);
    console.log(`Premium Package: ${premiumPrice.id}`);
    console.log(`Basic Plan: ${basicPrice.id}`);
    console.log(`Pro Plan: ${proPrice.id}`);

    // Save to file
    const config = {
      products: {
        therapy_session: therapySession.id,
        credit_purchase: creditPurchase.id,
        platform_subscription: platformSubscription.id
      },
      prices: {
        starter_credit: starterPrice.id,
        professional_credit: professionalPrice.id,
        premium_credit: premiumPrice.id,
        basic_subscription: basicPrice.id,
        pro_subscription: proPrice.id
      },
      created_at: new Date().toISOString(),
      environment: 'live'
    };

    const fs = await import('fs');
    fs.writeFileSync('stripe-live-config.json', JSON.stringify(config, null, 2));
    console.log('\n💾 Configuration saved to: stripe-live-config.json');

    console.log('\n🎉 SUCCESS! All products created in live mode!');
    console.log('You can now see them in your Stripe dashboard at: https://dashboard.stripe.com');

  } catch (error) {
    console.error('\n❌ Error creating products:', error.message);
    
    if (error.code === 'api_key_invalid') {
      console.log('\n🔑 API Key Issue:');
      console.log('• Make sure you\'re using your LIVE secret key');
      console.log('• Key should start with: sk_live_');
    }
    
    if (error.code === 'authentication_required') {
      console.log('\n🔐 Authentication Issue:');
      console.log('• Check your Stripe account permissions');
      console.log('• Ensure the API key has product creation access');
    }
    
    throw error;
  } finally {
    rl.close();
  }
}

// Run the script
createLiveProducts()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 FAILED! Check the error messages above.');
    process.exit(1);
  });
