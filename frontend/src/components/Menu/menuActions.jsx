const menuActions = {
  '📜 Transcript': () => ['➕', '✏️', '🔍'],
  '📑 Migration': () => ['➕', '🔍'],
  '📋 Provisional': () => ['➕', '🔍'],
  '🏅 Degree': () => ['➕', '🔍'],
  '🏛️ Institutional Verification': () => ['🔍'],
  'Enrollment': () => ['Add', 'View', 'Edit', 'Search'],


  '📥 Inward': () => ['➕', '✏️', '🔍'],
  '📤 Outward': () => ['➕', '✏️', '🔍'],
  '🏖️ Leave Management': () => ['➕', '✏️'],
  '📦 Inventory': () => ['🔍'],

  '📊 Daily Register': () => ['🔍'],
  '💵 Student Fees': () => ['✏️', '🔍'],
  '🔍 Payment Track': () => ['🔍'],

  'Admin Panel': () => [
    'User Management',
    'User Rights',
    'Institute Management',
    'Course Management',
  ],
};

export default menuActions;
