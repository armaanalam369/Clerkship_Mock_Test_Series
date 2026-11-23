/* =====================================================================
   Clerkship · Wise Choice — data/manifest.js
   Exam rules, the 18 topics, daily quotes and the list of question SETS.

   HOW TO ADD A NEW SET  (Set-1, Set-2, Set-3 ...)
   1. Copy data/set-1.js to data/set-4.js and replace the questions.
      Inside the file change the id ('set-4') and title ('Set 4').
   2. Add ONE line to SET_LIST below:
        { id:'set-4', title:'Set 4', file:'data/set-4.js' }
   Done. The set card appears on Home & Practice, and the Exam Countdown
   plan re-balances itself automatically around the new questions.

   QUESTION FORMAT (one object per question):
     { s:'Topic name (must match a topic below EXACTLY)',
       c:'Sub-topic / chapter',
       q:'Question text',
       o:['Option A','Option B','Option C','Option D'],
       a:0,                 // index of the correct option (0-3)
       e:'Short explanation' }
   ===================================================================== */

window.RULES = {
  examName: 'Clerkship',
  minPerQ: 0.6,          // minutes per question for a full-set exam (a set file can override with  minutes: 90 )
  negative: 0.25,        // marks deducted per wrong answer (1 mark per correct answer)
  drillQuestions: 10,    // Wise Drill: number of questions
  drillMinutes: 10,      // Wise Drill: time limit

  /* `n` must match the "s" field of every question EXACTLY. i = icon, k = short radar code */
  topics: [
    { n: 'English',                    i: '🔤',  k: 'ENGLISH'  },
    { n: 'Indian Polity',              i: '🏛️', k: 'POLITY'  },
    { n: 'Ancient History',            i: '🏺',  k: 'ANCIENT HIST'  },
    { n: 'Indian Economy',             i: '💹',  k: 'ECONOMY'  },
    { n: 'Medieval History',           i: '🏰',  k: 'MEDIEVAL HIST'  },
    { n: 'Physical Geography', i: '🌍',  k: 'PGEO'  },
    { n: 'General Science',                    i: '🧬',  k: 'SCIENCE'  },
    { n: 'Modern History',             i: '📜',  k: 'MODERN HIST'  },
    { n: 'Arts & Culture',             i: '🎭',  k: 'ART'  },
    { n: 'Indian Geography',           i: '🗺️', k: 'IGEO'  },
    { n: 'West Bengal Specific',       i: '🐅',  k: 'WB SPECIFIC'   },
    { n: 'Environmental Studies',      i: '🌱',  k: 'ENV'  },
    { n: 'Mathematics',     i: '🧠',  k: 'MATHS'  },
    { n: 'GK & Current Affairs',            i: '📰',  k: 'GK & CA'   }
  ]
};

/* ---- Question sets (loaded on demand) ---- */
window.SET_LIST = [
  { id: 'set-1', title: 'Set 1', file: 'data/set-1.js' },
  { id: 'set-2', title: 'Set 2', file: 'data/set-2.js' },
  { id: 'set-3', title: 'Set 3', file: 'data/set-3.js' },
  { id: 'set-4', title: 'Set 4', file: 'data/set-4.js' },
  { id: 'set-5', title: 'Set 5', file: 'data/set-5.js' },
  { id: 'set-6', title: 'Set 6', file: 'data/set-6.js' },
  { id: 'set-7', title: 'Set 7', file: 'data/set-7.js' },
  { id: 'set-8', title: 'Set 8', file: 'data/set-8.js' },
  { id: 'set-9', title: 'Set 9', file: 'data/set-9.js' },
  { id: 'set-10', title: 'Set 10', file: 'data/set-10.js' },
  { id: 'set-11', title: 'Set 11', file: 'data/set-11.js' },
  { id: 'set-12', title: 'Set 12', file: 'data/set-12.js' },
  { id: 'set-13', title: 'Set 13', file: 'data/set-13.js' },
  { id: 'set-14', title: 'Set 14', file: 'data/set-14.js' },
  { id: 'set-15', title: 'Set 15', file: 'data/set-15.js' },
  { id: 'set-16', title: 'Set 16', file: 'data/set-16.js' },
  { id: 'set-17', title: 'Set 17', file: 'data/set-17.js' },
  { id: 'set-18', title: 'Set 18', file: 'data/set-18.js' },
  { id: 'set-19', title: 'Set 19', file: 'data/set-19.js' },
  { id: 'set-20', title: 'Set 20', file: 'data/set-20.js' },
  { id: 'set-21', title: 'Set 21', file: 'data/set-21.js' },
  { id: 'set-22', title: 'Set 22', file: 'data/set-22.js' },
  { id: 'set-23', title: 'Set 23', file: 'data/set-23.js' },
  { id: 'set-24', title: 'Set 24', file: 'data/set-24.js' },
  { id: 'set-25', title: 'Set 25', file: 'data/set-25.js' },
  { id: 'set-26', title: 'Set 26', file: 'data/set-26.js' },
  { id: 'set-27', title: 'Set 27', file: 'data/set-27.js' },
  { id: 'set-28', title: 'Set 28', file: 'data/set-28.js' },
  { id: 'set-29', title: 'Set 29', file: 'data/set-29.js' },
  { id: 'set-30', title: 'Set 30', file: 'data/set-30.js' },
  { id: 'set-31', title: 'Set 31', file: 'data/set-31.js' },
  { id: 'set-32', title: 'Set 32', file: 'data/set-32.js' },
  { id: 'set-33', title: 'Set 33', file: 'data/set-33.js' },
  { id: 'set-34', title: 'Set 34', file: 'data/set-34.js' },
  { id: 'set-35', title: 'Set 35', file: 'data/set-35.js' },
  { id: 'set-36', title: 'Set 36', file: 'data/set-36.js' },
  { id: 'set-37', title: 'Set 37', file: 'data/set-37.js' },
  { id: 'set-38', title: 'Set 38', file: 'data/set-38.js' },
  { id: 'set-39', title: 'Set 39', file: 'data/set-39.js' },
  { id: 'set-40', title: 'Set 40', file: 'data/set-40.js' }
];

/* ---- Motivational quotes (one per day). Add your own! ---- */
window.QUOTES = [
  'Consistency beats intensity — one solid hour every day wins the exam.',
  'Every wrong answer you review today is a mark you keep tomorrow.',
  'You don\'t need to be perfect. You need to be better than yesterday.',
  'Discipline is choosing what you want most over what you want now.',
  'Small daily progress adds up to big results.',
  'Mock tests are rehearsals. Make your mistakes here, not in the exam hall.',
  'Your future officer self is watching — keep going.',
  'Don\'t count the days; make the days count.',
  'Hard work compounds. Start the next question.',
  'Revision is where marks are made.',
  'Slow progress is still progress.',
  'Focus on the process; the rank will follow.',
  'Today\'s effort is tomorrow\'s confidence.',
  'One more topic. One more set. One step closer.',
  'Be patient with the syllabus, be strict with your schedule.'
];
