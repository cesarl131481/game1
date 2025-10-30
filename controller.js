// ========================================
// CARGA DE SPRITE SHEETS
// ========================================
const SpriteLoader = {
    sprites: {
        idle: { frames: 6, cols: 6, rows: 1, src: './sprites/Idle.png', image: null },
        walk: { frames: 10, cols: 10, rows: 1, src: './sprites/Walk.png', image: null },
        run: { frames: 10, cols: 10, rows: 1, src: './sprites/Run.png', image: null },
        dead: { frames: 4, cols: 4, rows: 1, src: './sprites/Dead.png', image: null }
    },

    loadAll() {
        return Promise.all(Object.keys(this.sprites).map(key => 
            new Promise((resolve, reject) => {
                const sprite = this.sprites[key];
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => { sprite.image = img; resolve(); };
                img.onerror = reject;
                img.src = sprite.src;
            })
        ));
    },

    getSprite(name) {
        return this.sprites[name];
    }
};

// ========================================
// COMPONENTE DE ANIMACIÓN
// ========================================
AFRAME.registerComponent('sprite-animation', {
    init: function () {
        Object.assign(this, {
            currentFrame: 0,
            frameTime: 0,
            animationSpeed: 100,
            currentAnimation: null,
            isFlipped: false,
            canvas: document.createElement('canvas'),
            spriteData: null
        });
        this.ctx = this.canvas.getContext('2d');
        this.waitForSprites();
    },

    waitForSprites: function() {
        const check = () => {
            const idle = SpriteLoader.getSprite('idle');
            idle?.image ? this.loadAnimation('idle') : setTimeout(check, 100);
        };
        check();
    },

    loadAnimation: function (animName) {
        const sprite = SpriteLoader.getSprite(animName);
        if (!sprite?.image) return;

        this.currentAnimation = animName;
        this.currentFrame = 0;
        this.spriteData = sprite;
        
        const w = sprite.image.width / sprite.cols;
        const h = sprite.image.height / sprite.rows;
        this.canvas.width = w;
        this.canvas.height = h;
        this.updateFrame();
    },

    updateFrame: function () {
        if (!this.spriteData?.image) return;

        const { image, cols } = this.spriteData;
        const w = image.width / cols;
        const h = image.height / this.spriteData.rows;
        const col = this.currentFrame % cols;
        const row = Math.floor(this.currentFrame / cols);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.isFlipped) {
            this.ctx.save();
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(image, col * w, row * h, w, h, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        } else {
            this.ctx.drawImage(image, col * w, row * h, w, h, 0, 0, this.canvas.width, this.canvas.height);
        }

        const texture = new THREE.CanvasTexture(this.canvas);
        texture.needsUpdate = true;
        this.el.setAttribute('material', 'src', texture);
    },

    setFlip: function (flip) {
        this.isFlipped = flip;
        this.updateFrame();
    },

    tick: function (time, timeDelta) {
        if (!this.spriteData) return;
        
        // Para animación dead, reproducir una sola vez
        if (this.currentAnimation === 'dead') {
            if (this.currentFrame < this.spriteData.frames - 1) {
                this.frameTime += timeDelta;
                if (this.frameTime >= this.animationSpeed) {
                    this.currentFrame++;
                    this.updateFrame();
                    this.frameTime = 0;
                }
            }
            return;
        }

        // Para otras animaciones, loop continuo
        this.frameTime += timeDelta;
        if (this.frameTime >= this.animationSpeed) {
            this.currentFrame = (this.currentFrame + 1) % this.spriteData.frames;
            this.updateFrame();
            this.frameTime = 0;
        }
    }
});

// ========================================
// ACCIONES DEL PERSONAJE
// ========================================
const CharacterActions = {
    character: null,
    position: 0,
    currentSpeed: 0,
    isDead: false,
    animationComponent: null,
    moveTimeout: null,
    Y_POSITION: -0.25,
    lastDirection: 0, // -1 izquierda, 1 derecha

    init(el) {
        this.character = el;
        this.animationComponent = el.components['sprite-animation'];
        el.setAttribute('position', `0 ${this.Y_POSITION} 0`);
        this.startUpdateLoop();
    },

    setAnimation(anim, flip = false) {
        if (!this.isDead && this.animationComponent) {
            this.animationComponent.loadAnimation(anim);
            this.animationComponent.setFlip(flip);
        }
    },

    idle() {
        if (this.isDead) return;
        this.currentSpeed = 0;
        // Mantener la dirección visual del último movimiento
        this.setAnimation('idle', this.lastDirection < 0);
    },

    runLeft() { 
        this.currentSpeed = -0.02; 
        this.lastDirection = -1;
        this.setAnimation('run', true); 
    },
    
    runRight() { 
        this.currentSpeed = 0.02; 
        this.lastDirection = 1;
        this.setAnimation('run'); 
    },

    sick() {
        this.isDead = true;
        this.currentSpeed = 0;
        if (this.animationComponent) {
            this.animationComponent.loadAnimation('dead');
            this.animationComponent.setFlip(false);
        }
    },

    stopAfterDelay(delay) {
        clearTimeout(this.moveTimeout);
        this.moveTimeout = setTimeout(() => this.idle(), delay);
    },

    startUpdateLoop() {
        const update = () => {
            if (this.character && this.currentSpeed !== 0) {
                // Límites del target (aproximadamente -1 a 1 en unidades de A-Frame)
                this.position = Math.max(-1, Math.min(1, this.position + this.currentSpeed));
                this.character.setAttribute('position', `${this.position} ${this.Y_POSITION} 0`);
            }
            requestAnimationFrame(update);
        };
        update();
    }
};

// ========================================
// CONTROLADOR DE BOTONES
// ========================================
const ButtonController = {
    init() {
        this.setupButton('left-btn', -1);
        this.setupButton('right-btn', 1);
        this.setupButton('sick-btn', 0);
    },

    setupButton(id, dir) {
        const btn = document.getElementById(id);
        if (!btn) return;

        if (id === 'sick-btn') {
            btn.addEventListener('click', e => { 
                e.preventDefault(); 
                CharacterActions.sick(); 
            });
        } else {
            btn.addEventListener('pointerdown', e => {
                e.preventDefault();
                // Iniciar run inmediatamente
                dir < 0 ? CharacterActions.runLeft() : CharacterActions.runRight();
            });

            btn.addEventListener('pointerup', e => {
                e.preventDefault();
                // Continuar corriendo un poco y luego idle
                CharacterActions.stopAfterDelay(300);
            });

            btn.addEventListener('pointercancel', e => { 
                e.preventDefault(); 
                CharacterActions.idle(); 
            });
        }
    }
};

// ========================================
// INICIALIZACIÓN
// ========================================
const MindARController = {
    init() {
        const scene = document.querySelector('a-scene');
        scene.hasLoaded ? this.setup() : scene.addEventListener('loaded', () => this.setup());
    },

    setup() {
        SpriteLoader.loadAll().then(() => {
            const char = document.querySelector('#character');
            if (char) CharacterActions.init(char);
            ButtonController.init();
            this.startMindAR();
        });
    },

    startMindAR() {
        const scene = document.querySelector('a-scene');
        const loading = document.getElementById('loading');
        
        const tryStart = () => {
            const ar = scene.systems?.['mindar-image-system'];
            
            if (ar) {
                try {
                    const result = ar.start();
                    if (result?.then) {
                        result.then(() => loading.style.display = 'none')
                              .catch(err => loading.innerHTML = 'Error: ' + err.message);
                    } else {
                        loading.style.display = 'none';
                    }
                } catch (err) {
                    loading.innerHTML = 'Error: ' + err.message;
                }
            } else {
                setTimeout(tryStart, 200);
            }
        };
        
        setTimeout(tryStart, 1000);
    }
};
// Exponer CharacterActions globalmente para que otros módulos puedan acceder
if (typeof window !== 'undefined') {
    window.CharacterActions = CharacterActions;
}
// Inicio
(document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', () => MindARController.init())
    : MindARController.init());