export const PAIN_AREAS = [
  'Head', 'Neck', 'Shoulder', 'Upper Back', 'Lower Back', 'Chest', 'Abdomen', 
  'Hip', 'Groin', 'Thigh', 'Knee', 'Shin', 'Calf', 'Ankle', 'Foot', 
  'Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand'
];

export const JOINTS = ['Head', 'Neck', 'Shoulder', 'Elbow', 'Wrist', 'Hip', 'Knee', 'Ankle', 'Spine (Lumbar)', 'Spine (Thoracic)'];

export const MOVEMENTS: Record<string, string[]> = {
  'Head': ['Flexion', 'Extension', 'Rotation', 'Side Flexion'],
  'Neck': ['Flexion', 'Extension', 'Rotation', 'Side Flexion'],
  'Shoulder': ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal Rotation', 'External Rotation'],
  'Elbow': ['Flexion', 'Extension', 'Pronation', 'Supination'],
  'Wrist': ['Flexion', 'Extension', 'Radial Deviation', 'Ulnar Deviation'],
  'Hip': ['Flexion', 'Extension', 'Abduction', 'Adduction', 'Internal Rotation', 'External Rotation'],
  'Knee': ['Flexion', 'Extension'],
  'Ankle': ['Dorsiflexion', 'Plantarflexion', 'Inversion', 'Eversion'],
  'Spine (Lumbar)': ['Flexion', 'Extension', 'Rotation', 'Side Flexion'],
  'Spine (Thoracic)': ['Flexion', 'Extension', 'Rotation', 'Side Flexion']
};

export const STRENGTH_GRADES = [
  { value: '0', label: '0 - No contraction' },
  { value: '1', label: '1 - Trace/flicker' },
  { value: '2', label: '2 - Movement, no gravity' },
  { value: '3', label: '3 - Movement against gravity' },
  { value: '4-', label: '4- - Against slight resistance' },
  { value: '4', label: '4 - Against moderate resistance' },
  { value: '4+', label: '4+ - Against strong resistance' },
  { value: '5', label: '5 - Normal strength' }
];

export const STRENGTH_VALUE_MAP: Record<string, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4-': 3.5,
  '4': 4,
  '4+': 4.5,
  '5': 5
};
