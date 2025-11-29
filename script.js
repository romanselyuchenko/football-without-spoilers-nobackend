/* Вставьте сюда ваш ключ (опасно для публичных сайтов) */
const API_KEY = '952583d14957b0616f3736e623fad301';
const URL = 'https://v3.football.api-sports.io/fixtures';

class LeagueManager {
    constructor() {
        this.leaguesContainer = document.getElementById('leagues-container');
        this.refreshButton = document.getElementById('refresh-btn');
        this.datePicker = document.getElementById('date-picker');
        
        if (this.datePicker) {
            const today = new Date().toISOString().split('T')[0];
            this.datePicker.value = today;
        }
        
        this.teamIcons = {
            'athletic club': 'Athletic Bilbao.png',
            'atletico madrid': 'Atletico Madrid.png',
            'celta vigo': 'Celta Vigo.png',
            'deportivo la coruna': 'Deportivo La Coruna.png',
            'barcelona': 'FC Barcelona.png',
            'getafe': 'Getafe.png',
            'granada': 'Granada.png',
            'levante': 'Levante.png',
            'malaga': 'Malaga.png',
            'osasuna': 'Osasuna.png',
            'rayo vallecano': 'Rayo Vallecano.png',
            'real betis': 'Real Betis.png',
            'real madrid': 'Real Madrid.png'
        };
        
        if (this.refreshButton && this.datePicker) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.refreshResults());
        }
        if (this.datePicker) {
            this.datePicker.addEventListener('change', () => this.refreshResults());
        }
    }

    async fetchLeagueData() {
        try {
            const selectedDate = this.datePicker.value;
            const params = new URLSearchParams({ date: selectedDate, status: 'FT' });
            const res = await fetch(`${URL}?${params.toString()}`, {
                headers: {
                    'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                    'x-rapidapi-key': API_KEY
                }
            });
            if (!res.ok) {
                console.error('API error', res.status);
                return [];
            }
            const data = await res.json();
            const matches = data.response || [];

            // Преобразуем в формат, который ожидал старый фронтенд
            const formattedLeagues = {};
            for (const match of matches) {
                const league = match.league;
                const name = `${league.name} (${league.country})`;

                const ok = (league.name.toLowerCase() === 'premier league' && league.country.toLowerCase() === 'england')
                        || (league.name.toLowerCase() === 'la liga' && league.country.toLowerCase() === 'spain')
                        || (league.name.toLowerCase() === 'uefa champions league' && league.country.toLowerCase() === 'world');
                if (!ok) continue;

                if (!formattedLeagues[name]) {
                    formattedLeagues[name] = { leagueName: name, matches: [] };
                }

                const score = (match.fixture && match.fixture.status && (match.fixture.status.long || '').toLowerCase() === 'match finished')
                    ? { display: 'Finished', score: `${match.goals.home ?? 0}-${match.goals.away ?? 0}` }
                    : { display: '?', score: '?' };

                formattedLeagues[name].matches.push({
                    homeTeam: match.teams.home.name,
                    awayTeam: match.teams.away.name,
                    score,
                    timeInfo: this.formatTimeInfo(match.fixture)
                });
            }

            return Object.values(formattedLeagues);
        } catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    }

    // Возвращаем путь к иконке (без синхронных проверок). img onerror установит default.
    getTeamIcon(teamName) {
        const normalizedName = teamName.toLowerCase();
        for (const [key, value] of Object.entries(this.teamIcons)) {
            if (normalizedName.includes(key) || key.includes(normalizedName)) {
                return `icons/${value}`;
            }
        }
        return 'icons/default.png';
    }

    createLeagueBlock(leagueData) {
        const leagueBlock = document.createElement('div');
        leagueBlock.className = 'league';

        const leagueName = document.createElement('h2');
        leagueName.className = 'league-name';
        leagueName.textContent = leagueData.leagueName.split(' (')[0];

        const leagueLogoPath = this.getLeagueLogo(leagueData.leagueName);
        if (leagueLogoPath) {
            const leagueLogo = document.createElement('img');
            leagueLogo.src = leagueLogoPath;
            leagueLogo.alt = `${leagueData.leagueName} logo`;
            leagueLogo.className = 'league-logo';
            leagueLogo.style.width = '28px';
            leagueLogo.style.height = '28px';
            leagueLogo.style.objectFit = 'contain';
            leagueLogo.style.marginRight = '8px';
            leagueLogo.onerror = () => { leagueLogo.src = 'icons/default.png'; };
            leagueName.prepend(leagueLogo);
        }

        leagueBlock.appendChild(leagueName);

        leagueData.matches.forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match';

            const homeIcon = this.getTeamIcon(match.homeTeam);
            const awayIcon = this.getTeamIcon(match.awayTeam);

            matchDiv.innerHTML = `
                <div class="match-teams" style="display:flex;align-items:center;gap:8px;flex:1;">
                    <img src="${homeIcon}" alt="${match.homeTeam}" class="team-icon" onerror="this.src='icons/default.png'">
                    <div class="team"><div class="name">${match.homeTeam}</div></div>
                    <span style="margin:0 6px">vs</span>
                    <img src="${awayIcon}" alt="${match.awayTeam}" class="team-icon" onerror="this.src='icons/default.png'">
                    <div class="team"><div class="name">${match.awayTeam}</div></div>
                </div>
                <div class="match-score" data-full-score="${match.score.score}">
                    ${match.score.display === 'Finished' ? 
                        '<span class="clickable-score">Finished</span>' : 
                        match.score.display}
                </div>
                <div class="youtube-link" style="display: none;">
                    <a href="#" class="youtube-button">YouTube</a>
                </div>
            `;

            const scoreElement = matchDiv.querySelector('.clickable-score');
            const youtubeLinkDiv = matchDiv.querySelector('.youtube-link');

            if (scoreElement) {
                let state = 0;
                scoreElement.innerHTML = match.score.display;

                scoreElement.addEventListener('click', () => {
                    const fullScore = match.score.score;
                    const parts = (fullScore && fullScore.split('-')) || [];
                    const homeScore = parseInt(parts[0]||'0',10);
                    const awayScore = parseInt(parts[1]||'0',10);
                    let displayText = '';

                    if (state === 0) {
                        displayText = ''; // leave as is
                    } else if (state === 1) {
                        if (homeScore > awayScore) {
                            displayText = `Победитель: ${match.homeTeam}`;
                        } else if (homeScore < awayScore) {
                            displayText = `Победитель: ${match.awayTeam}`;
                        } else {
                            displayText = 'Ничья';
                        }
                    } else if (state === 2) {
                        displayText = `${fullScore} - YouTube`;
                        const homeTeam = match.homeTeam.split(' ').join('+');
                        const awayTeam = match.awayTeam.split(' ').join('+');
                        youtubeLinkDiv.querySelector('.youtube-button').href = `https://www.youtube.com/results?search_query=megogo+${homeTeam}+${awayTeam}`;
                        youtubeLinkDiv.style.display = 'block';
                    }

                    if (displayText) scoreElement.innerHTML = displayText;
                    state = (state + 1) % 3;
                });
            }

            leagueBlock.appendChild(matchDiv);
        });

        return leagueBlock;
    }

    getLeagueLogo(leagueName) {
        const leagueLogos = {
            'Premier League': 'English Premier League.png',
            'La Liga': 'LaLiga.png',
            'UEFA Champions League': 'UEFA Champions League.png'
        };
        const normalizedLeagueName = leagueName.split(' (')[0];
        const logoFileName = leagueLogos[normalizedLeagueName];
        return logoFileName ? `icons/${logoFileName}` : null;
    }

    formatTimeInfo(fixture) {
        try {
            const matchStart = new Date(fixture.date);
            const now = new Date();
            const statusLong = (fixture.status && fixture.status.long || '').toLowerCase();
            if (statusLong !== 'match finished') {
                const minutes = Math.floor((now - matchStart) / 60000);
                return `Match ongoing for ${minutes} minutes`;
            } else {
                const elapsed = fixture.status && fixture.status.elapsed ? fixture.status.elapsed : 90;
                const matchEnd = new Date(matchStart.getTime() + elapsed * 60000);
                if (matchEnd.toDateString() === now.toDateString()) {
                    const minutesAgo = Math.floor((now - matchEnd) / 60000);
                    return `Match finished ${minutesAgo} minutes ago`;
                } else {
                    return `Date: ${matchStart.toISOString().slice(0,10)}`;
                }
            }
        } catch (e) {
            return '';
        }
    }

    async refreshResults() {
        try {
            this.leaguesContainer.innerHTML = 'Loading...';
            const leagues = await this.fetchLeagueData();
            
            if (!leagues || leagues.length === 0) {
                this.leaguesContainer.innerHTML = 'No matches found for selected date';
                return;
            }

            this.leaguesContainer.innerHTML = '';
            leagues.forEach(league => {
                const leagueBlock = this.createLeagueBlock(league);
                this.leaguesContainer.appendChild(leagueBlock);
            });
        } catch (error) {
            console.error('Error refreshing results:', error);
            this.leaguesContainer.innerHTML = 'Error loading matches. Please try again.';
        }
    }
}

export { LeagueManager };

document.addEventListener('DOMContentLoaded', () => {
    const manager = new LeagueManager();
    manager.refreshResults();
});
