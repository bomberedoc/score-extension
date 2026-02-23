// Live Sports Scores - Popup Script
// Handles UI interactions and displays live scores

class LiveScoresPopup {
  constructor() {
    this.currentSport = 'football';
    this.currentFilter = 'live';
    this.matches = [];
    this.refreshInterval = null;
    this.leaguesModal = null;
    
    this.init();
  }

  async init() {
    this.cacheElements();
    this.bindEvents();
    this.loadPreferences();
    await this.loadMatches();
    this.startAutoRefresh();
  }

  cacheElements() {
    this.elements = {
      tabButtons: document.querySelectorAll('.tab-btn'),
      matchFilter: document.getElementById('match-filter'),
      refreshBtn: document.getElementById('refresh-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      errorMessage: document.getElementById('error-message'),
      retryBtn: document.getElementById('retry-btn'),
      matchesContainer: document.getElementById('matches-container'),
      emptyState: document.getElementById('empty-state'),
      lastUpdated: document.getElementById('last-updated'),
      viewAllBtn: document.getElementById('view-all-btn')
    };
  }

  bindEvents() {
    // Tab switching
    this.elements.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => this.switchSport(btn.dataset.sport));
    });

    // Filter change
    this.elements.matchFilter.addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.loadMatches();
    });

    // Refresh button
    this.elements.refreshBtn.addEventListener('click', () => this.loadMatches());

    // Settings button
    this.elements.settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Retry button
    this.elements.retryBtn.addEventListener('click', () => this.loadMatches());

    // View all leagues - now shows leagues modal
    this.elements.viewAllBtn.addEventListener('click', () => this.showLeaguesModal());
  }

  loadPreferences() {
    chrome.storage.sync.get(['preferredSport', 'matchFilter'], (result) => {
      if (result.preferredSport) {
        this.switchSport(result.preferredSport);
      }
      if (result.matchFilter) {
        this.currentFilter = result.matchFilter;
        this.elements.matchFilter.value = result.matchFilter;
      }
    });
  }

  switchSport(sport) {
    this.currentSport = sport;
    
    // Update tab UI
    this.elements.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sport === sport);
    });

    // Save preference
    chrome.storage.sync.set({ preferredSport: sport });
    
    // Load matches for selected sport
    this.loadMatches();
  }

  async loadMatches() {
    this.showLoading();
    
    try {
      if (this.currentSport === 'football') {
        await this.loadFootballMatches();
      } else {
        await this.loadCricketMatches();
      }
      
      // Remove duplicates before rendering
      this.removeDuplicateMatches();
      
      this.renderMatches();
      this.updateLastUpdated();
      this.showMatches();
    } catch (error) {
      console.error('Error loading matches:', error);
      this.showError(error.message);
    }
  }

  // Remove duplicate matches based on team names
  removeDuplicateMatches() {
    const seen = new Set();
    this.matches = this.matches.filter(match => {
      const key = `${match.homeTeam.toLowerCase().trim()}_${match.awayTeam.toLowerCase().trim()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async loadFootballMatches() {
    this.matches = [];
    
    // Load from OpenLigaDB (European leagues)
    await this.loadOpenLigaDBMatches();
    
    // Load from TheSportsDB (ISL and other leagues)
    await this.loadSportsDBMatches();
    
    // Filter matches based on current filter
    this.filterMatches();
  }

  async loadOpenLigaDBMatches() {
    // Using OpenLigaDB - free, no API key required
    const leagues = [
      { id: 'bl1', name: 'Bundesliga', country: 'Germany' },
      { id: 'bl2', name: '2. Bundesliga', country: 'Germany' },
      { id: 'bl3', name: '3. Liga', country: 'Germany' },
      { id: 'dfb', name: 'DFB-Pokal', country: 'Germany' },
      { id: 'ucl', name: 'Champions League', country: 'Europe' },
      { id: 'uel', name: 'Europa League', country: 'Europe' },
      { id: 'pl', name: 'Premier League', country: 'England' },
      { id: 'pd', name: 'La Liga', country: 'Spain' },
      { id: 'sa', name: 'Serie A', country: 'Italy' },
      { id: 'fl1', name: 'Ligue 1', country: 'France' }
    ];
    
    for (const league of leagues) {
      try {
        const response = await fetch(`https://api.openligadb.de/getmatchdata/${league.id}`);
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          const processedMatches = data.map(match => ({
            id: `ol_${match.matchID}`,
            sport: 'football',
            league: league.name,
            leagueIcon: '⚽',
            homeTeam: match.team1.teamName,
            awayTeam: match.team2.teamName,
            homeScore: match.matchResults?.[1]?.pointsTeam1 ?? match.matchResults?.[0]?.pointsTeam1 ?? '-',
            awayScore: match.matchResults?.[1]?.pointsTeam2 ?? match.matchResults?.[0]?.pointsTeam2 ?? '-',
            status: this.getFootballMatchStatus(match),
            time: this.formatMatchTime(match.matchDateTime),
            venue: match.location?.locationCity || '',
            matchDateTime: match.matchDateTime,
            isLive: match.matchIsRunning || false,
            minute: match.matchResults?.[1]?.resultName || ''
          }));
          
          this.matches.push(...processedMatches);
        }
      } catch (err) {
        console.warn(`Failed to load ${league.name}:`, err);
      }
    }
  }

  async loadSportsDBMatches() {
    // Using TheSportsDB - free API key (3) for demo purposes
    const apiKey = '3';
    
    // League IDs for TheSportsDB
    const leagues = [
      { id: '4791', name: 'Indian Super League', country: 'India' },
      { id: '4328', name: 'Premier League', country: 'England' },
      { id: '4335', name: 'La Liga', country: 'Spain' },
      { id: '4332', name: 'Serie A', country: 'Italy' },
      { id: '4331', name: 'Bundesliga', country: 'Germany' },
      { id: '4334', name: 'Ligue 1', country: 'France' },
      { id: '4480', name: 'MLS', country: 'USA' },
      { id: '4346', name: 'Brasileirao', country: 'Brazil' },
      { id: '4350', name: 'Eredivisie', country: 'Netherlands' },
      { id: '4337', name: 'Primeira Liga', country: 'Portugal' }
    ];
    
    for (const league of leagues) {
      try {
        // Pull multiple windows so leagues with no "today" matches (e.g., ISL between rounds)
        // still appear in upcoming/finished filters.
        const endpoints = [
          `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnextleague.php?id=${league.id}`,
          `https://www.thesportsdb.com/api/v1/json/${apiKey}/eventspastleague.php?id=${league.id}`
        ];

        for (const url of endpoints) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const data = await response.json();
          if (!data.events || data.events.length === 0) continue;

          const processedMatches = data.events.map(match => this.mapSportsDBFootballMatch(match, league.name));
          this.matches.push(...processedMatches);
        }
      } catch (err) {
        console.warn(`Failed to load ${league.name} from SportsDB:`, err);
      }
    }
  }

  mapSportsDBFootballMatch(match, fallbackLeagueName) {
    const matchDateTime = match.strTimestamp || `${match.dateEvent || ''}T${match.strTime || '00:00:00'}`;
    const matchDate = new Date(matchDateTime);
    const progress = (match.strProgress || '').toUpperCase();
    const statusText = (match.strStatus || '').toLowerCase();

    const isLive = progress.includes("'") || progress === 'HT' || statusText.includes('live');
    const isFinished = progress === 'FT' || statusText.includes('finished') || (match.intHomeScore !== null && match.intAwayScore !== null);

    return {
      id: `sdb_${match.idEvent}`,
      sport: 'football',
      league: match.strLeague || fallbackLeagueName,
      leagueIcon: '⚽',
      homeTeam: match.strHomeTeam,
      awayTeam: match.strAwayTeam,
      homeScore: match.intHomeScore ?? '-',
      awayScore: match.intAwayScore ?? '-',
      status: isLive ? 'live' : isFinished ? 'finished' : 'upcoming',
      time: Number.isNaN(matchDate.getTime())
        ? 'TBD'
        : matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      venue: match.strVenue || '',
      matchDateTime,
      isLive,
      minute: progress || ''
    };
  }

  async loadCricketMatches() {
    const apiKey = await this.getCricketApiKey();
    
    if (!apiKey) {
      console.warn('No Cricket API key found, using mock data');
      this.loadMockCricketData();
      this.filterMatches();
      return;
    }
    
    this.matches = [];
    
    // Load current/live matches
    await this.loadCricapiCurrentMatches(apiKey);
    
    // Load upcoming matches
    await this.loadCricapiUpcomingMatches(apiKey);
    
    this.filterMatches();
  }

  async loadCricapiCurrentMatches(apiKey) {
    try {
      // CORRECT endpoint: currentMatches (capital M)
      const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('CricAPI currentMatches response not OK:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const processedMatches = data.data.map(match => {
          const homeScore = this.parseCricAPIScore(match.score?.[0] || '');
          const awayScore = this.parseCricAPIScore(match.score?.[1] || '');
          
          const matchStatus = (match.status || '').toLowerCase();
          const isLive = matchStatus.includes('live') || matchStatus.includes('in progress') || matchStatus.includes('innings');
          const isFinished = matchStatus.includes('won') || matchStatus.includes('draw') || matchStatus.includes('tied') || matchStatus.includes('result');
          
          return {
            id: match.id || `cricket_${Date.now()}_${Math.random()}`,
            sport: 'cricket',
            league: match.name?.split(',')[0] || match.series_id || 'International',
            leagueIcon: '🏏',
            homeTeam: match.teams?.[0] || 'Team A',
            awayTeam: match.teams?.[1] || 'Team B',
            homeScore: homeScore,
            awayScore: awayScore,
            status: isLive ? 'live' : isFinished ? 'finished' : 'upcoming',
            time: match.dateTimeGMT ? new Date(match.dateTimeGMT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
            venue: match.venue || '',
            matchDateTime: match.dateTimeGMT || new Date().toISOString(),
            isLive: isLive,
            overs: homeScore.overs || awayScore.overs || ''
          };
        });
        
        this.matches.push(...processedMatches);
      }
    } catch (error) {
      console.warn('CricAPI currentMatches failed:', error);
    }
  }

  async loadCricapiUpcomingMatches(apiKey) {
    try {
      // Use matches endpoint for upcoming matches
      const url = `https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('CricAPI matches response not OK:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        const processedMatches = data.data.map(match => {
          const matchStatus = (match.status || '').toLowerCase();
          const isLive = matchStatus.includes('live') || matchStatus.includes('in progress');
          const isFinished = matchStatus.includes('won') || matchStatus.includes('draw') || matchStatus.includes('tied') || matchStatus.includes('result');
          
          return {
            id: match.id || `cricket_upcoming_${Date.now()}_${Math.random()}`,
            sport: 'cricket',
            league: match.name?.split(',')[0] || match.series_id || 'International',
            leagueIcon: '🏏',
            homeTeam: match.teams?.[0] || 'Team A',
            awayTeam: match.teams?.[1] || 'Team B',
            homeScore: { runs: 0, wickets: 0, overs: '' },
            awayScore: { runs: 0, wickets: 0, overs: '' },
            status: isLive ? 'live' : isFinished ? 'finished' : 'upcoming',
            time: match.dateTimeGMT ? new Date(match.dateTimeGMT).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
            venue: match.venue || '',
            matchDateTime: match.dateTimeGMT || new Date().toISOString(),
            isLive: isLive,
            overs: ''
          };
        });
        
        this.matches.push(...processedMatches);
      }
    } catch (error) {
      console.warn('CricAPI matches failed:', error);
    }
  }

  parseCricAPIScore(scoreStr) {
    if (!scoreStr) return { runs: 0, wickets: 0, overs: '' };
    
    // Parse score like "186/4 (20 Ov)" or "142/10 (19.2 Ov)"
    const match = scoreStr.match(/(\d+)\/(\d+)\s*\(([\d.]+)\s*Ov\)/);
    if (match) {
      return {
        runs: parseInt(match[1]),
        wickets: parseInt(match[2]),
        overs: match[3]
      };
    }
    
    // Try simpler format like "186/4"
    const simpleMatch = scoreStr.match(/(\d+)\/(\d+)/);
    if (simpleMatch) {
      return {
        runs: parseInt(simpleMatch[1]),
        wickets: parseInt(simpleMatch[2]),
        overs: ''
      };
    }
    
    return { runs: 0, wickets: 0, overs: '' };
  }

  loadMockCricketData() {
    this.matches = [
      {
        id: 'c1',
        sport: 'cricket',
        league: 'ICC World Cup 2024',
        leagueIcon: '🏏',
        homeTeam: 'India',
        awayTeam: 'Australia',
        homeScore: { runs: 287, wickets: 6, overs: '48.2' },
        awayScore: { runs: 245, wickets: 8, overs: '45.0' },
        status: 'live',
        time: 'Live',
        venue: 'Melbourne Cricket Ground',
        matchDateTime: new Date().toISOString(),
        isLive: true
      },
      {
        id: 'c2',
        sport: 'cricket',
        league: 'IPL 2024',
        leagueIcon: '🏏',
        homeTeam: 'Mumbai Indians',
        awayTeam: 'Chennai Super Kings',
        homeScore: { runs: 186, wickets: 4, overs: '20.0' },
        awayScore: { runs: 142, wickets: 5, overs: '16.3' },
        status: 'live',
        time: 'Live',
        venue: 'Wankhede Stadium',
        matchDateTime: new Date().toISOString(),
        isLive: true
      },
      {
        id: 'c3',
        sport: 'cricket',
        league: 'Big Bash League',
        leagueIcon: '🏏',
        homeTeam: 'Sydney Sixers',
        awayTeam: 'Melbourne Stars',
        homeScore: { runs: 0, wickets: 0, overs: '0.0' },
        awayScore: { runs: 0, wickets: 0, overs: '0.0' },
        status: 'upcoming',
        time: '19:30',
        venue: 'SCG',
        matchDateTime: new Date(Date.now() + 3600000).toISOString(),
        isLive: false
      }
    ];
  }

  getFootballMatchStatus(match) {
    if (match.matchIsRunning) return 'live';
    if (match.matchResults && match.matchResults.length > 0) return 'finished';
    return 'upcoming';
  }

  formatMatchTime(dateTimeString) {
    if (!dateTimeString) return 'TBD';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  filterMatches() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (this.currentFilter) {
      case 'live':
        this.matches = this.matches.filter(m => m.isLive);
        break;
      case 'today':
        this.matches = this.matches.filter(m => {
          const matchDate = new Date(m.matchDateTime);
          return matchDate >= today && matchDate < tomorrow;
        });
        break;
      case 'upcoming':
        this.matches = this.matches.filter(m => {
          const matchDate = new Date(m.matchDateTime);
          return matchDate > now && !m.isLive;
        });
        break;
      case 'finished':
        this.matches = this.matches.filter(m => m.status === 'finished');
        break;
    }

    // Sort: Live first, then by time
    this.matches.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(a.matchDateTime) - new Date(b.matchDateTime);
    });
  }

  renderMatches() {
    const container = this.elements.matchesContainer;
    container.innerHTML = '';

    if (this.matches.length === 0) {
      this.elements.emptyState.classList.remove('hidden');
      return;
    }

    this.elements.emptyState.classList.add('hidden');

    this.matches.forEach(match => {
      const card = this.createMatchCard(match);
      container.appendChild(card);
    });
  }

  createMatchCard(match) {
    const card = document.createElement('div');
    card.className = `match-card ${match.isLive ? 'live' : ''}`;
    card.dataset.matchId = match.id;

    if (match.sport === 'football') {
      card.innerHTML = this.getFootballCardHTML(match);
    } else {
      card.innerHTML = this.getCricketCardHTML(match);
    }

    card.addEventListener('click', () => this.showMatchDetails(match));

    return card;
  }

  getFootballCardHTML(match) {
    const statusClass = match.isLive ? 'live' : match.status;
    const statusText = match.isLive ? `LIVE ${match.minute}` : 
                       match.status === 'finished' ? 'FT' : match.time;

    return `
      <div class="match-header">
        <div class="league-info">
          <span class="league-icon">${match.leagueIcon}</span>
          <span>${match.league}</span>
        </div>
        <div class="match-status ${statusClass}">
          ${match.isLive ? '<span class="live-indicator"></span>' : ''}
          <span>${statusText}</span>
        </div>
      </div>
      <div class="teams-section">
        <div class="team-row">
          <div class="team-info">
            <div class="team-logo">${match.homeTeam.charAt(0)}</div>
            <span class="team-name">${match.homeTeam}</span>
          </div>
          <span class="team-score ${match.homeScore > match.awayScore && match.status === 'finished' ? 'winning' : ''}">${match.homeScore}</span>
        </div>
        <div class="team-row">
          <div class="team-info">
            <div class="team-logo">${match.awayTeam.charAt(0)}</div>
            <span class="team-name">${match.awayTeam}</span>
          </div>
          <span class="team-score ${match.awayScore > match.homeScore && match.status === 'finished' ? 'winning' : ''}">${match.awayScore}</span>
        </div>
      </div>
      ${match.venue ? `
        <div class="match-details">
          <span class="match-venue">📍 ${match.venue}</span>
        </div>
      ` : ''}
    `;
  }

  getCricketCardHTML(match) {
    const statusClass = match.isLive ? 'live' : match.status;
    const statusText = match.isLive ? 'LIVE' : match.status === 'finished' ? 'Finished' : match.time;

    const homeScore = typeof match.homeScore === 'object' ? 
      `${match.homeScore.runs}/${match.homeScore.wickets}` : match.homeScore;
    const awayScore = typeof match.awayScore === 'object' ? 
      `${match.awayScore.runs}/${match.awayScore.wickets}` : match.awayScore;
    
    const homeOvers = typeof match.homeScore === 'object' ? match.homeScore.overs : '';
    const awayOvers = typeof match.awayScore === 'object' ? match.awayScore.overs : '';

    return `
      <div class="match-header">
        <div class="league-info">
          <span class="league-icon">${match.leagueIcon}</span>
          <span>${match.league}</span>
        </div>
        <div class="match-status ${statusClass}">
          ${match.isLive ? '<span class="live-indicator"></span>' : ''}
          <span>${statusText}</span>
        </div>
      </div>
      <div class="teams-section">
        <div class="team-row">
          <div class="team-info">
            <div class="team-logo">${match.homeTeam.charAt(0)}</div>
            <span class="team-name">${match.homeTeam}</span>
          </div>
          <div class="cricket-score">
            <span class="cricket-runs ${match.homeScore.runs > match.awayScore.runs && match.status === 'finished' ? 'winning' : ''}">${homeScore}</span>
            ${homeOvers ? `<span class="cricket-overs">${homeOvers} ov</span>` : ''}
          </div>
        </div>
        <div class="team-row">
          <div class="team-info">
            <div class="team-logo">${match.awayTeam.charAt(0)}</div>
            <span class="team-name">${match.awayTeam}</span>
          </div>
          <div class="cricket-score">
            <span class="cricket-runs ${match.awayScore.runs > match.homeScore.runs && match.status === 'finished' ? 'winning' : ''}">${awayScore}</span>
            ${awayOvers ? `<span class="cricket-overs">${awayOvers} ov</span>` : ''}
          </div>
        </div>
      </div>
      ${match.venue ? `
        <div class="match-details">
          <span class="match-venue">📍 ${match.venue}</span>
        </div>
      ` : ''}
    `;
  }

  showLeaguesModal() {
    // Create modal if it doesn't exist
    if (!this.leaguesModal) {
      this.createLeaguesModal();
    }
    this.leaguesModal.classList.remove('hidden');
  }

  createLeaguesModal() {
    const modal = document.createElement('div');
    modal.className = 'leagues-modal hidden';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>🏆 Available Leagues</h2>
          <button class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="league-category">
            <h3>⚽ Football</h3>
            <div class="leagues-grid">
              <div class="league-item"><span class="flag">🇮🇳</span> Indian Super League</div>
              <div class="league-item"><span class="flag">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span> Premier League</div>
              <div class="league-item"><span class="flag">🇪🇸</span> La Liga</div>
              <div class="league-item"><span class="flag">🇩🇪</span> Bundesliga</div>
              <div class="league-item"><span class="flag">🇮🇹</span> Serie A</div>
              <div class="league-item"><span class="flag">🇫🇷</span> Ligue 1</div>
              <div class="league-item"><span class="flag">🇪🇺</span> Champions League</div>
              <div class="league-item"><span class="flag">🇪🇺</span> Europa League</div>
              <div class="league-item"><span class="flag">🇺🇸</span> MLS</div>
              <div class="league-item"><span class="flag">🇧🇷</span> Brasileirao</div>
            </div>
          </div>
          <div class="league-category">
            <h3>🏏 Cricket</h3>
            <div class="leagues-grid">
              <div class="league-item">International Matches</div>
              <div class="league-item">IPL</div>
              <div class="league-item">Big Bash League</div>
              <div class="league-item">PSL</div>
              <div class="league-item">T20 World Cup</div>
              <div class="league-item">ODI World Cup</div>
              <div class="league-item">Test Matches</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .leagues-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .leagues-modal.hidden {
        display: none;
      }
      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
      }
      .modal-content {
        position: relative;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 1001;
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .modal-header h2 {
        font-size: 18px;
        margin: 0;
      }
      .close-btn {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
      }
      .modal-body {
        padding: 20px;
      }
      .league-category {
        margin-bottom: 20px;
      }
      .league-category h3 {
        font-size: 14px;
        color: #a0a0a0;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .leagues-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
      .league-item {
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .flag {
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Bind close events
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    modal.querySelector('.modal-overlay').addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    
    this.leaguesModal = modal;
  }

  showMatchDetails(match) {
    chrome.storage.local.set({ selectedMatch: match }, () => {
      console.log('Match selected:', match);
    });
  }

  showLoading() {
    this.elements.loading.classList.remove('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.matchesContainer.classList.add('hidden');
    this.elements.emptyState.classList.add('hidden');
  }

  showMatches() {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.matchesContainer.classList.remove('hidden');
  }

  showError(message) {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.remove('hidden');
    this.elements.matchesContainer.classList.add('hidden');
    this.elements.emptyState.classList.add('hidden');
    this.elements.errorMessage.textContent = message || 'Failed to load scores';
  }

  updateLastUpdated() {
    const now = new Date();
    this.elements.lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.loadMatches();
      }
    }, 60000);
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async getCricketApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['cricketApiKey'], (result) => {
        resolve(result.cricketApiKey || '');
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new LiveScoresPopup();
});
