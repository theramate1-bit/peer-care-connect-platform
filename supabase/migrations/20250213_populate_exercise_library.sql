-- Populate Exercise Library with common exercises
-- This provides a starting library of exercises for practitioners

INSERT INTO exercise_library (name, description, category, instructions, duration_minutes, difficulty_level, muscle_groups, equipment_needed, is_system_exercise, is_active)
VALUES
  -- Strength Exercises
  ('Squats', 'Basic lower body strength exercise', 'strength', 'Stand with feet shoulder-width apart. Lower your body as if sitting in a chair, keeping knees behind toes. Return to starting position. Start with 2 sets of 10 reps.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['none'], true, true),
  
  ('Wall Push-ups', 'Upper body strength for beginners', 'strength', 'Stand facing a wall, arms length away. Place hands on wall at shoulder height. Lean in, then push back to start. Start with 2 sets of 10 reps.', 5, 'beginner', ARRAY['chest', 'shoulders'], ARRAY['none'], true, true),
  
  ('Plank', 'Core strength and stability', 'strength', 'Lie face down, raise onto forearms and toes. Keep body in straight line. Hold for 20-60 seconds. Breathe normally.', 3, 'beginner', ARRAY['core', 'shoulders'], ARRAY['none'], true, true),
  
  -- Flexibility Exercises
  ('Hamstring Stretch', 'Improve flexibility in back of legs', 'flexibility', 'Sit on floor with one leg extended. Lean forward from hips, reaching toward toes. Hold for 30 seconds. Repeat on other side.', 5, 'beginner', ARRAY['hamstrings'], ARRAY['none'], true, true),
  
  ('Shoulder Stretch', 'Release tension in shoulders', 'flexibility', 'Bring one arm across chest. Use other arm to gently pull. Hold for 30 seconds. Repeat on other side.', 3, 'beginner', ARRAY['shoulders'], ARRAY['none'], true, true),
  
  ('Neck Rolls', 'Gentle neck mobility', 'flexibility', 'Slowly roll head in a circle, one direction 5 times, then reverse. Keep movements slow and controlled.', 2, 'beginner', ARRAY['neck'], ARRAY['none'], true, true),
  
  -- Mobility Exercises
  ('Cat-Cow Stretch', 'Spinal mobility and flexibility', 'mobility', 'On hands and knees, arch back (cow), then round spine (cat). Repeat 10 times slowly.', 3, 'beginner', ARRAY['spine', 'core'], ARRAY['none'], true, true),
  
  ('Hip Circles', 'Hip joint mobility', 'mobility', 'Stand on one leg. Lift other leg and make slow circles with hip. 10 circles each direction, then switch legs.', 3, 'beginner', ARRAY['hips'], ARRAY['none'], true, true),
  
  ('Ankle Circles', 'Ankle mobility and flexibility', 'mobility', 'Sit or stand. Lift one foot and rotate ankle in circle 10 times each direction. Repeat on other side.', 2, 'beginner', ARRAY['ankles'], ARRAY['none'], true, true),
  
  -- Balance Exercises
  ('Single Leg Balance', 'Improve balance and stability', 'balance', 'Stand on one leg, hold for 30 seconds. Progress to closing eyes. Repeat on other leg.', 3, 'beginner', ARRAY['core', 'ankles'], ARRAY['none'], true, true),
  
  ('Heel-to-Toe Walk', 'Dynamic balance exercise', 'balance', 'Walk forward placing heel of one foot directly in front of toe of other. Walk 10-15 steps.', 3, 'beginner', ARRAY['core', 'ankles'], ARRAY['none'], true, true),
  
  -- Rehabilitation Exercises
  ('Knee to Chest', 'Lower back and hip mobility', 'rehabilitation', 'Lie on back. Bring one knee to chest, hold for 20 seconds. Repeat 3 times each leg.', 4, 'beginner', ARRAY['hips', 'lower_back'], ARRAY['none'], true, true),
  
  ('Piriformis Stretch', 'Hip and sciatic nerve relief', 'rehabilitation', 'Lie on back. Cross one ankle over opposite knee. Pull knee toward chest. Hold 30 seconds. Repeat other side.', 4, 'beginner', ARRAY['hips', 'piriformis'], ARRAY['none'], true, true),
  
  ('Scapular Retraction', 'Upper back strengthening', 'rehabilitation', 'Sit or stand. Squeeze shoulder blades together. Hold 5 seconds, release. Repeat 10 times.', 3, 'beginner', ARRAY['upper_back', 'shoulders'], ARRAY['none'], true, true),
  
  -- Intermediate Strength
  ('Lunges', 'Lower body strength and balance', 'strength', 'Step forward into lunge position. Lower back knee toward ground. Push back to start. 10 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['none'], true, true),
  
  ('Modified Push-ups', 'Progression from wall push-ups', 'strength', 'On knees, hands on floor. Lower chest toward ground, push back up. 2 sets of 10-15 reps.', 5, 'intermediate', ARRAY['chest', 'shoulders'], ARRAY['none'], true, true),
  
  -- Cardio
  ('Marching in Place', 'Low-impact cardiovascular exercise', 'cardio', 'March in place, lifting knees high. Start with 2 minutes, work up to 5-10 minutes.', 5, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], true, true),
  
  ('Jumping Jacks', 'Cardiovascular and full-body movement', 'cardio', 'Jump feet apart while raising arms overhead, then return. Start with 10-20 reps.', 3, 'intermediate', ARRAY['cardio', 'full_body'], ARRAY['none'], true, true)
ON CONFLICT DO NOTHING;

