-- Expand Exercise Library to 200-300 Exercises
-- Comprehensive exercise library covering physical therapy/rehabilitation and general fitness/wellness
-- Organized by category, difficulty level, and body region

INSERT INTO exercise_library (name, description, category, instructions, duration_minutes, difficulty_level, muscle_groups, equipment_needed, contraindications, is_system_exercise, is_active)
VALUES
  -- ============================================
  -- STRENGTH EXERCISES (80-100 exercises)
  -- ============================================
  
  -- BEGINNER STRENGTH (30 exercises)
  ('Wall Push-ups', 'Upper body strength for beginners', 'strength', 'Stand facing a wall, arms length away. Place hands on wall at shoulder height, slightly wider than shoulders. Lean in toward wall, then push back to start. Keep core engaged and body straight. Start with 2 sets of 10-15 reps.', 5, 'beginner', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], NULL, true, true),
  
  ('Knee Push-ups', 'Modified push-up for beginners', 'strength', 'Start on hands and knees, hands slightly wider than shoulders. Lower chest toward ground, keeping back straight. Push back up. Start with 2 sets of 8-12 reps.', 5, 'beginner', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], NULL, true, true),
  
  ('Squats', 'Basic lower body strength exercise', 'strength', 'Stand with feet shoulder-width apart, toes slightly turned out. Lower body as if sitting in a chair, keeping knees behind toes and chest up. Go down until thighs are parallel to floor, then return to start. Start with 2 sets of 10-15 reps.', 5, 'beginner', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Chair Squats', 'Squat using chair for support', 'strength', 'Stand in front of chair, feet shoulder-width apart. Lower down to touch chair with glutes, then stand back up. Use chair for balance if needed. Start with 2 sets of 10 reps.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['chair'], NULL, true, true),
  
  ('Wall Sit', 'Isometric lower body strength', 'strength', 'Stand with back against wall. Slide down until knees are at 90 degrees, as if sitting in invisible chair. Hold position, keeping back flat against wall. Start with 20-30 second holds, 2-3 sets.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['wall'], 'Avoid if knee pain', true, true),
  
  ('Glute Bridge', 'Hip and glute strengthening', 'strength', 'Lie on back with knees bent, feet flat on floor. Lift hips up, squeezing glutes. Hold for 2 seconds, then lower. Keep core engaged. Start with 2 sets of 12-15 reps.', 5, 'beginner', ARRAY['glutes', 'hamstrings', 'lower_back'], ARRAY['none'], NULL, true, true),
  
  ('Plank', 'Core strength and stability', 'strength', 'Start on forearms and toes, body in straight line from head to heels. Engage core, keep hips level. Breathe normally. Hold for 20-60 seconds, 2-3 sets.', 3, 'beginner', ARRAY['core', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Knee Plank', 'Modified plank for beginners', 'strength', 'Start on forearms and knees instead of toes. Keep body straight from knees to head. Hold for 30-60 seconds, 2-3 sets.', 3, 'beginner', ARRAY['core', 'shoulders'], ARRAY['none'], NULL, true, true),
  
  ('Dead Bug', 'Core stability exercise', 'strength', 'Lie on back with arms extended toward ceiling, knees bent at 90 degrees. Slowly lower opposite arm and leg toward floor, keeping core engaged and lower back pressed to floor. Return to start, alternate sides. Start with 2 sets of 10 reps each side.', 5, 'beginner', ARRAY['core', 'hip_flexors'], ARRAY['none'], NULL, true, true),
  
  ('Bird Dog', 'Core and back stability', 'strength', 'Start on hands and knees. Extend opposite arm and leg, keeping body stable. Hold for 5-10 seconds, return to start. Alternate sides. Start with 2 sets of 8 reps each side.', 5, 'beginner', ARRAY['core', 'lower_back', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Calf Raises', 'Calf muscle strengthening', 'strength', 'Stand with feet hip-width apart. Rise up onto toes, hold for 1-2 seconds, then lower slowly. Can hold onto wall for balance. Start with 2 sets of 15-20 reps.', 3, 'beginner', ARRAY['calves'], ARRAY['none'], NULL, true, true),
  
  ('Seated Leg Raises', 'Quadriceps strengthening', 'strength', 'Sit in chair with back straight. Slowly lift one leg until straight, hold for 2-3 seconds, lower. Repeat with other leg. Start with 2 sets of 10 reps each leg.', 5, 'beginner', ARRAY['quadriceps'], ARRAY['chair'], NULL, true, true),
  
  ('Standing Hip Abduction', 'Hip strengthening', 'strength', 'Stand holding onto wall or chair for support. Lift one leg out to side, keeping it straight. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each leg.', 5, 'beginner', ARRAY['hip_abductors', 'glutes'], ARRAY['wall', 'chair'], NULL, true, true),
  
  ('Standing Hip Extension', 'Glute and hamstring strengthening', 'strength', 'Stand holding onto wall or chair. Lift one leg straight back, squeezing glute. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each leg.', 5, 'beginner', ARRAY['glutes', 'hamstrings'], ARRAY['wall', 'chair'], NULL, true, true),
  
  ('Wall Angels', 'Upper back and shoulder strengthening', 'strength', 'Stand with back against wall, arms at sides. Slowly slide arms up wall, keeping contact with wall. Lower slowly. Start with 2 sets of 10-12 reps.', 5, 'beginner', ARRAY['upper_back', 'shoulders', 'rhomboids'], ARRAY['wall'], NULL, true, true),
  
  ('Scapular Squeezes', 'Upper back strengthening', 'strength', 'Sit or stand with arms at sides. Squeeze shoulder blades together, hold for 5 seconds, release. Keep shoulders down, not shrugged. Start with 2 sets of 12-15 reps.', 3, 'beginner', ARRAY['upper_back', 'rhomboids'], ARRAY['none'], NULL, true, true),
  
  ('Bicep Curls (Air)', 'Arm strengthening without weights', 'strength', 'Stand with arms at sides, palms facing forward. Curl arms up as if holding weights, squeezing biceps. Lower slowly. Start with 2 sets of 12-15 reps.', 3, 'beginner', ARRAY['biceps'], ARRAY['none'], NULL, true, true),
  
  ('Tricep Dips (Chair)', 'Tricep strengthening using chair', 'strength', 'Sit on edge of sturdy chair, hands gripping edge. Slide forward, supporting weight with arms. Lower body by bending elbows, then push back up. Start with 2 sets of 8-12 reps.', 5, 'beginner', ARRAY['triceps', 'shoulders'], ARRAY['chair'], 'Avoid if shoulder pain', true, true),
  
  ('Superman', 'Lower back and glute strengthening', 'strength', 'Lie face down with arms extended overhead. Lift arms, chest, and legs off ground simultaneously, squeezing glutes and lower back. Hold for 2-3 seconds, lower. Start with 2 sets of 10-12 reps.', 5, 'beginner', ARRAY['lower_back', 'glutes', 'shoulders'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Modified Burpees', 'Full body conditioning', 'strength', 'Start standing. Step back into plank position (or knee plank). Step forward, then stand up. No jumping. Start with 2 sets of 5-8 reps.', 5, 'beginner', ARRAY['full_body', 'cardio'], ARRAY['none'], 'Avoid if knee or back pain', true, true),
  
  ('Marching in Place', 'Low impact leg strengthening', 'strength', 'Stand tall, lift knees alternately as if marching. Pump arms naturally. Keep core engaged. Start with 2-3 minutes continuous.', 5, 'beginner', ARRAY['quadriceps', 'hip_flexors', 'cardio'], ARRAY['none'], NULL, true, true),
  
  ('Step-ups', 'Lower body functional strength', 'strength', 'Stand facing step or low platform. Step up with one foot, bring other foot up. Step down with same foot, then other. Alternate leading leg. Start with 2 sets of 10 reps each leg.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['step', 'platform'], 'Avoid if knee pain', true, true),
  
  ('Lying Hip Abduction', 'Hip strengthening lying down', 'strength', 'Lie on side with bottom leg bent for support. Lift top leg straight up, keeping it in line with body. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each leg.', 5, 'beginner', ARRAY['hip_abductors'], ARRAY['none'], NULL, true, true),
  
  ('Clamshells', 'Hip and glute strengthening', 'strength', 'Lie on side with knees bent, feet together. Keeping feet together, lift top knee up like opening a clam. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each side.', 5, 'beginner', ARRAY['hip_abductors', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Fire Hydrants', 'Hip strengthening', 'strength', 'Start on hands and knees. Lift one leg out to side, keeping knee bent at 90 degrees. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each leg.', 5, 'beginner', ARRAY['hip_abductors', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Donkey Kicks', 'Glute strengthening', 'strength', 'Start on hands and knees. Lift one leg back, keeping knee bent at 90 degrees, foot toward ceiling. Lower slowly. Repeat on other side. Start with 2 sets of 12 reps each leg.', 5, 'beginner', ARRAY['glutes', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Leg Raises (Lying)', 'Lower abdominals and hip flexors', 'strength', 'Lie on back with hands under lower back for support. Slowly lift both legs up to 90 degrees, then lower slowly without touching floor. Start with 2 sets of 10-12 reps.', 5, 'beginner', ARRAY['lower_abs', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Reverse Crunches', 'Lower abdominals', 'strength', 'Lie on back with knees bent, feet off floor. Bring knees toward chest, lifting hips slightly. Lower slowly. Start with 2 sets of 12-15 reps.', 5, 'beginner', ARRAY['lower_abs'], ARRAY['none'], NULL, true, true),
  
  ('Crunches', 'Abdominal strengthening', 'strength', 'Lie on back with knees bent, feet flat. Place hands behind head lightly. Lift shoulders off ground, engaging abs. Lower slowly. Start with 2 sets of 15-20 reps.', 5, 'beginner', ARRAY['upper_abs'], ARRAY['none'], 'Avoid if neck pain', true, true),
  
  ('Modified Side Plank', 'Oblique and core strength', 'strength', 'Lie on side, prop up on forearm and knees (not feet). Lift hips up, keeping body straight. Hold for 20-30 seconds. Repeat on other side. Start with 2 sets each side.', 5, 'beginner', ARRAY['obliques', 'core'], ARRAY['none'], NULL, true, true),
  
  -- INTERMEDIATE STRENGTH (40 exercises)
  ('Push-ups', 'Standard upper body strength', 'strength', 'Start in plank position, hands slightly wider than shoulders. Lower body until chest nearly touches ground, keeping body straight. Push back up. Start with 2 sets of 10-15 reps.', 5, 'intermediate', ARRAY['chest', 'shoulders', 'triceps', 'core'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Wide Push-ups', 'Chest-focused push-up variation', 'strength', 'Same as push-up but hands placed wider than shoulders. Emphasizes chest muscles. Start with 2 sets of 8-12 reps.', 5, 'intermediate', ARRAY['chest', 'shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Diamond Push-ups', 'Tricep-focused push-up', 'strength', 'Start in plank position. Place hands close together, forming diamond shape with thumbs and index fingers. Lower and push up. Start with 2 sets of 8-12 reps.', 5, 'intermediate', ARRAY['triceps', 'chest'], ARRAY['none'], 'Avoid if wrist pain', true, true),
  
  ('Lunges', 'Lower body strength and balance', 'strength', 'Step forward into lunge position, front knee at 90 degrees, back knee nearly touching ground. Push back to start. Alternate legs. Start with 2 sets of 10 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Reverse Lunges', 'Lower body strength, easier on knees', 'strength', 'Step backward into lunge position instead of forward. Front knee stays over ankle. Push back to start. Alternate legs. Start with 2 sets of 10 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Walking Lunges', 'Dynamic lower body strength', 'strength', 'Step forward into lunge, then step forward with back leg into next lunge. Continue walking forward. Start with 2 sets of 10-12 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes', 'hamstrings'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Bulgarian Split Squats', 'Single leg lower body strength', 'strength', 'Stand with back foot elevated on chair or step. Lower into squat position with front leg. Push back up. Start with 2 sets of 8-10 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['chair', 'step'], 'Avoid if knee pain', true, true),
  
  ('Single Leg Glute Bridge', 'Advanced glute strengthening', 'strength', 'Lie on back, one leg bent, other extended. Lift hips up, keeping extended leg in line with body. Lower slowly. Repeat on other side. Start with 2 sets of 10 reps each leg.', 5, 'intermediate', ARRAY['glutes', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Side Plank', 'Oblique and core strength', 'strength', 'Lie on side, prop up on forearm and side of foot. Lift hips up, keeping body straight. Hold for 30-60 seconds. Repeat on other side. Start with 2 sets each side.', 5, 'intermediate', ARRAY['obliques', 'core', 'shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Plank to Down Dog', 'Core and shoulder mobility', 'strength', 'Start in plank position. Push hips up and back into downward dog position, then return to plank. Start with 2 sets of 8-10 reps.', 5, 'intermediate', ARRAY['core', 'shoulders', 'hamstrings'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Mountain Climbers', 'Cardio and core conditioning', 'strength', 'Start in plank position. Alternately bring knees toward chest in running motion. Keep core engaged. Start with 2 sets of 20-30 reps (10-15 each leg).', 5, 'intermediate', ARRAY['core', 'cardio', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Burpees', 'Full body conditioning', 'strength', 'Start standing. Drop into squat, jump back to plank, do push-up, jump feet forward, jump up with arms overhead. Start with 2 sets of 5-10 reps.', 5, 'intermediate', ARRAY['full_body', 'cardio'], ARRAY['none'], 'Avoid if knee or back pain', true, true),
  
  ('Jump Squats', 'Explosive lower body power', 'strength', 'Perform squat, then explode up into jump. Land softly, immediately go into next squat. Start with 2 sets of 8-12 reps.', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'calves'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Single Leg Calf Raises', 'Advanced calf strengthening', 'strength', 'Stand on one leg, hold onto wall for balance. Rise up onto toe, hold for 1-2 seconds, lower slowly. Repeat on other leg. Start with 2 sets of 12 reps each leg.', 5, 'intermediate', ARRAY['calves'], ARRAY['wall'], NULL, true, true),
  
  ('Pike Push-ups', 'Shoulder and upper body strength', 'strength', 'Start in downward dog position, hands and feet on ground, hips high. Lower head toward ground, then push back up. Start with 2 sets of 8-12 reps.', 5, 'intermediate', ARRAY['shoulders', 'triceps'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Dips (Between Chairs)', 'Advanced tricep strengthening', 'strength', 'Place two sturdy chairs facing each other. Sit on edge of one, hands gripping edge. Place feet on other chair. Lower body by bending elbows, push back up. Start with 2 sets of 8-12 reps.', 5, 'intermediate', ARRAY['triceps', 'shoulders'], ARRAY['chairs'], 'Avoid if shoulder pain', true, true),
  
  ('Hindu Push-ups', 'Full body mobility and strength', 'strength', 'Start in downward dog. Lower into upward dog position, then push back to downward dog. Fluid motion. Start with 2 sets of 8-10 reps.', 5, 'intermediate', ARRAY['chest', 'shoulders', 'core', 'spine'], ARRAY['none'], 'Avoid if back or shoulder pain', true, true),
  
  ('Single Leg Deadlift', 'Balance and posterior chain', 'strength', 'Stand on one leg, slight bend in knee. Hinge at hips, lowering torso while lifting other leg back. Return to start. Repeat on other side. Start with 2 sets of 8 reps each leg.', 5, 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back', 'core'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Russian Twists', 'Rotational core strength', 'strength', 'Sit with knees bent, lean back slightly. Rotate torso side to side, keeping core engaged. Can hold weight or water bottle. Start with 2 sets of 20 reps (10 each side).', 5, 'intermediate', ARRAY['obliques', 'core'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Bicycle Crunches', 'Core and oblique strengthening', 'strength', 'Lie on back, hands behind head. Bring opposite elbow to opposite knee in bicycle motion. Alternate sides. Start with 2 sets of 20 reps (10 each side).', 5, 'intermediate', ARRAY['abs', 'obliques'], ARRAY['none'], 'Avoid if neck pain', true, true),
  
  ('V-Ups', 'Advanced abdominal exercise', 'strength', 'Lie on back, arms overhead. Simultaneously lift legs and torso, reaching hands toward feet. Lower slowly. Start with 2 sets of 10-12 reps.', 5, 'intermediate', ARRAY['abs', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Plank Jacks', 'Cardio and core conditioning', 'strength', 'Start in plank position. Jump feet apart, then jump back together. Keep core engaged throughout. Start with 2 sets of 20 reps.', 5, 'intermediate', ARRAY['core', 'cardio', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Bear Crawls', 'Full body functional movement', 'strength', 'Start on hands and feet, knees slightly off ground. Crawl forward by moving opposite hand and foot. Keep core engaged. Start with 2 sets of 10-15 steps forward and back.', 5, 'intermediate', ARRAY['core', 'shoulders', 'legs'], ARRAY['none'], 'Avoid if wrist or shoulder pain', true, true),
  
  ('Crab Walks', 'Posterior chain and shoulder strength', 'strength', 'Sit with hands behind you, fingers pointing forward. Lift hips up. Walk forward and backward on hands and feet. Start with 2 sets of 10 steps each direction.', 5, 'intermediate', ARRAY['triceps', 'shoulders', 'glutes', 'hamstrings'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Hip Thrusts', 'Glute and hamstring strengthening', 'strength', 'Sit with upper back against bench or couch, knees bent. Lift hips up, squeezing glutes at top. Lower slowly. Start with 2 sets of 12-15 reps.', 5, 'intermediate', ARRAY['glutes', 'hamstrings'], ARRAY['bench', 'couch'], NULL, true, true),
  
  ('Single Leg Squats (Assisted)', 'Advanced single leg strength', 'strength', 'Stand on one leg, hold onto wall or chair for support. Lower into squat on one leg, other leg extended forward. Push back up. Start with 2 sets of 5-8 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['wall', 'chair'], 'Avoid if knee pain', true, true),
  
  ('Wall Handstand Push-ups', 'Advanced shoulder strength', 'strength', 'Start in handstand against wall. Lower head toward ground, then push back up. Requires significant upper body strength. Start with 2 sets of 3-5 reps.', 5, 'intermediate', ARRAY['shoulders', 'triceps'], ARRAY['wall'], 'Avoid if shoulder pain or high blood pressure', true, true),
  
  ('Dragon Flags', 'Advanced core strength', 'strength', 'Lie on bench, grip behind head. Lift entire body up, keeping straight, then lower slowly. Very advanced. Start with 2 sets of 5-8 reps.', 5, 'intermediate', ARRAY['core', 'abs'], ARRAY['bench'], 'Avoid if lower back pain', true, true),
  
  ('Pistol Squats (Assisted)', 'Ultimate single leg strength', 'strength', 'Stand on one leg, hold onto support. Lower into deep squat on one leg, other leg extended forward. Push back up. Very advanced. Start with 2 sets of 3-5 reps each leg.', 6, 'intermediate', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['wall', 'chair'], 'Avoid if knee pain', true, true),
  
  ('Diamond Push-ups (Elevated)', 'Tricep focus with easier progression', 'strength', 'Place hands on elevated surface in diamond position. Perform push-ups. Easier than floor version. Start with 2 sets of 10-15 reps.', 5, 'intermediate', ARRAY['triceps', 'chest'], ARRAY['bench', 'step'], NULL, true, true),
  
  ('Archer Push-ups', 'Unilateral upper body strength', 'strength', 'Start in push-up position, hands wider than normal. Shift weight to one side, lower that side more. Push back up. Alternate sides. Start with 2 sets of 5 reps each side.', 5, 'intermediate', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Hindu Squats', 'Dynamic lower body with mobility', 'strength', 'Stand with feet shoulder-width apart. Lower into squat while swinging arms down, then rise up swinging arms overhead. Fluid motion. Start with 2 sets of 15-20 reps.', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'shoulders'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Jump Lunges', 'Explosive lower body power', 'strength', 'Start in lunge position. Explode up, switching legs in air, landing in opposite lunge. Land softly. Start with 2 sets of 10 reps (5 each leg).', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'calves'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Plank Up-Downs', 'Core and shoulder stability', 'strength', 'Start in plank on forearms. Push up to hands one arm at a time, then lower back to forearms. Alternate which arm goes first. Start with 2 sets of 10 reps.', 5, 'intermediate', ARRAY['core', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Starfish Crunches', 'Core and hip flexor strength', 'strength', 'Lie on back, arms and legs spread like starfish. Bring opposite elbow to opposite knee, then extend. Alternate sides. Start with 2 sets of 20 reps (10 each side).', 5, 'intermediate', ARRAY['abs', 'obliques', 'hip_flexors'], ARRAY['none'], NULL, true, true),
  
  ('Flutter Kicks', 'Lower abdominals and hip flexors', 'strength', 'Lie on back, hands under glutes. Lift legs slightly off ground. Alternately kick legs up and down in small motions. Start with 2 sets of 30 seconds.', 5, 'intermediate', ARRAY['lower_abs', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Scissor Kicks', 'Lower abdominals', 'strength', 'Lie on back, hands under glutes. Lift legs off ground. Alternately cross legs in scissor motion. Start with 2 sets of 30 seconds.', 5, 'intermediate', ARRAY['lower_abs', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Hollow Body Hold', 'Core isometric strength', 'strength', 'Lie on back, lift shoulders and legs off ground, forming banana shape. Hold position, keeping lower back pressed to floor. Start with 2 sets of 20-30 second holds.', 5, 'intermediate', ARRAY['core', 'abs'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('L-Sit (Supported)', 'Advanced core and hip flexor', 'strength', 'Sit on ground, place hands beside hips. Lift body up, legs extended forward. Hold position. Very advanced. Start with 2 sets of 10-15 second holds.', 5, 'intermediate', ARRAY['core', 'triceps', 'hip_flexors'], ARRAY['none'], 'Avoid if wrist pain', true, true),
  
  -- ADVANCED STRENGTH (30 exercises)
  ('One-Arm Push-ups', 'Ultimate upper body strength', 'strength', 'Start in push-up position. Shift weight to one side, place other hand behind back. Lower and push up on one arm. Extremely advanced. Start with 2 sets of 3-5 reps each arm.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps', 'core'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Handstand Push-ups', 'Ultimate shoulder strength', 'strength', 'Start in handstand against wall. Lower head toward ground, push back up. Requires exceptional upper body strength. Start with 2 sets of 3-5 reps.', 5, 'advanced', ARRAY['shoulders', 'triceps'], ARRAY['wall'], 'Avoid if shoulder pain or high blood pressure', true, true),
  
  ('Pistol Squats', 'Ultimate single leg strength', 'strength', 'Stand on one leg. Lower into deep squat, other leg extended forward. Push back up. Extremely advanced. Start with 2 sets of 3-5 reps each leg.', 6, 'advanced', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Muscle-ups', 'Advanced upper body and core', 'strength', 'Start hanging from bar. Pull up, then transition to push-up position over bar. Lower and repeat. Requires pull-up bar. Extremely advanced. Start with 2 sets of 2-5 reps.', 5, 'advanced', ARRAY['back', 'shoulders', 'triceps', 'core'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  ('Planche (Training)', 'Ultimate pushing strength', 'strength', 'Start in plank position. Shift weight forward, lift feet off ground. Hold position. Extremely advanced progression. Start with 2 sets of 5-10 second holds.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps', 'core'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Front Lever (Training)', 'Advanced pulling strength', 'strength', 'Hang from bar, lift body to horizontal position, facing up. Hold position. Requires pull-up bar. Extremely advanced. Start with 2 sets of 5-10 second holds.', 5, 'advanced', ARRAY['back', 'core', 'shoulders'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  ('Human Flag', 'Ultimate core and shoulder strength', 'strength', 'Grip vertical pole, lift body sideways to horizontal. Hold position. Requires pole. Extremely advanced. Start with 2 sets of 5-10 second holds.', 5, 'advanced', ARRAY['core', 'shoulders', 'obliques'], ARRAY['pole'], 'Avoid if shoulder pain', true, true),
  
  ('Dragon Flag', 'Advanced core strength', 'strength', 'Lie on bench, grip behind head. Lift entire body up, keeping straight, lower slowly. Very advanced. Start with 2 sets of 5-8 reps.', 5, 'advanced', ARRAY['core', 'abs'], ARRAY['bench'], 'Avoid if lower back pain', true, true),
  
  ('L-Sit', 'Advanced core and hip flexor', 'strength', 'Sit on ground, hands beside hips. Lift body up, legs extended forward. Hold position. Very advanced. Start with 2 sets of 10-15 second holds.', 5, 'advanced', ARRAY['core', 'triceps', 'hip_flexors'], ARRAY['none'], 'Avoid if wrist pain', true, true),
  
  ('Single Arm Plank', 'Advanced core stability', 'strength', 'Start in plank position. Lift one arm forward, hold. Alternate arms. Very challenging. Start with 2 sets of 10-15 second holds each arm.', 5, 'advanced', ARRAY['core', 'shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Single Leg Plank', 'Advanced core and hip stability', 'strength', 'Start in plank position. Lift one leg up, hold. Alternate legs. Very challenging. Start with 2 sets of 15-20 second holds each leg.', 5, 'advanced', ARRAY['core', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Archer Pull-ups', 'Unilateral pulling strength', 'strength', 'Hang from bar, grip wide. Shift weight to one side, pull up that side more. Alternate sides. Requires pull-up bar. Very advanced. Start with 2 sets of 3-5 reps each side.', 5, 'advanced', ARRAY['back', 'biceps'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  ('Weighted Pistol Squats', 'Ultimate single leg with load', 'strength', 'Perform pistol squat while holding weight. Extremely advanced. Start with 2 sets of 3-5 reps each leg.', 6, 'advanced', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['weight'], 'Avoid if knee pain', true, true),
  
  ('Single Arm Handstand Push-ups', 'Ultimate unilateral shoulder strength', 'strength', 'Perform handstand push-up on one arm. Extremely advanced. Start with 2 sets of 1-3 reps each arm.', 5, 'advanced', ARRAY['shoulders', 'triceps', 'core'], ARRAY['wall'], 'Avoid if shoulder pain', true, true),
  
  ('90-Degree Push-ups', 'Advanced pushing strength', 'strength', 'Start in handstand against wall, lower to 90-degree angle, push back up. Very advanced. Start with 2 sets of 3-5 reps.', 5, 'advanced', ARRAY['shoulders', 'triceps'], ARRAY['wall'], 'Avoid if shoulder pain', true, true),
  
  ('One-Arm Plank', 'Ultimate core stability', 'strength', 'Start in plank, lift one arm and opposite leg simultaneously. Hold. Extremely challenging. Start with 2 sets of 10-15 second holds each side.', 5, 'advanced', ARRAY['core', 'shoulders', 'glutes'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Single Leg Glute Bridge (Weighted)', 'Advanced posterior chain', 'strength', 'Perform single leg glute bridge with weight on hips. Advanced progression. Start with 2 sets of 8-10 reps each leg.', 5, 'advanced', ARRAY['glutes', 'hamstrings'], ARRAY['weight'], NULL, true, true),
  
  ('Dragon Walk', 'Advanced full body movement', 'strength', 'Start in low squat, walk forward on hands and feet, keeping low. Very challenging. Start with 2 sets of 10-15 steps.', 5, 'advanced', ARRAY['full_body', 'core', 'legs'], ARRAY['none'], 'Avoid if knee or wrist pain', true, true),
  
  ('Shrimp Squats', 'Advanced single leg variation', 'strength', 'Stand on one leg, grab other foot behind you. Lower into squat on standing leg. Very advanced. Start with 2 sets of 3-5 reps each leg.', 6, 'advanced', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Single Arm Push-up (Elevated)', 'Progression to one-arm push-up', 'strength', 'Place one hand on elevated surface, perform push-up. Progressively lower surface. Advanced progression. Start with 2 sets of 5-8 reps each arm.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps', 'core'], ARRAY['bench', 'step'], 'Avoid if shoulder pain', true, true),
  
  ('Wall Walk Handstand', 'Advanced shoulder and core', 'strength', 'Start in downward dog, walk feet up wall into handstand. Walk back down. Very advanced. Start with 2 sets of 3-5 reps.', 5, 'advanced', ARRAY['shoulders', 'core'], ARRAY['wall'], 'Avoid if shoulder pain or high blood pressure', true, true),
  
  ('Single Leg Romanian Deadlift (Weighted)', 'Advanced posterior chain', 'strength', 'Perform single leg RDL while holding weight. Advanced progression. Start with 2 sets of 8 reps each leg.', 5, 'advanced', ARRAY['hamstrings', 'glutes', 'lower_back'], ARRAY['weight'], 'Avoid if lower back pain', true, true),
  
  ('Weighted Pull-ups', 'Advanced pulling strength', 'strength', 'Perform pull-ups while holding weight between legs or using weight belt. Requires pull-up bar. Very advanced. Start with 2 sets of 5-8 reps.', 5, 'advanced', ARRAY['back', 'biceps'], ARRAY['pull_up_bar', 'weight'], 'Avoid if shoulder pain', true, true),
  
  ('Single Arm Plank Row', 'Advanced core and back', 'strength', 'Start in plank with weight in one hand. Row weight to side, keeping core stable. Alternate sides. Requires weight. Very advanced. Start with 2 sets of 8 reps each side.', 5, 'advanced', ARRAY['core', 'back', 'shoulders'], ARRAY['weight'], 'Avoid if shoulder pain', true, true),
  
  ('Pike Handstand Push-ups', 'Advanced shoulder strength', 'strength', 'Start in pike position, feet elevated. Lower head toward ground, push back up. Very advanced. Start with 2 sets of 5-8 reps.', 5, 'advanced', ARRAY['shoulders', 'triceps'], ARRAY['bench', 'step'], 'Avoid if shoulder pain', true, true),
  
  ('Single Leg Box Jumps', 'Advanced plyometric', 'strength', 'Stand on one leg in front of box. Jump onto box on one leg. Land softly. Very advanced. Start with 2 sets of 5 reps each leg.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves'], ARRAY['box'], 'Avoid if knee pain', true, true),
  
  ('Weighted Dips', 'Advanced tricep strength', 'strength', 'Perform dips with weight attached. Very advanced. Start with 2 sets of 5-8 reps.', 5, 'advanced', ARRAY['triceps', 'shoulders'], ARRAY['chairs', 'weight'], 'Avoid if shoulder pain', true, true),
  
  ('Single Arm Muscle-up', 'Ultimate upper body', 'strength', 'Perform muscle-up using primarily one arm. Extremely advanced. Start with 2 sets of 1-3 reps each arm.', 5, 'advanced', ARRAY['back', 'shoulders', 'triceps', 'core'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  ('Planche Push-ups', 'Ultimate pushing strength', 'strength', 'Perform push-ups in planche position (feet off ground). Extremely advanced. Start with 2 sets of 2-5 reps.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps', 'core'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Front Lever Pull-ups', 'Ultimate pulling strength', 'strength', 'Perform pull-ups while holding front lever position. Extremely advanced. Requires pull-up bar. Start with 2 sets of 2-5 reps.', 5, 'advanced', ARRAY['back', 'core', 'biceps'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  ('Single Arm Front Lever', 'Ultimate unilateral strength', 'strength', 'Hold front lever position using one arm. Extremely advanced. Requires pull-up bar. Start with 2 sets of 3-5 second holds each arm.', 5, 'advanced', ARRAY['back', 'core', 'shoulders'], ARRAY['pull_up_bar'], 'Avoid if shoulder pain', true, true),
  
  -- ============================================
  -- FLEXIBILITY EXERCISES (50-60 exercises)
  -- ============================================
  
  -- BEGINNER FLEXIBILITY (25 exercises)
  ('Hamstring Stretch (Seated)', 'Improve flexibility in back of legs', 'flexibility', 'Sit on floor with one leg extended straight, other leg bent with foot against inner thigh. Lean forward from hips, reaching toward extended leg''s toes. Hold for 30 seconds, breathe deeply. Repeat on other side. Do 2-3 times each leg.', 5, 'beginner', ARRAY['hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Hamstring Stretch (Standing)', 'Standing hamstring flexibility', 'flexibility', 'Stand with one foot on step or chair. Keep leg straight, lean forward from hips until stretch felt in back of thigh. Hold for 30 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'beginner', ARRAY['hamstrings'], ARRAY['step', 'chair'], NULL, true, true),
  
  ('Quadriceps Stretch (Standing)', 'Front thigh flexibility', 'flexibility', 'Stand holding onto wall or chair for balance. Bend one knee, grab foot and pull heel toward glute. Keep knees together and standing leg slightly bent. Hold for 30 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'beginner', ARRAY['quadriceps', 'hip_flexors'], ARRAY['wall', 'chair'], 'Avoid if knee pain', true, true),
  
  ('Quadriceps Stretch (Lying)', 'Lying quadriceps stretch', 'flexibility', 'Lie on side, bottom leg bent for support. Grab top foot and pull heel toward glute. Keep knees together. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['quadriceps'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Calf Stretch (Wall)', 'Calf muscle flexibility', 'flexibility', 'Stand facing wall, one foot forward. Place hands on wall, lean forward keeping back leg straight, heel on ground. Feel stretch in calf. Hold for 30 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'beginner', ARRAY['calves'], ARRAY['wall'], NULL, true, true),
  
  ('Calf Stretch (Step)', 'Calf stretch using step', 'flexibility', 'Stand on step with heels hanging off edge. Lower heels below step level, feeling stretch in calves. Hold for 30 seconds. Can do one leg at a time for deeper stretch. Do 2-3 times.', 5, 'beginner', ARRAY['calves'], ARRAY['step'], NULL, true, true),
  
  ('Hip Flexor Stretch (Lunge)', 'Hip flexor and quadriceps flexibility', 'flexibility', 'Step into lunge position, back knee on ground (use cushion). Push hips forward, keeping front knee over ankle. Feel stretch in front of hip. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['hip_flexors', 'quadriceps'], ARRAY['cushion'], 'Avoid if knee pain', true, true),
  
  ('Hip Flexor Stretch (Standing)', 'Standing hip flexor stretch', 'flexibility', 'Stand with one foot forward in lunge position. Push hips forward, keeping back leg straight. Feel stretch in front of back leg''s hip. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['hip_flexors'], ARRAY['none'], NULL, true, true),
  
  ('IT Band Stretch', 'Iliotibial band flexibility', 'flexibility', 'Stand with one leg crossed behind other. Lean to side of front leg, reaching arm overhead. Feel stretch along side of hip and thigh. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['it_band', 'obliques'], ARRAY['none'], NULL, true, true),
  
  ('Pigeon Pose', 'Hip and glute flexibility', 'flexibility', 'Start on hands and knees. Bring one knee forward toward same-side wrist, extend other leg back. Square hips forward. Hold for 30-60 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['hips', 'glutes', 'piriformis'], ARRAY['none'], 'Avoid if knee or hip pain', true, true),
  
  ('Piriformis Stretch', 'Hip and sciatic nerve relief', 'flexibility', 'Lie on back. Cross one ankle over opposite knee. Pull knee toward chest. Feel stretch in hip/buttock area. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 4, 'beginner', ARRAY['hips', 'piriformis'], ARRAY['none'], NULL, true, true),
  
  ('Figure-4 Stretch', 'Hip flexibility variation', 'flexibility', 'Lie on back, cross one ankle over opposite knee. Pull uncrossed leg toward chest. Feel stretch in hip. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['hips', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Shoulder Stretch (Cross Body)', 'Shoulder and upper back flexibility', 'flexibility', 'Bring one arm across chest at shoulder height. Use other arm to gently pull across. Feel stretch in shoulder and upper back. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 3, 'beginner', ARRAY['shoulders', 'upper_back'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Shoulder Stretch (Doorway)', 'Chest and anterior shoulder stretch', 'flexibility', 'Stand in doorway, place forearm against doorframe at 90 degrees. Step forward, feeling stretch in chest and front of shoulder. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['chest', 'shoulders'], ARRAY['doorway'], 'Avoid if shoulder pain', true, true),
  
  ('Tricep Stretch', 'Back of arm flexibility', 'flexibility', 'Reach one arm overhead, bend elbow, hand behind head. Use other hand to gently pull elbow. Feel stretch in back of arm. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 3, 'beginner', ARRAY['triceps'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Bicep Stretch', 'Front of arm flexibility', 'flexibility', 'Extend one arm straight, palm facing up. Use other hand to gently pull fingers down. Feel stretch in front of arm. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 3, 'beginner', ARRAY['biceps'], ARRAY['none'], 'Avoid if elbow pain', true, true),
  
  ('Neck Stretch (Side)', 'Neck lateral flexibility', 'flexibility', 'Sit or stand tall. Gently tilt head to one side, bringing ear toward shoulder. Hold for 20-30 seconds. Repeat on other side. Do 2-3 times each side. Avoid if neck pain.', 3, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Neck Stretch (Rotation)', 'Neck rotational flexibility', 'flexibility', 'Sit or stand tall. Gently turn head to one side, looking over shoulder. Hold for 20-30 seconds. Repeat on other side. Do 2-3 times each side. Move slowly.', 3, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Neck Stretch (Forward)', 'Neck and upper back flexibility', 'flexibility', 'Sit or stand tall. Gently lower chin toward chest until stretch felt in back of neck. Hold for 20-30 seconds. Do 2-3 times. Move slowly and gently.', 3, 'beginner', ARRAY['neck', 'upper_back'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Upper Back Stretch (Seated)', 'Upper back and shoulder flexibility', 'flexibility', 'Sit tall, interlace fingers and extend arms forward, palms facing away. Round upper back, feeling stretch between shoulder blades. Hold for 30 seconds. Do 2-3 times.', 3, 'beginner', ARRAY['upper_back', 'shoulders'], ARRAY['none'], NULL, true, true),
  
  ('Chest Stretch (Wall)', 'Chest and anterior shoulder stretch', 'flexibility', 'Stand facing wall, place palm on wall at shoulder height. Turn body away from wall, feeling stretch in chest. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['chest', 'shoulders'], ARRAY['wall'], 'Avoid if shoulder pain', true, true),
  
  ('Spinal Twist (Seated)', 'Spinal rotation and flexibility', 'flexibility', 'Sit with legs extended or crossed. Place one hand on opposite knee, other hand behind you. Gently twist toward back hand. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'beginner', ARRAY['spine', 'obliques'], ARRAY['none'], 'Avoid if back pain', true, true),
  
  ('Child''s Pose', 'Full body relaxation and flexibility', 'flexibility', 'Start on hands and knees. Sit back on heels, extend arms forward, lowering forehead toward ground. Hold for 30-60 seconds, breathing deeply. Excellent for relaxation.', 5, 'beginner', ARRAY['back', 'shoulders', 'hips'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Cat-Cow Stretch', 'Spinal mobility and flexibility', 'flexibility', 'On hands and knees, arch back and look up (cow), then round spine and tuck chin (cat). Move slowly between positions. Repeat 10-15 times. Excellent for spinal mobility.', 3, 'beginner', ARRAY['spine', 'core'], ARRAY['none'], NULL, true, true),
  
  ('Forward Fold (Standing)', 'Hamstring and back flexibility', 'flexibility', 'Stand with feet hip-width apart. Hinge at hips, lowering torso toward ground. Let head hang, bend knees slightly if needed. Hold for 30-60 seconds. Do 2-3 times.', 5, 'beginner', ARRAY['hamstrings', 'back'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Butterfly Stretch', 'Inner thigh and hip flexibility', 'flexibility', 'Sit with soles of feet together, knees out to sides. Sit tall, gently press knees toward ground. Hold for 30-60 seconds. Can lean forward for deeper stretch. Do 2-3 times.', 5, 'beginner', ARRAY['inner_thighs', 'hips'], ARRAY['none'], 'Avoid if groin pain', true, true),
  
  -- INTERMEDIATE FLEXIBILITY (20 exercises)
  ('Standing Quad Stretch (Advanced)', 'Advanced quadriceps flexibility', 'flexibility', 'Stand on one leg, grab opposite foot and pull heel toward glute. Keep knees together, extend free arm for balance. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'intermediate', ARRAY['quadriceps', 'hip_flexors'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Standing Hamstring Stretch (Advanced)', 'Advanced hamstring flexibility', 'flexibility', 'Stand with one foot on elevated surface. Keep leg straight, hinge at hips to lean forward. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'intermediate', ARRAY['hamstrings'], ARRAY['step', 'chair'], NULL, true, true),
  
  ('Lizard Pose', 'Advanced hip flexor and quadriceps stretch', 'flexibility', 'Start in low lunge. Lower forearms to ground inside front foot. Feel deep stretch in hip flexor. Hold for 30-60 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['hip_flexors', 'quadriceps', 'groin'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Half Splits', 'Hamstring flexibility progression', 'flexibility', 'Start in low lunge. Straighten front leg, flex foot. Hinge at hips, lean forward. Feel stretch in hamstring. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Reclining Hand-to-Big-Toe', 'Supine hamstring stretch', 'flexibility', 'Lie on back, loop towel or strap around foot. Straighten leg toward ceiling, keeping other leg on ground. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'intermediate', ARRAY['hamstrings', 'calves'], ARRAY['towel', 'strap'], NULL, true, true),
  
  ('Seated Forward Fold', 'Deep hamstring and back stretch', 'flexibility', 'Sit with legs extended straight. Hinge at hips, reach forward toward toes. Keep back straight initially, then allow rounding. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['hamstrings', 'back'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Wide-Legged Forward Fold', 'Inner thigh and hamstring stretch', 'flexibility', 'Stand with feet wide apart, toes slightly turned out. Hinge at hips, lower torso toward ground. Can place hands on ground or hold elbows. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['inner_thighs', 'hamstrings', 'back'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Side Angle Pose', 'Lateral body and hip stretch', 'flexibility', 'Step into wide stance, turn one foot out. Bend that knee, place forearm on thigh, extend other arm overhead. Feel stretch along side body. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['obliques', 'hips', 'groin'], ARRAY['none'], NULL, true, true),
  
  ('Triangle Pose', 'Lateral body and hip flexibility', 'flexibility', 'Stand with feet wide, one foot turned out. Extend arms, hinge at hips, reach forward hand to shin or ground, other arm up. Feel stretch along side. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['obliques', 'hips', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Revolved Triangle', 'Spinal rotation and hamstring stretch', 'flexibility', 'From triangle pose, rotate torso, placing opposite hand on ground or shin, other arm up. Feel rotation in spine. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['spine', 'obliques', 'hamstrings'], ARRAY['none'], 'Avoid if back pain', true, true),
  
  ('Cow Face Arms', 'Shoulder and tricep flexibility', 'flexibility', 'Reach one arm up, bend elbow, hand behind head. Reach other arm behind back, try to clasp hands. If can''t reach, use strap. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['shoulders', 'triceps'], ARRAY['strap'], 'Avoid if shoulder pain', true, true),
  
  ('Eagle Arms', 'Shoulder and upper back stretch', 'flexibility', 'Extend arms forward, cross one arm under other, wrap arms around each other, palms together if possible. Lift elbows, feel stretch in shoulders. Hold for 30-45 seconds. Repeat with other arm on top. Do 2-3 times each side.', 5, 'intermediate', ARRAY['shoulders', 'upper_back'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Thread the Needle', 'Shoulder and upper back flexibility', 'flexibility', 'Start on hands and knees. Slide one arm under body, reaching to opposite side. Lower shoulder and head to ground. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'intermediate', ARRAY['shoulders', 'upper_back'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Puppy Pose', 'Shoulder and upper back stretch', 'flexibility', 'Start on hands and knees. Walk hands forward, lower chest toward ground, keeping hips over knees. Feel stretch in shoulders and upper back. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['shoulders', 'upper_back'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Sphinx Pose', 'Lower back and hip flexor stretch', 'flexibility', 'Lie face down, prop up on forearms, elbows under shoulders. Press hips into ground, feel stretch in lower back and hip flexors. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['lower_back', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Cobra Pose', 'Lower back and hip flexor stretch', 'flexibility', 'Lie face down, place hands under shoulders. Press into hands, lift chest off ground, keeping hips on ground. Feel stretch in lower back. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['lower_back', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Upward Facing Dog', 'Full front body stretch', 'flexibility', 'From cobra, press into hands, straighten arms, lift hips and thighs off ground. Keep shoulders over wrists. Feel stretch in front body. Hold for 20-30 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['chest', 'shoulders', 'hip_flexors', 'lower_back'], ARRAY['none'], 'Avoid if lower back or wrist pain', true, true),
  
  ('Downward Facing Dog', 'Full body stretch', 'flexibility', 'Start on hands and knees. Tuck toes, lift hips up and back, forming inverted V. Press hands into ground, lengthen spine. Feel stretch in hamstrings, calves, shoulders. Hold for 30-60 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['hamstrings', 'calves', 'shoulders', 'back'], ARRAY['none'], 'Avoid if wrist or shoulder pain', true, true),
  
  ('Standing Backbend', 'Front body and hip flexor stretch', 'flexibility', 'Stand with feet hip-width apart. Place hands on lower back, fingers pointing down. Gently arch back, lifting chest. Feel stretch in front body. Hold for 20-30 seconds. Do 2-3 times.', 5, 'intermediate', ARRAY['chest', 'hip_flexors', 'lower_back'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Wheel Pose (Bridge Variation)', 'Advanced backbend preparation', 'flexibility', 'Lie on back, bend knees, feet flat. Place hands by ears, fingers toward shoulders. Press into hands and feet, lift hips and chest. Hold for 10-20 seconds. Very advanced. Do 2-3 times.', 5, 'intermediate', ARRAY['chest', 'shoulders', 'hip_flexors', 'lower_back'], ARRAY['none'], 'Avoid if lower back, shoulder, or wrist pain', true, true),
  
  -- ADVANCED FLEXIBILITY (15 exercises)
  ('Full Splits (Front)', 'Ultimate hamstring and hip flexor flexibility', 'flexibility', 'Start in lunge, gradually slide front leg forward and back leg back until in full splits. Use hands for support. Hold for 30-60 seconds. Repeat on other side. Extremely advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['hamstrings', 'hip_flexors', 'groin'], ARRAY['none'], 'Avoid if hip or knee pain', true, true),
  
  ('Full Splits (Side)', 'Ultimate inner thigh and hip flexibility', 'flexibility', 'Sit with legs spread wide. Gradually slide one leg forward, other back, rotating hips. Use hands for support. Hold for 30-60 seconds. Repeat on other side. Extremely advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['inner_thighs', 'hips', 'groin'], ARRAY['none'], 'Avoid if hip pain', true, true),
  
  ('King Pigeon', 'Advanced hip and quadriceps stretch', 'flexibility', 'From pigeon pose, reach back and grab back foot, pulling toward glute. Keep hips square. Feel deep stretch in hip flexor and quad. Hold for 30-60 seconds. Repeat on other side. Very advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['hip_flexors', 'quadriceps', 'hips'], ARRAY['none'], 'Avoid if knee or hip pain', true, true),
  
  ('Standing Splits', 'Advanced hamstring and balance', 'flexibility', 'From standing forward fold, shift weight to one leg, lift other leg up behind you. Can hold leg with hand. Feel stretch in hamstring. Hold for 30-45 seconds. Repeat on other side. Very advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['hamstrings', 'calves'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Scorpion Pose', 'Advanced backbend and hip flexor', 'flexibility', 'Lie face down, reach back and grab feet. Lift chest and pull feet toward head. Very advanced backbend. Hold for 10-20 seconds. Do 2-3 times. Requires significant flexibility.', 5, 'advanced', ARRAY['lower_back', 'hip_flexors', 'shoulders'], ARRAY['none'], 'Avoid if lower back or shoulder pain', true, true),
  
  ('Camel Pose', 'Advanced backbend', 'flexibility', 'Kneel, place hands on heels behind you. Push hips forward, arch back, lift chest. Feel stretch in front body. Hold for 20-30 seconds. Very advanced. Do 2-3 times.', 5, 'advanced', ARRAY['chest', 'hip_flexors', 'lower_back'], ARRAY['none'], 'Avoid if lower back or knee pain', true, true),
  
  ('Wheel Pose', 'Ultimate backbend', 'flexibility', 'Lie on back, place hands by ears. Press into hands and feet, lift entire body into bridge. Very advanced. Hold for 10-20 seconds. Do 2-3 times. Requires significant strength and flexibility.', 5, 'advanced', ARRAY['chest', 'shoulders', 'hip_flexors', 'lower_back'], ARRAY['none'], 'Avoid if lower back, shoulder, or wrist pain', true, true),
  
  ('One-Legged King Pigeon', 'Advanced hip and quadriceps', 'flexibility', 'From pigeon, reach back, grab back foot, pull toward head. Very deep stretch. Hold for 30-60 seconds. Repeat on other side. Extremely advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['hip_flexors', 'quadriceps', 'hips'], ARRAY['none'], 'Avoid if knee or hip pain', true, true),
  
  ('Dancer Pose', 'Balance and quadriceps flexibility', 'flexibility', 'Stand on one leg, bend other knee, grab foot behind you. Kick foot into hand, lean forward. Balance and stretch. Hold for 20-30 seconds. Repeat on other side. Very advanced. Do 2-3 times each side.', 5, 'advanced', ARRAY['quadriceps', 'hip_flexors', 'shoulders'], ARRAY['none'], 'Avoid if balance issues or knee pain', true, true),
  
  ('Forearm Stand', 'Inversion and shoulder flexibility', 'flexibility', 'Start in downward dog, lower to forearms. Walk feet in, lift one leg, then other. Balance in handstand on forearms. Very advanced. Hold for 10-20 seconds. Do 2-3 times.', 5, 'advanced', ARRAY['shoulders', 'core'], ARRAY['wall'], 'Avoid if shoulder pain or high blood pressure', true, true),
  
  ('Headstand', 'Inversion and core strength', 'flexibility', 'Start on hands and knees, place forearms and head on ground forming triangle. Lift hips, walk feet in, lift legs up. Very advanced. Hold for 10-30 seconds. Do 2-3 times.', 5, 'advanced', ARRAY['core', 'shoulders'], ARRAY['wall'], 'Avoid if neck pain or high blood pressure', true, true),
  
  ('Handstand', 'Ultimate inversion', 'flexibility', 'Start in downward dog, kick up into handstand against wall or freestanding. Very advanced. Hold for 10-30 seconds. Do 2-3 times. Requires significant strength and balance.', 5, 'advanced', ARRAY['shoulders', 'core'], ARRAY['wall'], 'Avoid if shoulder pain or high blood pressure', true, true),
  
  ('Scorpion Handstand', 'Ultimate backbend inversion', 'flexibility', 'From handstand, arch back, bringing feet toward head. Extremely advanced. Hold for 5-10 seconds. Do 2-3 times. Requires exceptional flexibility and strength.', 5, 'advanced', ARRAY['lower_back', 'shoulders', 'hip_flexors'], ARRAY['wall'], 'Avoid if back, shoulder pain, or high blood pressure', true, true),
  
  ('Mermaid Pose', 'Advanced lateral and hip flexibility', 'flexibility', 'Sit with one leg bent, foot by hip. Other leg bent, foot on opposite thigh. Reach one arm overhead, other behind back, try to clasp. Very advanced. Hold for 30-45 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'advanced', ARRAY['hips', 'obliques', 'shoulders'], ARRAY['none'], 'Avoid if hip or shoulder pain', true, true),
  
  ('Flying Pigeon', 'Advanced balance and hip flexibility', 'flexibility', 'From standing, lift one leg, place ankle on opposite thigh. Balance on standing leg. Can fold forward. Very advanced. Hold for 20-30 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'advanced', ARRAY['hips', 'balance', 'core'], ARRAY['none'], 'Avoid if balance issues or hip pain', true, true),
  
  -- ============================================
  -- MOBILITY EXERCISES (40-50 exercises)
  -- ============================================
  
  -- BEGINNER MOBILITY (20 exercises)
  ('Ankle Circles', 'Ankle mobility and flexibility', 'mobility', 'Sit or stand. Lift one foot and rotate ankle in circle 10 times clockwise, then 10 times counterclockwise. Repeat on other side. Do 2-3 sets each direction.', 2, 'beginner', ARRAY['ankles'], ARRAY['none'], NULL, true, true),
  
  ('Ankle Pumps', 'Ankle range of motion', 'mobility', 'Sit or lie down. Point toes away from you, then pull toes toward you. Repeat 20 times. Do 2-3 sets. Excellent for circulation and ankle mobility.', 2, 'beginner', ARRAY['ankles', 'calves'], ARRAY['none'], NULL, true, true),
  
  ('Ankle Alphabet', 'Ankle mobility exercise', 'mobility', 'Sit with leg extended. Using big toe as pointer, draw alphabet in air. Complete entire alphabet. Repeat with other foot. Do 2-3 sets each foot.', 5, 'beginner', ARRAY['ankles'], ARRAY['none'], NULL, true, true),
  
  ('Hip Circles', 'Hip joint mobility', 'mobility', 'Stand on one leg, hold onto wall for support. Lift other leg and make slow circles with hip, keeping leg straight. 10 circles each direction, then switch legs. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['hips'], ARRAY['wall'], NULL, true, true),
  
  ('Hip Circles (Lying)', 'Lying hip mobility', 'mobility', 'Lie on back, lift one leg, make circles with hip. 10 circles each direction. Repeat with other leg. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['hips'], ARRAY['none'], NULL, true, true),
  
  ('Shoulder Circles', 'Shoulder joint mobility', 'mobility', 'Stand with arms at sides. Slowly circle shoulders forward 10 times, then backward 10 times. Can do one arm at a time or both together. Do 2-3 sets each direction.', 3, 'beginner', ARRAY['shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Arm Circles', 'Shoulder and arm mobility', 'mobility', 'Extend arms out to sides. Make small circles, gradually increasing size. 10 circles forward, then 10 backward. Do 2-3 sets each direction.', 3, 'beginner', ARRAY['shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Wrist Circles', 'Wrist mobility', 'mobility', 'Extend arms forward, make circles with wrists. 10 circles each direction. Do 2-3 sets each direction. Important for wrist health.', 2, 'beginner', ARRAY['wrists'], ARRAY['none'], 'Avoid if wrist pain', true, true),
  
  ('Neck Rolls', 'Gentle neck mobility', 'mobility', 'Slowly roll head in circle, one direction 5 times, then reverse 5 times. Keep movements slow and controlled. Do 2-3 sets each direction.', 2, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Neck Side to Side', 'Neck lateral mobility', 'mobility', 'Slowly turn head side to side, looking over each shoulder. 10 times each side. Keep movements controlled. Do 2-3 sets.', 2, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Spinal Waves', 'Spinal mobility', 'mobility', 'Stand with feet hip-width apart. Slowly roll down vertebra by vertebra, then roll back up. Feel movement through entire spine. Repeat 10 times. Do 2-3 sets.', 5, 'beginner', ARRAY['spine'], ARRAY['none'], 'Avoid if back pain', true, true),
  
  ('Cat-Cow Stretch', 'Spinal mobility and flexibility', 'mobility', 'On hands and knees, arch back and look up (cow), then round spine and tuck chin (cat). Move slowly between positions. Repeat 10-15 times. Excellent for spinal mobility.', 3, 'beginner', ARRAY['spine', 'core'], ARRAY['none'], NULL, true, true),
  
  ('Hip Hinges', 'Hip mobility and posterior chain', 'mobility', 'Stand with slight bend in knees. Hinge at hips, pushing hips back, lowering torso. Keep back straight. Return to start. Repeat 10-15 times. Do 2-3 sets.', 5, 'beginner', ARRAY['hips', 'hamstrings'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Leg Swings (Forward)', 'Hip mobility and warm-up', 'mobility', 'Stand holding onto wall. Swing one leg forward and back, keeping it straight. 10-15 swings. Repeat with other leg. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['hips', 'hip_flexors'], ARRAY['wall'], NULL, true, true),
  
  ('Leg Swings (Side)', 'Hip abduction/adduction mobility', 'mobility', 'Stand holding onto wall. Swing one leg side to side across body. 10-15 swings. Repeat with other leg. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['hips'], ARRAY['wall'], NULL, true, true),
  
  ('Knee Circles', 'Knee joint mobility', 'mobility', 'Stand with slight bend in knees, hands on knees. Make circles with knees, 10 times each direction. Keep movements small and controlled. Do 2-3 sets each direction.', 2, 'beginner', ARRAY['knees'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Shoulder Shrugs', 'Upper trap and neck mobility', 'mobility', 'Stand or sit. Lift shoulders up toward ears, hold for 2 seconds, lower. Repeat 10-15 times. Do 2-3 sets. Good for releasing tension.', 2, 'beginner', ARRAY['upper_traps', 'neck'], ARRAY['none'], NULL, true, true),
  
  ('Shoulder Blade Slides', 'Scapular mobility', 'mobility', 'Stand with back against wall. Slide shoulder blades up wall, then down. Keep contact with wall. Repeat 10-15 times. Do 2-3 sets.', 3, 'beginner', ARRAY['shoulder_blades', 'upper_back'], ARRAY['wall'], NULL, true, true),
  
  ('Thoracic Extension', 'Upper back mobility', 'mobility', 'Sit or stand. Place hands behind head, elbows out. Arch upper back, looking up slightly. Return to start. Repeat 10-15 times. Do 2-3 sets.', 3, 'beginner', ARRAY['upper_back', 'thoracic_spine'], ARRAY['none'], 'Avoid if neck pain', true, true),
  
  ('Thoracic Rotation', 'Spinal rotation mobility', 'mobility', 'Sit with hands behind head. Rotate upper body to one side, keeping hips still. Return to center, rotate other side. Repeat 10 times each side. Do 2-3 sets.', 5, 'beginner', ARRAY['thoracic_spine', 'obliques'], ARRAY['none'], 'Avoid if back pain', true, true),
  
  -- INTERMEDIATE MOBILITY (15 exercises)
  ('World''s Greatest Stretch', 'Full body mobility', 'mobility', 'Step into lunge, place opposite hand on ground inside front foot. Rotate torso, reaching same-side arm up. Return, step forward, repeat on other side. Excellent mobility exercise. Do 10-12 reps each side.', 5, 'intermediate', ARRAY['hips', 'thoracic_spine', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Walking Spiderman', 'Hip and thoracic mobility', 'mobility', 'Start in plank. Step one foot to outside of same hand. Rotate torso, reaching arm up. Return to plank, step other foot forward. Continue walking forward. Do 10-12 steps each side.', 5, 'intermediate', ARRAY['hips', 'thoracic_spine', 'shoulders'], ARRAY['none'], NULL, true, true),
  
  ('Hip CARs (Controlled Articular Rotations)', 'Hip joint mobility', 'mobility', 'Stand on one leg. Slowly move other leg through full range of motion in circular pattern, keeping control. 5 circles each direction. Repeat on other side. Advanced mobility work. Do 2-3 sets each leg.', 5, 'intermediate', ARRAY['hips'], ARRAY['none'], NULL, true, true),
  
  ('Shoulder CARs', 'Shoulder joint mobility', 'mobility', 'Stand with arm extended. Slowly move arm through full range of motion in circular pattern, keeping control. 5 circles each direction. Repeat with other arm. Advanced mobility work. Do 2-3 sets each arm.', 5, 'intermediate', ARRAY['shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Spinal Waves (Advanced)', 'Advanced spinal mobility', 'mobility', 'Stand with feet hip-width apart. Initiate movement from pelvis, creating wave through spine. More advanced than basic spinal waves. Repeat 10-15 times. Do 2-3 sets.', 5, 'intermediate', ARRAY['spine', 'core'], ARRAY['none'], 'Avoid if back pain', true, true),
  
  ('90/90 Hip Switches', 'Hip internal/external rotation', 'mobility', 'Sit with one leg bent at 90 degrees in front, other bent at 90 degrees behind. Switch positions, rotating hips. Feel stretch and mobility. Repeat 10-12 times each side. Do 2-3 sets.', 5, 'intermediate', ARRAY['hips'], ARRAY['none'], 'Avoid if hip pain', true, true),
  
  ('Cossack Squats', 'Hip and ankle mobility', 'mobility', 'Stand with feet wide, toes turned out. Shift weight to one side, squat down on that leg, keeping other leg straight. Return to center, repeat other side. Excellent for hip mobility. Do 10-12 reps each side.', 5, 'intermediate', ARRAY['hips', 'ankles', 'groin'], ARRAY['none'], 'Avoid if knee or hip pain', true, true),
  
  ('Lizard Lunge with Rotation', 'Hip and thoracic mobility', 'mobility', 'Start in low lunge. Place forearm on ground inside front foot. Rotate torso, reaching opposite arm up and back. Return, repeat other side. Do 8-10 reps each side.', 5, 'intermediate', ARRAY['hips', 'thoracic_spine', 'hip_flexors'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Thread the Needle Flow', 'Shoulder and thoracic mobility flow', 'mobility', 'Start on hands and knees. Thread one arm under body, then reach it up and back. Flow between positions. Repeat on other side. Do 8-10 reps each side. Do 2-3 sets.', 5, 'intermediate', ARRAY['shoulders', 'thoracic_spine'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Scapular Wall Slides', 'Scapular and shoulder mobility', 'mobility', 'Stand with back against wall, arms in W position. Slide arms up wall, keeping contact. Lower slowly. Repeat 10-15 times. Do 2-3 sets. Excellent for posture.', 5, 'intermediate', ARRAY['shoulder_blades', 'shoulders'], ARRAY['wall'], NULL, true, true),
  
  ('Bear Crawl Circles', 'Full body mobility', 'mobility', 'Start in bear crawl position (hands and feet, knees slightly off ground). Crawl in circle, keeping low. 5 circles each direction. Do 2-3 sets each direction.', 5, 'intermediate', ARRAY['shoulders', 'hips', 'core'], ARRAY['none'], 'Avoid if wrist or shoulder pain', true, true),
  
  ('Inchworms', 'Full body mobility and warm-up', 'mobility', 'Stand, fold forward, walk hands out to plank. Hold briefly, walk feet back to hands. Stand up. Repeat 8-10 times. Excellent full body mobility. Do 2-3 sets.', 5, 'intermediate', ARRAY['hamstrings', 'shoulders', 'core'], ARRAY['none'], 'Avoid if lower back or shoulder pain', true, true),
  
  ('Reverse Tabletop', 'Hip flexor and shoulder mobility', 'mobility', 'Sit with hands behind you, fingers pointing forward. Lift hips up, creating tabletop shape. Hold for 10-15 seconds. Lower, repeat. Do 8-10 reps. Do 2-3 sets.', 5, 'intermediate', ARRAY['hip_flexors', 'shoulders', 'core'], ARRAY['none'], 'Avoid if wrist or shoulder pain', true, true),
  
  ('Single Leg Romanian Deadlift (Unweighted)', 'Hip and hamstring mobility', 'mobility', 'Stand on one leg, slight bend in knee. Hinge at hips, lowering torso while lifting other leg back. Focus on mobility and control. Return to start. Repeat 10-12 times each leg. Do 2-3 sets.', 5, 'intermediate', ARRAY['hips', 'hamstrings'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Windmills', 'Hip and thoracic mobility', 'mobility', 'Stand with feet wide, one arm up. Hinge at hips, reach down toward opposite foot, other arm up. Return to start. Repeat 10-12 times each side. Do 2-3 sets.', 5, 'intermediate', ARRAY['hips', 'thoracic_spine', 'hamstrings'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  -- ADVANCED MOBILITY (10 exercises)
  ('Loaded Hip Flexor Stretch', 'Advanced hip flexor mobility', 'mobility', 'Start in lunge, place back foot on elevated surface. Sink into stretch, then add small pulses or circles. Very deep stretch. Hold for 30-60 seconds. Repeat on other side. Do 2-3 times each side.', 5, 'advanced', ARRAY['hip_flexors', 'quadriceps'], ARRAY['bench', 'step'], 'Avoid if knee or hip pain', true, true),
  
  ('Loaded Calf Stretch', 'Advanced calf mobility', 'mobility', 'Stand on step with one foot, heel hanging off. Lower heel, then add small pulses or circles. Very deep stretch. Hold for 30-60 seconds. Repeat on other side. Do 2-3 times each leg.', 5, 'advanced', ARRAY['calves'], ARRAY['step'], NULL, true, true),
  
  ('Weighted Shoulder Dislocations', 'Advanced shoulder mobility', 'mobility', 'Hold stick or band with wide grip. Lift overhead, bring behind back, then return. Keep arms straight. Very advanced. Repeat 10-12 times. Do 2-3 sets. Requires significant shoulder mobility.', 5, 'advanced', ARRAY['shoulders'], ARRAY['stick', 'band'], 'Avoid if shoulder pain', true, true),
  
  ('Loaded Spinal Rotation', 'Advanced thoracic mobility', 'mobility', 'Sit with resistance band or weight. Rotate torso against resistance, then return. Very advanced. Repeat 10-12 times each side. Do 2-3 sets.', 5, 'advanced', ARRAY['thoracic_spine', 'obliques'], ARRAY['band', 'weight'], 'Avoid if back pain', true, true),
  
  ('Loaded Hip Circles', 'Advanced hip mobility', 'mobility', 'Stand on one leg with weight or band around ankle. Make controlled circles with hip, keeping control. Very advanced. 10 circles each direction. Repeat on other side. Do 2-3 sets each leg.', 5, 'advanced', ARRAY['hips'], ARRAY['weight', 'band'], NULL, true, true),
  
  ('Loaded Ankle Mobility', 'Advanced ankle mobility', 'mobility', 'Place band around foot, anchor to fixed point. Move ankle through full range of motion against resistance. Very advanced. Repeat 10-15 times each direction. Do 2-3 sets each foot.', 5, 'advanced', ARRAY['ankles'], ARRAY['band'], NULL, true, true),
  
  ('Loaded Wrist Mobility', 'Advanced wrist mobility', 'mobility', 'Hold light weight, move wrist through full range of motion. Flex, extend, side to side, circles. Very advanced. Repeat 10 times each direction. Do 2-3 sets each wrist.', 5, 'advanced', ARRAY['wrists'], ARRAY['weight'], 'Avoid if wrist pain', true, true),
  
  ('Loaded Neck Mobility', 'Advanced neck mobility', 'mobility', 'Place hand on head, gently resist as you move head through range of motion. Very advanced, use caution. Repeat 5-8 times each direction. Do 2-3 sets.', 5, 'advanced', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Loaded Hip Hinge', 'Advanced posterior chain mobility', 'mobility', 'Perform hip hinge with weight, focusing on full range of motion and control. Very advanced. Repeat 10-12 times. Do 2-3 sets.', 5, 'advanced', ARRAY['hips', 'hamstrings'], ARRAY['weight'], 'Avoid if lower back pain', true, true),
  
  ('Loaded Squat Mobility', 'Advanced lower body mobility', 'mobility', 'Perform deep squats with weight, focusing on full range of motion. Very advanced. Repeat 10-12 times. Do 2-3 sets.', 5, 'advanced', ARRAY['hips', 'ankles', 'knees'], ARRAY['weight'], 'Avoid if knee pain', true, true),
  
  -- ============================================
  -- CARDIO EXERCISES (20-30 exercises)
  -- ============================================
  
  -- BEGINNER CARDIO (10 exercises)
  ('Walking', 'Low impact cardiovascular exercise', 'cardio', 'Walk at comfortable pace, maintaining steady rhythm. Start with 10-15 minutes, gradually increase to 30-60 minutes. Can be done indoors or outdoors. Excellent for beginners.', 15, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], NULL, true, true),
  
  ('Marching in Place', 'Low-impact cardiovascular exercise', 'cardio', 'March in place, lifting knees high. Pump arms naturally. Start with 2-3 minutes, work up to 5-10 minutes. Excellent for beginners or limited space.', 5, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], NULL, true, true),
  
  ('Step-ups (Cardio)', 'Low impact lower body cardio', 'cardio', 'Step up onto step or platform, one foot at a time. Step down. Continue alternating. Start with 2-3 minutes, work up to 5-10 minutes. Do at steady pace.', 5, 'beginner', ARRAY['cardio', 'quadriceps', 'glutes'], ARRAY['step', 'platform'], 'Avoid if knee pain', true, true),
  
  ('Seated Marching', 'Seated cardiovascular exercise', 'cardio', 'Sit in chair, lift knees alternately as if marching. Pump arms. Start with 2-3 minutes, work up to 5-10 minutes. Excellent for those with limited mobility.', 5, 'beginner', ARRAY['cardio', 'legs'], ARRAY['chair'], NULL, true, true),
  
  ('Arm Circles (Cardio)', 'Upper body cardio', 'cardio', 'Stand with arms extended. Make large circles with arms, increasing speed. Continue for 2-3 minutes. Good for upper body warm-up and light cardio.', 3, 'beginner', ARRAY['cardio', 'shoulders'], ARRAY['none'], 'Avoid if shoulder pain', true, true),
  
  ('Standing Knee Lifts', 'Low impact cardio', 'cardio', 'Stand tall, lift knees alternately toward chest. Pump arms. Start with 2-3 minutes, work up to 5 minutes. Good for beginners.', 3, 'beginner', ARRAY['cardio', 'hip_flexors'], ARRAY['none'], NULL, true, true),
  
  ('Heel Taps', 'Low impact cardio', 'cardio', 'Stand tall, tap heels alternately in front of you. Continue for 2-3 minutes. Very low impact, good for beginners.', 3, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], NULL, true, true),
  
  ('Side Steps', 'Lateral cardio movement', 'cardio', 'Stand with feet together. Step to side, bring other foot to meet it. Continue side to side. Start with 2-3 minutes. Good for beginners.', 3, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], NULL, true, true),
  
  ('Seated Bicycle', 'Seated cardio exercise', 'cardio', 'Sit in chair, lean back slightly. Alternately bring knees toward chest in bicycle motion. Continue for 2-3 minutes. Good for limited mobility.', 3, 'beginner', ARRAY['cardio', 'legs', 'core'], ARRAY['chair'], NULL, true, true),
  
  ('Standing Toe Taps', 'Low impact cardio', 'cardio', 'Stand tall, tap toes alternately in front of you. Continue for 2-3 minutes. Very low impact.', 3, 'beginner', ARRAY['cardio', 'legs'], ARRAY['none'], NULL, true, true),
  
  -- INTERMEDIATE CARDIO (10 exercises)
  ('Jumping Jacks', 'Cardiovascular and full-body movement', 'cardio', 'Jump feet apart while raising arms overhead, then return. Start with 20-30 reps, work up to 50-100. Do 2-3 sets. Moderate intensity.', 5, 'intermediate', ARRAY['cardio', 'full_body'], ARRAY['none'], 'Avoid if knee or ankle pain', true, true),
  
  ('High Knees', 'Cardiovascular exercise', 'cardio', 'Run in place, lifting knees high toward chest. Pump arms. Start with 30 seconds, work up to 1-2 minutes. Do 2-3 sets. Moderate to high intensity.', 5, 'intermediate', ARRAY['cardio', 'legs', 'hip_flexors'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Butt Kicks', 'Cardiovascular exercise', 'cardio', 'Run in place, kicking heels toward glutes. Pump arms. Start with 30 seconds, work up to 1-2 minutes. Do 2-3 sets. Moderate intensity.', 5, 'intermediate', ARRAY['cardio', 'legs', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Mountain Climbers', 'Cardio and core conditioning', 'cardio', 'Start in plank position. Alternately bring knees toward chest in running motion. Keep core engaged. Start with 20-30 reps, work up to 50. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['core', 'cardio', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  ('Burpees', 'Full body conditioning', 'cardio', 'Start standing. Drop into squat, jump back to plank, do push-up, jump feet forward, jump up with arms overhead. Start with 5-10 reps, work up to 20. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['full_body', 'cardio'], ARRAY['none'], 'Avoid if knee or back pain', true, true),
  
  ('Jump Rope (Imaginary)', 'Cardiovascular exercise', 'cardio', 'Mimic jump rope motion without rope. Jump on balls of feet, rotating wrists. Start with 30 seconds, work up to 1-2 minutes. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['cardio', 'calves'], ARRAY['none'], 'Avoid if knee or ankle pain', true, true),
  
  ('Skaters', 'Lateral cardio movement', 'cardio', 'Jump side to side, landing on one foot, other leg extended behind. Swing arms. Start with 20-30 reps, work up to 50. Do 2-3 sets. Moderate to high intensity.', 5, 'intermediate', ARRAY['cardio', 'legs', 'glutes'], ARRAY['none'], 'Avoid if knee or ankle pain', true, true),
  
  ('Squat Jumps', 'Explosive lower body cardio', 'cardio', 'Perform squat, then explode up into jump. Land softly, immediately go into next squat. Start with 10-15 reps, work up to 25. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Lunge Jumps', 'Explosive lower body cardio', 'cardio', 'Start in lunge position. Explode up, switching legs in air, landing in opposite lunge. Start with 10 reps (5 each leg), work up to 20. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Plank Jacks', 'Cardio and core conditioning', 'cardio', 'Start in plank position. Jump feet apart, then jump back together. Keep core engaged throughout. Start with 20 reps, work up to 40. Do 2-3 sets. High intensity.', 5, 'intermediate', ARRAY['core', 'cardio', 'shoulders'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  -- ADVANCED CARDIO (10 exercises)
  ('Plyometric Burpees', 'Ultimate full body cardio', 'cardio', 'Perform burpee with explosive jump at end, adding tuck jump. Extremely high intensity. Start with 5-10 reps, work up to 20. Do 2-3 sets. Very advanced.', 5, 'advanced', ARRAY['full_body', 'cardio'], ARRAY['none'], 'Avoid if knee, back, or shoulder pain', true, true),
  
  ('Box Jumps', 'Explosive lower body power', 'cardio', 'Stand in front of box or platform. Jump onto box, landing softly. Step down, repeat. Start with 10 reps, work up to 20-30. Do 2-3 sets. Very high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['box', 'platform'], 'Avoid if knee or ankle pain', true, true),
  
  ('Single Leg Box Jumps', 'Advanced plyometric', 'cardio', 'Stand on one leg in front of box. Jump onto box on one leg. Land softly. Very advanced. Start with 5 reps each leg, work up to 10. Do 2-3 sets. Extremely high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['box'], 'Avoid if knee pain', true, true),
  
  ('Broad Jumps', 'Explosive horizontal power', 'cardio', 'Stand, jump forward as far as possible. Land softly, walk back, repeat. Start with 5-10 reps, work up to 15-20. Do 2-3 sets. Very high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['none'], 'Avoid if knee or ankle pain', true, true),
  
  ('Tuck Jumps', 'Explosive vertical power', 'cardio', 'Jump up, bringing knees toward chest. Land softly, immediately jump again. Start with 10 reps, work up to 20-30. Do 2-3 sets. Very high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['none'], 'Avoid if knee pain', true, true),
  
  ('Star Jumps', 'Explosive full body cardio', 'cardio', 'Jump up, spreading legs and arms wide like star. Land softly, return to start. Start with 10 reps, work up to 20-30. Do 2-3 sets. Very high intensity.', 5, 'advanced', ARRAY['full_body', 'cardio'], ARRAY['none'], 'Avoid if knee or ankle pain', true, true),
  
  ('Sprint Intervals', 'Maximum intensity cardio', 'cardio', 'Sprint as fast as possible for 20-30 seconds, then rest 30-60 seconds. Repeat 5-10 times. Very high intensity. Do 2-3 sets. Extremely advanced.', 10, 'advanced', ARRAY['cardio', 'legs'], ARRAY['none'], 'Avoid if knee, ankle, or cardiovascular issues', true, true),
  
  ('Plyometric Lunges', 'Explosive unilateral cardio', 'cardio', 'Start in lunge. Explode up, switching legs in air. Land in opposite lunge. Continue rapidly. Start with 10 reps (5 each leg), work up to 20. Do 2-3 sets. Very high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Depth Jumps', 'Advanced plyometric', 'cardio', 'Stand on box, step off, land and immediately jump up as high as possible. Very advanced. Start with 5 reps, work up to 10. Do 2-3 sets. Extremely high intensity.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'calves', 'cardio'], ARRAY['box'], 'Avoid if knee or ankle pain', true, true),
  
  ('Plyometric Push-ups', 'Explosive upper body cardio', 'cardio', 'Perform push-up explosively, hands leaving ground. Land softly, repeat. Very advanced. Start with 5-10 reps, work up to 15-20. Do 2-3 sets. High intensity.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps', 'cardio'], ARRAY['none'], 'Avoid if shoulder or wrist pain', true, true),
  
  -- ============================================
  -- BALANCE EXERCISES (20-30 exercises)
  -- ============================================
  
  -- BEGINNER BALANCE (15 exercises)
  ('Single Leg Balance', 'Improve balance and stability', 'balance', 'Stand on one leg, hold for 30 seconds. Progress to closing eyes. Repeat on other leg. Start with eyes open, progress to eyes closed. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['core', 'ankles'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Tandem Stance', 'Balance and coordination', 'balance', 'Stand with one foot directly in front of other, heel to toe. Hold for 30 seconds. Repeat with other foot forward. Progress to closing eyes. Do 2-3 sets each side.', 3, 'beginner', ARRAY['core', 'ankles'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Heel-to-Toe Walk', 'Dynamic balance exercise', 'balance', 'Walk forward placing heel of one foot directly in front of toe of other. Walk 10-15 steps. Can use wall for support initially. Do 2-3 sets. Excellent for balance.', 3, 'beginner', ARRAY['core', 'ankles'], ARRAY['wall'], 'Avoid if balance issues', true, true),
  
  ('Standing on One Leg (Eyes Closed)', 'Advanced balance challenge', 'balance', 'Stand on one leg with eyes closed. Hold for 10-20 seconds. Repeat on other leg. Very challenging. Do 2-3 sets each leg. Use wall for safety if needed.', 3, 'beginner', ARRAY['core', 'ankles', 'proprioception'], ARRAY['wall'], 'Avoid if severe balance issues', true, true),
  
  ('Single Leg Balance with Arm Reach', 'Balance and coordination', 'balance', 'Stand on one leg. Reach opposite arm forward, then to side, then overhead. Maintain balance. Repeat on other side. Do 2-3 sets each leg.', 5, 'beginner', ARRAY['core', 'ankles', 'shoulders'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Knee Lift', 'Balance and hip strength', 'balance', 'Stand on one leg. Lift other knee toward chest, hold for 10-15 seconds. Lower slowly. Repeat on other side. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['core', 'ankles', 'hip_flexors'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Leg Swing', 'Dynamic balance', 'balance', 'Stand on one leg. Swing other leg forward and back, maintaining balance. 10-15 swings. Repeat on other side. Do 2-3 sets each leg.', 3, 'beginner', ARRAY['core', 'ankles', 'hips'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Standing on Toes', 'Calf and balance', 'balance', 'Stand with feet together. Rise onto toes, hold for 10-15 seconds. Lower slowly. Can hold onto wall for support. Do 2-3 sets of 10-15 reps.', 3, 'beginner', ARRAY['calves', 'ankles', 'balance'], ARRAY['wall'], NULL, true, true),
  
  ('Single Leg Toe Taps', 'Balance and coordination', 'balance', 'Stand on one leg. Tap other foot forward, to side, and behind, maintaining balance. 5 taps each direction. Repeat on other side. Do 2-3 sets each leg.', 5, 'beginner', ARRAY['core', 'ankles'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Standing Hip Abduction (Balance)', 'Hip strength and balance', 'balance', 'Stand on one leg, lift other leg out to side. Hold for 10-15 seconds. Lower slowly. Repeat on other side. Do 2-3 sets each leg. Can hold onto wall initially.', 5, 'beginner', ARRAY['hip_abductors', 'core', 'balance'], ARRAY['wall'], 'Avoid if balance issues', true, true),
  
  ('Standing Hip Extension (Balance)', 'Glute strength and balance', 'balance', 'Stand on one leg, lift other leg straight back. Hold for 10-15 seconds. Lower slowly. Repeat on other side. Do 2-3 sets each leg. Can hold onto wall initially.', 5, 'beginner', ARRAY['glutes', 'core', 'balance'], ARRAY['wall'], 'Avoid if balance issues', true, true),
  
  ('Tree Pose', 'Yoga balance pose', 'balance', 'Stand on one leg, place other foot on inner thigh or calf (not knee). Bring hands to prayer position or overhead. Hold for 30-60 seconds. Repeat on other side. Do 2-3 sets each side.', 5, 'beginner', ARRAY['core', 'ankles', 'hips'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Standing Quad Stretch (Balance)', 'Balance and flexibility', 'balance', 'Stand on one leg, grab other foot and pull heel toward glute. Hold for 20-30 seconds, maintaining balance. Repeat on other side. Do 2-3 sets each leg.', 5, 'beginner', ARRAY['quadriceps', 'core', 'balance'], ARRAY['none'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Single Leg Deadlift (Balance)', 'Balance and posterior chain', 'balance', 'Stand on one leg, slight bend in knee. Hinge at hips, lowering torso while lifting other leg back. Return to start. Focus on balance. Repeat 8-10 times each leg. Do 2-3 sets.', 5, 'beginner', ARRAY['hamstrings', 'glutes', 'core', 'balance'], ARRAY['none'], 'Avoid if lower back pain or balance issues', true, true),
  
  ('Standing Marching', 'Dynamic balance', 'balance', 'Stand tall, lift knees alternately as if marching, maintaining balance. Start with 20-30 steps. Progress to closing eyes. Do 2-3 sets. Good for balance training.', 3, 'beginner', ARRAY['core', 'ankles', 'balance'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  -- INTERMEDIATE BALANCE (10 exercises)
  ('Single Leg Squat (Balance)', 'Advanced balance and strength', 'balance', 'Stand on one leg, lower into squat while maintaining balance. Can hold onto support initially. Return to start. Repeat 5-8 times each leg. Do 2-3 sets. Very challenging.', 5, 'intermediate', ARRAY['quadriceps', 'glutes', 'core', 'balance'], ARRAY['wall', 'chair'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Single Leg Romanian Deadlift (Balance)', 'Balance and posterior chain', 'balance', 'Stand on one leg, hinge at hips, lowering torso while lifting other leg back. Focus on balance and control. Return to start. Repeat 10-12 times each leg. Do 2-3 sets.', 5, 'intermediate', ARRAY['hamstrings', 'glutes', 'core', 'balance'], ARRAY['none'], 'Avoid if lower back pain or balance issues', true, true),
  
  ('Single Leg Balance with Rotation', 'Advanced balance and core', 'balance', 'Stand on one leg. Rotate torso side to side while maintaining balance. 10-15 rotations each direction. Repeat on other side. Do 2-3 sets each leg. Very challenging.', 5, 'intermediate', ARRAY['core', 'obliques', 'balance'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Overhead Reach', 'Balance and shoulder mobility', 'balance', 'Stand on one leg. Reach opposite arm overhead and across body, maintaining balance. Return to start. Repeat 10-12 times each side. Do 2-3 sets.', 5, 'intermediate', ARRAY['core', 'shoulders', 'balance'], ARRAY['none'], 'Avoid if balance or shoulder issues', true, true),
  
  ('Single Leg Balance with Leg Circles', 'Advanced balance and hip mobility', 'balance', 'Stand on one leg. Make circles with other leg, maintaining balance. 10 circles each direction. Repeat on other side. Do 2-3 sets each leg. Very challenging.', 5, 'intermediate', ARRAY['core', 'hips', 'balance'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Warrior III Pose', 'Yoga balance pose', 'balance', 'Stand on one leg, hinge forward, lifting other leg back. Arms can be forward or at sides. Body forms T shape. Hold for 20-30 seconds. Repeat on other side. Do 2-3 sets each side.', 5, 'intermediate', ARRAY['core', 'hamstrings', 'balance'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance on Unstable Surface', 'Advanced balance challenge', 'balance', 'Stand on one leg on pillow or cushion. Maintain balance. Hold for 20-30 seconds. Repeat on other side. Very challenging. Do 2-3 sets each leg.', 5, 'intermediate', ARRAY['core', 'ankles', 'proprioception'], ARRAY['pillow', 'cushion'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Ball Toss', 'Dynamic balance and coordination', 'balance', 'Stand on one leg. Toss ball or object to partner or wall, catch while maintaining balance. 10-15 tosses. Repeat on other side. Do 2-3 sets each leg. Requires partner or wall.', 5, 'intermediate', ARRAY['core', 'coordination', 'balance'], ARRAY['ball'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Head Turns', 'Balance and vestibular challenge', 'balance', 'Stand on one leg. Turn head side to side while maintaining balance. 10-15 turns each direction. Repeat on other side. Very challenging. Do 2-3 sets each leg.', 5, 'intermediate', ARRAY['core', 'balance', 'vestibular'], ARRAY['none'], 'Avoid if balance issues or neck problems', true, true),
  
  ('Single Leg Balance with Eyes Closed (Advanced)', 'Ultimate balance challenge', 'balance', 'Stand on one leg with eyes closed. Hold for 20-30 seconds. Extremely challenging. Repeat on other side. Do 2-3 sets each leg. Use wall for safety.', 5, 'intermediate', ARRAY['core', 'ankles', 'proprioception'], ARRAY['wall'], 'Avoid if severe balance issues', true, true),
  
  -- ADVANCED BALANCE (5 exercises)
  ('Single Leg Squat (Eyes Closed)', 'Ultimate balance and strength', 'balance', 'Stand on one leg with eyes closed. Lower into squat while maintaining balance. Extremely challenging. Hold for 5-10 seconds. Return to start. Repeat 3-5 times each leg. Do 2-3 sets. Very advanced.', 5, 'advanced', ARRAY['quadriceps', 'glutes', 'core', 'balance'], ARRAY['wall'], 'Avoid if knee pain or balance issues', true, true),
  
  ('Single Leg Balance on BOSU', 'Advanced unstable surface balance', 'balance', 'Stand on one leg on BOSU ball (dome side up or down). Maintain balance. Hold for 30-60 seconds. Repeat on other side. Extremely challenging. Do 2-3 sets each leg. Requires BOSU ball.', 5, 'advanced', ARRAY['core', 'ankles', 'proprioception'], ARRAY['bosu_ball'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Weight Transfer', 'Advanced balance and coordination', 'balance', 'Stand on one leg. Pass weight or object around body while maintaining balance. 10-15 passes. Repeat on other side. Very challenging. Do 2-3 sets each leg. Requires weight or object.', 5, 'advanced', ARRAY['core', 'coordination', 'balance'], ARRAY['weight'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Partner Push', 'Reactive balance training', 'balance', 'Stand on one leg. Partner gently pushes you from various directions. React and maintain balance. 30-60 seconds. Repeat on other side. Extremely challenging. Do 2-3 sets each leg. Requires partner.', 5, 'advanced', ARRAY['core', 'reactive_balance'], ARRAY['partner'], 'Avoid if balance issues', true, true),
  
  ('Single Leg Balance with Complex Movements', 'Ultimate balance challenge', 'balance', 'Stand on one leg. Perform complex movement sequence (squat, reach, rotate) while maintaining balance. Extremely advanced. 5-8 sequences. Repeat on other side. Do 2-3 sets each leg.', 5, 'advanced', ARRAY['core', 'full_body', 'balance'], ARRAY['none'], 'Avoid if balance issues', true, true),
  
  -- ============================================
  -- REHABILITATION EXERCISES (50-60 exercises)
  -- ============================================
  
  -- BEGINNER REHABILITATION (30 exercises)
  ('Quad Sets', 'Knee rehabilitation exercise', 'rehabilitation', 'Sit or lie with leg extended. Tighten quadriceps muscle, pushing back of knee toward ground. Hold for 5-10 seconds, relax. Repeat 10-15 times. Do 2-3 sets. Excellent for knee rehab.', 5, 'beginner', ARRAY['quadriceps'], ARRAY['none'], NULL, true, true),
  
  ('Straight Leg Raises', 'Hip and quadriceps rehabilitation', 'rehabilitation', 'Lie on back, one leg bent, other straight. Tighten quad, lift straight leg 6-12 inches off ground. Hold for 5-10 seconds, lower slowly. Repeat 10-15 times. Do 2-3 sets each leg.', 5, 'beginner', ARRAY['quadriceps', 'hip_flexors'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Heel Slides', 'Knee range of motion', 'rehabilitation', 'Lie on back, slide heel toward glutes, bending knee. Slide back to straight. Repeat 10-15 times. Do 2-3 sets each leg. Excellent for knee ROM after injury or surgery.', 5, 'beginner', ARRAY['knees', 'quadriceps'], ARRAY['none'], 'Avoid if severe knee pain', true, true),
  
  ('Ankle Pumps', 'Ankle and circulation rehabilitation', 'rehabilitation', 'Sit or lie down. Point toes away from you, then pull toes toward you. Repeat 20-30 times. Do 2-3 sets. Excellent for circulation and ankle mobility after injury.', 2, 'beginner', ARRAY['ankles', 'calves'], ARRAY['none'], NULL, true, true),
  
  ('Ankle Circles', 'Ankle mobility rehabilitation', 'rehabilitation', 'Sit or stand. Lift one foot and rotate ankle in circle 10 times each direction. Repeat on other side. Do 2-3 sets each foot. Good for ankle rehab.', 2, 'beginner', ARRAY['ankles'], ARRAY['none'], NULL, true, true),
  
  ('Ankle Alphabet', 'Ankle mobility and coordination', 'rehabilitation', 'Sit with leg extended. Using big toe as pointer, draw alphabet in air. Complete entire alphabet. Repeat with other foot. Do 2-3 sets each foot. Excellent for ankle rehab.', 5, 'beginner', ARRAY['ankles'], ARRAY['none'], NULL, true, true),
  
  ('Calf Raises (Seated)', 'Calf strengthening rehabilitation', 'rehabilitation', 'Sit in chair, place feet flat on ground. Rise onto toes, hold for 2-3 seconds, lower. Repeat 15-20 times. Do 2-3 sets. Good for calf rehab.', 3, 'beginner', ARRAY['calves'], ARRAY['chair'], NULL, true, true),
  
  ('Wall Sits', 'Knee and quadriceps rehabilitation', 'rehabilitation', 'Stand with back against wall. Slide down until knees at 90 degrees. Hold for 20-60 seconds. Start with shorter holds, progress. Do 2-3 sets. Good for knee rehab.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['wall'], 'Avoid if severe knee pain', true, true),
  
  ('Step-ups (Rehabilitation)', 'Lower body functional rehabilitation', 'rehabilitation', 'Stand facing step or platform. Step up with affected leg, bring other foot up. Step down. Start with low step, progress. Repeat 10-15 times. Do 2-3 sets. Excellent for lower body rehab.', 5, 'beginner', ARRAY['quadriceps', 'glutes'], ARRAY['step', 'platform'], 'Avoid if severe knee pain', true, true),
  
  ('Clamshells', 'Hip and glute rehabilitation', 'rehabilitation', 'Lie on side with knees bent, feet together. Keeping feet together, lift top knee up. Lower slowly. Repeat 12-15 times. Do 2-3 sets each side. Excellent for hip and glute rehab.', 5, 'beginner', ARRAY['hip_abductors', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Hip Abduction (Lying)', 'Hip rehabilitation', 'rehabilitation', 'Lie on side, bottom leg bent for support. Lift top leg straight up, keeping it in line with body. Lower slowly. Repeat 12-15 times. Do 2-3 sets each side. Good for hip rehab.', 5, 'beginner', ARRAY['hip_abductors'], ARRAY['none'], NULL, true, true),
  
  ('Glute Bridges', 'Hip and lower back rehabilitation', 'rehabilitation', 'Lie on back with knees bent, feet flat. Lift hips up, squeezing glutes. Hold for 2-3 seconds, lower. Repeat 12-15 times. Do 2-3 sets. Excellent for lower back and hip rehab.', 5, 'beginner', ARRAY['glutes', 'hamstrings', 'lower_back'], ARRAY['none'], NULL, true, true),
  
  ('Pelvic Tilts', 'Lower back rehabilitation', 'rehabilitation', 'Lie on back with knees bent. Flatten lower back against floor by tilting pelvis. Hold for 5-10 seconds, relax. Repeat 10-15 times. Do 2-3 sets. Excellent for lower back rehab.', 5, 'beginner', ARRAY['lower_back', 'core'], ARRAY['none'], NULL, true, true),
  
  ('Dead Bug', 'Core and lower back rehabilitation', 'rehabilitation', 'Lie on back with arms extended, knees bent at 90 degrees. Slowly lower opposite arm and leg toward floor, keeping core engaged. Return to start, alternate sides. Repeat 10-12 times each side. Do 2-3 sets.', 5, 'beginner', ARRAY['core', 'lower_back'], ARRAY['none'], NULL, true, true),
  
  ('Bird Dog', 'Core and back stability rehabilitation', 'rehabilitation', 'Start on hands and knees. Extend opposite arm and leg, keeping body stable. Hold for 5-10 seconds, return to start. Alternate sides. Repeat 8-10 times each side. Do 2-3 sets. Excellent for back rehab.', 5, 'beginner', ARRAY['core', 'lower_back', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Cat-Cow Stretch', 'Spinal mobility rehabilitation', 'rehabilitation', 'On hands and knees, arch back and look up (cow), then round spine and tuck chin (cat). Move slowly between positions. Repeat 10-15 times. Excellent for back mobility. Do 2-3 sets.', 3, 'beginner', ARRAY['spine', 'core'], ARRAY['none'], NULL, true, true),
  
  ('Pendulum Swings', 'Shoulder mobility rehabilitation', 'rehabilitation', 'Lean forward slightly, let affected arm hang. Gently swing arm in small circles, gradually increasing size. 10 circles each direction. Do 2-3 sets. Excellent for shoulder rehab after injury.', 5, 'beginner', ARRAY['shoulders'], ARRAY['none'], 'Avoid if severe shoulder pain', true, true),
  
  ('Wall Slides', 'Shoulder rehabilitation', 'rehabilitation', 'Stand with back against wall, arms at sides. Slide arms up wall, keeping contact. Lower slowly. Repeat 10-15 times. Do 2-3 sets. Good for shoulder ROM and strength.', 5, 'beginner', ARRAY['shoulders', 'upper_back'], ARRAY['wall'], 'Avoid if severe shoulder pain', true, true),
  
  ('Scapular Retraction', 'Upper back rehabilitation', 'rehabilitation', 'Sit or stand. Squeeze shoulder blades together, hold for 5 seconds, release. Keep shoulders down. Repeat 12-15 times. Do 2-3 sets. Excellent for upper back and posture.', 3, 'beginner', ARRAY['upper_back', 'rhomboids'], ARRAY['none'], NULL, true, true),
  
  ('Scapular Squeezes', 'Upper back and shoulder rehabilitation', 'rehabilitation', 'Sit or stand with arms at sides. Squeeze shoulder blades together, hold for 5 seconds, release. Repeat 12-15 times. Do 2-3 sets. Good for upper back rehab.', 3, 'beginner', ARRAY['upper_back', 'shoulders'], ARRAY['none'], NULL, true, true),
  
  ('External Rotation (Band)', 'Shoulder rotator cuff rehabilitation', 'rehabilitation', 'Stand with resistance band, elbow at 90 degrees, close to side. Rotate arm outward against resistance. Return slowly. Repeat 10-15 times. Do 2-3 sets each arm. Requires resistance band. Excellent for shoulder rehab.', 5, 'beginner', ARRAY['shoulders', 'rotator_cuff'], ARRAY['resistance_band'], 'Avoid if severe shoulder pain', true, true),
  
  ('Internal Rotation (Band)', 'Shoulder rotator cuff rehabilitation', 'rehabilitation', 'Stand with resistance band, elbow at 90 degrees. Rotate arm inward against resistance. Return slowly. Repeat 10-15 times. Do 2-3 sets each arm. Requires resistance band. Good for shoulder rehab.', 5, 'beginner', ARRAY['shoulders', 'rotator_cuff'], ARRAY['resistance_band'], 'Avoid if severe shoulder pain', true, true),
  
  ('Chin Tucks', 'Neck rehabilitation', 'rehabilitation', 'Sit or stand tall. Gently pull chin back, creating double chin. Hold for 5-10 seconds, release. Repeat 10-15 times. Do 2-3 sets. Excellent for neck posture and rehab.', 3, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if severe neck pain', true, true),
  
  ('Neck Isometrics', 'Neck strength rehabilitation', 'rehabilitation', 'Sit or stand. Place hand on head, gently resist as you try to move head. Do forward, backward, and side resistance. Hold for 5-10 seconds each direction. Repeat 5-8 times each. Do 2-3 sets. Use caution.', 5, 'beginner', ARRAY['neck'], ARRAY['none'], 'Avoid if neck pain or injury', true, true),
  
  ('Wrist Flexion Stretch', 'Wrist rehabilitation', 'rehabilitation', 'Extend arm, palm up. Use other hand to gently pull fingers toward you. Feel stretch in wrist and forearm. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 3, 'beginner', ARRAY['wrists', 'forearms'], ARRAY['none'], 'Avoid if severe wrist pain', true, true),
  
  ('Wrist Extension Stretch', 'Wrist rehabilitation', 'rehabilitation', 'Extend arm, palm down. Use other hand to gently pull fingers toward you. Feel stretch in top of wrist and forearm. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side.', 3, 'beginner', ARRAY['wrists', 'forearms'], ARRAY['none'], 'Avoid if severe wrist pain', true, true),
  
  ('Wrist Circles', 'Wrist mobility rehabilitation', 'rehabilitation', 'Extend arms forward, make circles with wrists. 10 circles each direction. Do 2-3 sets each direction. Good for wrist mobility and rehab.', 2, 'beginner', ARRAY['wrists'], ARRAY['none'], 'Avoid if severe wrist pain', true, true),
  
  ('Knee to Chest', 'Lower back and hip rehabilitation', 'rehabilitation', 'Lie on back. Bring one knee to chest, hold for 20-30 seconds. Lower slowly. Repeat 3-5 times each leg. Do 2-3 sets. Excellent for lower back and hip mobility.', 5, 'beginner', ARRAY['hips', 'lower_back'], ARRAY['none'], 'Avoid if severe lower back pain', true, true),
  
  ('Piriformis Stretch', 'Hip and sciatic nerve rehabilitation', 'rehabilitation', 'Lie on back. Cross one ankle over opposite knee. Pull knee toward chest. Feel stretch in hip/buttock area. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side. Excellent for sciatic pain.', 4, 'beginner', ARRAY['hips', 'piriformis'], ARRAY['none'], NULL, true, true),
  
  ('IT Band Stretch', 'Iliotibial band rehabilitation', 'rehabilitation', 'Stand with one leg crossed behind other. Lean to side of front leg, reaching arm overhead. Feel stretch along side of hip and thigh. Hold for 30 seconds. Repeat on other side. Do 2-3 times each side. Good for IT band issues.', 5, 'beginner', ARRAY['it_band', 'hips'], ARRAY['none'], NULL, true, true),
  
  -- INTERMEDIATE REHABILITATION (20 exercises)
  ('Single Leg Glute Bridge', 'Advanced hip rehabilitation', 'rehabilitation', 'Lie on back, one leg bent, other extended. Lift hips up, keeping extended leg in line with body. Lower slowly. Repeat 10-12 times each leg. Do 2-3 sets. Advanced progression for hip rehab.', 5, 'intermediate', ARRAY['glutes', 'hamstrings'], ARRAY['none'], NULL, true, true),
  
  ('Lateral Step-ups', 'Hip and knee rehabilitation', 'rehabilitation', 'Stand beside step or platform. Step up sideways with one leg, bring other foot up. Step down. Repeat 10-15 times each side. Do 2-3 sets. Good for lateral hip strength.', 5, 'intermediate', ARRAY['hip_abductors', 'quadriceps'], ARRAY['step', 'platform'], 'Avoid if severe knee pain', true, true),
  
  ('Reverse Step-ups', 'Posterior chain rehabilitation', 'rehabilitation', 'Stand with back to step. Step backward onto step with one foot, lower other foot to ground. Step back up. Repeat 10-15 times each leg. Do 2-3 sets. Good for hamstring and glute rehab.', 5, 'intermediate', ARRAY['hamstrings', 'glutes'], ARRAY['step'], NULL, true, true),
  
  ('Single Leg Romanian Deadlift', 'Posterior chain rehabilitation', 'rehabilitation', 'Stand on one leg, slight bend in knee. Hinge at hips, lowering torso while lifting other leg back. Return to start. Focus on control. Repeat 10-12 times each leg. Do 2-3 sets. Advanced posterior chain rehab.', 5, 'intermediate', ARRAY['hamstrings', 'glutes', 'lower_back'], ARRAY['none'], 'Avoid if lower back pain', true, true),
  
  ('Lateral Lunges', 'Hip and knee rehabilitation', 'rehabilitation', 'Step to side into lunge position, keeping other leg straight. Push back to start. Repeat 10-12 times each side. Do 2-3 sets. Good for lateral hip and knee rehab.', 5, 'intermediate', ARRAY['hips', 'quadriceps', 'glutes'], ARRAY['none'], 'Avoid if severe knee pain', true, true),
  
  ('Reverse Lunges', 'Lower body rehabilitation', 'rehabilitation', 'Step backward into lunge position. Front knee stays over ankle. Push back to start. Repeat 10-12 times each leg. Do 2-3 sets. Easier on knees than forward lunges.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['none'], 'Avoid if severe knee pain', true, true),
  
  ('Wall Push-ups', 'Upper body rehabilitation', 'rehabilitation', 'Stand facing wall, arms length away. Place hands on wall, lean in, push back. Start with 2 sets of 10-15 reps. Progress to lower surfaces. Good for shoulder and chest rehab.', 5, 'intermediate', ARRAY['chest', 'shoulders'], ARRAY['wall'], 'Avoid if severe shoulder pain', true, true),
  
  ('Prone Y-T-W', 'Shoulder and upper back rehabilitation', 'rehabilitation', 'Lie face down. Lift arms into Y position, hold 5 seconds. Lower. Lift into T position, hold 5 seconds. Lower. Lift into W position, hold 5 seconds. Lower. Repeat 8-10 times. Do 2-3 sets. Excellent for shoulder rehab.', 5, 'intermediate', ARRAY['shoulders', 'upper_back'], ARRAY['none'], 'Avoid if severe shoulder pain', true, true),
  
  ('Band Pull-aparts', 'Upper back rehabilitation', 'rehabilitation', 'Hold resistance band with arms extended. Pull band apart, squeezing shoulder blades. Return slowly. Repeat 12-15 times. Do 2-3 sets. Requires resistance band. Excellent for upper back rehab.', 5, 'intermediate', ARRAY['upper_back', 'rhomboids'], ARRAY['resistance_band'], NULL, true, true),
  
  ('Band Rows', 'Upper back rehabilitation', 'rehabilitation', 'Anchor resistance band, hold with both hands. Pull toward chest, squeezing shoulder blades. Return slowly. Repeat 12-15 times. Do 2-3 sets. Requires resistance band. Good for upper back rehab.', 5, 'intermediate', ARRAY['upper_back', 'rhomboids'], ARRAY['resistance_band'], NULL, true, true),
  
  ('Plank (Rehabilitation)', 'Core rehabilitation', 'rehabilitation', 'Start on forearms and toes, body in straight line. Hold for 20-60 seconds. Start with shorter holds, progress. Do 2-3 sets. Excellent for core and back rehab.', 3, 'intermediate', ARRAY['core', 'shoulders'], ARRAY['none'], 'Avoid if severe shoulder or lower back pain', true, true),
  
  ('Side Plank', 'Core and hip rehabilitation', 'rehabilitation', 'Lie on side, prop up on forearm and side of foot. Lift hips up. Hold for 20-40 seconds. Repeat on other side. Start with shorter holds. Do 2-3 sets each side. Good for core and hip rehab.', 5, 'intermediate', ARRAY['obliques', 'core', 'hips'], ARRAY['none'], 'Avoid if severe shoulder pain', true, true),
  
  ('Dead Bug (Advanced)', 'Advanced core rehabilitation', 'rehabilitation', 'Lie on back, arms and legs extended. Lower opposite arm and leg simultaneously, keeping core engaged. Return to start, alternate sides. Repeat 10-12 times each side. Do 2-3 sets. Advanced core rehab.', 5, 'intermediate', ARRAY['core', 'lower_back'], ARRAY['none'], 'Avoid if severe lower back pain', true, true),
  
  ('Bird Dog (Advanced)', 'Advanced back rehabilitation', 'rehabilitation', 'Start on hands and knees. Extend opposite arm and leg, hold for 10-15 seconds. Return to start, alternate sides. Repeat 10-12 times each side. Do 2-3 sets. Advanced back stability rehab.', 5, 'intermediate', ARRAY['core', 'lower_back', 'glutes'], ARRAY['none'], NULL, true, true),
  
  ('Hip Hinges', 'Posterior chain rehabilitation', 'rehabilitation', 'Stand with slight bend in knees. Hinge at hips, pushing hips back, lowering torso. Keep back straight. Return to start. Repeat 12-15 times. Do 2-3 sets. Good for posterior chain mobility.', 5, 'intermediate', ARRAY['hips', 'hamstrings'], ARRAY['none'], 'Avoid if severe lower back pain', true, true),
  
  ('Squats (Rehabilitation)', 'Lower body functional rehabilitation', 'rehabilitation', 'Stand with feet shoulder-width apart. Lower into squat, keeping knees behind toes. Return to start. Start with partial squats, progress to full. Repeat 10-15 times. Do 2-3 sets. Good for lower body rehab.', 5, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['none'], 'Avoid if severe knee pain', true, true),
  
  ('Lunges (Rehabilitation)', 'Lower body rehabilitation', 'rehabilitation', 'Step forward into lunge position. Front knee at 90 degrees. Push back to start. Repeat 10-12 times each leg. Do 2-3 sets. Good for lower body functional rehab.', 6, 'intermediate', ARRAY['quadriceps', 'glutes'], ARRAY['none'], 'Avoid if severe knee pain', true, true),
  
  ('Calf Raises (Standing)', 'Calf rehabilitation', 'rehabilitation', 'Stand with feet hip-width apart. Rise onto toes, hold for 2-3 seconds, lower slowly. Can hold onto wall for support. Repeat 15-20 times. Do 2-3 sets. Good for calf rehab.', 3, 'intermediate', ARRAY['calves'], ARRAY['wall'], NULL, true, true),
  
  ('Single Leg Calf Raises', 'Advanced calf rehabilitation', 'rehabilitation', 'Stand on one leg, hold onto wall for support. Rise onto toe, hold for 2-3 seconds, lower slowly. Repeat 12-15 times each leg. Do 2-3 sets. Advanced calf rehab.', 5, 'intermediate', ARRAY['calves'], ARRAY['wall'], NULL, true, true),
  
  ('Ankle Eversion/Inversion', 'Ankle rehabilitation', 'rehabilitation', 'Sit with leg extended. Turn foot inward (inversion), then outward (eversion). Repeat 15-20 times each direction. Do 2-3 sets each foot. Good for ankle strength and rehab.', 5, 'intermediate', ARRAY['ankles'], ARRAY['none'], 'Avoid if severe ankle pain', true, true),
  
  -- ADVANCED REHABILITATION (10 exercises)
  ('Single Leg Squats (Rehabilitation)', 'Advanced lower body rehabilitation', 'rehabilitation', 'Stand on one leg, lower into squat while maintaining control. Can hold onto support initially. Return to start. Repeat 5-8 times each leg. Do 2-3 sets. Very advanced. Good for advanced lower body rehab.', 6, 'advanced', ARRAY['quadriceps', 'glutes', 'core'], ARRAY['wall', 'chair'], 'Avoid if severe knee pain', true, true),
  
  ('Bulgarian Split Squats', 'Advanced single leg rehabilitation', 'rehabilitation', 'Stand with back foot elevated on chair or step. Lower into squat position with front leg. Push back up. Repeat 8-10 times each leg. Do 2-3 sets. Very advanced. Good for advanced lower body rehab.', 6, 'advanced', ARRAY['quadriceps', 'glutes'], ARRAY['chair', 'step'], 'Avoid if severe knee pain', true, true),
  
  ('Single Leg Romanian Deadlift (Weighted)', 'Advanced posterior chain rehabilitation', 'rehabilitation', 'Perform single leg RDL while holding light weight. Focus on control and form. Repeat 8-10 times each leg. Do 2-3 sets. Very advanced. Requires weight. Good for advanced posterior chain rehab.', 5, 'advanced', ARRAY['hamstrings', 'glutes', 'lower_back'], ARRAY['weight'], 'Avoid if severe lower back pain', true, true),
  
  ('Push-ups (Rehabilitation)', 'Advanced upper body rehabilitation', 'rehabilitation', 'Start in plank position. Lower body until chest nearly touches ground, push back up. Start with 2 sets of 5-10 reps, progress. Do 2-3 sets. Advanced upper body rehab. Avoid if severe shoulder pain.', 5, 'advanced', ARRAY['chest', 'shoulders', 'triceps'], ARRAY['none'], 'Avoid if severe shoulder or wrist pain', true, true),
  
  ('Pull-ups (Assisted)', 'Advanced back rehabilitation', 'rehabilitation', 'Hang from pull-up bar, use assistance band or machine. Pull body up until chin over bar. Lower slowly. Repeat 5-10 reps. Do 2-3 sets. Requires pull-up bar and assistance. Very advanced. Good for advanced back rehab.', 5, 'advanced', ARRAY['back', 'biceps'], ARRAY['pull_up_bar', 'assistance_band'], 'Avoid if severe shoulder pain', true, true),
  
  ('Plank Variations', 'Advanced core rehabilitation', 'rehabilitation', 'Perform plank with variations: single arm, single leg, or both. Hold for 20-40 seconds. Very challenging. Do 2-3 sets. Very advanced core rehab.', 5, 'advanced', ARRAY['core', 'shoulders'], ARRAY['none'], 'Avoid if severe shoulder or lower back pain', true, true),
  
  ('Turkish Get-ups', 'Advanced full body rehabilitation', 'rehabilitation', 'Lie on back holding weight (or no weight). Sit up, then stand, keeping weight overhead. Reverse to return to start. Very advanced. Repeat 3-5 times each side. Do 2-3 sets. Requires weight (optional). Excellent for full body rehab.', 10, 'advanced', ARRAY['full_body', 'core', 'shoulders'], ARRAY['weight'], 'Avoid if shoulder or lower back pain', true, true),
  
  ('Single Leg Balance with Perturbations', 'Advanced balance rehabilitation', 'rehabilitation', 'Stand on one leg. Have partner gently push you from various directions, or use unstable surface. React and maintain balance. 30-60 seconds. Repeat on other side. Very advanced. Do 2-3 sets each leg. Requires partner or unstable surface.', 5, 'advanced', ARRAY['core', 'balance', 'proprioception'], ARRAY['partner', 'unstable_surface'], 'Avoid if severe balance issues', true, true),
  
  ('Plyometric Exercises (Rehabilitation)', 'Advanced power rehabilitation', 'rehabilitation', 'Perform low-level plyometrics: small jumps, hops, bounds. Start with 5-10 reps, progress gradually. Very advanced. Do 2-3 sets. Good for advanced power and coordination rehab. Use caution.', 5, 'advanced', ARRAY['full_body', 'power'], ARRAY['none'], 'Avoid if severe joint pain or recent injury', true, true),
  
  ('Functional Movement Patterns', 'Advanced movement rehabilitation', 'rehabilitation', 'Perform complex movement patterns: squat to overhead reach, lunge with rotation, etc. Focus on quality movement. Very advanced. 5-8 reps each pattern. Do 2-3 sets. Excellent for advanced functional rehab.', 10, 'advanced', ARRAY['full_body', 'functional'], ARRAY['none'], 'Avoid if severe pain in any area', true, true);
  

