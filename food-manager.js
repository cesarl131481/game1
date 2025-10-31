// ========================================
// GESTOR DE ALIMENTOS
// ========================================
const FoodManager = {
    foods: {
        saludable: [
            { name: 'manzana', src: './comida/manzana.png', azucar: -5, colesterol: -5 },
            { name: 'brocoli', src: './comida/brocoli.png', azucar: -10, colesterol: -5 },
            // Agrega más alimentos saludables aquí
        ],
        azucar: [
            { name: 'donut', src: './comida/donut.png', azucar: 10, colesterol: 0 },
            { name: 'refresco', src: './comida/refresco.png', azucar: 15, colesterol: 0 },
            // Agrega más alimentos con azúcar aquí
        ],
        colesterol: [
            { name: 'hamburguesa', src: './comida/hamburguesa.png', azucar: 0, colesterol: 15 },
            { name: 'pizza', src: './comida/pizza.png', azucar: 0, colesterol: 10 },
            // Agrega más alimentos con colesterol aquí
        ],
        mixta: [
            { name: 'papas-fritas', src: './comida/papas-fritas.png', azucar: 5, colesterol: 10 },
            { name: 'helado', src: './comida/helado.png', azucar: 8, colesterol: 5 },
            // Agrega más alimentos mixtos aquí
        ]
    },

    activeFoods: [], // Comidas actualmente cayendo
    spawnInterval: null,
    spawnRate: 500, // Cada 1 segundos cae una comida
    fallSpeed: 0.01, // Velocidad de caída
    targetEntity: null,

    init(targetElement) {
        this.targetEntity = targetElement;
        console.log('🍎 FoodManager inicializado');
    },

    // Cargar todas las imágenes de comida
    preloadImages() {
        const allFoods = [
            ...this.foods.saludable,
            ...this.foods.azucar,
            ...this.foods.colesterol,
            ...this.foods.mixta
        ];

        return Promise.all(allFoods.map(food => 
            new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    food.image = img;
                    console.log(`✓ Comida ${food.name} cargada`);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`⚠ No se pudo cargar ${food.name}`);
                    resolve(); // Continuar aunque falle
                };
                img.src = food.src;
            })
        ));
    },

    // Iniciar la caída de comida
    startSpawning() {
        this.stopSpawning(); // Limpiar si ya estaba activo
        
        this.spawnInterval = setInterval(() => {
            this.spawnRandomFood();
        }, this.spawnRate);
        
        console.log('🍔 Inicio de caída de comida');
    },

    // Detener la caída de comida
    stopSpawning() {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        // Eliminar todas las comidas activas
        this.activeFoods.forEach(food => {
            if (food.entity && food.entity.parentNode) {
                food.entity.parentNode.removeChild(food.entity);
            }
        });
        this.activeFoods = [];
        
        console.log('🛑 Caída de comida detenida');
    },

    // Seleccionar comida aleatoria de cualquier categoría
    getRandomFood() {
        const categories = ['saludable', 'azucar', 'colesterol', 'mixta'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const foodArray = this.foods[randomCategory];
        const randomFood = foodArray[Math.floor(Math.random() * foodArray.length)];
        
        return { ...randomFood, category: randomCategory };
    },

    // Crear y hacer caer una comida aleatoria
    spawnRandomFood() {
        if (!this.targetEntity) return;

        const food = this.getRandomFood();
        if (!food.image) {
            console.warn(`Imagen de ${food.name} no disponible`);
            return;
        }

        // Crear entidad de A-Frame para la comida
        const foodEntity = document.createElement('a-plane');
        foodEntity.setAttribute('width', '0.1');
        foodEntity.setAttribute('height', '0.1');
        foodEntity.setAttribute('material', {
            src: food.image.src,
            transparent: true,
            alphaTest: 0.5
        });
        
        // Posición aleatoria en X, arriba del target
        const randomX = (Math.random() - 0.5) * 2; // Entre -1 y 1
        const startY = 1.5; // Arriba del target
        
        foodEntity.setAttribute('position', `${randomX} ${startY} 0`);
        
        // Agregar al target
        this.targetEntity.appendChild(foodEntity);

        // Guardar referencia
        const foodData = {
            entity: foodEntity,
            data: food,
            position: { x: randomX, y: startY, z: 0 },
            active: true
        };
        
        this.activeFoods.push(foodData);
    },

    // Actualizar posiciones de comida (llamar en loop)
    update() {
        this.activeFoods = this.activeFoods.filter(food => {
            if (!food.active) return false;

            // Hacer caer la comida
            food.position.y -= this.fallSpeed;
            food.entity.setAttribute('position', 
                `${food.position.x} ${food.position.y} ${food.position.z}`);

            // Verificar colisión con el personaje
            const collision = this.checkCollision(food);
            if (collision) {
                this.collectFood(food);
                return false; // Eliminar de la lista
            }

            // Eliminar si sale del área visible
            if (food.position.y < -1) {
                if (food.entity && food.entity.parentNode) {
                    food.entity.parentNode.removeChild(food.entity);
                }
                return false; // Eliminar de la lista
            }

            return true; // Mantener en la lista
        });
    },

    // Detectar colisión entre comida y personaje
    checkCollision(food) {
        const characterPos = CharacterActions.position;
        const characterY = CharacterActions.Y_POSITION;
        
        // Área de colisión simple (cuadrado)
        const collisionRange = 0.25;
        
        const distX = Math.abs(food.position.x - characterPos);
        const distY = Math.abs(food.position.y - characterY);
        
        return distX < collisionRange && distY < collisionRange;
    },

    // Recoger comida y aplicar efectos
    collectFood(food) {
        console.log(`🍽️ Comida recogida: ${food.data.name}`);
        
        // Notificar al GameManager
        if (window.GameManager) {
            GameManager.applyFoodEffect(food.data.azucar, food.data.colesterol);
            
            // Dar puntos según el tipo
            const points = food.data.category === 'saludable' ? 10 : -5;
            GameManager.addScore(points);
        }

        // Eliminar entidad visual
        if (food.entity && food.entity.parentNode) {
            food.entity.parentNode.removeChild(food.entity);
        }
        
        food.active = false;
    },

    // Ajustar velocidad de spawn (dificultad)
    setDifficulty(level) {
        // Niveles: 1 = fácil, 2 = medio, 3 = difícil
        switch(level) {
            case 1:
                this.spawnRate = 4000;
                this.fallSpeed = 0.008;
                break;
            case 2:
                this.spawnRate = 2500;
                this.fallSpeed = 0.012;
                break;
            case 3:
                this.spawnRate = 1500;
                this.fallSpeed = 0.015;
                break;
        }
        
        // Reiniciar spawn con nueva velocidad
        if (this.spawnInterval) {
            this.stopSpawning();
            this.startSpawning();
        }
    },

    // Agregar nueva comida dinámicamente
    addFood(category, foodData) {
        if (this.foods[category]) {
            this.foods[category].push(foodData);
            console.log(`✓ Comida ${foodData.name} agregada a ${category}`);
        }
    }
};

// Iniciar loop de actualización
function startFoodUpdateLoop() {
    function update() {
        FoodManager.update();
        requestAnimationFrame(update);
    }
    update();
}

// Auto-iniciar cuando esté listo
if (typeof window !== 'undefined') {
    window.FoodManager = FoodManager;

}
