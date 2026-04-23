// Internationalization (i18n) for Hebrew/English
export const translations = {
  en: {
    // Header
    back: '← Back',
    whosPlayingToday: "Who's Playing Today?",
    basketballMatch: 'Basketball Match',
    footballMatch: 'Football Match',

    // Actions
    addPlayer: 'Add Player',
    friends: 'Friends',
    createTeams: 'Create Teams',
    shuffle: 'Shuffle',
    newSession: 'New Session',

    // Player Card
    noPosition: 'No Position',
    friendsWith: 'Friends:',

    // Status
    playersReady: (count) => `${count} player${count !== 1 ? 's' : ''} ready!`,
    teamsInfo: (size, bench) => `Teams: ${size}v${size} + ${bench} bench`,

    // Modals
    addNewPlayer: 'Add New Player',
    editPlayer: 'Edit Player',
    manageConnections: 'Manage Connections',
    playerActions: 'Player Actions',

    // Form
    playerName: 'Player Name',
    position: 'Position',
    includeInSession: "Include in today's session",
    cancel: 'Cancel',
    save: 'Save Changes',
    done: 'Done',

    // Positions - Basketball
    guard: 'Guard',
    forward: 'Forward',
    center: 'Center',

    // Positions - Football
    goalkeeper: 'Goalkeeper',
    defender: 'Defender',
    midfielder: 'Midfielder',
    forwardFootball: 'Forward',

    // Connections
    currentConnections: 'Current Connections',
    addNewConnection: 'Add New Connection',
    player1: 'Player 1',
    player2: 'Player 2',
    sessionOnly: 'This session only',
    saveAsGroupDefault: 'Save as group default',
    addConnection: 'Add Connection',
    sourceGroupDefault: 'Source: Group default',
    sourceSessionOverride: 'Source: Session override',
    remove: 'Remove',
    removeOverride: 'Remove Override',

    // Action Menu
    connect: 'Manage Connections',
    edit: 'Edit Player',
    delete: 'Delete Player',

    // Team Display
    teamsReady: 'Teams Ready!',
    perfectBalance: 'Perfectly Balanced!',
    wellBalanced: 'Well Balanced!',
    fairBalance: (diff) => `Fair Balance (±${diff})`,
    team: 'Team',
    bench: 'Bench',
    total: 'Total',

    // Toast Messages
    playerAdded: 'Player added successfully!',
    playerUpdated: 'Player updated successfully!',
    playerDeleted: 'Player deleted',
    connectionAdded: 'Connection added!',
    connectionRemoved: 'Connection removed',
    teamsShuffled: 'Teams shuffled! 🎲',

    // Errors
    failedToLoad: 'Failed to load players',
    selectBothPlayers: 'Please select both players',
    cannotConnectSelf: 'Cannot connect player to themselves',
    failedToAddConnection: 'Failed to add connection',
    failedToGenerateTeams: 'Failed to generate teams',
    selectAtLeast2: 'Select at least 2 players',

    // Confirmations
    deletePlayerConfirm: (name) => `Delete ${name} from the group? This cannot be undone.`,
    removeConnectionConfirm: 'Remove this connection?',
    shuffleTeamsConfirm: 'Shuffle teams? This will create new teams with the same players.',

    // Empty States
    noPlayersYet: 'No players yet.',
    tapAddPlayer: 'Tap "Add Player" to get started!',
    noConnectionsYet: 'No connections yet'
  },
  he: {
    // Header
    back: 'חזרה ←',
    whosPlayingToday: 'מי משחק היום?',
    basketballMatch: 'משחק כדורסל',
    footballMatch: 'משחק כדורגל',

    // Actions
    addPlayer: 'הוסף שחקן',
    friends: 'חברים',
    createTeams: 'צור קבוצות',
    shuffle: 'ערבב',
    newSession: 'משחק חדש',

    // Player Card
    noPosition: 'ללא עמדה',
    friendsWith: 'חברים:',

    // Status
    playersReady: (count) => `${count} שחקנים מוכנים!`,
    teamsInfo: (size, bench) => `קבוצות: ${size} נגד ${size} + ${bench} ספסל`,

    // Modals
    addNewPlayer: 'הוסף שחקן חדש',
    editPlayer: 'ערוך שחקן',
    manageConnections: 'ניהול חיבורים',
    playerActions: 'פעולות שחקן',

    // Form
    playerName: 'שם השחקן',
    position: 'עמדה',
    includeInSession: 'כלול במשחק של היום',
    cancel: 'ביטול',
    save: 'שמור שינויים',
    done: 'סיום',

    // Positions - Basketball
    guard: 'גארד',
    forward: 'פורוורד',
    center: 'סנטר',

    // Positions - Football
    goalkeeper: 'שוער',
    defender: 'מגן',
    midfielder: 'קשר',
    forwardFootball: 'חלוץ',

    // Connections
    currentConnections: 'חיבורים נוכחיים',
    addNewConnection: 'הוסף חיבור חדש',
    player1: 'שחקן 1',
    player2: 'שחקן 2',
    sessionOnly: 'למשחק הזה בלבד',
    saveAsGroupDefault: 'שמור כברירת מחדל לקבוצה',
    addConnection: 'הוסף חיבור',
    sourceGroupDefault: 'מקור: ברירת מחדל של הקבוצה',
    sourceSessionOverride: 'מקור: עקיפה למשחק זה',
    remove: 'הסר',
    removeOverride: 'הסר עקיפה',

    // Action Menu
    connect: 'ניהול חיבורים',
    edit: 'ערוך שחקן',
    delete: 'מחק שחקן',

    // Team Display
    teamsReady: 'הקבוצות מוכנות!',
    perfectBalance: 'איזון מושלם!',
    wellBalanced: 'איזון טוב!',
    fairBalance: (diff) => `איזון סביר (±${diff})`,
    team: 'קבוצה',
    bench: 'ספסל',
    total: 'סה"כ',

    // Toast Messages
    playerAdded: 'שחקן נוסף בהצלחה!',
    playerUpdated: 'שחקן עודכן בהצלחה!',
    playerDeleted: 'שחקן נמחק',
    connectionAdded: 'חיבור נוסף!',
    connectionRemoved: 'חיבור הוסר',
    teamsShuffled: 'הקבוצות עורבבו! 🎲',

    // Errors
    failedToLoad: 'טעינת שחקנים נכשלה',
    selectBothPlayers: 'נא לבחור שני שחקנים',
    cannotConnectSelf: 'לא ניתן לחבר שחקן לעצמו',
    failedToAddConnection: 'הוספת חיבור נכשלה',
    failedToGenerateTeams: 'יצירת קבוצות נכשלה',
    selectAtLeast2: 'נא לבחור לפחות 2 שחקנים',

    // Confirmations
    deletePlayerConfirm: (name) => `למחוק את ${name} מהקבוצה? לא ניתן לבטל פעולה זו.`,
    removeConnectionConfirm: 'להסיר חיבור זה?',
    shuffleTeamsConfirm: 'לערבב קבוצות? זה ייצור קבוצות חדשות עם אותם שחקנים.',

    // Empty States
    noPlayersYet: 'אין שחקנים עדיין.',
    tapAddPlayer: 'לחץ על "הוסף שחקן" כדי להתחיל!',
    noConnectionsYet: 'אין חיבורים עדיין'
  }
};

// Current language (stored in localStorage)
let currentLanguage = localStorage.getItem('language') || 'en';

// Get translation
export function t(key, ...args) {
  const text = translations[currentLanguage][key];
  if (typeof text === 'function') {
    return text(...args);
  }
  return text || key;
}

// Set language
export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    return true;
  }
  return false;
}

// Get current language
export function getLanguage() {
  return currentLanguage;
}

// Initialize language on page load
export function initLanguage() {
  const lang = getLanguage();
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
}

// Toggle language
export function toggleLanguage() {
  const newLang = currentLanguage === 'en' ? 'he' : 'en';
  setLanguage(newLang);
  return newLang;
}
