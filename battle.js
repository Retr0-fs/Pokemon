document.addEventListener('DOMContentLoaded', function() {
    // Cette fonction va maintenant compléter les animations de combat déjà gérées par main.js
    
    // Styles d'animation supplémentaires
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
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        .battle-sprite {
            transition: transform 0.3s ease, filter 0.3s ease;
        }
        
        .attack-effect {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            position: absolute;
            z-index: 100;
            pointer-events: none;
            animation: attackAnim 0.6s forwards;
        }
        
        .battle-particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
        }
        
        .attack-effect.fire { background: radial-gradient(#ff4422, transparent); }
        .attack-effect.water { background: radial-gradient(#3399ff, transparent); }
        .attack-effect.grass { background: radial-gradient(#33cc33, transparent); }
        .attack-effect.normal { background: radial-gradient(#aaaabb, transparent); }
        .attack-effect.electric { background: radial-gradient(#ffcc33, transparent); }
        .attack-effect.ice { background: radial-gradient(#66ccff, transparent); }
        .attack-effect.fighting { background: radial-gradient(#bb5544, transparent); }
        .attack-effect.poison { background: radial-gradient(#aa5599, transparent); }
        .attack-effect.ground { background: radial-gradient(#ddbb55, transparent); }
        .attack-effect.flying { background: radial-gradient(#8899ff, transparent); }
        .attack-effect.psychic { background: radial-gradient(#ff5599, transparent); }
        .attack-effect.bug { background: radial-gradient(#aabb22, transparent); }
        .attack-effect.rock { background: radial-gradient(#bbaa66, transparent); }
        .attack-effect.ghost { background: radial-gradient(#6666bb, transparent); }
        .attack-effect.dragon { background: radial-gradient(#7766ee, transparent); }
        .attack-effect.dark { background: radial-gradient(#775544, transparent); }
        .attack-effect.steel { background: radial-gradient(#aaaabb, transparent); }
        .attack-effect.fairy { background: radial-gradient(#ee99ee, transparent); }
    `;
    document.head.appendChild(styleSheet);

    // Fonction pour créer des particules d'arrière-plan dans l'arène de combat
    function createParticles() {
        const battleArena = document.querySelector('.battle-arena');
        if (!battleArena) return;
        
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'battle-particle';
            particle.style.width = `${Math.random() * 4 + 2}px`;
            particle.style.height = `${Math.random() * 4 + 2}px`;
            particle.style.background = 'rgba(255, 255, 255, 0.3)';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animation = `float ${Math.random() * 8 + 4}s infinite ease-in-out`;
            
            battleArena.appendChild(particle);
        }
    }
    
    // Créer des particules pour l'arène de combat
    createParticles();
    
    // Ajout des écouteurs d'événements pour les animations de combat
    document.addEventListener('battle:attack', function(e) {
        const { attacker, defender, moveType } = e.detail;
        animateAttack(attacker, defender, moveType);
    });
    
    // Fonction d'animation d'attaque
    function animateAttack(attackerType, defenderSelector, moveType) {
        const battleArena = document.querySelector('.battle-arena');
        if (!battleArena) return;
        
        const isPlayerAttack = attackerType === 'player';
        const attackerSelector = isPlayerAttack ? '.my-pokemon .battle-sprite' : '.enemy-pokemon .battle-sprite';
        const defenderSelector2 = isPlayerAttack ? '.enemy-pokemon .battle-sprite' : '.my-pokemon .battle-sprite';
        
        const attacker = document.querySelector(attackerSelector);
        const defender = document.querySelector(defenderSelector || defenderSelector2);
        
        if (!attacker || !defender) {
            console.error('Attacker or defender element not found', { attackerSelector, defenderSelector, defenderSelector2 });
            return;
        }
        
        // Animation de l'attaquant
        const direction = isPlayerAttack ? 1 : -1;
        attacker.style.transform = `translateX(${20 * direction}px)`;
        
        // Créer l'effet d'attaque
        setTimeout(() => {
            createAttackEffect(moveType || 'normal', defender, battleArena);
            
            // Animation du défenseur
            defender.style.animation = 'shake 0.5s ease';
            
            // Réinitialiser les positions
            setTimeout(() => {
                attacker.style.transform = '';
                defender.style.animation = '';
            }, 500);
        }, 300);
    }
    
    // Créer un effet visuel pour l'attaque
    function createAttackEffect(moveType, target, arena) {
        const effect = document.createElement('div');
        effect.className = `attack-effect ${moveType}`;
        
        // Positionnement de l'effet
        const targetRect = target.getBoundingClientRect();
        const arenaRect = arena.getBoundingClientRect();
        effect.style.left = `${targetRect.left - arenaRect.left + targetRect.width / 2 - 25}px`;
        effect.style.top = `${targetRect.top - arenaRect.top + targetRect.height / 2 - 25}px`;
        
        arena.appendChild(effect);
        setTimeout(() => effect.remove(), 600);
    }
    
    // Gestion des boutons d'attaque
    document.querySelectorAll('.move-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Les données seront traitées par main.js
            // On ajoute juste un effet visuel ici
            const moveType = this.dataset.type || 'normal';
            
            // Déclencher une animation d'attaque
            const attackEvent = new CustomEvent('battle:attack', {
                detail: {
                    attacker: 'player',
                    moveType: moveType
                }
            });
            document.dispatchEvent(attackEvent);
        });
    });
    
    // Mise à jour dynamique pour les nouveaux boutons d'attaque
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList.contains('move-btn') && !node._hasEventListener) {
                        node.addEventListener('click', function() {
                            const moveType = this.dataset.type || 'normal';
                            
                            const attackEvent = new CustomEvent('battle:attack', {
                                detail: {
                                    attacker: 'player',
                                    moveType: moveType
                                }
                            });
                            document.dispatchEvent(attackEvent);
                        });
                        node._hasEventListener = true;
                    }
                });
            }
        });
    });
    
    // Observer les changements dans la grille des mouvements
    const movesGrid = document.getElementById('movesGrid');
    if (movesGrid) {
        observer.observe(movesGrid, { childList: true, subtree: true });
    }
});