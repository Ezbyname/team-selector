// App State
const APP_VERSION = '1.2.2';

const state = {
    currentScreen: 'welcome',
    sport: null,
    players: [],
    teamSize: null,
    language: 'he',
    theme: 'light',
    firstVisit: true
};

// Positions by sport
const positions = {
    basketball: {
        he: ['ללא תפקיד', 'גארד', 'פורוורד', 'סנטר'],
        en: ['No Position', 'Guard', 'Forward', 'Center']
    },
    soccer: {
        he: ['ללא תפקיד', 'שוער', 'מגן', 'קשר', 'חלוץ'],
        en: ['No Position', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward']
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initializeEventListeners();
    updateLanguage();
    applyTheme();

    if (state.firstVisit) {
        showScreen('welcome');
    } else {
        showScreen('sport');
    }
});

// Event Listeners
function initializeEventListeners() {
    // Welcome screen
    document.getElementById('gotItBtn').addEventListener('click', () => {
        state.firstVisit = false;
        saveState();
        showScreen('sport');
    });

    // Help button
    document.getElementById('helpBtn').addEventListener('click', () => {
        showScreen('welcome');
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Language toggle
    document.getElementById('langToggle').addEventListener('click', toggleLanguage);

    // Sport selection
    document.querySelectorAll('.sport-card').forEach(card => {
        card.addEventListener('click', () => {
            state.sport = card.dataset.sport;
            saveState();
            showScreen('players');
        });
    });

    // Player management
    document.getElementById('playerNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllPlayers);
    document.getElementById('continueToSettingsBtn').addEventListener('click', () => {
        showScreen('settings');
        setupTeamSizeOptions();
    });

    // Navigation
    document.getElementById('backToSport').addEventListener('click', () => {
        showScreen('sport');
    });
    document.getElementById('backToPlayers').addEventListener('click', () => {
        showScreen('players');
    });
    document.getElementById('backToSettings').addEventListener('click', () => {
        showScreen('settings');
    });

    // Generate teams
    document.getElementById('generateTeamsBtn').addEventListener('click', generateTeams);
    document.getElementById('regenerateBtn').addEventListener('click', generateTeams);
    document.getElementById('newGameBtn').addEventListener('click', () => {
        showScreen('sport');
    });

    // Modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('linkModal').addEventListener('click', (e) => {
        if (e.target.id === 'linkModal') closeModal();
    });
}

// Screen Management
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`${screenName}Screen`).classList.add('active');
    state.currentScreen = screenName;

    // Update header title
    const titles = {
        welcome: { he: 'ברוכים הבאים', en: 'Welcome' },
        sport: { he: 'בחר ספורט', en: 'Choose Sport' },
        players: { he: 'שחקנים', en: 'Players' },
        settings: { he: 'הגדרות', en: 'Settings' },
        teams: { he: 'קבוצות', en: 'Teams' }
    };

    if (titles[screenName]) {
        document.getElementById('headerTitle').textContent = titles[screenName][state.language];
    }

    // Update version number
    document.getElementById('versionNumber').textContent = `v${APP_VERSION}`;

    // Refresh UI if needed
    if (screenName === 'players') {
        renderPlayers();
    }
}

// Theme Management
function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const icon = document.querySelector('#themeToggle .icon');
    icon.textContent = state.theme === 'light' ? '🌙' : '☀️';
}

// Language Management
function toggleLanguage() {
    state.language = state.language === 'he' ? 'en' : 'he';
    updateLanguage();
    saveState();
}

function updateLanguage() {
    const dir = state.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', state.language);

    // Update flag
    document.querySelector('.lang-flag').textContent = state.language === 'he' ? '🇺🇸' : '🇮🇱';

    // Update all text elements
    document.querySelectorAll('[data-he], [data-en]').forEach(el => {
        if (el.hasAttribute(`data-${state.language}`)) {
            el.textContent = el.getAttribute(`data-${state.language}`);
        }
    });

    // Update placeholders
    document.querySelectorAll('[data-placeholder-he], [data-placeholder-en]').forEach(el => {
        if (el.hasAttribute(`data-placeholder-${state.language}`)) {
            el.placeholder = el.getAttribute(`data-placeholder-${state.language}`);
        }
    });

    // Re-render players to update positions
    if (state.currentScreen === 'players') {
        renderPlayers();
    }
}

// Player Management
function addPlayer() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim();

    if (!name) return;

    if (state.players.some(p => p.name === name)) {
        alert(state.language === 'he' ? 'השם כבר קיים' : 'Name already exists');
        return;
    }

    state.players.push({
        id: Date.now(),
        name: name,
        position: 0, // 0 = no position
        isStar: false,
        linkedWith: []
    });

    input.value = '';
    saveState();
    renderPlayers();
}

function removePlayer(id) {
    // Remove player and all links to them
    state.players = state.players.filter(p => p.id !== id);
    state.players.forEach(p => {
        p.linkedWith = p.linkedWith.filter(linkId => linkId !== id);
    });
    saveState();
    renderPlayers();
}

function toggleStar(id) {
    const player = state.players.find(p => p.id === id);
    if (player) {
        player.isStar = !player.isStar;
        saveState();
        renderPlayers();
    }
}

function updatePosition(id, positionIndex) {
    const player = state.players.find(p => p.id === id);
    if (player) {
        player.position = parseInt(positionIndex);
        saveState();
    }
}

function openLinkModal(playerId) {
    const modal = document.getElementById('linkModal');
    const body = document.getElementById('linkModalBody');
    const currentPlayer = state.players.find(p => p.id === playerId);

    if (!currentPlayer) return;

    body.innerHTML = state.players
        .filter(p => p.id !== playerId)
        .map(p => {
            const isLinked = currentPlayer.linkedWith.includes(p.id);
            return `
                <div class="link-option ${isLinked ? 'linked' : ''}" data-player-id="${p.id}">
                    ${isLinked ? '✓ ' : ''}${p.name}
                </div>
            `;
        })
        .join('');

    // Add click handlers
    body.querySelectorAll('.link-option').forEach(option => {
        option.addEventListener('click', () => {
            const linkedId = parseInt(option.dataset.playerId);
            toggleLink(playerId, linkedId);

            // Update visual state
            option.classList.toggle('linked');
            option.textContent = option.classList.contains('linked')
                ? `✓ ${state.players.find(p => p.id === linkedId).name}`
                : state.players.find(p => p.id === linkedId).name;
        });
    });

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('linkModal').classList.remove('active');
    renderPlayers(); // Refresh to show updated links
}

function toggleLink(playerId, linkedId) {
    const player = state.players.find(p => p.id === playerId);
    const linkedPlayer = state.players.find(p => p.id === linkedId);

    if (!player || !linkedPlayer) return;

    const isLinked = player.linkedWith.includes(linkedId);

    if (isLinked) {
        // Unlink
        player.linkedWith = player.linkedWith.filter(id => id !== linkedId);
        linkedPlayer.linkedWith = linkedPlayer.linkedWith.filter(id => id !== playerId);
    } else {
        // Link
        if (!player.linkedWith.includes(linkedId)) {
            player.linkedWith.push(linkedId);
        }
        if (!linkedPlayer.linkedWith.includes(playerId)) {
            linkedPlayer.linkedWith.push(playerId);
        }
    }

    saveState();
}

function unlinkPlayer(playerId, linkedId) {
    toggleLink(playerId, linkedId);
    renderPlayers();
}

function clearAllPlayers() {
    if (state.players.length === 0) return;

    const msg = state.language === 'he'
        ? 'האם אתה בטוח שברצונך למחוק את כל השחקנים?'
        : 'Are you sure you want to delete all players?';

    if (confirm(msg)) {
        state.players = [];
        saveState();
        renderPlayers();
    }
}

function renderPlayers() {
    const container = document.getElementById('playersList');
    const countEl = document.getElementById('playerCount');
    const continueBtn = document.getElementById('continueToSettingsBtn');

    countEl.textContent = state.players.length;
    continueBtn.disabled = state.players.length < 2;

    if (state.players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👥</span>
                <p data-he="אין שחקנים עדיין. הוסף את השחקן הראשון!" data-en="No players yet. Add your first player!">
                    ${state.language === 'he' ? 'אין שחקנים עדיין. הוסף את השחקן הראשון!' : 'No players yet. Add your first player!'}
                </p>
            </div>
        `;
        return;
    }

    const positionsList = positions[state.sport][state.language];

    container.innerHTML = state.players.map(player => {
        const linkedNames = player.linkedWith
            .map(id => state.players.find(p => p.id === id))
            .filter(p => p)
            .map(p => `
                <span class="linked-tag">
                    ${p.name}
                    <button class="unlink-btn" onclick="unlinkPlayer(${player.id}, ${p.id})">×</button>
                </span>
            `).join('');

        return `
            <div class="player-card ${player.isStar ? 'star' : ''}">
                <div class="player-header">
                    <span class="player-name">${player.name}</span>
                    <div class="player-actions">
                        <button class="player-action-btn ${player.isStar ? 'active' : ''}"
                                onclick="toggleStar(${player.id})"
                                title="${state.language === 'he' ? 'שחקן כוכב' : 'Star Player'}">
                            ⭐
                        </button>
                        <button class="player-action-btn link-btn ${player.linkedWith.length > 0 ? 'active' : ''}"
                                onclick="openLinkModal(${player.id})"
                                title="${state.language === 'he' ? 'קישור לשחקן' : 'Link to Player'}">
                            🔗
                        </button>
                        <button class="player-action-btn delete-btn"
                                onclick="removePlayer(${player.id})"
                                title="${state.language === 'he' ? 'מחק' : 'Delete'}">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="position-selector">
                    <select class="position-select" onchange="updatePosition(${player.id}, this.value)">
                        ${positionsList.map((pos, idx) =>
                            `<option value="${idx}" ${player.position === idx ? 'selected' : ''}>${pos}</option>`
                        ).join('')}
                    </select>
                </div>
                ${linkedNames ? `<div class="linked-players">${linkedNames}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Team Settings
function setupTeamSizeOptions() {
    const container = document.getElementById('teamSizeSelector');
    const infoEl = document.getElementById('teamInfo');

    let min, max;
    if (state.sport === 'basketball') {
        min = 2;
        max = 5;
    } else {
        min = 5;
        max = 11;
    }

    container.innerHTML = '';
    for (let i = min; i <= max; i++) {
        const btn = document.createElement('button');
        btn.className = 'size-option';
        btn.textContent = i;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.teamSize = i;
            updateTeamInfo();
            saveState();
        });
        container.appendChild(btn);
    }

    // Default selection
    if (!state.teamSize || state.teamSize < min || state.teamSize > max) {
        state.teamSize = max;
    }

    const defaultBtn = container.querySelector(`.size-option:nth-child(${state.teamSize - min + 1})`);
    if (defaultBtn) defaultBtn.classList.add('selected');

    updateTeamInfo();
}

function updateTeamInfo() {
    const infoEl = document.getElementById('teamInfo');
    const totalPlayers = state.teamSize * 2;
    const currentPlayers = state.players.length;

    let text;
    if (state.language === 'he') {
        if (currentPlayers < totalPlayers) {
            text = `המשחק דורש ${totalPlayers} שחקנים (${state.teamSize}v${state.teamSize}). יש לך ${currentPlayers} שחקנים.`;
        } else if (currentPlayers === totalPlayers) {
            text = `מושלם! יש לך ${totalPlayers} שחקנים למשחק ${state.teamSize}v${state.teamSize}.`;
        } else {
            const bench = currentPlayers - totalPlayers;
            text = `יש לך ${currentPlayers} שחקנים. ${totalPlayers} ישחקו ו-${bench} ימתינו למשחק הבא.`;
        }
    } else {
        if (currentPlayers < totalPlayers) {
            text = `Game requires ${totalPlayers} players (${state.teamSize}v${state.teamSize}). You have ${currentPlayers} players.`;
        } else if (currentPlayers === totalPlayers) {
            text = `Perfect! You have ${totalPlayers} players for ${state.teamSize}v${state.teamSize}.`;
        } else {
            const bench = currentPlayers - totalPlayers;
            text = `You have ${currentPlayers} players. ${totalPlayers} will play and ${bench} will wait for next game.`;
        }
    }

    infoEl.textContent = text;
}

// Team Generation Algorithm
function generateTeams() {
    if (!state.teamSize || state.players.length < 2) return;

    const playersPerTeam = state.teamSize;
    const totalNeeded = playersPerTeam * 2;

    // Shuffle players
    let shuffled = [...state.players].sort(() => Math.random() - 0.5);

    // Separate playing and bench
    let playing = shuffled.slice(0, totalNeeded);
    let bench = shuffled.slice(totalNeeded);

    // Build teams with constraints
    const teams = balanceTeams(playing, playersPerTeam);

    displayTeams(teams, bench);
    showScreen('teams');
}

function balanceTeams(players, teamSize) {
    const team1 = [];
    const team2 = [];
    const assigned = new Set();

    // Helper: Count stars in a team
    function getStarCount(team) {
        return team.filter(p => p.isStar).length;
    }

    // Helper: Count position in a team
    function getPositionCount(team, position) {
        return team.filter(p => p.position === position).length;
    }

    // Helper: Get best team for a player
    function getBestTeamForPlayer(player) {
        // Check if teams are full
        if (team1.length >= teamSize) return team2;
        if (team2.length >= teamSize) return team1;

        // For star players, prefer team with fewer stars
        if (player.isStar) {
            const stars1 = getStarCount(team1);
            const stars2 = getStarCount(team2);
            if (stars1 < stars2) return team1;
            if (stars2 < stars1) return team2;
        }

        // Count this position in both teams
        const pos1 = getPositionCount(team1, player.position);
        const pos2 = getPositionCount(team2, player.position);

        // Prefer team with fewer of this position
        if (pos1 < pos2) return team1;
        if (pos2 < pos1) return team2;

        // If equal positions, prefer smaller team
        if (team1.length < team2.length) return team1;
        if (team2.length < team1.length) return team2;

        // Default to team1
        return team1;
    }

    // STEP 1: Find all linked groups
    const groups = findLinkedGroups(players);

    // Separate into star groups and non-star groups
    const starGroups = groups.filter(g => g.some(p => p.isStar));
    const nonStarGroups = groups.filter(g => !g.some(p => p.isStar));

    // STEP 2: Assign star groups alternately
    starGroups.forEach((group, idx) => {
        // Alternate between teams for star groups
        const targetTeam = idx % 2 === 0 ? team1 : team2;

        // Try to add to target team, but check capacity
        let allFit = true;
        for (const player of group) {
            if (targetTeam.length < teamSize) {
                targetTeam.push(player);
                assigned.add(player.id);
            } else {
                allFit = false;
                break;
            }
        }

        // If didn't fit, add remaining to other team
        if (!allFit) {
            const otherTeam = targetTeam === team1 ? team2 : team1;
            for (const player of group) {
                if (!assigned.has(player.id) && otherTeam.length < teamSize) {
                    otherTeam.push(player);
                    assigned.add(player.id);
                }
            }
        }
    });

    // STEP 3: Assign non-star linked groups to smaller team
    nonStarGroups.forEach(group => {
        const targetTeam = team1.length <= team2.length ? team1 : team2;

        // Try to add all to target team
        let allFit = true;
        for (const player of group) {
            if (!assigned.has(player.id)) {
                if (targetTeam.length < teamSize) {
                    targetTeam.push(player);
                    assigned.add(player.id);
                } else {
                    allFit = false;
                    break;
                }
            }
        }

        // If didn't fit, add remaining to other team
        if (!allFit) {
            const otherTeam = targetTeam === team1 ? team2 : team1;
            for (const player of group) {
                if (!assigned.has(player.id) && otherTeam.length < teamSize) {
                    otherTeam.push(player);
                    assigned.add(player.id);
                }
            }
        }
    });

    // STEP 4: Get remaining unassigned players
    const remaining = players.filter(p => !assigned.has(p.id));

    // STEP 5: Sort remaining players properly
    // Sort by: stars first, then by position, then shuffle within same category
    remaining.sort((a, b) => {
        // Stars first
        if (a.isStar !== b.isStar) return b.isStar - a.isStar;
        // Then by position
        if (a.position !== b.position) return a.position - b.position;
        // Random within same star status and position
        return Math.random() - 0.5;
    });

    // STEP 6: Assign remaining players one by one with smart balancing
    remaining.forEach(player => {
        const bestTeam = getBestTeamForPlayer(player);
        if (bestTeam && bestTeam.length < teamSize) {
            bestTeam.push(player);
            assigned.add(player.id);
        }
    });

    return [team1, team2];
}

function findLinkedGroups(players) {
    const visited = new Set();
    const groups = [];

    players.forEach(player => {
        if (visited.has(player.id)) return;

        const group = [];
        const queue = [player];

        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current.id)) continue;

            visited.add(current.id);
            group.push(current);

            current.linkedWith.forEach(linkedId => {
                const linkedPlayer = players.find(p => p.id === linkedId);
                if (linkedPlayer && !visited.has(linkedId)) {
                    queue.push(linkedPlayer);
                }
            });
        }

        if (group.length > 0) {
            groups.push(group);
        }
    });

    return groups;
}

function displayTeams(teams, bench) {
    const container = document.getElementById('teamsContainer');
    const benchContainer = document.getElementById('benchContainer');
    const benchPlayers = document.getElementById('benchPlayers');

    const sportEmoji = state.sport === 'basketball' ? '🏀' : '⚽';
    const teamLabels = state.language === 'he' ? ['קבוצה 1', 'קבוצה 2'] : ['Team 1', 'Team 2'];
    const positionsList = positions[state.sport][state.language];

    container.innerHTML = teams.map((team, idx) => `
        <div class="team">
            <h3>${sportEmoji} ${teamLabels[idx]}</h3>
            <ul class="team-players">
                ${team.map(player => `
                    <li class="team-player ${player.isStar ? 'star' : ''}">
                        ${player.name}
                        ${player.position > 0 ? `<span class="player-position">${positionsList[player.position]}</span>` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    if (bench.length > 0) {
        benchContainer.style.display = 'block';
        benchPlayers.innerHTML = bench.map(player =>
            `<span class="bench-player">${player.name}</span>`
        ).join('');
    } else {
        benchContainer.style.display = 'none';
    }
}

// State Persistence
function saveState() {
    localStorage.setItem('teamSelectorState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('teamSelectorState');
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            Object.assign(state, loaded);
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.log('SW registration failed', err);
        });
    });
}

// Make functions global for onclick handlers
window.removePlayer = removePlayer;
window.toggleStar = toggleStar;
window.updatePosition = updatePosition;
window.openLinkModal = openLinkModal;
window.unlinkPlayer = unlinkPlayer;
