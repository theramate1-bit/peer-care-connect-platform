# Exercise Library Duplicates Report
**Date:** 2025-01-27  
**Analysis Method:** Supabase MCP SQL Queries

---

## Executive Summary

**Total Exercises:** 346 active exercises  
**Unique Exercise Names:** 305  
**Duplicate Exercises Found:** 41 exercises (346 - 305 = 41)

**Status:** ⚠️ **DUPLICATES DETECTED**

---

## Duplicate Analysis

### Exercises with 4 Duplicates
1. **Cat-Cow Stretch** - 4 instances
   - IDs: `b0861b5c-2781-47a6-8c1a-02a88a184a97`, `c6d3c6c9-e861-474a-ae57-96aff7090843`, `147db98d-430b-4cf6-8d59-3dbea652ef09`, `db0f9bc6-8e80-4b46-a40d-ca17407bd741`
   - Categories: mobility, flexibility, rehabilitation
   - Created: 2026-01-04 (multiple times)

### Exercises with 3 Duplicates
1. **Ankle Circles** - 3 instances
   - Categories: mobility, rehabilitation
   
2. **Marching in Place** - 3 instances
   - Categories: cardio, strength
   
3. **Piriformis Stretch** - 3 instances
   - Categories: rehabilitation, flexibility
   
4. **Wall Push-ups** - 3 instances
   - Categories: strength, rehabilitation

### Exercises with 2 Duplicates (32 exercises)

1. **Ankle Alphabet**
   - Categories: mobility, rehabilitation
   
2. **Ankle Pumps**
   - Categories: mobility, rehabilitation
   
3. **Bird Dog**
   - Categories: strength, rehabilitation
   
4. **Bulgarian Split Squats**
   - Categories: strength, rehabilitation
   
5. **Burpees**
   - Categories: strength, cardio
   
6. **Clamshells**
   - Categories: strength, rehabilitation
   
7. **Dead Bug**
   - Categories: strength, rehabilitation
   
8. **Heel-to-Toe Walk**
   - Categories: balance
   
9. **Hip Circles**
   - Categories: mobility
   
10. **Hip Hinges**
    - Categories: mobility, rehabilitation
    
11. **IT Band Stretch**
    - Categories: flexibility, rehabilitation
    
12. **Jumping Jacks**
    - Categories: cardio
    
13. **Knee Push-ups**
    - Categories: strength
    
14. **Knee to Chest**
    - Categories: rehabilitation
    
15. **Lunges**
    - Categories: strength
    
16. **Mountain Climbers**
    - Categories: strength, cardio
    
17. **Neck Rolls**
    - Categories: flexibility, mobility
    
18. **Plank**
    - Categories: strength
    
19. **Plank Jacks**
    - Categories: strength, cardio
    
20. **Reverse Lunges**
    - Categories: strength, rehabilitation
    
21. **Scapular Retraction**
    - Categories: rehabilitation
    
22. **Scapular Squeezes**
    - Categories: strength, rehabilitation
    
23. **Side Plank**
    - Categories: strength, rehabilitation
    
24. **Single Leg Balance**
    - Categories: balance
    
25. **Single Leg Box Jumps**
    - Categories: strength, cardio
    
26. **Single Leg Calf Raises**
    - Categories: strength, rehabilitation
    
27. **Single Leg Glute Bridge**
    - Categories: strength, rehabilitation
    
28. **Single Leg Romanian Deadlift (Weighted)**
    - Categories: strength, rehabilitation
    
29. **Squats**
    - Categories: strength
    
30. **Wrist Circles**
    - Categories: mobility, rehabilitation

---

## Detailed Duplicate Information

### Pattern Analysis

**Common Patterns:**
1. **Category Variations:** Many exercises have duplicates with different categories (e.g., strength vs rehabilitation)
2. **Description Variations:** Some duplicates have slightly different descriptions
3. **Instruction Variations:** Instructions may vary in detail level
4. **Creation Dates:** Most duplicates created on 2026-01-04 in multiple batches

**Example - Cat-Cow Stretch:**
- 4 versions with same name but:
  - Different categories (mobility, flexibility, rehabilitation)
  - Slightly different instructions
  - All created on same day

**Example - Burpees:**
- 2 versions:
  - Category: strength (intermediate)
  - Category: cardio (intermediate)
  - Different instruction detail levels

---

## Recommendations

### Option 1: Manual Review & Merge
1. Review each duplicate group
2. Identify the "best" version (most complete description, most appropriate category)
3. Merge duplicates by:
   - Keeping the best version
   - Deactivating or deleting others
   - Updating any programs using deleted exercises

### Option 2: Automated Deduplication
1. Create a deduplication script that:
   - Groups by normalized name
   - Keeps the most recent or most complete version
   - Deactivates duplicates
   - Logs all changes

### Option 3: Add Unique Constraint
1. Add database constraint to prevent future duplicates:
   ```sql
   CREATE UNIQUE INDEX idx_exercise_library_unique_name 
   ON exercise_library(LOWER(TRIM(name))) 
   WHERE is_active = true;
   ```

### Option 4: Deduplication Function
1. Create a function to identify and handle duplicates:
   - Mark duplicates for review
   - Suggest which version to keep
   - Allow manual approval before deletion

---

## Impact Assessment

### Current Impact
- **User Experience:** Practitioners may see duplicate exercises in library
- **Data Quality:** 41 duplicate entries (11.8% of total)
- **Storage:** Minimal impact (text data only)

### If Not Fixed
- Library will continue to grow with duplicates
- Search results may show multiple identical exercises
- Confusion for practitioners selecting exercises

---

## Next Steps

1. ✅ **Analysis Complete** - Duplicates identified
2. ⏳ **Decision Required** - Choose deduplication approach
3. ⏳ **Implementation** - Execute deduplication
4. ⏳ **Verification** - Confirm duplicates removed
5. ⏳ **Prevention** - Add constraints to prevent future duplicates

---

## SQL Queries Used

### Query 1: Duplicates by Name
```sql
SELECT 
  name,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as exercise_ids
FROM exercise_library
WHERE is_active = true
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### Query 2: Duplicates by Name and Description
```sql
SELECT 
  name,
  description,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as exercise_ids
FROM exercise_library
WHERE is_active = true
GROUP BY name, description
HAVING COUNT(*) > 1;
```

### Query 3: Case-Insensitive Duplicates
```sql
SELECT 
  LOWER(TRIM(name)) as normalized_name,
  COUNT(*) as count,
  array_agg(name) as actual_names,
  array_agg(id) as exercise_ids
FROM exercise_library
WHERE is_active = true
GROUP BY LOWER(TRIM(name))
HAVING COUNT(*) > 1;
```

---

**Report Generated:** 2025-01-27  
**Analysis Tool:** Supabase MCP  
**Status:** ✅ **ANALYSIS COMPLETE**
