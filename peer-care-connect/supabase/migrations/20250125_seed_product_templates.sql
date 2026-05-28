-- Seed default product templates for each service category
-- These are platform-wide templates that all practitioners can use

-- Sports Therapist Templates
INSERT INTO product_templates (service_category, template_name, name_template, description_template, default_duration_minutes, suggested_price_per_hour, pricing_type, min_duration_minutes, max_duration_minutes, is_platform_template, is_active) VALUES
-- Sports Injury Assessment
('sports_injury_assessment', 'Standard Assessment', '{duration}-minute Sports Injury Assessment', 'Comprehensive assessment of your sports-related injury, including biomechanical analysis, movement screening, and injury diagnosis. Includes detailed report and treatment recommendations.', 60, NULL, 'hourly', 45, 90, true, true),
('sports_injury_assessment', 'Extended Assessment', '{duration}-minute Comprehensive Sports Injury Assessment', 'In-depth assessment with detailed biomechanical analysis, video analysis (if applicable), functional movement screening, and comprehensive treatment plan.', 90, NULL, 'hourly', 60, 120, true, true),

-- Exercise Rehabilitation
('exercise_rehabilitation', 'Rehabilitation Session', '{duration}-minute Exercise Rehabilitation Session', 'Structured rehabilitation program tailored to your injury. Includes exercise prescription, progression plan, and technique correction.', 60, NULL, 'hourly', 45, 90, true, true),
('exercise_rehabilitation', 'Rehabilitation Package', '{duration}-minute Rehabilitation Program', 'Extended rehabilitation session with comprehensive exercise program, home exercise prescription, and follow-up plan.', 90, NULL, 'hourly', 60, 120, true, true),

-- Strength & Conditioning
('strength_conditioning', 'Training Session', '{duration}-minute Strength & Conditioning Session', 'Personalized strength and conditioning program designed to improve athletic performance, power, and movement quality.', 60, NULL, 'hourly', 45, 90, true, true),
('strength_conditioning', 'Performance Program', '{duration}-minute Performance Enhancement', 'Advanced strength and conditioning session focusing on sport-specific movements and performance metrics.', 90, NULL, 'hourly', 60, 120, true, true),

-- Injury Prevention
('injury_prevention', 'Prevention Session', '{duration}-minute Injury Prevention Program', 'Proactive injury prevention session including movement screening, weak link identification, and preventive exercise prescription.', 60, NULL, 'hourly', 45, 75, true, true),

-- Performance Enhancement
('performance_enhancement', 'Performance Session', '{duration}-minute Sports Performance Enhancement', 'Performance optimization session focusing on athletic development, technique refinement, and competitive advantage.', 60, NULL, 'hourly', 45, 90, true, true),

-- Return to Play
('return_to_play', 'Return to Play Session', '{duration}-minute Return to Play Protocol', 'Structured return to sport program following injury. Includes graded exposure, sport-specific drills, and clearance assessment.', 60, NULL, 'hourly', 45, 90, true, true),

-- Massage Therapist Templates
('deep_tissue', 'Deep Tissue Massage', '{duration}-minute Deep Tissue Massage', 'Intense pressure massage targeting deep muscle layers and chronic tension. Ideal for athletes, postural issues, and chronic pain.', 60, NULL, 'hourly', 45, 90, true, true),
('deep_tissue', 'Extended Deep Tissue', '{duration}-minute Extended Deep Tissue Massage', 'Comprehensive deep tissue treatment for multiple areas or chronic conditions. Extended time allows for thorough work.', 90, NULL, 'hourly', 60, 120, true, true),

('sports_massage', 'Sports Massage', '{duration}-minute Sports Massage', 'Therapeutic massage specifically for athletes and active individuals. Includes pre/post-event techniques and performance optimization. Consultation included to understand your needs.', 60, NULL, 'hourly', 45, 90, true, true),
('sports_massage', 'Competition Massage', '{duration}-minute Competition Sports Massage', 'Specialized sports massage for competition preparation and recovery. Includes consultation to understand your needs. Tailored to your sport and training schedule.', 90, NULL, 'hourly', 60, 120, true, true),

('swedish_massage', 'Swedish Massage', '{duration}-minute Swedish Massage', 'Classic relaxation massage with long, flowing strokes. Perfect for stress relief, general relaxation, and improving circulation.', 60, NULL, 'hourly', 30, 90, true, true),
('swedish_massage', 'Relaxation Massage', '{duration}-minute Relaxation Massage', 'Gentle, soothing massage designed for complete relaxation and stress relief. Uses traditional Swedish techniques.', 60, NULL, 'hourly', 30, 90, true, true),

('trigger_point', 'Trigger Point Therapy', '{duration}-minute Trigger Point Therapy', 'Focused treatment targeting trigger points and muscle knots. Effective for referred pain, tension headaches, and chronic muscle tightness.', 45, NULL, 'hourly', 30, 60, true, true),

('myofascial_release', 'Myofascial Release', '{duration}-minute Myofascial Release Session', 'Gentle stretching and release of fascial tissue to improve mobility, reduce pain, and enhance movement quality.', 60, NULL, 'hourly', 45, 90, true, true),

('relaxation_massage', 'Relaxation Massage', '{duration}-minute Relaxation Massage', 'Gentle, soothing massage for stress relief and relaxation. Perfect for unwinding after a busy week.', 60, NULL, 'hourly', 30, 90, true, true),

-- Osteopath Templates
('structural_osteopathy', 'Structural Osteopathy', '{duration}-minute Structural Osteopathy Session', 'Comprehensive structural assessment and treatment focusing on the musculoskeletal system. Uses manual techniques to improve alignment and function.', 60, NULL, 'hourly', 45, 90, true, true),

('cranial_osteopathy', 'Cranial Osteopathy', '{duration}-minute Cranial Osteopathy Session', 'Gentle cranial osteopathic treatment focusing on the head, neck, and spine. Effective for headaches, TMJ issues, and stress-related conditions.', 45, NULL, 'hourly', 30, 60, true, true),

('visceral_osteopathy', 'Visceral Osteopathy', '{duration}-minute Visceral Osteopathy Session', 'Specialized treatment focusing on internal organ function and its relationship to the musculoskeletal system. Beneficial for digestive issues, breathing problems, and chronic pain.', 60, NULL, 'hourly', 45, 90, true, true),

('paediatric_osteopathy', 'Paediatric Osteopathy', '{duration}-minute Paediatric Osteopathy Session', 'Gentle osteopathic treatment specifically for children. Effective for feeding issues, sleep problems, colic, and developmental concerns.', 30, NULL, 'hourly', 20, 45, true, true),

('sports_osteopathy', 'Sports Osteopathy', '{duration}-minute Sports Osteopathy Session', 'Osteopathic treatment tailored for athletes. Addresses sports injuries, performance optimization, and biomechanical efficiency.', 60, NULL, 'hourly', 45, 90, true, true),

('postural_assessment', 'Postural Assessment', '{duration}-minute Postural Assessment', 'Comprehensive postural analysis and assessment. Includes biomechanical evaluation, movement screening, and corrective exercise prescription.', 60, NULL, 'hourly', 45, 90, true, true);

