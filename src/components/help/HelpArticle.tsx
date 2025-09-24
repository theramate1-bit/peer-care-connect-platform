import { useState } from "react";
import { ArrowLeft, BookOpen, Clock, User, ArrowRight, FileText, Users, CreditCard, Shield, Settings, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface HelpArticleProps {
  articleId: string;
  onBack: () => void;
}

const HelpArticle = ({ articleId, onBack }: HelpArticleProps) => {
  const [currentArticle, setCurrentArticle] = useState(articleId);

  // Article database - in a real app, this would come from an API
  const articles = {
    "soap-notes-guide": {
      id: "soap-notes-guide",
      title: "Complete Guide to SOAP Notes for Healthcare Professionals",
      category: "Clinical Documentation",
      author: "TheraMate Team",
      readTime: "6 min read",
      lastUpdated: "December 15, 2024",
      difficulty: "Beginner",
      content: `
        <h2>What are SOAP Notes?</h2>
        <p>SOAP notes are a standardized method of documenting patient care in healthcare. The acronym stands for:</p>
        <ul>
          <li><strong>Subjective:</strong> What the patient tells you about their condition</li>
          <li><strong>Objective:</strong> What you observe during the examination</li>
          <li><strong>Assessment:</strong> Your professional opinion and diagnosis</li>
          <li><strong>Plan:</strong> What you plan to do for the patient</li>
        </ul>

        <h2>Creating Effective SOAP Notes</h2>
        <h3>1. Subjective Section</h3>
        <p>Document the patient's chief complaint, history of present illness, and relevant medical history. Use the patient's own words when possible.</p>
        <p><strong>Example:</strong> "Patient reports lower back pain for 3 days, rated 7/10, worse with movement, better with rest."</p>

        <h3>2. Objective Section</h3>
        <p>Record your physical examination findings, vital signs, and any diagnostic test results. Be specific and measurable.</p>
        <p><strong>Example:</strong> "Tenderness to palpation L4-L5, limited ROM in flexion (30°), positive straight leg raise test."</p>

        <h3>3. Assessment Section</h3>
        <p>Provide your clinical impression, differential diagnosis, and reasoning. This is where your expertise comes into play.</p>
        <p><strong>Example:</strong> "Acute mechanical low back pain, likely muscular strain vs. discogenic pain."</p>

        <h3>4. Plan Section</h3>
        <p>Outline your treatment plan, including interventions, medications, follow-up, and patient education.</p>
        <p><strong>Example:</strong> "Prescribe physical therapy 3x/week, NSAIDs PRN, follow-up in 2 weeks."</p>

        <h2>Best Practices</h2>
        <ul>
          <li>Write notes immediately after patient contact</li>
          <li>Use clear, concise language</li>
          <li>Include relevant negative findings</li>
          <li>Document patient education provided</li>
          <li>Use standardized terminology when possible</li>
        </ul>

        <h2>Common Mistakes to Avoid</h2>
        <ul>
          <li>Vague or subjective language in objective section</li>
          <li>Missing follow-up plans</li>
          <li>Incomplete patient history</li>
          <li>Lack of measurable outcomes</li>
        </ul>
      `,
      relatedArticles: ["soap-templates", "voice-to-text", "documentation-tips"]
    },
    "soap-templates": {
      id: "soap-templates",
      title: "Advanced SOAP Note Templates and Customization",
      category: "Clinical Documentation",
      author: "TheraMate Team",
      readTime: "8 min read",
      lastUpdated: "December 10, 2024",
      difficulty: "Advanced",
      content: `
        <h2>Creating Professional SOAP Note Templates</h2>
        <p>Custom SOAP note templates can significantly improve your documentation efficiency and consistency. Learn how to create templates that work for your specific practice needs.</p>

        <h2>Template Design Principles</h2>
        <h3>1. Specialty-Specific Content</h3>
        <p>Design templates that include relevant assessment tools and outcome measures for your specialty.</p>

        <h3>2. Structured Format</h3>
        <p>Use consistent formatting, checkboxes, and dropdown menus to streamline documentation.</p>

        <h3>3. Clinical Decision Support</h3>
        <p>Include prompts and reminders for important clinical considerations.</p>

        <h2>Template Categories</h2>
        <ul>
          <li>Initial Evaluation Templates</li>
          <li>Progress Note Templates</li>
          <li>Discharge Summary Templates</li>
          <li>Specialty-Specific Templates</li>
        </ul>

        <h2>Customization Features</h2>
        <ul>
          <li>Drag-and-drop form builder</li>
          <li>Conditional logic and branching</li>
          <li>Integration with outcome measures</li>
          <li>Voice-to-text compatibility</li>
        </ul>
      `,
      relatedArticles: ["soap-notes-guide", "voice-to-text", "documentation-tips"]
    },
    "voice-to-text": {
      id: "voice-to-text",
      title: "Voice-to-Text Technology: Revolutionizing Clinical Documentation",
      category: "Technology",
      author: "TheraMate Team",
      readTime: "6 min read",
      lastUpdated: "December 8, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Benefits of Voice-to-Text Technology</h2>
        <p>Voice-to-text technology can dramatically reduce the time spent on documentation while improving accuracy and completeness.</p>

        <h2>Implementation Strategies</h2>
        <h3>1. Choose the Right Platform</h3>
        <p>Select a platform that integrates with your EHR and offers medical terminology recognition.</p>

        <h3>2. Training and Practice</h3>
        <p>Invest time in training to improve accuracy and efficiency.</p>

        <h3>3. Quality Assurance</h3>
        <p>Implement review processes to ensure documentation quality.</p>

        <h2>Best Practices</h2>
        <ul>
          <li>Use clear, consistent speech patterns</li>
          <li>Review and edit transcribed text</li>
          <li>Maintain patient privacy during dictation</li>
          <li>Regular accuracy assessments</li>
        </ul>
      `,
      relatedArticles: ["soap-notes-guide", "soap-templates", "documentation-tips"]
    },
    "documentation-tips": {
      id: "documentation-tips",
      title: "Clinical Documentation Best Practices and Tips",
      category: "Clinical Documentation",
      author: "TheraMate Team",
      readTime: "5 min read",
      lastUpdated: "December 5, 2024",
      difficulty: "Beginner",
      content: `
        <h2>Essential Documentation Principles</h2>
        <p>Good documentation is the foundation of quality patient care and legal protection.</p>

        <h2>Key Documentation Standards</h2>
        <ul>
          <li>Timeliness - Document immediately after patient contact</li>
          <li>Accuracy - Use precise, objective language</li>
          <li>Completeness - Include all relevant information</li>
          <li>Legibility - Ensure clear, readable documentation</li>
        </ul>

        <h2>Common Documentation Pitfalls</h2>
        <ul>
          <li>Delayed documentation</li>
          <li>Vague or subjective language</li>
          <li>Missing signatures or dates</li>
          <li>Incomplete follow-up plans</li>
        </ul>
      `,
      relatedArticles: ["soap-notes-guide", "soap-templates", "voice-to-text"]
    },
    "hipaa-compliance": {
      id: "hipaa-compliance",
      title: "HIPAA Compliance Checklist for Therapy Practices",
      category: "Security & Compliance",
      author: "TheraMate Team",
      readTime: "8 min read",
      lastUpdated: "December 12, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Understanding HIPAA Requirements</h2>
        <p>The Health Insurance Portability and Accountability Act (HIPAA) sets the standard for protecting sensitive patient data. As a healthcare provider, you must ensure your practice meets all compliance requirements.</p>

        <h2>Administrative Safeguards</h2>
        <h3>1. Security Officer Designation</h3>
        <p>Designate a HIPAA Security Officer responsible for developing and implementing security policies.</p>

        <h3>2. Workforce Training</h3>
        <p>Provide regular training to all staff members on HIPAA requirements and your practice's policies.</p>

        <h3>3. Access Management</h3>
        <p>Implement procedures to authorize and supervise workforce access to patient information.</p>

        <h2>Physical Safeguards</h2>
        <h3>1. Facility Access Controls</h3>
        <p>Limit physical access to facilities where patient information is stored.</p>

        <h3>2. Workstation Security</h3>
        <p>Implement physical safeguards for all workstations that access patient information.</p>

        <h3>3. Device and Media Controls</h3>
        <p>Establish policies for the receipt and removal of hardware and electronic media.</p>

        <h2>Technical Safeguards</h2>
        <h3>1. Access Control</h3>
        <p>Implement unique user identification, automatic logoff, and encryption/decryption.</p>

        <h3>2. Audit Controls</h3>
        <p>Implement hardware, software, and procedural mechanisms to record and examine access to patient information.</p>

        <h3>3. Integrity</h3>
        <p>Establish procedures to protect patient information from improper alteration or destruction.</p>

        <h2>Required Documentation</h2>
        <ul>
          <li>Privacy and Security Policies</li>
          <li>Risk Assessment Documentation</li>
          <li>Training Records</li>
          <li>Incident Response Plans</li>
          <li>Business Associate Agreements</li>
        </ul>

        <h2>Regular Compliance Activities</h2>
        <ul>
          <li>Annual risk assessments</li>
          <li>Quarterly policy reviews</li>
          <li>Monthly access audits</li>
          <li>Ongoing staff training</li>
        </ul>
      `,
      relatedArticles: ["data-security", "privacy-policies", "incident-response"]
    },
    "client-management": {
      id: "client-management",
      title: "Client Portal & Profile Management",
      category: "Client Portal",
      author: "TheraMate Team",
      readTime: "7 min read",
      lastUpdated: "December 10, 2024",
      difficulty: "Beginner",
      content: `
        <h2>Welcome to Your Client Portal</h2>
        <p>Your client portal is your personal space on TheraMate where you can manage your profile, browse therapists, and book sessions. This guide will help you make the most of it.</p>

        <h2>Getting Started</h2>
        <h3>1. Complete Your Profile</h3>
        <p>When you first sign up, you'll be asked to complete your profile with basic information like your name, location, and contact details.</p>

        <h3>2. Onboarding Questions</h3>
        <p>Answer a few questions about your therapy goals and preferences. This helps us match you with the right healthcare professional.</p>

        <h3>3. Set Your Goals</h3>
        <p>Tell us what you hope to achieve through therapy. This information helps your therapist understand your needs better.</p>

        <h2>Finding Therapists</h2>
        <h3>1. Browse the Marketplace</h3>
        <p>Use our marketplace to search for healthcare professionals in your area. You can filter by:</p>
        <ul>
          <li>Specialty (Sports Therapy, Massage Therapy, Osteopathy)</li>
          <li>Location and distance from you</li>
          <li>Availability and appointment times</li>
          <li>Experience level and qualifications</li>
        </ul>

        <h3>2. Read Profiles</h3>
        <p>Each therapist has a detailed profile showing their qualifications, experience, specialties, and what clients say about them.</p>

        <h3>3. Check Availability</h3>
        <p>View real-time availability and book sessions that fit your schedule.</p>

        <h2>Booking Sessions</h2>
        <h3>1. Choose Your Therapist</h3>
        <p>Once you find a therapist you like, click on their profile to see available appointment times.</p>

        <h3>2. Select a Time</h3>
        <p>Pick a time slot that works for you. Sessions are typically 30-60 minutes long.</p>

        <h3>3. Complete Payment</h3>
        <p>Pay for your session securely through our platform. No subscription fees - you only pay for sessions you book.</p>

        <h2>Managing Your Account</h2>
        <h3>1. Update Your Profile</h3>
        <p>Keep your contact information and preferences up to date in your profile settings.</p>

        <h3>2. View Your Sessions</h3>
        <p>See your upcoming and past sessions in your dashboard.</p>

        <h3>3. Message Your Therapist</h3>
        <p>Use our secure messaging system to communicate with your therapist between sessions.</p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>Free to Use:</strong> No monthly fees, only pay for sessions you book</li>
          <li><strong>Secure Communication:</strong> All messages are encrypted and HIPAA-compliant</li>
          <li><strong>Easy Booking:</strong> Simple scheduling with real-time availability</li>
          <li><strong>Location Search:</strong> Find therapists near you or book online sessions</li>
        </ul>

        <h2>Need Help?</h2>
        <p>If you have questions about using your client portal:</p>
        <ul>
          <li>Check our Help Center for detailed guides</li>
          <li>Contact our support team for assistance</li>
          <li>Use the live chat feature for immediate help</li>
        </ul>
      `,
      relatedArticles: ["soap-notes-guide", "telehealth-best-practices", "outcome-measurement"]
    },
    "telehealth-best-practices": {
      id: "telehealth-best-practices",
      title: "Telehealth Best Practices for Therapy Sessions",
      category: "Telehealth & Technology",
      author: "TheraMate Team",
      readTime: "7 min read",
      lastUpdated: "December 7, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Setting Up for Success</h2>
        <p>Proper preparation is key to effective telehealth sessions.</p>

        <h2>Technical Requirements</h2>
        <ul>
          <li>High-speed internet connection</li>
          <li>Quality webcam and microphone</li>
          <li>Secure, HIPAA-compliant platform</li>
          <li>Backup communication methods</li>
        </ul>

        <h2>Session Best Practices</h2>
        <ul>
          <li>Test technology before sessions</li>
          <li>Create a professional environment</li>
          <li>Maintain eye contact and engagement</li>
          <li>Have contingency plans ready</li>
        </ul>
      `,
      relatedArticles: ["client-management", "platform-setup", "hipaa-compliance"]
    },
    "outcome-measurement": {
      id: "outcome-measurement",
      title: "Measuring Client Outcomes and Progress",
      category: "Practice Management",
      author: "TheraMate Team",
      readTime: "6 min read",
      lastUpdated: "December 6, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Why Measure Outcomes?</h2>
        <p>Outcome measurement provides evidence of treatment effectiveness and guides clinical decisions.</p>

        <h2>Common Outcome Measures</h2>
        <ul>
          <li>Pain scales and functional assessments</li>
          <li>Quality of life questionnaires</li>
          <li>Client satisfaction surveys</li>
          <li>Progress toward goals</li>
        </ul>

        <h2>Implementation Strategies</h2>
        <ul>
          <li>Choose appropriate measures for your specialty</li>
          <li>Collect data consistently</li>
          <li>Review progress regularly</li>
          <li>Use data to inform treatment</li>
        </ul>
      `,
      relatedArticles: ["client-management", "soap-notes-guide", "platform-setup"]
    },
    "platform-setup": {
      id: "platform-setup",
      title: "TheraMate Platform Setup Guide for New Users",
      category: "Getting Started",
      author: "TheraMate Team",
      readTime: "5 min read",
      lastUpdated: "December 8, 2024",
      difficulty: "Beginner",
      content: `
        <h2>Welcome to TheraMate!</h2>
        <p>This guide will help you get started with TheraMate, whether you're a client looking for therapy services or a healthcare professional wanting to join our platform.</p>

        <h2>Getting Started</h2>
        <h3>1. Choose Your Role</h3>
        <p>When you first visit TheraMate, you'll need to choose between:</p>
        <ul>
          <li><strong>Client Portal:</strong> For individuals seeking therapy services</li>
          <li><strong>Professional Portal:</strong> For healthcare professionals offering services</li>
        </ul>

        <h3>2. Create Your Account</h3>
        <p>Sign up using your email address or Google account. You'll be asked to provide basic information about yourself.</p>

        <h3>3. Complete Your Profile</h3>
        <p>Fill in your details to help us match you with the right services or clients.</p>

        <h2>For Clients</h2>
        <h3>1. Complete Onboarding</h3>
        <p>Answer a few questions about your goals and preferences to help us find the right therapist for you.</p>

        <h3>2. Browse Therapists</h3>
        <p>Use our marketplace to find healthcare professionals in your area. Filter by specialty, location, and availability.</p>

        <h3>3. Book Sessions</h3>
        <p>Once you find a therapist you like, book sessions directly through the platform. Sessions are paid per booking.</p>

        <h2>For Healthcare Professionals</h2>
        <h3>1. Professional Registration</h3>
        <p>Choose your professional type (Sports Therapist, Massage Therapist, or Osteopath) and provide your credentials.</p>

        <h3>2. Profile Setup</h3>
        <p>Create an attractive profile that helps clients find and book with you. Include your specialties, experience, and availability.</p>

        <h3>3. Subscription Plan</h3>
        <p>Choose a subscription plan that fits your practice needs. We offer Professional (£79.99/month) and Premium (£199.99/month) plans.</p>

        <h2>Key Features</h2>
        <ul>
          <li><strong>Free for Clients:</strong> No subscription fees, pay only for sessions you book</li>
          <li><strong>Secure Messaging:</strong> Communicate safely with your therapist or clients</li>
          <li><strong>Easy Booking:</strong> Simple scheduling and appointment management</li>
          <li><strong>Location Search:</strong> Find therapists near you or offer services in your area</li>
        </ul>

        <h2>Need Help?</h2>
        <p>If you have any questions or need assistance:</p>
        <ul>
          <li>Check our Help Center for detailed guides</li>
          <li>Contact our support team through the Contact page</li>
          <li>Use the live chat feature for immediate assistance</li>
        </ul>
      `,
      relatedArticles: ["soap-notes-guide", "client-management", "billing-setup"]
    },
    "billing-management": {
      id: "billing-management",
      title: "Understanding Our Pricing Structure",
      category: "Account & Billing",
      author: "TheraMate Team",
      readTime: "7 min read",
      lastUpdated: "December 4, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Understanding TheraMate's Pricing</h2>
        <p>TheraMate offers flexible pricing options designed to make therapy accessible for everyone while supporting healthcare professionals in building successful practices.</p>

        <h2>For Clients - Free Access</h2>
        <h3>No Subscription Fees</h3>
        <p>Client access to TheraMate is completely free. You don't pay any monthly or annual subscription fees.</p>

        <h3>Pay Per Session</h3>
        <p>You only pay for the therapy sessions you actually book. This means:</p>
        <ul>
          <li>No upfront costs or commitments</li>
          <li>Pay only when you need therapy</li>
          <li>Try different therapists without long-term contracts</li>
          <li>Pause or resume therapy as needed</li>
        </ul>

        <h3>Session Pricing</h3>
        <p>Individual therapists set their own session rates, typically ranging from £40-£80 per session depending on:</p>
        <ul>
          <li>Type of therapy (Sports, Massage, Osteopathy)</li>
          <li>Session length (30-60 minutes)</li>
          <li>Therapist experience and qualifications</li>
          <li>Location and demand</li>
        </ul>

        <h2>For Healthcare Professionals - Subscription Plans</h2>
        <h3>Professional Plan - £79.99/month</h3>
        <p>Perfect for new practitioners or those just starting out:</p>
        <ul>
          <li>Create and manage your professional profile</li>
          <li>List your services and availability</li>
          <li>Receive booking requests from clients</li>
          <li>Basic messaging with clients</li>
          <li>Calendar management</li>
        </ul>

        <h3>Advanced Plan - £59/month</h3>
        <p>Ideal for established practitioners who want more features:</p>
        <ul>
          <li>Everything in Basic plan</li>
          <li>Advanced analytics and reporting</li>
          <li>Priority support</li>
          <li>Enhanced profile customization</li>
          <li>Marketing tools and insights</li>
        </ul>

        <h3>Yearly Discount</h3>
        <p>Save 10% when you pay annually instead of monthly. This applies to both Basic and Advanced plans.</p>

        <h2>For Companies - Enterprise Solutions</h2>
        <h3>Custom Pricing</h3>
        <p>We offer tailored solutions for organizations that need:</p>
        <ul>
          <li>Multiple practitioner accounts</li>
          <li>Custom branding and white-label options</li>
          <li>Advanced reporting and analytics</li>
          <li>Dedicated account management</li>
          <li>Integration with existing systems</li>
        </ul>

        <h3>Contact for Enterprise</h3>
        <p>To discuss enterprise pricing and features, contact our team through the Contact page or visit our pricing page.</p>

        <h2>Payment Methods</h2>
        <ul>
          <li>Credit and debit cards</li>
          <li>Bank transfers</li>
          <li>PayPal</li>
          <li>Apple Pay and Google Pay</li>
        </ul>

        <h2>No Hidden Fees</h2>
        <p>We believe in transparent pricing. What you see is what you pay - no surprise charges or hidden fees.</p>

        <h2>Questions About Pricing?</h2>
        <p>If you have questions about our pricing or need help choosing the right plan:</p>
        <ul>
          <li>Check our Help Center for detailed information</li>
          <li>Contact our support team for personalized advice</li>
          <li>Use the live chat for immediate assistance</li>
        </ul>
      `,
      relatedArticles: ["client-management", "platform-setup", "hipaa-compliance"]
    },
    "progress-tracking": {
      id: "progress-tracking",
      title: "Progress Tracking and Outcome Measurement Tools",
      category: "Practice Management",
      author: "TheraMate Team",
      readTime: "6 min read",
      lastUpdated: "December 6, 2024",
      difficulty: "Advanced",
      content: `
        <h2>Why Measure Outcomes?</h2>
        <p>Outcome measurement provides evidence of treatment effectiveness and guides clinical decisions.</p>

        <h2>Common Outcome Measures</h2>
        <ul>
          <li>Pain scales and functional assessments</li>
          <li>Quality of life questionnaires</li>
          <li>Client satisfaction surveys</li>
          <li>Progress toward goals</li>
        </ul>

        <h2>Implementation Strategies</h2>
        <ul>
          <li>Choose appropriate measures for your specialty</li>
          <li>Collect data consistently</li>
          <li>Review progress regularly</li>
          <li>Use data to inform treatment</li>
        </ul>

        <h2>Technology Integration</h2>
        <ul>
          <li>Use digital assessment tools</li>
          <li>Automate data collection</li>
          <li>Generate progress reports</li>
          <li>Share results with clients</li>
        </ul>

        <h2>Analytics and Reporting</h2>
        <ul>
          <li>Track individual client progress</li>
          <li>Monitor practice-wide outcomes</li>
          <li>Generate compliance reports</li>
          <li>Identify improvement opportunities</li>
        </ul>
      `,
      relatedArticles: ["client-management", "soap-notes-guide", "outcome-measurement"]
    },
    "insurance-billing": {
      id: "insurance-billing",
      title: "Insurance Billing and Claims Processing Guide",
      category: "Billing & Insurance",
      author: "TheraMate Team",
      readTime: "8 min read",
      lastUpdated: "December 4, 2024",
      difficulty: "Intermediate",
      content: `
        <h2>Understanding Insurance Billing</h2>
        <p>Proper insurance billing is crucial for practice sustainability and client accessibility.</p>

        <h2>Claims Submission Process</h2>
        <h3>1. Verify Coverage</h3>
        <ul>
          <li>Check eligibility and benefits</li>
          <li>Verify deductibles and copays</li>
          <li>Confirm authorization requirements</li>
          <li>Document coverage details</li>
        </ul>

        <h3>2. Proper Coding</h3>
        <ul>
          <li>Use correct CPT codes</li>
          <li>Include appropriate modifiers</li>
          <li>Ensure diagnosis code accuracy</li>
          <li>Follow coding guidelines</li>
        </ul>

        <h3>3. Timely Submission</h3>
        <ul>
          <li>Submit claims within deadlines</li>
          <li>Follow up on pending claims</li>
          <li>Appeal denied claims promptly</li>
          <li>Track claim status</li>
        </ul>

        <h2>Common Billing Challenges</h2>
        <ul>
          <li>Claim denials and rejections</li>
          <li>Incomplete documentation</li>
          <li>Coding errors</li>
          <li>Timely filing issues</li>
        </ul>

        <h2>Best Practices</h2>
        <ul>
          <li>Maintain detailed records</li>
          <li>Train staff on billing procedures</li>
          <li>Regular audits and reviews</li>
          <li>Stay updated on regulations</li>
        </ul>
      `,
      relatedArticles: ["billing-management", "hipaa-compliance", "client-management"]
    }
  };

  const article = articles[currentArticle as keyof typeof articles];

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="py-20">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested article could not be found.</p>
            <Button onClick={onBack}>Back to Help Centre</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Clinical Documentation":
        return FileText;
      case "Practice Management":
        return Users;
      case "Billing & Insurance":
        return CreditCard;
      case "Security & Compliance":
        return Shield;
      case "Telehealth & Technology":
        return Settings;
      case "Getting Started":
        return BookOpen;
      default:
        return TrendingUp;
    }
  };

  const CategoryIcon = getCategoryIcon(article.category);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="py-20">
        <div className="container mx-auto px-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={onBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Help Centre
          </Button>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">{article.category}</Badge>
              <Badge variant="secondary">{article.difficulty}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{article.readTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Updated {article.lastUpdated}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-8">
                  <div 
                    className="max-w-none [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-gray-800 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:text-gray-700 [&>p]:mb-4 [&>p]:text-gray-600 [&>ul]:mb-4 [&>ul]:pl-6 [&>li]:mb-2 [&>li]:text-gray-600 [&>strong]:font-semibold [&>strong]:text-gray-800"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Article Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CategoryIcon className="w-5 h-5" />
                    Article Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <Badge variant="outline">{article.category}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Difficulty:</span>
                    <Badge variant="secondary">{article.difficulty}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Read Time:</span>
                    <span className="text-sm font-medium">{article.readTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Updated:</span>
                    <span className="text-sm font-medium">{article.lastUpdated}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Related Articles */}
              <Card>
                <CardHeader>
                  <CardTitle>Related Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {article.relatedArticles.map((relatedId) => {
                      const relatedArticle = articles[relatedId as keyof typeof articles];
                      if (!relatedArticle) return null;
                      
                      return (
                        <div 
                          key={relatedId}
                          className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setCurrentArticle(relatedId)}
                        >
                          <h4 className="text-sm font-medium mb-1 line-clamp-2">
                            {relatedArticle.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{relatedArticle.category}</span>
                            <span>•</span>
                            <span>{relatedArticle.readTime}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Print Article
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Save to Library
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Share Article
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default HelpArticle;
