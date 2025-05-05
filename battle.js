document.addEventListener('DOMContentLoaded', function() {
    // État du jeu
    const gameState = {
        myHP: 100,
        enemyHP: 100,
        isAnimating: false,
        battleLog: []
    };

    // Références DOM
    const elements = {
        mySprite: document.querySelector('.my-pokemon .battle-sprite'),
        enemySprite: document.querySelector('.enemy-pokemon .battle-sprite'),
        myHPBar: document.querySelector('.my-pokemon .hp-bar'),
        enemyHPBar: document.querySelector('.enemy-pokemon .hp-bar'),
        moveButtons: document.querySelectorAll('.move-btn'),
        battleLog: document.querySelector('.battle-log'),
        battleArena: document.querySelector('.battle-arena')
    };

    // Gestionnaire d'attaques
    function handleAttack(isPlayerAttack, moveType, damage) {
        if (gameState.isAnimating) return;
        gameState.isAnimating = true;

        const attacker = isPlayerAttack ? elements.mySprite : elements.enemySprite;
        const defender = isPlayerAttack ? elements.enemySprite : elements.mySprite;
        const hpBar = isPlayerAttack ? elements.enemyHPBar : elements.myHPBar;

        // Animation d'attaque
        animateAttack(attacker, defender, moveType, damage, hpBar, isPlayerAttack);
    }

    // Animation d'attaque
    function animateAttack(attacker, defender, moveType, damage, hpBar, isPlayerAttack) {
        const direction = isPlayerAttack ? 1 : -1;
        
        // Animation de l'attaquant
        attacker.style.transform = `translateX(${20 * direction}px)`;
        
        setTimeout(() => {
            // Effet visuel
            createAttackEffect(moveType, defender);
            
            // Animation du défenseur
            defender.style.animation = 'shake 0.5s ease';
            
            // Mise à jour des PV
            updateHP(hpBar, damage, isPlayerAttack);
            
            // Log de combat
            addBattleLog(isPlayerAttack, moveType, damage);
            
            setTimeout(() => {
                // Réinitialisation des positions
                attacker.style.transform = '';
                defender.style.animation = '';
                gameState.isAnimating = false;
            }, 500);
        }, 300);
    }

    // Mise à jour des PV
    function updateHP(hpBar, damage, isPlayerAttack) {
        const target = isPlayerAttack ? 'enemyHP' : 'myHP';
        gameState[target] = Math.max(0, gameState[target] - damage);
        
        hpBar.style.width = `${gameState[target]}%`;
        
        // Changement de couleur selon les PV
        if (gameState[target] <= 20) {
            hpBar.style.background = 'linear-gradient(to right, #ff4136, #ff725c)';
        } else if (gameState[target] <= 50) {
            hpBar.style.background = 'linear-gradient(to right, #ffdc00, #ffe066)';
        }

        return gameState[target] <= 0;
    }

    // Log de combat
    function addBattleLog(isPlayerAttack, moveType, damage) {
        const who = isPlayerAttack ? 'Votre Pokémon' : 'Pokémon adverse';
        const message = `${who} utilise ${moveType} et inflige ${damage} dégâts !`;
        
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        elements.battleLog.appendChild(logEntry);
        elements.battleLog.scrollTop = elements.battleLog.scrollHeight;
    }

    // Effets visuels améliorés
    function createAttackEffect(moveType, target) {
        const effect = document.createElement('div');
        effect.className = `attack-effect ${moveType}`;
        effect.style.cssText = `
            position: absolute;
            z-index: 100;
            pointer-events: none;
            animation: attackAnim 0.6s forwards;
        `;
        
        // Positionnement de l'effet
        const targetRect = target.getBoundingClientRect();
        const arenaRect = elements.battleArena.getBoundingClientRect();
        effect.style.left = `${targetRect.left - arenaRect.left}px`;
        effect.style.top = `${targetRect.top - arenaRect.top}px`;
        
        elements.battleArena.appendChild(effect);
        setTimeout(() => effect.remove(), 600);
    }

    // Gestion des particules d'arrière-plan
    function createParticles() {
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'battle-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                pointer-events: none;
                animation: float ${Math.random() * 8 + 4}s infinite ease-in-out;
            `;
            elements.battleArena.appendChild(particle);
        }
    }

    createParticles();

    // Initialisation des boutons d'attaque
    elements.moveButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (gameState.isAnimating) return;
            
            const moveType = button.dataset.type;
            const damage = parseInt(button.dataset.power) || Math.floor(Math.random() * 20 + 10);
            
            // Attaque du joueur
            handleAttack(true, moveType, damage);
            
            // Contre-attaque
            setTimeout(() => {
                if (!gameState.isAnimating && gameState.enemyHP > 0) {
                    const enemyDamage = Math.floor(Math.random() * 20 + 10);
                    handleAttack(false, 'normal', enemyDamage);
                }
            }, 1500);
        });
    });

    // Ajout des styles d'animation
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px) rotate(-5deg); }
            75% { transform: translateX(10px) rotate(5deg); }
        }
        
        @keyframes attackAnim {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.5); opacity: 1; }
            100% { transform: scale(0); opacity: 0; }
        }
        
        .battle-sprite {
            transition: transform 0.3s ease, filter 0.3s ease;
        }
        
        .attack-effect {
            width: 50px;
            height: 50px;
            border-radius: 50%;
        }
        
        .attack-effect.fire { background: radial-gradient(#ff4422, transparent); }
        .attack-effect.water { background: radial-gradient(#3399ff, transparent); }
        .attack-effect.grass { background: radial-gradient(#33cc33, transparent); }
        /* Ajoutez d'autres types selon besoin */
    `;
    document.head.appendChild(styleSheet);
});