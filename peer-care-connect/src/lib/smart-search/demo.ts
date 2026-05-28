/**
 * Smart Search Demo
 * Shows how the AI-powered practitioner matching works
 */

import { processUserInput, ConversationContext } from './matching-engine';

// Demo conversation flow
async function demonstrateSmartSearch() {
  console.log('🤖 Smart Search Demo - AI-Powered Practitioner Matching\n');

  // Initial context
  let context: ConversationContext = {
    symptoms: [],
    location: null,
    urgency: null,
    preferences: {},
    detectedConditions: [],
    conversationHistory: [],
    stage: 'greeting'
  };

  // Demo conversation
  const demoMessages = [
    "I have lower back pain",
    "It started about 2 weeks ago",
    "It gets worse when I sit for long periods",
    "I work at a desk all day",
    "I want to get back to playing tennis"
  ];

  for (const message of demoMessages) {
    console.log(`👤 User: "${message}"`);
    
    try {
      const response = await processUserInput(message, context);
      context = response.updatedContext;
      
      console.log(`🤖 Assistant: "${response.message}"`);
      
      if (response.suggestions && response.suggestions.length > 0) {
        console.log(`💡 Suggestions: ${response.suggestions.join(', ')}`);
      }
      
      if (response.recommendations && response.recommendations.length > 0) {
        console.log(`🎯 Recommendations:`);
        response.recommendations.forEach((rec, idx) => {
          console.log(`   ${idx + 1}. ${rec.practitioner.first_name} ${rec.practitioner.last_name} (${rec.matchScore}% match)`);
          console.log(`      Reasons: ${rec.reasons.join(', ')}`);
          console.log(`      Suggested Service: ${rec.suggestedService}`);
        });
      }
      
      console.log(`📊 Context: Stage=${context.stage}, Symptoms=${context.symptoms.length}, Conditions=${context.detectedConditions.length}\n`);
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  console.log('✅ Demo completed! The system successfully:');
  console.log('   • Extracted symptoms from natural language');
  console.log('   • Matched conditions to practitioner types');
  console.log('   • Generated contextual recommendations');
  console.log('   • Maintained conversation flow');
}

// Example usage patterns
export const exampleConversations = {
  sportsInjury: [
    "I injured my knee playing football",
    "It happened last weekend",
    "I can't bend it properly",
    "I need to get back to training soon"
  ],
  
  stressRelief: [
    "I'm really stressed at work",
    "My shoulders are always tense",
    "I have trouble sleeping",
    "I need something relaxing"
  ],
  
  chronicPain: [
    "I've had neck pain for months",
    "It's getting worse",
    "I've tried physio but it didn't help",
    "I need a different approach"
  ],
  
  pregnancy: [
    "I'm pregnant and my back hurts",
    "I'm in my second trimester",
    "It's hard to sleep comfortably",
    "I need gentle treatment"
  ],
  
  computerWork: [
    "I work at a computer all day",
    "My wrists and shoulders hurt",
    "I have headaches",
    "I need help with my posture"
  ],
  
  elderlyCare: [
    "I'm getting older and everything aches",
    "I have joint stiffness",
    "I want to stay mobile",
    "I need gentle treatment"
  ],
  
  headaches: [
    "I have frequent headaches",
    "They're worse in the morning",
    "My neck feels tight",
    "I need relief"
  ],
  
  hipPain: [
    "My hip hurts when I walk",
    "I can't sleep on my side",
    "It's been going on for weeks",
    "I need help"
  ],
  
  footProblems: [
    "I have heel pain",
    "It's worse in the morning",
    "I can barely walk",
    "I think it's plantar fasciitis"
  ],
  
  // 2025 Forum-style conversations
  deskWorkerSyndrome: [
    "I work from home and my back is killing me",
    "I can't sit at my desk anymore",
    "I've tried everything but nothing helps",
    "I need help with my setup"
  ],
  
  gymInjuries: [
    "I hurt myself at the gym",
    "I can't lift properly anymore",
    "I think my form is off",
    "I need help getting back to training"
  ],
  
  parentBackPain: [
    "I'm a parent and my back is destroyed",
    "I can't lift my kids anymore",
    "I wake up in pain every morning",
    "I need help with lifting technique"
  ],
  
  studentNeckPain: [
    "I'm a student with neck pain",
    "I think it's from studying all day",
    "I have text neck from my phone",
    "I need help with my posture"
  ],
  
  weekendWarrior: [
    "I'm a weekend warrior with injuries",
    "I hurt myself hiking last weekend",
    "I can't do my usual activities",
    "I need help getting back to hiking"
  ],
  
  pregnancyPain: [
    "I'm pregnant and my back hurts",
    "I can't sleep comfortably",
    "I need gentle treatment",
    "I'm worried about the baby"
  ],
  
  postpartumRecovery: [
    "I'm a new mom with back pain",
    "I had a baby 3 months ago",
    "I can't lift anything",
    "I need help with my recovery"
  ],
  
  menopausePain: [
    "I have menopause joint pain",
    "I'm going through menopause",
    "Everything hurts",
    "I need help managing these symptoms"
  ],
  
  tennisElbow: [
    "I have tennis elbow",
    "I can't grip anything",
    "I've tried everything",
    "I need help with my elbow"
  ],
  
  cyclingPain: [
    "I have cycling pain",
    "My bike fit is off",
    "I can't ride comfortably",
    "I need help with my setup"
  ],
  
  yogaInjuries: [
    "I hurt myself doing yoga",
    "I think I overstretched",
    "I can't do poses anymore",
    "I need help with my practice"
  ],
  
  swimmingInjuries: [
    "I have swimming shoulder pain",
    "I think it's my technique",
    "I can't swim without pain",
    "I need help with my form"
  ],
  
  martialArtsInjuries: [
    "I hurt myself doing martial arts",
    "I think it's from sparring",
    "I can't train properly",
    "I need help with my technique"
  ],
  
  danceInjuries: [
    "I hurt myself dancing",
    "I think it's from overuse",
    "I can't perform anymore",
    "I need help with my technique"
  ],
  
  gardeningInjuries: [
    "I hurt myself gardening",
    "I think it's from lifting",
    "I can't garden anymore",
    "I need help with my technique"
  ],
  
  drivingPain: [
    "I have driving pain",
    "I commute 2 hours a day",
    "I can't sit in the car",
    "I need help with my posture"
  ],
  
  sleepPositionPain: [
    "I wake up with pain every morning",
    "I think it's my sleeping position",
    "I can't sleep comfortably",
    "I need help with my setup"
  ],
  
  // Reddit-style desperate posts
  desperateSeekingHelp: [
    "I'm going crazy with all these symptoms",
    "I've been to doctors but they don't know what's wrong",
    "I can't take it anymore",
    "I need someone who actually understands"
  ],
  
  overwhelmedParent: [
    "I'm a parent and I'm completely overwhelmed",
    "I have no energy and I'm always in pain",
    "I can't lift my kids",
    "I need help getting my life back"
  ],
  
  workBurnout: [
    "I'm burned out from work",
    "I have constant back pain from sitting",
    "I can't work from home anymore",
    "I need help with my setup"
  ],
  
  athleteInjury: [
    "I'm an athlete and I'm injured",
    "I can't compete anymore",
    "I've tried everything",
    "I need help getting back to my sport"
  ],
  
  elderlyCare: [
    "I'm getting older and everything aches",
    "I have joint stiffness",
    "I want to stay mobile",
    "I need gentle treatment"
  ],
  
  // X/Twitter-style quick posts
  quickPainPosts: [
    "My back is killing me from sitting all day",
    "I hurt myself at the gym again",
    "I can't sleep because of neck pain",
    "I need help with my posture"
  ],
  
  // TikTok-style health concerns
  socialMediaHealth: [
    "I saw this on TikTok about back pain",
    "Everyone on social media has this issue",
    "I think I have what I saw online",
    "I need help with this trend"
  ]
};

// Run demo if this file is executed directly
if (typeof window === 'undefined') {
  demonstrateSmartSearch().catch(console.error);
}
