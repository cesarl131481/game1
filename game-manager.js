// ========================================
// GESTOR DEL JUEGO
// ========================================
const GameManager = {
    // Niveles de salud
    azucar: 50, // 0-100
    colesterol: 50, // 0-100
    maxLevel: 100,
    minLevel: 0,
    
    // Límites para perder
    dangerLevel: 90,
    
    // Puntuación
    score: 0,
    
    // Estado del juego
    isGameOver: false,
    isPlaying: false,
    
    // Elementos UI
    ui: {
        azucarBar: null,
        colesterolBar: null,
        azucarText: null,
        colesterolText: null,
        scoreText: null,
        gameOverPanel: null,
        restartBtn: null,
        finalScoreText: null
    },

    init() {
        this.setupUI();
        this.updateUI();
        console.log('🎮 GameManager inicializado');
    },

    // Crear elementos de UI
    setupUI() {
        // Crear panel de stats
        const statsPanel = document.createElement('div');
        statsPanel.id = 'stats-panel';
        statsPanel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            border-radius: 10px;
            color: white;
            font-family: Arial, sans-serif;
            min-width: 200px;
        `;

        statsPanel.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>Puntos: <span id="score-text">0</span></strong>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 5px;">
                    🍬 Azúcar: <span id="azucar-text">50</span>%
                </label>
                <div style="width: 100%; height: 10px; background: #333; border-radius: 5px; overflow: hidden;">
                    <div id="azucar-bar" style="width: 50%; height: 100%; background: linear-gradient(90deg, #4CAF50, #FFC107, #F44336); transition: width 0.3s;"></div>
                </div>
            </div>
            <div>
                <label style="display: block; margin-bottom: 5px;">
                    🥓 Colesterol: <span id="colesterol-text">50</span>%
                </label>
                <div style="width: 100%; height: 10px; background: #333; border-radius: 5px; overflow: hidden;">
                    <div id="colesterol-bar" style="width: 50%; height: 100%; background: linear-gradient(90deg, #4CAF50, #FFC107, #F44336); transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(statsPanel);

        // Crear panel de Game Over
        const gameOverPanel = document.createElement('div');
        gameOverPanel.id = 'game-over-panel';
        gameOverPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 2000;
            background: rgba(0, 0, 0, 0.95);
            padding: 40px;
            border-radius: 20px;
            color: white;
            font-family: Arial, sans-serif;
            text-align: center;
            display: none;
        `;

        gameOverPanel.innerHTML = `
            <h1 style="margin: 0 0 20px 0; font-size: 48px; color: #F44336;">💔 GAME OVER</h1>
            <p style="font-size: 24px; margin: 20px 0;">Puntuación Final: <strong id="final-score">0</strong></p>
            <button id="restart-btn" style="
                padding: 15px 40px;
                font-size: 20px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                margin-top: 20px;
                transition: background 0.3s;
            ">🔄 Reiniciar Juego</button>
        `;

        document.body.appendChild(gameOverPanel);

        // Guardar referencias
        this.ui.azucarBar = document.getElementById('azucar-bar');
        this.ui.colesterolBar = document.getElementById('colesterol-bar');
        this.ui.azucarText = document.getElementById('azucar-text');
        this.ui.colesterolText = document.getElementById('colesterol-text');
        this.ui.scoreText = document.getElementById('score-text');
        this.ui.gameOverPanel = document.getElementById('game-over-panel');
        this.ui.restartBtn = document.getElementById('restart-btn');
        this.ui.finalScoreText = document.getElementById('final-score');

        // Evento del botón reiniciar
        this.ui.restartBtn.addEventListener('click', () => this.restartGame());

        // Efecto hover del botón
        this.ui.restartBtn.addEventListener('mouseenter', (e) => {
            e.target.style.background = '#45a049';
        });
        this.ui.restartBtn.addEventListener('mouseleave', (e) => {
            e.target.style.background = '#4CAF50';
        });
    },

    // Iniciar juego
    startGame() {
        this.isPlaying = true;
        this.isGameOver = false;
        this.azucar = 50;
        this.colesterol = 50;
        this.score = 0;
        
        this.updateUI();
        
        // Iniciar caída de comida
        if (window.FoodManager) {
            FoodManager.startSpawning();
        }
        
        console.log('▶️ Juego iniciado');
    },

    // Aplicar efectos de comida
    applyFoodEffect(azucarChange, colesterolChange) {
        if (this.isGameOver) return;

        this.azucar = Math.max(this.minLevel, Math.min(this.maxLevel, this.azucar + azucarChange));
        this.colesterol = Math.max(this.minLevel, Math.min(this.maxLevel, this.colesterol + colesterolChange));
        
        this.updateUI();
        this.checkGameOver();
        
        console.log(`📊 Azúcar: ${this.azucar}%, Colesterol: ${this.colesterol}%`);
    },

    // Agregar puntos
    addScore(points) {
        if (this.isGameOver) return;
        
        this.score += points;
        if (this.score < 0) this.score = 0; // No permitir puntaje negativo
        
        this.updateUI();
    },

    // Actualizar UI
    updateUI() {
        if (!this.ui.azucarBar) return;

        // Actualizar barras y textos
        this.ui.azucarBar.style.width = `${this.azucar}%`;
        this.ui.colesterolBar.style.width = `${this.colesterol}%`;
        this.ui.azucarText.textContent = Math.round(this.azucar);
        this.ui.colesterolText.textContent = Math.round(this.colesterol);
        this.ui.scoreText.textContent = this.score;

        // Cambiar color según nivel de peligro
        this.ui.azucarBar.style.background = this.getHealthColor(this.azucar);
        this.ui.colesterolBar.style.background = this.getHealthColor(this.colesterol);
    },

    // Obtener color según nivel
    getHealthColor(level) {
        if (level < 30) return '#4CAF50'; // Verde - Saludable
        if (level < 60) return '#8BC34A'; // Verde claro
        if (level < 75) return '#FFC107'; // Amarillo - Advertencia
        if (level < 90) return '#FF9800'; // Naranja - Peligro
        return '#F44336'; // Rojo - Crítico
    },

    // Verificar si el juego terminó
    checkGameOver() {
        if (this.azucar >= this.dangerLevel || this.colesterol >= this.dangerLevel) {
            this.gameOver();
        }
    },

    // Terminar juego
    gameOver() {
        this.isGameOver = true;
        this.isPlaying = false;
        
        // Detener caída de comida
        if (window.FoodManager) {
            FoodManager.stopSpawning();
        }
        
        // Activar animación de muerte del personaje
        if (window.CharacterActions) {
            CharacterActions.sick();
        }
        
        // Mostrar panel de game over
        this.ui.finalScoreText.textContent = this.score;
        this.ui.gameOverPanel.style.display = 'block';
        
        console.log('☠️ Game Over - Puntuación final:', this.score);
    },

    // Reiniciar juego
    restartGame() {
        // Ocultar panel de game over
        this.ui.gameOverPanel.style.display = 'none';
        
        // Resetear estado del personaje
        if (window.CharacterActions) {
            CharacterActions.isDead = false;
            CharacterActions.position = 0;
            CharacterActions.character.setAttribute('position', '0 -0.25 0');
            CharacterActions.idle();
        }
        
        // Reiniciar juego
        this.startGame();
        
        console.log('🔄 Juego reiniciado');
    },

    // Pausar juego
    pauseGame() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        if (window.FoodManager) {
            FoodManager.stopSpawning();
        }
        
        console.log('⏸️ Juego pausado');
    },

    // Reanudar juego
    resumeGame() {
        if (this.isPlaying || this.isGameOver) return;
        
        this.isPlaying = true;
        if (window.FoodManager) {
            FoodManager.startSpawning();
        }
        
        console.log('▶️ Juego reanudado');
    }
};

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.GameManager = GameManager;
}