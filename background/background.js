// Live Sports Scores - Background Service Worker
// Handles periodic score updates and notifications

class BackgroundService {
  constructor() {
    this.footballMatches = new Map();
    this.cricketMatches = new Map();
    this.favoriteTeams = [];
    this.notificationEnabled = true;
    this.updateInterval = 60; // seconds
    
    this.init();
  }

  init() {
    // Set up alarm for periodic updates
    chrome.alarms.create('scoreUpdate', {
      periodInMinutes: 1
    });

    // Listen for alarm
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'scoreUpdate') {
        this.checkForUpdates();
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async
    });

    // Load preferences
    this.loadPreferences();

    // Initial check
    this.checkForUpdates();

    console.log('Live Sports Scores: Background service initialized');
  }

  async loadPreferences() {
    chrome.storage.sync.get([
      'favoriteTeams',
      'notificationEnabled',
      'updateInterval',
      'trackedMatches'
    ], (result) => {
      this.favoriteTeams = result.favoriteTeams || [];
      this.notificationEnabled = result.notificationEnabled !== false;
      this.updateInterval = result.updateInterval || 60;
      
      // Restore tracked matches
      if (result.trackedMatches) {
        const tracked = result.trackedMatches;
        tracked.football?.forEach(m => this.footballMatches.set(m.id, m));
        tracked.cricket?.forEach(m => this.cricketMatches.set(m.id, m));
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'getScores':
        const scores = await this.fetchAllScores();
        sendResponse({ success: true, data: scores });
        break;
        
      case 'trackMatch':
        this.trackMatch(request.match);
        sendResponse({ success: true });
        break;
        
      case 'untrackMatch':
        this.untrackMatch(request.matchId, request.sport);
        sendResponse({ success: true });
        break;
        
      case 'updatePreferences':
        this.updatePreferences(request.preferences);
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  async checkForUpdates() {
    if (!this.notificationEnabled) return;

    try {
      await this.fetchFootballScores();
      await this.fetchCricketScores();
      this.saveTrackedMatches();
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  async fetchFootballScores() {
    const leagues = ['bl1', 'bl2', 'bl3', 'dfb', 'ucl', 'uel', 'pl', 'pd', 'sa', 'fl1'];
    
    for (const leagueId of leagues) {
      try {
        const response = await fetch(`https://api.openligadb.de/getmatchdata/${leagueId}`);
        if (!response.ok) continue;
        
        const matches = await response.json();
        
        if (Array.isArray(matches)) {
          for (const match of matches) {
            if (match.matchIsRunning) {
              this.processFootballMatch(match);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch ${leagueId}:`, err);
      }
    }
  }

  processFootballMatch(match) {
    const matchId = match.matchID.toString();
    const previousMatch = this.footballMatches.get(matchId);
    
    const currentMatch = {
      id: matchId,
      sport: 'football',
      league: match.leagueName || 'Unknown League',
      homeTeam: match.team1.teamName,
      awayTeam: match.team2.teamName,
      homeScore: match.matchResults?.[1]?.pointsTeam1 ?? match.matchResults?.[0]?.pointsTeam1 ?? 0,
      awayScore: match.matchResults?.[1]?.pointsTeam2 ?? match.matchResults?.[0]?.pointsTeam2 ?? 0,
      minute: match.matchResults?.[1]?.resultName || '',
      lastUpdated: Date.now()
    };

    // Check for score changes
    if (previousMatch) {
      const homeScoreChanged = previousMatch.homeScore !== currentMatch.homeScore;
      const awayScoreChanged = previousMatch.awayScore !== currentMatch.awayScore;

      if (homeScoreChanged || awayScoreChanged) {
        const scoringTeam = homeScoreChanged ? currentMatch.homeTeam : currentMatch.awayTeam;
        const newScore = homeScoreChanged ? currentMatch.homeScore : currentMatch.awayScore;
        
        this.sendGoalNotification(currentMatch, scoringTeam, newScore);
      }
    }

    // Check if match involves favorite team
    if (this.isFavoriteTeam(currentMatch.homeTeam) || this.isFavoriteTeam(currentMatch.awayTeam)) {
      this.footballMatches.set(matchId, currentMatch);
    }
  }

  async fetchCricketScores() {
    const apiKey = await this.getCricketApiKey();
    
    if (!apiKey) {
      console.warn('No Cricket API key found, skipping cricket fetch');
      return;
    }
    
    try {
      // CORRECT CricAPI endpoint: currentMatches (capital M)
      const url = `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('Cricket API response not OK:', response.status);
        return;
      }

      const data = await response.json();
      
      if (data && data.status === 'success' && Array.isArray(data.data)) {
        for (const match of data.data) {
          this.processCricketMatch(match);
        }
      }
    } catch (error) {
      console.warn('Cricket API fetch failed:', error);
    }
  }

  processCricketMatch(match) {
    const matchId = match.id?.toString();
    if (!matchId) return;
    
    const previousMatch = this.cricketMatches.get(matchId);
    
    // Parse scores from CricAPI format
    const homeScore = this.parseCricAPIScore(match.score?.[0] || '');
    const awayScore = this.parseCricAPIScore(match.score?.[1] || '');
    
    const currentMatch = {
      id: matchId,
      sport: 'cricket',
      league: match.series_id || 'International',
      homeTeam: match.teams?.[0] || 'Team A',
      awayTeam: match.teams?.[1] || 'Team B',
      homeScore: homeScore.runs,
      awayScore: awayScore.runs,
      homeWickets: homeScore.wickets,
      awayWickets: awayScore.wickets,
      overs: homeScore.overs || awayScore.overs || '',
      lastUpdated: Date.now()
    };

    // Check for wicket or significant score change
    if (previousMatch) {
      const homeWicketChange = previousMatch.homeWickets !== currentMatch.homeWickets;
      const awayWicketChange = previousMatch.awayWickets !== currentMatch.awayWickets;
      
      if (homeWicketChange || awayWicketChange) {
        const wicketTeam = homeWicketChange ? currentMatch.homeTeam : currentMatch.awayTeam;
        const wickets = homeWicketChange ? currentMatch.homeWickets : currentMatch.awayWickets;
        
        this.sendWicketNotification(currentMatch, wicketTeam, wickets);
      }
    }

    if (this.isFavoriteTeam(currentMatch.homeTeam) || this.isFavoriteTeam(currentMatch.awayTeam)) {
      this.cricketMatches.set(matchId, currentMatch);
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

  sendGoalNotification(match, scoringTeam, score) {
    if (!this.notificationEnabled) return;

    const title = `⚽ GOAL! ${match.league}`;
    const message = `${scoringTeam} scores!\n${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`;

    chrome.notifications.create(`goal-${match.id}-${Date.now()}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: title,
      message: message,
      priority: 2
    });
  }

  sendWicketNotification(match, team, wickets) {
    if (!this.notificationEnabled) return;

    const title = `🏏 WICKET! ${match.league}`;
    const message = `${team} loses a wicket! (${wickets} down)\n${match.homeTeam} ${match.homeScore}/${match.homeWickets} - ${match.awayScore}/${match.awayWickets} ${match.awayTeam}`;

    chrome.notifications.create(`wicket-${match.id}-${Date.now()}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: title,
      message: message,
      priority: 2
    });
  }

  sendMatchStartNotification(match) {
    if (!this.notificationEnabled) return;

    const icon = match.sport === 'football' ? '⚽' : '🏏';
    const title = `${icon} Match Started!`;
    const message = `${match.homeTeam} vs ${match.awayTeam}\n${match.league}`;

    chrome.notifications.create(`start-${match.id}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: title,
      message: message,
      priority: 1
    });
  }

  sendMatchEndNotification(match) {
    if (!this.notificationEnabled) return;

    const icon = match.sport === 'football' ? '⚽' : '🏏';
    const title = `${icon} Match Ended!`;
    
    let winner = '';
    if (match.sport === 'football') {
      if (match.homeScore > match.awayScore) winner = match.homeTeam;
      else if (match.awayScore > match.homeScore) winner = match.awayTeam;
      else winner = 'Draw';
    }
    
    const message = `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}\nWinner: ${winner}`;

    chrome.notifications.create(`end-${match.id}`, {
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: title,
      message: message,
      priority: 1
    });
  }

  isFavoriteTeam(teamName) {
    return this.favoriteTeams.some(team => 
      teamName.toLowerCase().includes(team.toLowerCase()) ||
      team.toLowerCase().includes(teamName.toLowerCase())
    );
  }

  trackMatch(match) {
    if (match.sport === 'football') {
      this.footballMatches.set(match.id, match);
    } else {
      this.cricketMatches.set(match.id, match);
    }
    this.saveTrackedMatches();
  }

  untrackMatch(matchId, sport) {
    if (sport === 'football') {
      this.footballMatches.delete(matchId);
    } else {
      this.cricketMatches.delete(matchId);
    }
    this.saveTrackedMatches();
  }

  saveTrackedMatches() {
    const trackedMatches = {
      football: Array.from(this.footballMatches.values()),
      cricket: Array.from(this.cricketMatches.values()),
      lastUpdated: Date.now()
    };
    
    chrome.storage.local.set({ trackedMatches });
  }

  updatePreferences(preferences) {
    if (preferences.favoriteTeams !== undefined) {
      this.favoriteTeams = preferences.favoriteTeams;
    }
    if (preferences.notificationEnabled !== undefined) {
      this.notificationEnabled = preferences.notificationEnabled;
    }
    if (preferences.updateInterval !== undefined) {
      this.updateInterval = preferences.updateInterval;
      
      // Update alarm interval
      chrome.alarms.clear('scoreUpdate');
      chrome.alarms.create('scoreUpdate', {
        periodInMinutes: Math.max(1, this.updateInterval / 60)
      });
    }
  }

  async getCricketApiKey() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['cricketApiKey'], (result) => {
        resolve(result.cricketApiKey || '');
      });
    });
  }

  async fetchAllScores() {
    await this.checkForUpdates();
    return {
      football: Array.from(this.footballMatches.values()),
      cricket: Array.from(this.cricketMatches.values())
    };
  }
}

// Initialize background service
new BackgroundService();

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default preferences
    chrome.storage.sync.set({
      favoriteTeams: [],
      notificationEnabled: true,
      updateInterval: 60,
      preferredSport: 'football',
      matchFilter: 'live'
    });

    // Show welcome notification
    chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: '⚽🏏 Welcome to Live Sports Scores!',
      message: 'Click the extension icon to view live scores. Set your favorite teams in settings!',
      priority: 2
    });
  }
});
