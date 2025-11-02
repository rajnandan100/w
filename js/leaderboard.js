
// LEADERBOARD PAGE - COMPLETELY FIXED VERSION
console.log('Loading Fixed Leaderboard Manager...');

class LeaderboardManager {
    constructor() {
        this.currentUser = null;
        this.realLeaderboardData = [];
        this.filteredData = [];
        this.quizInfo = null;
        this.currentFilter = 'all';
        this.currentSort = 'score';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.isLoading = false;
        this.init();
    }

    // Wait for Firebase and DOM to be ready
    init() {
        if (typeof firebase !== 'undefined') {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    // FIXED: Better error handling and debugging
    async setup() {
        // Check authentication
        firebase.auth().onAuthStateChanged(user => {
            this.currentUser = user;
            console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Not logged in');
            
            if (user) {
                this.updateUserUI(user);
                this.loadRealLeaderboardData();
                this.showVideoAdPlaceholder();
                this.showSimpleToastAd();
            } else {
                // Redirect to home if not authenticated
                console.log('User not authenticated, redirecting...');
                window.location.href = '../index.html';
            }
        });
    }

    // FIXED: Load real quiz results with correct field names
    async loadRealLeaderboardData() {
        this.showLoading(true);
        try {
            console.log('Loading real leaderboard data from Firebase...');
            
            // FIXED: Simple query without composite index requirement
            const resultsRef = firebase.firestore().collection('quizResults');
            const snapshot = await resultsRef
                .orderBy('completedAt', 'desc')  // Order by completion time (latest first)
                .limit(100)  // Get recent 100 results
                .get();

            if (snapshot.empty) {
                console.log('No quiz results found in Firebase');
                this.showToast('No quiz results available yet. Complete some quizzes to see the leaderboard!', 'info');
                this.showLoading(false);
                return;
            }

            // Process real Firebase data with CORRECT field names
            const participants = [];
            snapshot.forEach((doc, index) => {
                const data = doc.data();
                
                // FIXED: Use correct field names from your quiz results
                const score = data.score || 0;  // Use 'score' not 'percentage'
                const totalQuestions = data.total || 1;
                const percentage = Math.round((score / totalQuestions) * 100);
                
                participants.push({
                    id: doc.id,
                    name: data.userFirstName || data.userName || 'Anonymous User',
                    score: percentage,  // Convert to percentage
                    rawScore: score,    // Keep raw score
                    totalQuestions: totalQuestions,
                    time: data.timeTaken || 0,  // FIXED: Use correct field name
                    date: data.completedAt ? data.completedAt.toDate() : new Date(),
                    rank: 0, // Will be set after sorting
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.userFirstName || data.userName || 'User')}&background=4F46E5&color=fff&bold=true`,
                    isCurrentUser: this.currentUser && data.userId === this.currentUser.uid,
                    quizTitle: data.quizTitle || 'Quiz'
                });
            });

            console.log(`Loaded ${participants.length} real participants from Firebase`);

            // FIXED: Sort by score (percentage) descending, then by time ascending
            participants.sort((a, b) => {
                if (a.score !== b.score) {
                    return b.score - a.score;  // Higher score first
                }
                return a.time - b.time;  // Lower time first for ties
            });

            // FIXED: Set correct ranks after sorting
            participants.forEach((participant, index) => {
                participant.rank = index + 1;
            });

            // Set quiz info based on real data
            this.quizInfo = {
               title: 'DK AGRAWAL Leaderboard',

                totalParticipants: participants.length,
                averageScore: participants.length > 0 ? Math.round(participants.reduce((sum, p) => sum + p.score, 0) / participants.length) : 0,
                averageTime: participants.length > 0 ? this.formatTime(Math.round(participants.reduce((sum, p) => sum + p.time, 0) / participants.length)) : '0:00',
                highestScore: participants.length > 0 ? participants[0].score : 0,
                fastestTime: participants.length > 0 ? Math.min(...participants.map(p => p.time)) : 0
            };

            // Store the real data
            this.realLeaderboardData = participants;
            this.filteredData = [...participants];

            // Process and display the data
            this.processLeaderboardData();
            this.displayAllSections();

        } catch (error) {
            console.error('Error loading real leaderboard data:', error);
            this.showToast('Failed to load leaderboard data. Please refresh the page.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    processLeaderboardData() {
        // Apply current filters and sorting
        this.filteredData = this.applyFiltersAndSorting([...this.realLeaderboardData]);
    }

    displayAllSections() {
        this.updateQuizInfo();
        this.updatePodium();
        this.updateUserPosition();
        this.updateLeaderboardList();
        this.updateStatistics();
        this.hideLoadingPlaceholders();
    }

    updateQuizInfo() {
        if (!this.quizInfo) return;
        
        const quizTitle = document.getElementById('quiz-title');
        const totalParticipants = document.getElementById('total-participants');
        const avgScore = document.getElementById('avg-score');
        const avgTime = document.getElementById('avg-time');
        
        if (quizTitle) quizTitle.textContent = this.quizInfo.title;
        if (totalParticipants) totalParticipants.textContent = `${this.quizInfo.totalParticipants.toLocaleString()} participants`;
        if (avgScore) avgScore.textContent = `Avg Score: ${this.quizInfo.averageScore}%`;
        if (avgTime) avgTime.textContent = `Avg Time: ${this.quizInfo.averageTime}`;
    }

    updatePodium() {
        const top3 = this.realLeaderboardData.slice(0, 3);
        
        if (top3.length >= 1) {
            const firstName = document.getElementById('first-name');
            const firstScore = document.getElementById('first-score');
            const firstTime = document.getElementById('first-time');
            const firstAvatar = document.getElementById('first-avatar');
            
            if (firstName) firstName.textContent = top3[0].name;
            if (firstScore) firstScore.textContent = `${top3[0].score}%`;
            if (firstTime) firstTime.textContent = this.formatTime(top3[0].time);
            if (firstAvatar) firstAvatar.src = top3[0].avatar;
        }
        
        if (top3.length >= 2) {
            const secondName = document.getElementById('second-name');
            const secondScore = document.getElementById('second-score');
            const secondTime = document.getElementById('second-time');
            const secondAvatar = document.getElementById('second-avatar');
            
            if (secondName) secondName.textContent = top3[1].name;
            if (secondScore) secondScore.textContent = `${top3[1].score}%`;
            if (secondTime) secondTime.textContent = this.formatTime(top3[1].time);
            if (secondAvatar) secondAvatar.src = top3[1].avatar;
        }
        
        if (top3.length >= 3) {
            const thirdName = document.getElementById('third-name');
            const thirdScore = document.getElementById('third-score');
            const thirdTime = document.getElementById('third-time');
            const thirdAvatar = document.getElementById('third-avatar');
            
            if (thirdName) thirdName.textContent = top3[2].name;
            if (thirdScore) thirdScore.textContent = `${top3[2].score}%`;
            if (thirdTime) thirdTime.textContent = this.formatTime(top3[2].time);
            if (thirdAvatar) thirdAvatar.src = top3[2].avatar;
        }
    }

    // FIXED: Update user position with better logic
    updateUserPosition() {
        const userEntry = this.realLeaderboardData.find(entry => entry.isCurrentUser);
        
        if (userEntry) {
            console.log('Found current user in leaderboard:', userEntry);
            
            // Update user position display
            const userRankEl = document.getElementById('user-rank');
            const userNameEl = document.getElementById('user-name'); 
            const userScoreEl = document.getElementById('user-score');
            const userTimeEl = document.getElementById('user-time');
            
            if (userRankEl) userRankEl.textContent = `#${userEntry.rank}`;
            if (userNameEl) userNameEl.textContent = userEntry.name;
            if (userScoreEl) userScoreEl.textContent = `${userEntry.score}%`;
            if (userTimeEl) userTimeEl.textContent = this.formatTime(userEntry.time);

            // Update position difference text
            const positionDiff = document.getElementById('position-diff');
            if (positionDiff) {
                if (userEntry.rank <= 3) {
                    positionDiff.textContent = '🏆 You\'re in the top 3!';
                    positionDiff.style.color = '#10b981';
                } else if (userEntry.rank <= 10) {
                    positionDiff.textContent = '🌟 You\'re in the top 10!';
                    positionDiff.style.color = '#4f46e5';
                } else if (userEntry.rank <= 50) {
                    const diff = 10 - userEntry.rank;
                    positionDiff.textContent = `${Math.abs(diff)} spots away from top 10`;
                    positionDiff.style.color = '#f59e0b';
                } else {
                    positionDiff.textContent = 'Keep practicing to climb higher!';
                    positionDiff.style.color = '#6b7280';
                }
            }

            // Update progress bar
            const progressBar = document.getElementById('position-progress');
            if (progressBar) {
                const progress = Math.max(5, 100 - (userEntry.rank / this.realLeaderboardData.length * 100));
                progressBar.style.width = `${progress}%`;
            }
        } else {
            console.log('Current user not found in leaderboard data');
            
            // Hide user position section if user not found
            const userPositionSection = document.querySelector('.user-position');
            if (userPositionSection) {
                userPositionSection.style.display = 'none';
            }
        }
    }

    updateLeaderboardList() {
        const container = document.getElementById('leaderboard-items');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add header as first item inside the scrollable container
        const headerItem = document.createElement('div');
        headerItem.className = 'list-header';
        headerItem.innerHTML = `
            <div class="header-rank">Rank</div>
            <div class="header-participant">Participant</div>
            <div class="header-score">Score</div>
            <div class="header-time">Time</div>
            <div class="header-date">Date</div>
        `;
        container.appendChild(headerItem);

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredData.length);
        const pageData = this.filteredData.slice(startIndex, endIndex);

        pageData.forEach((participant, index) => {
            const actualIndex = startIndex + index;
            const listItem = this.createParticipantItem(participant, actualIndex);
            container.appendChild(listItem);
        });

        // Update load more button
        this.updateLoadMoreButton(endIndex);
    }

    // FIXED - Simplified Participant Item Creation
    createParticipantItem(participant, index) {
        const item = document.createElement('div');
        item.className = `leaderboard-item ${participant.isCurrentUser ? 'current-user' : ''}`;
        
        const medal = participant.rank <= 3 ? this.getMedalIcon(participant.rank) : '';
        const date = participant.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Simple grid structure - matches the CSS
        item.innerHTML = `
            <div class="item-rank">${medal} #${participant.rank}</div>
            <div class="item-player">
                <img src="${participant.avatar}" alt="${participant.name}" class="player-avatar">
                <div class="player-info">
                    <div class="player-name" title="${participant.name}">${participant.name}</div>
                    ${participant.isCurrentUser ? '<div class="current-user-badge">You</div>' : '<div></div>'}
                </div>
            </div>
            <div class="item-score">${participant.score}%</div>
            <div class="item-time">${this.formatTime(participant.time)}</div>
            <div class="item-date">${date}</div>
        `;
        
        return item;
    }

    getMedalIcon(rank) {
        const medals = {
            1: '<i class="fas fa-trophy" style="color: #ffd700;"></i>',
            2: '<i class="fas fa-medal" style="color: #c0c0c0;"></i>',
            3: '<i class="fas fa-medal" style="color: #cd7f32;"></i>'
        };
        return medals[rank] || '';
    }

    updateLoadMoreButton(endIndex) {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            if (endIndex >= this.filteredData.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
                const remaining = this.filteredData.length - endIndex;
                loadMoreBtn.innerHTML = `<i class="fas fa-chevron-down"></i><span>Load More (${remaining} remaining)</span>`;
            }
        }
    }

    updateStatistics() {
        if (!this.quizInfo || this.realLeaderboardData.length === 0) return;

        const highestScore = document.getElementById('highest-score');
        const fastestTime = document.getElementById('fastest-time');
        const totalAttempts = document.getElementById('total-attempts');
        const averageScore = document.getElementById('average-score');

        if (highestScore) highestScore.textContent = `${this.quizInfo.highestScore}%`;
        if (fastestTime) fastestTime.textContent = this.formatTime(this.quizInfo.fastestTime);
        if (totalAttempts) totalAttempts.textContent = this.quizInfo.totalParticipants.toLocaleString();
        if (averageScore) averageScore.textContent = `${this.quizInfo.averageScore}%`;
    }

    hideLoadingPlaceholders() {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');
        if (loadingPlaceholder) {
            loadingPlaceholder.style.display = 'none';
        }
    }

    // Working Filter Functions
    applyTimeFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;

        // Update active filter button
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-filter') === filter) {
                tab.classList.add('active');
            }
        });

        this.processLeaderboardData();
        this.updateLeaderboardList();
        this.showToast(`Filtered by: ${filter === 'all' ? 'All Time' : filter}`, 'info');
    }

    applySorting(sortBy) {
        this.currentSort = sortBy;
        this.currentPage = 1;
        this.processLeaderboardData();
        this.updateLeaderboardList();
        this.showToast(`Sorted by: ${sortBy}`, 'info');
    }

    applyFiltersAndSorting(data) {
        let filtered = [...data];

        // Apply time filter
        const now = new Date();
        if (this.currentFilter === 'today') {
            filtered = filtered.filter(p => {
                const diff = now - p.date;
                return diff < (24 * 60 * 60 * 1000);
            });
        } else if (this.currentFilter === 'week') {
            filtered = filtered.filter(p => {
                const diff = now - p.date;
                return diff < (7 * 24 * 60 * 60 * 1000);
            });
        } else if (this.currentFilter === 'month') {
            filtered = filtered.filter(p => {
                const diff = now - p.date;
                return diff < (30 * 24 * 60 * 60 * 1000);
            });
        }

        // Apply sorting
        if (this.currentSort === 'score') {
            filtered.sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.time - b.time;
            });
        } else if (this.currentSort === 'time') {
            filtered.sort((a, b) => a.time - b.time);
        } else if (this.currentSort === 'date') {
            filtered.sort((a, b) => b.date - a.date);
        }

        return filtered;
    }

    loadMoreParticipants() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.currentPage++;

        // Show loading state
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Loading...';
        }

        setTimeout(() => {
            this.updateLeaderboardList();
            this.isLoading = false;
        }, 500);
    }

    // Utility Functions
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateUserUI(user) {
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4F46E5&color=fff`;
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.toggle('show', show);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast-notification');
        const toastMessage = document.getElementById('toast-message');
        
        if (toast && toastMessage) {
            // Update toast appearance based on type
            const colors = {
                'info': '#4f46e5',
                'success': '#10b981',
                'warning': '#f59e0b',
                'error': '#ef4444'
            };
            
            toast.style.background = `linear-gradient(135deg, ${colors[type] || colors.info} 0%, ${colors[type] || colors.info}dd 100%)`;
            toastMessage.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    // Simple Video Advertisement Functions
    showVideoAdPlaceholder() {
        const videoAdPlaceholder = document.getElementById('video-ad-placeholder');
        if (videoAdPlaceholder) {
            videoAdPlaceholder.style.display = 'block';
        }
    }

    // Simple Toast Advertisement Functions
    showSimpleToastAd() {
        const simpleToastAd = document.getElementById('simple-toast-ad');
        if (simpleToastAd) {
            simpleToastAd.style.display = 'block';
        }
    }

    closeSimpleToastAd() {
        const simpleToastAd = document.getElementById('simple-toast-ad');
        if (simpleToastAd) {
            simpleToastAd.style.display = 'none';
        }
        this.showToast('Advertisement dismissed', 'info');
    }

    async downloadLeaderboardPDF() {
        console.log('PDF download feature - coming soon!');
        this.showToast('PDF download feature coming soon!', 'info');
    }
}

// Global Functions for HTML onclick handlers
function applyTimeFilter(filter) {
    if (window.leaderboardManager) {
        window.leaderboardManager.applyTimeFilter(filter);
    }
}

function applySorting(sortBy) {
    if (window.leaderboardManager) {
        window.leaderboardManager.applySorting(sortBy);
    }
}

function loadMoreParticipants() {
    if (window.leaderboardManager) {
        window.leaderboardManager.loadMoreParticipants();
    }
}

function downloadLeaderboardPDF() {
    if (window.leaderboardManager) {
        window.leaderboardManager.downloadLeaderboardPDF();
    }
}

function closeSimpleToastAd() {
    if (window.leaderboardManager) {
        window.leaderboardManager.closeSimpleToastAd();
    }
}

function takeQuizAgain() {
    window.location.href = '../pages/quiz.html?id=gk-001';
}

function viewMyResults() {
    window.location.href = '../pages/results.html';
}

function shareLeaderboard() {
    const text = 'Check out the leaderboard for the General Knowledge Challenge! Can you beat the top scores? ' + window.location.origin;
    
    if (navigator.share) {
        navigator.share({
            title: 'Quiz Leaderboard',
            text: text,
            url: window.location.origin
        });
    } else {
        // Fallback to copying to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                if (window.leaderboardManager) {
                    window.leaderboardManager.showToast('Leaderboard link copied!', 'success');
                }
            });
        }
    }
}

// Initialize leaderboard manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.leaderboardManager = new LeaderboardManager();
});

// Handle sort select change
document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            applySorting(e.target.value);
        });
    }
});
