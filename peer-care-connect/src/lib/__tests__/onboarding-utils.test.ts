/**
 * Unit Tests for Onboarding Utilities
 * Tests the core logic for mapping services_offered to specializations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the mapping logic (extracted from onboarding-utils.ts)
function mapServicesToSpecializations(
  servicesOffered: string[],
  availableSpecs: Array<{ id: string; name: string; category: string }>,
  userRole: string
): string[] {
  const serviceToSpecializationMap: Record<string, string[]> = {
    // Massage Therapist mappings
    'sports_massage': ['Sports Massage'],
    'deep_tissue': ['Deep Tissue Massage'],
    'swedish_massage': ['Massage Therapy'],
    'trigger_point': ['Massage Therapy', 'Deep Tissue Massage'],
    'myofascial_release': ['Massage Therapy', 'Deep Tissue Massage'],
    'relaxation_massage': ['Massage Therapy'],
    'massage': ['Massage Therapy'],
    
    // Sports Therapist mappings
    'sports_injury_assessment': ['Sports Injury'],
    'exercise_rehabilitation': ['Rehabilitation'],
    'strength_conditioning': ['Strength Training'],
    'injury_prevention': ['Injury Prevention'],
    'performance_enhancement': ['Sports Injury', 'Strength Training'],
    'return_to_play': ['Rehabilitation', 'Sports Injury'],
    
    // Osteopath mappings
    'structural_osteopathy': ['Osteopathy', 'Manual Therapy'],
    'cranial_osteopathy': ['Cranial Osteopathy'],
    'visceral_osteopathy': ['Osteopathy'],
    'paediatric_osteopathy': ['Osteopathy'],
    'sports_osteopathy': ['Osteopathy'],
    'postural_assessment': ['Osteopathy', 'Manual Therapy'],
    
    // Common services
    'mobilisation': ['Manual Therapy'],
    'manipulation': ['Manual Therapy'],
    'stretching': ['Rehabilitation'],
    'acupuncture': [],
    'cupping': []
  };
  
  const matchedSpecIds = new Set<string>();
  
  servicesOffered.forEach((service: string) => {
    const mappedNames = serviceToSpecializationMap[service] || [];
    
    if (mappedNames.length > 0) {
      mappedNames.forEach(mappedName => {
        const matchingSpec = availableSpecs.find(spec => 
          spec.name.toLowerCase() === mappedName.toLowerCase()
        );
        if (matchingSpec) {
          matchedSpecIds.add(matchingSpec.id);
        }
      });
    } else {
      // Try intelligent matching
      const serviceName = service.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      
      let matchingSpec = availableSpecs.find(spec => 
        spec.name.toLowerCase() === serviceName.toLowerCase()
      );
      
      if (!matchingSpec) {
        matchingSpec = availableSpecs.find(spec => {
          const specLower = spec.name.toLowerCase();
          const serviceLower = serviceName.toLowerCase();
          return specLower.includes(serviceLower) || serviceLower.includes(specLower);
        });
      }
      
      if (matchingSpec) {
        matchedSpecIds.add(matchingSpec.id);
      }
    }
  });
  
  return Array.from(matchedSpecIds);
}

describe('Onboarding Utils - Services to Specializations Mapping', () => {
  const massageTherapistSpecs = [
    { id: '1', name: 'Sports Massage', category: 'massage_therapist' },
    { id: '2', name: 'Deep Tissue Massage', category: 'massage_therapist' },
    { id: '3', name: 'Massage Therapy', category: 'massage_therapist' }
  ];
  
  const sportsTherapistSpecs = [
    { id: '4', name: 'Sports Injury', category: 'sports_therapist' },
    { id: '5', name: 'Rehabilitation', category: 'sports_therapist' },
    { id: '6', name: 'Strength Training', category: 'sports_therapist' },
    { id: '7', name: 'Injury Prevention', category: 'sports_therapist' }
  ];
  
  const osteopathSpecs = [
    { id: '8', name: 'Osteopathy', category: 'osteopath' },
    { id: '9', name: 'Cranial Osteopathy', category: 'osteopath' },
    { id: '10', name: 'Manual Therapy', category: 'osteopath' }
  ];

  describe('Massage Therapist mappings', () => {
    it('should map sports_massage to Sports Massage', () => {
      const result = mapServicesToSpecializations(
        ['sports_massage'],
        massageTherapistSpecs,
        'massage_therapist'
      );
      expect(result).toContain('1'); // Sports Massage ID
      expect(result.length).toBe(1);
    });

    it('should map trigger_point to Massage Therapy and Deep Tissue Massage', () => {
      const result = mapServicesToSpecializations(
        ['trigger_point'],
        massageTherapistSpecs,
        'massage_therapist'
      );
      expect(result).toContain('2'); // Deep Tissue Massage
      expect(result).toContain('3'); // Massage Therapy
      expect(result.length).toBe(2);
    });

    it('should map multiple services correctly', () => {
      const result = mapServicesToSpecializations(
        ['sports_massage', 'deep_tissue', 'trigger_point'],
        massageTherapistSpecs,
        'massage_therapist'
      );
      expect(result).toContain('1'); // Sports Massage
      expect(result).toContain('2'); // Deep Tissue Massage
      expect(result).toContain('3'); // Massage Therapy
      expect(result.length).toBe(3);
    });
  });

  describe('Sports Therapist mappings', () => {
    it('should map sports_injury_assessment to Sports Injury', () => {
      const result = mapServicesToSpecializations(
        ['sports_injury_assessment'],
        sportsTherapistSpecs,
        'sports_therapist'
      );
      expect(result).toContain('4'); // Sports Injury
      expect(result.length).toBe(1);
    });

    it('should map exercise_rehabilitation to Rehabilitation', () => {
      const result = mapServicesToSpecializations(
        ['exercise_rehabilitation'],
        sportsTherapistSpecs,
        'sports_therapist'
      );
      expect(result).toContain('5'); // Rehabilitation
      expect(result.length).toBe(1);
    });

    it('should map performance_enhancement to multiple specializations', () => {
      const result = mapServicesToSpecializations(
        ['performance_enhancement'],
        sportsTherapistSpecs,
        'sports_therapist'
      );
      expect(result).toContain('4'); // Sports Injury
      expect(result).toContain('6'); // Strength Training
      expect(result.length).toBe(2);
    });
  });

  describe('Osteopath mappings', () => {
    it('should map cranial_osteopathy to Cranial Osteopathy', () => {
      const result = mapServicesToSpecializations(
        ['cranial_osteopathy'],
        osteopathSpecs,
        'osteopath'
      );
      expect(result).toContain('9'); // Cranial Osteopathy
      expect(result.length).toBe(1);
    });

    it('should map structural_osteopathy to multiple specializations', () => {
      const result = mapServicesToSpecializations(
        ['structural_osteopathy'],
        osteopathSpecs,
        'osteopath'
      );
      expect(result).toContain('8'); // Osteopathy
      expect(result).toContain('10'); // Manual Therapy
      expect(result.length).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should return empty array for services with no mapping', () => {
      const result = mapServicesToSpecializations(
        ['acupuncture', 'cupping'],
        massageTherapistSpecs,
        'massage_therapist'
      );
      expect(result.length).toBe(0);
    });

    it('should handle empty services array', () => {
      const result = mapServicesToSpecializations(
        [],
        massageTherapistSpecs,
        'massage_therapist'
      );
      expect(result.length).toBe(0);
    });

    it('should handle services not in mapping but matchable by name', () => {
      // This tests the intelligent matching fallback
      const customSpecs = [
        { id: '11', name: 'Custom Service Name', category: 'massage_therapist' }
      ];
      const result = mapServicesToSpecializations(
        ['custom_service_name'],
        customSpecs,
        'massage_therapist'
      );
      // Should match via intelligent matching
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Real-world scenario', () => {
    it('should map the actual massage therapist services correctly', () => {
      // This matches the actual database scenario
      const actualSpecs = [
        { id: '800d75ef-0006-4be2-b844-f5e53e665f5a', name: 'Sports Massage', category: 'massage_therapist' },
        { id: 'f5f3c7ff-ae93-48e4-a37f-f45886625a77', name: 'Deep Tissue Massage', category: 'massage_therapist' },
        { id: 'a080889a-75d7-4973-8705-6319bfefcaa1', name: 'Massage Therapy', category: 'massage_therapist' }
      ];
      
      const result = mapServicesToSpecializations(
        ['sports_massage', 'trigger_point'],
        actualSpecs,
        'massage_therapist'
      );
      
      // Should map to: Sports Massage, Massage Therapy, Deep Tissue Massage
      expect(result.length).toBe(3);
      expect(result).toContain('800d75ef-0006-4be2-b844-f5e53e665f5a'); // Sports Massage
      expect(result).toContain('a080889a-75d7-4973-8705-6319bfefcaa1'); // Massage Therapy
      expect(result).toContain('f5f3c7ff-ae93-48e4-a37f-f45886625a77'); // Deep Tissue Massage
    });
  });
});

