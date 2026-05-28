import { PractitionerGeocodingService } from '@/lib/practitioner-geocoding';

export async function populateExistingPractitioners() {
  console.log('🚀 Starting geocoding for existing practitioners...');
  
  try {
    const result = await PractitionerGeocodingService.updateAllPractitionerCoordinates();
    
    console.log(`\n📊 Results:`);
    console.log(`✅ Successfully geocoded: ${result.success} practitioners`);
    console.log(`❌ Failed: ${result.failed} practitioners`);
    
    if (result.results.length > 0) {
      console.log('\n📋 Detailed Results:');
      result.results.forEach(r => {
        console.log(`${r.success ? '✅' : '❌'} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('💥 Geocoding failed:', error);
    throw error;
  }
}
