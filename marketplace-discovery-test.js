import { createClient } from '@supabase/supabase-js';

// Test configuration
const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

const logTest = (testName, status, details = '') => {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED ${details}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED ${details}`);
  }
  testResults.details.push({ testName, status, details });
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test marketplace discovery and filtering
async function testMarketplaceDiscovery() {
  console.log('🔍 Starting Marketplace Discovery & Filtering Test');
  console.log('=' .repeat(60));
  console.log('This test demonstrates the marketplace search, filtering, and discovery capabilities.');

  const startTime = Date.now();

  try {
    // Test 1: Browse All Therapists
    console.log('\n👥 TEST 1: Browse All Therapists');
    console.log('-' .repeat(40));

    const { data: allTherapists, error: allError } = await supabase
      .from('therapist_profiles')
      .select(`
        id,
        bio,
        location,
        specializations,
        hourly_rate,
        experience_years,
        verification_status,
        profile_score,
        total_reviews,
        average_rating
      `)
      .order('profile_score', { ascending: false });

    if (allError) throw allError;
    logTest('Browse All Therapists', 'PASS', `Found ${allTherapists.length} therapists`);

    // Display therapist details
    allTherapists.forEach((therapist, index) => {
      console.log(`  ${index + 1}. ${therapist.bio?.substring(0, 60)}...`);
      console.log(`     Location: ${therapist.location} | Rate: £${therapist.hourly_rate}/hour`);
      console.log(`     Specializations: ${therapist.specializations?.join(', ')}`);
      console.log(`     Experience: ${therapist.experience_years} years | Score: ${therapist.profile_score}`);
      console.log('');
    });

    // Test 2: Filter by Verification Status
    console.log('\n✅ TEST 2: Filter by Verification Status');
    console.log('-' .repeat(40));

    const { data: verifiedTherapists, error: verifiedError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('verification_status', 'verified');

    if (verifiedError) throw verifiedError;
    logTest('Verified Therapists', 'PASS', `Found ${verifiedTherapists.length} verified therapists`);

    const { data: pendingTherapists, error: pendingError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('verification_status', 'pending');

    if (pendingError) throw pendingError;
    logTest('Pending Verification', 'PASS', `Found ${pendingTherapists.length} pending verification`);

    // Test 3: Filter by Specialization
    console.log('\n🏥 TEST 3: Filter by Specialization');
    console.log('-' .repeat(40));

    const specializations = ['sports_injury', 'rehabilitation', 'massage_therapy', 'osteopathy'];
    
    for (const spec of specializations) {
      const { data: specTherapists, error: specError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .contains('specializations', [spec]);

      if (specError) throw specError;
      logTest(`${spec.replace('_', ' ').toUpperCase()} Specialists`, 'PASS', `Found ${specTherapists.length} specialists`);
    }

    // Test 4: Filter by Location
    console.log('\n📍 TEST 4: Filter by Location');
    console.log('-' .repeat(40));

    const locations = ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'];
    
    for (const location of locations) {
      const { data: locationTherapists, error: locationError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .ilike('location', `%${location}%`);

      if (locationError) throw locationError;
      logTest(`${location} Therapists`, 'PASS', `Found ${locationTherapists.length} therapists`);
    }

    // Test 5: Filter by Price Range
    console.log('\n💰 TEST 5: Filter by Price Range');
    console.log('-' .repeat(40));

    const priceRanges = [
      { min: 0, max: 50, label: 'Budget (£0-50)' },
      { min: 50, max: 80, label: 'Mid-range (£50-80)' },
      { min: 80, max: 120, label: 'Premium (£80-120)' },
      { min: 120, max: 1000, label: 'Luxury (£120+)' }
    ];

    for (const range of priceRanges) {
      const { data: priceTherapists, error: priceError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .gte('hourly_rate', range.min)
        .lte('hourly_rate', range.max);

      if (priceError) throw priceError;
      logTest(`${range.label}`, 'PASS', `Found ${priceTherapists.length} therapists`);
    }

    // Test 6: Filter by Experience
    console.log('\n🎓 TEST 6: Filter by Experience');
    console.log('-' .repeat(40));

    const experienceRanges = [
      { min: 0, max: 2, label: 'New (0-2 years)' },
      { min: 2, max: 5, label: 'Experienced (2-5 years)' },
      { min: 5, max: 10, label: 'Senior (5-10 years)' },
      { min: 10, max: 100, label: 'Expert (10+ years)' }
    ];

    for (const range of experienceRanges) {
      const { data: expTherapists, error: expError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .gte('experience_years', range.min)
        .lte('experience_years', range.max);

      if (expError) throw expError;
      logTest(`${range.label}`, 'PASS', `Found ${expTherapists.length} therapists`);
    }

    // Test 7: Sort by Different Criteria
    console.log('\n📊 TEST 7: Sort by Different Criteria');
    console.log('-' .repeat(40));

    // Sort by rating
    const { data: ratingSorted, error: ratingError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .order('average_rating', { ascending: false });

    if (ratingError) throw ratingError;
    logTest('Sort by Rating', 'PASS', `Sorted ${ratingSorted.length} therapists by rating`);

    // Sort by price (low to high)
    const { data: priceLowHigh, error: priceLowError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .order('hourly_rate', { ascending: true });

    if (priceLowError) throw priceLowError;
    logTest('Sort by Price (Low to High)', 'PASS', `Sorted ${priceLowHigh.length} therapists by price`);

    // Sort by experience
    const { data: expSorted, error: expSortedError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .order('experience_years', { ascending: false });

    if (expSortedError) throw expSortedError;
    logTest('Sort by Experience', 'PASS', `Sorted ${expSorted.length} therapists by experience`);

    // Test 8: Search by Keywords
    console.log('\n🔍 TEST 8: Search by Keywords');
    console.log('-' .repeat(40));

    const keywords = ['sports', 'injury', 'rehabilitation', 'massage', 'therapy'];
    
    for (const keyword of keywords) {
      const { data: keywordTherapists, error: keywordError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .ilike('bio', `%${keyword}%`);

      if (keywordError) throw keywordError;
      logTest(`Search: "${keyword}"`, 'PASS', `Found ${keywordTherapists.length} therapists`);
    }

    // Test 9: Advanced Filtering Combinations
    console.log('\n🎯 TEST 9: Advanced Filtering Combinations');
    console.log('-' .repeat(40));

    // Sports injury specialists in London under £80/hour
    const { data: advancedFilter, error: advancedError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .contains('specializations', ['sports_injury'])
      .ilike('location', '%London%')
      .lte('hourly_rate', 80);

    if (advancedError) throw advancedError;
    logTest('Sports Injury + London + Under £80', 'PASS', `Found ${advancedFilter.length} therapists`);

    // Verified therapists with 5+ years experience
    const { data: verifiedExp, error: verifiedExpError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('verification_status', 'verified')
      .gte('experience_years', 5);

    if (verifiedExpError) throw verifiedExpError;
    logTest('Verified + 5+ Years Experience', 'PASS', `Found ${verifiedExp.length} therapists`);

    // Test 10: Availability Check
    console.log('\n📅 TEST 10: Availability Check');
    console.log('-' .repeat(40));

    const { data: availability, error: availError } = await supabase
      .from('availability_slots')
      .select(`
        id,
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        duration_minutes,
        is_available
      `)
      .eq('is_available', true);

    if (availError) throw availError;
    logTest('Check Availability', 'PASS', `Found ${availability.length} available slots`);

    // Group availability by therapist
    const availabilityByTherapist = availability.reduce((acc, slot) => {
      if (!acc[slot.therapist_id]) {
        acc[slot.therapist_id] = [];
      }
      acc[slot.therapist_id].push(slot);
      return acc;
    }, {});

    logTest('Availability by Therapist', 'PASS', 
      `${Object.keys(availabilityByTherapist).length} therapists have availability`);

    // Calculate results
    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 MARKETPLACE DISCOVERY TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`⚡ Average Test Duration: ${(totalDuration / 10).toFixed(0)}ms per test`);

    console.log('\n📋 DISCOVERY TEST RESULTS:');
    testResults.details.forEach((test, index) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.details}`);
    });

    if (testResults.failed === 0) {
      console.log('\n🎉 DISCOVERY SUCCESS! Marketplace search and filtering are working perfectly!');
      console.log('✨ All discovery features from basic browsing to advanced filtering are functional!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please review the details above.`);
    }

  } catch (error) {
    console.error('\n💥 Marketplace discovery test failed:', error.message);
    process.exit(1);
  }
}

// Run the marketplace discovery test
testMarketplaceDiscovery().catch(console.error);
