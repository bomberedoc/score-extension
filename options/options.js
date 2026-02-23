// Live Sports Scores - Options Page Script
// Handles user preferences and settings

class OptionsPage {
  constructor() {
    this.favoriteTeams = [];
    this.preferences = {};
    
    this.init();
  }

  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSettings();
  }

  cacheElements() {
    this.elements = {
      // Notifications
      notificationsToggle: document.getElementById('notifications-toggle'),
      updateInterval: document.getElementById('update-interval'),
      
      // Favorite Teams
      teamInput: document.getElementById('team-input'),
      addTeamBtn: document.getElementById('add-team-btn'),
      favoriteTeamsList: document.getElementById('favorite-teams-list'),
      emptyTeams: document.getElementById('empty-teams'),
      
      // API Configuration
      cricketApiKey: document.getElementById('cricket-api-key'),
      apiStatus: document.getElementById('api-status'),
      
      // Default Preferences
      defaultSport: document.getElementById('default-sport'),
      defaultFilter: document.getElementById('default-filter'),
      
      // Footer
      resetBtn: document.getElementById('reset-btn'),
      saveStatus: document.getElementById('save-status')
    };
  }

  bindEvents() {
    // Notifications
    this.elements.notificationsToggle.addEventListener('change', () => {
      this.saveSetting('notificationEnabled', this.elements.notificationsToggle.checked);
    });

    this.elements.updateInterval.addEventListener('change', () => {
      this.saveSetting('updateInterval', parseInt(this.elements.updateInterval.value));
    });

    // Favorite Teams
    this.elements.addTeamBtn.addEventListener('click', () => this.addTeam());
    this.elements.teamInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTeam();
    });

    // API Configuration
    this.elements.cricketApiKey.addEventListener('input', this.debounce(() => {
      this.saveSetting('cricketApiKey', this.elements.cricketApiKey.value);
      this.updateApiStatus();
    }, 500));

    // Default Preferences
    this.elements.defaultSport.addEventListener('change', () => {
      this.saveSetting('preferredSport', this.elements.defaultSport.value);
    });

    this.elements.defaultFilter.addEventListener('change', () => {
      this.saveSetting('matchFilter', this.elements.defaultFilter.value);
    });

    // Reset
    this.elements.resetBtn.addEventListener('click', () => this.resetToDefaults());
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get([
      'notificationEnabled',
      'updateInterval',
      'favoriteTeams',
      'cricketApiKey',
      'preferredSport',
      'matchFilter'
    ]);

    // Apply settings to UI
    this.elements.notificationsToggle.checked = settings.notificationEnabled !== false;
    this.elements.updateInterval.value = (settings.updateInterval || 60).toString();
    this.elements.cricketApiKey.value = settings.cricketApiKey || '';
    this.elements.defaultSport.value = settings.preferredSport || 'football';
    this.elements.defaultFilter.value = settings.matchFilter || 'live';

    // Load favorite teams
    this.favoriteTeams = settings.favoriteTeams || [];
    this.renderFavoriteTeams();
    this.updateApiStatus();
  }

  saveSetting(key, value) {
    chrome.storage.sync.set({ [key]: value }, () => {
      this.showSaveStatus();
      
      // Notify background script of preference change
      chrome.runtime.sendMessage({
        action: 'updatePreferences',
        preferences: { [key]: value }
      });
    });
  }

  showSaveStatus() {
    this.elements.saveStatus.classList.remove('hidden');
    setTimeout(() => {
      this.elements.saveStatus.classList.add('hidden');
    }, 2000);
  }

  // Favorite Teams Management
  addTeam() {
    const teamName = this.elements.teamInput.value.trim();
    
    if (!teamName) {
      this.shakeInput(this.elements.teamInput);
      return;
    }

    // Check for duplicates
    if (this.favoriteTeams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
      this.shakeInput(this.elements.teamInput);
      return;
    }

    const team = {
      id: Date.now().toString(),
      name: teamName,
      sport: this.detectSport(teamName),
      addedAt: Date.now()
    };

    this.favoriteTeams.push(team);
    this.saveFavoriteTeams();
    this.elements.teamInput.value = '';
    this.renderFavoriteTeams();
  }

  removeTeam(teamId) {
    this.favoriteTeams = this.favoriteTeams.filter(t => t.id !== teamId);
    this.saveFavoriteTeams();
    this.renderFavoriteTeams();
  }

  saveFavoriteTeams() {
    chrome.storage.sync.set({ favoriteTeams: this.favoriteTeams });
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'updatePreferences',
      preferences: { favoriteTeams: this.favoriteTeams }
    });
  }

  renderFavoriteTeams() {
    const container = this.elements.favoriteTeamsList;
    container.innerHTML = '';

    if (this.favoriteTeams.length === 0) {
      this.elements.emptyTeams.classList.remove('hidden');
      return;
    }

    this.elements.emptyTeams.classList.add('hidden');

    this.favoriteTeams.forEach(team => {
      const teamTag = document.createElement('div');
      teamTag.className = 'team-tag';
      teamTag.innerHTML = `
        <div>
          <span class="team-name">${this.escapeHtml(team.name)}</span>
          <span class="team-sport">(${team.sport})</span>
        </div>
        <button class="remove-team-btn" data-team-id="${team.id}" title="Remove">×</button>
      `;
      
      teamTag.querySelector('.remove-team-btn').addEventListener('click', () => {
        this.removeTeam(team.id);
      });

      container.appendChild(teamTag);
    });
  }

  detectSport(teamName) {
    const cricketKeywords = ['india', 'australia', 'england', 'pakistan', 'srilanka', 'bangladesh', 
      'newzealand', 'southafrica', 'westindies', 'mumbai', 'chennai', 'delhi', 'bangalore', 
      'kolkata', 'hyderabad', 'punjab', 'rajasthan', 'gujarat', 'lucknow', 'ipl', 'bbl', 'psl'];
    
    const nameLower = teamName.toLowerCase().replace(/\s/g, '');
    
    if (cricketKeywords.some(k => nameLower.includes(k))) {
      return 'cricket';
    }
    return 'football';
  }

  updateApiStatus() {
    const hasKey = this.elements.cricketApiKey.value.trim().length > 0;
    
    if (hasKey) {
      this.elements.apiStatus.innerHTML = `
        <span class="status-icon">✓</span>
        <span class="status-text">API key configured - cricket scores enabled!</span>
      `;
      this.elements.apiStatus.classList.remove('warning');
      this.elements.apiStatus.style.background = 'rgba(46, 213, 115, 0.1)';
      this.elements.apiStatus.style.borderColor = 'rgba(46, 213, 115, 0.2)';
      this.elements.apiStatus.style.color = '#2ed573';
    } else {
      this.elements.apiStatus.innerHTML = `
        <span class="status-icon">⚠️</span>
        <span class="status-text">Cricket API key required - get one free at cricketdata.org</span>
      `;
      this.elements.apiStatus.style.background = 'rgba(255, 165, 2, 0.1)';
      this.elements.apiStatus.style.borderColor = 'rgba(255, 165, 2, 0.2)';
      this.elements.apiStatus.style.color = '#ffa502';
    }
  }

  resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    const defaults = {
      notificationEnabled: true,
      updateInterval: 60,
      favoriteTeams: [],
      cricketApiKey: '',
      preferredSport: 'football',
      matchFilter: 'live'
    };

    chrome.storage.sync.set(defaults, () => {
      this.loadSettings();
      alert('Settings reset to defaults!');
    });
  }

  shakeInput(input) {
    input.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      input.style.animation = '';
    }, 500);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new OptionsPage();
});