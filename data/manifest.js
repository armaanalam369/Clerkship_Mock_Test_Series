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
    { n: 'English',                    i: '🔤',  k: 'ENG'  },
    { n: 'Indian Polity',              i: '🏛️', k: 'POL'  },
    { n: 'Ancient History',            i: '🏺',  k: 'ANC'  },
    { n: 'Indian Economy',             i: '💹',  k: 'ECO'  },
    { n: 'Medieval History',           i: '🏰',  k: 'MED'  },
    { n: 'Physics',                    i: '⚛️', k: 'PHY'  },
    { n: 'Indian National Movement',   i: '🇮🇳', k: 'INM'  },
    { n: 'Chemistry',                  i: '🧪',  k: 'CHE'  },
    { n: 'Physical Geography', i: '🌍',  k: 'PGEO'  },
    { n: 'General Science',                    i: '🧬',  k: 'SCI'  },
    { n: 'Modern History',             i: '📜',  k: 'MOD'  },
    { n: 'Arts & Culture',             i: '🎭',  k: 'ART'  },
    { n: 'Indian Geography',           i: '🗺️', k: 'IGEO'  },
    { n: 'West Bengal Specific',       i: '🐅',  k: 'WB'   },
    { n: 'Environmental Studies',      i: '🌱',  k: 'ENV'  },
    { n: 'Static GK',                  i: '📌',  k: 'GK'   },
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
  { id: 'set-20', title: 'Set 20', file: 'data/set-20.js' }
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
