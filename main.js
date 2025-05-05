// État global de l'application
const appState = {
    // Mode actuel (pokedex ou battle)
    mode: 'pokedex',
    // Mon Pokémon
    myPokemon: null,
    // Pokémon ennemi
    enemyPokemon: null,
    // Points de vie
    myPokemonHP: 0,
    myPokemonMaxHP: 0,
    enemyPokemonHP: 0,
    enemyPokemonMaxHP: 0,
    // Journal de combat
    battleLog: [],
    // Attaques de mon Pokémon
    myPokemonMoves: [],
    // Attaques du Pokémon ennemi
    enemyPokemonMoves: [],
    // Combat terminé
    battleOver: false
};

// Table de types (pour calculer les multiplicateurs de dégâts)
const typeChart = {
    'fire': {'grass': 2, 'water': 0.5, 'fire': 0.5},
    'water': {'fire': 2, 'grass': 0.5, 'water': 0.5},
    'grass': {'water': 2, 'fire': 0.5, 'grass': 0.5}
    // Ajoutez d'autres types selon besoin
};

// Fonction pour récupérer un Pokémon aléatoire (entre 1 et 898)
async function getRandomPokemon() {
    const randomId = Math.floor(Math.random() * 898) + 1;
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!response.ok) {
            throw new Error('Erreur lors de la récupération du Pokémon');
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

// Fonction pour calculer les HP basés sur les stats
function calculateHP(baseStat) {
    return baseStat * 2 + 50; // Formule améliorée
}

// Fonction pour calculer les dégâts en fonction des types
function calculateDamage(attacker, defender, attackPower) {
    const typeMultiplier = getTypeMultiplier(attacker.types, defender.types);
    const baseDamage = attackPower * (Math.random() * 0.15 + 0.85); // 85% à 100% de puissance
    return Math.max(1, Math.round(baseDamage * typeMultiplier));
}

// Fonction pour obtenir le multiplicateur de type
function getTypeMultiplier(attackerTypes, defenderTypes) {
    let multiplier = 1;
    
    attackerTypes.forEach(attackerType => {
        const attackType = attackerType.type.name;
        
        defenderTypes.forEach(defenderType => {
            const defendType = defenderType.type.name;
            if (typeChart[attackType] && typeChart[attackType][defendType]) {
                multiplier *= typeChart[attackType][defendType];
            }
        });
    });
    
    return multiplier;
}

// Fonction pour récupérer les attaques d'un Pokémon
async function getPokemonMoves(pokemon) {
    // Limiter à 4 attaques
    const movesToFetch = pokemon.moves.slice(0, 4).map(move => {
        // Extraire l'ID de l'URL du move
        const moveUrl = move.move.url;
        return fetch(moveUrl)
            .then(response => response.json())
            .then(moveData => ({
                name: move.move.name,
                power: moveData.power || 50,
                type: moveData.type.name,
                accuracy: moveData.accuracy || 100
            }));
    });
    
    return Promise.all(movesToFetch);
}

// Fonction pour afficher un Pokémon dans le mode Pokédex
function displayPokemonInPokedex(pokemon) {
    const pokemonCard = document.getElementById('pokemonCard');
    
    // Préparer le HTML pour les types
    const typesHTML = pokemon.types.map(type => 
        `<div class="type ${type.type.name}">${type.type.name}</div>`
    ).join('');
    
    // Préparer le HTML pour les statistiques
    const statsHTML = pokemon.stats.map(stat => {
        const percentage = Math.min(100, (stat.base_stat / 255) * 100);
        return `
            <tr>
                <td>${capitalizeFirstLetter(stat.stat.name.replace('-', ' '))}</td>
                <td>
                    <div class="stat-bar-container">
                        <div class="stat-bar" style="width: ${percentage}%">${stat.base_stat}</div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Mettre à jour le HTML de la carte Pokémon
    pokemonCard.innerHTML = `
        <div class="pokemon-header">
            <div class="pokemon-name">${capitalizeFirstLetter(pokemon.name)} #${pokemon.id}</div>
            <div class="pokemon-types">${typesHTML}</div>
        </div>
        <div class="pokemon-content">
            <div class="pokemon-image">
                <img src="${pokemon.sprites.other['official-artwork'].front_default}" alt="${pokemon.name}">
            </div>
            <div class="pokemon-info">
                <div class="section-header">Caractéristiques</div>
                <table>
                    <tr>
                        <td>Taille</td>
                        <td>${pokemon.height / 10} m</td>
                    </tr>
                    <tr>
                        <td>Poids</td>
                        <td>${pokemon.weight / 10} kg</td>
                    </tr>
                    <tr>
                        <td>Expérience de base</td>
                        <td>${pokemon.base_experience} XP</td>
                    </tr>
                </table>
                
                <div class="section-header">Statistiques</div>
                <table>${statsHTML}</table>
            </div>
        </div>
    `;
    
    // Afficher la carte
    pokemonCard.style.display = 'block';
}

// Fonction pour initialiser le mode combat
async function initBattleMode() {
    // Changer le titre
    document.getElementById('pageTitle').textContent = 'Combat Pokémon';
    
    // Cacher le mode Pokédex et afficher le mode combat
    document.getElementById('pokedexMode').style.display = 'none';
    document.getElementById('battleMode').style.display = 'block';
    
    // Ajouter la classe battle-container
    document.getElementById('mainContainer').classList.add('battle-container');
    
    // Si nous n'avons pas encore de Pokémon ennemi, en générer un
    if (!appState.enemyPokemon) {
        appState.enemyPokemon = await getRandomPokemon();
        
        // S'assurer que l'ennemi et mon Pokémon sont différents
        while (appState.enemyPokemon.id === appState.myPokemon.id) {
            appState.enemyPokemon = await getRandomPokemon();
        }
        
        // Calculer les HP
        appState.myPokemonHP = calculateHP(appState.myPokemon.stats[0].base_stat);
        appState.myPokemonMaxHP = appState.myPokemonHP;
        appState.enemyPokemonHP = calculateHP(appState.enemyPokemon.stats[0].base_stat);
        appState.enemyPokemonMaxHP = appState.enemyPokemonHP;
        
        // Initialiser le journal de combat
        appState.battleLog = ["Le combat commence !"];
        
        // Récupérer les attaques
        appState.myPokemonMoves = await getPokemonMoves(appState.myPokemon);
        appState.enemyPokemonMoves = await getPokemonMoves(appState.enemyPokemon);
    }
    
    // Afficher les Pokémon en combat
    displayPokemonInBattle();
}

// Fonction pour afficher les Pokémon en combat
function displayPokemonInBattle() {
    // Mettre à jour le Pokémon ennemi
    document.getElementById('enemyName').textContent = capitalizeFirstLetter(appState.enemyPokemon.name);
    document.getElementById('enemyHPLabel').textContent = `HP: ${appState.enemyPokemonHP}/${appState.enemyPokemonMaxHP}`;
    document.getElementById('enemyHPBar').style.width = `${(appState.enemyPokemonHP / appState.enemyPokemonMaxHP) * 100}%`;
    document.getElementById('enemySprite').innerHTML = `
        <img src="${appState.enemyPokemon.sprites.other['official-artwork'].front_default}" 
             alt="${appState.enemyPokemon.name}">
    `;
    
    // Mettre à jour mon Pokémon
    document.getElementById('myName').textContent = capitalizeFirstLetter(appState.myPokemon.name);
    document.getElementById('myHPLabel').textContent = `HP: ${appState.myPokemonHP}/${appState.myPokemonMaxHP}`;
    document.getElementById('myHPBar').style.width = `${(appState.myPokemonHP / appState.myPokemonMaxHP) * 100}%`;
    
    // Choisir l'image de dos si disponible, sinon utiliser l'image de face
    const myPokemonImage = appState.myPokemon.sprites.back_default || 
                          appState.myPokemon.sprites.other['official-artwork'].front_default;
    document.getElementById('mySprite').innerHTML = `
        <img src="${myPokemonImage}" alt="${appState.myPokemon.name}">
    `;
    
    // Mettre à jour le journal de combat
    updateBattleLog();
    
    // Afficher les attaques
    if (!appState.battleOver) {
        displayMoves();
    } else {
        document.getElementById('movesGrid').innerHTML = '';
    }
}

// Fonction pour mettre à jour le journal de combat
function updateBattleLog() {
    const battleLog = document.getElementById('battleLog');
    battleLog.innerHTML = '';
    
    // Afficher les 5 derniers messages
    const recentLogs = appState.battleLog.slice(-5);
    recentLogs.forEach(log => {
        const logEntry = document.createElement('p');
        logEntry.textContent = log;
        battleLog.appendChild(logEntry);
    });
    
    // Faire défiler vers le bas
    battleLog.scrollTop = battleLog.scrollHeight;
}

// Fonction pour afficher les attaques
function displayMoves() {
    const movesGrid = document.getElementById('movesGrid');
    movesGrid.innerHTML = '';
    
    appState.myPokemonMoves.forEach((move, index) => {
        const moveBtn = document.createElement('button');
        moveBtn.className = `move-btn ${move.type}`;
        moveBtn.dataset.type = move.type;
        moveBtn.dataset.power = move.power;
        moveBtn.dataset.index = index;
        moveBtn.innerHTML = `
            ${capitalizeFirstLetter(move.name.replace('-', ' '))}
            <span class="move-power">${move.power}</span>
        `;
        
        // Ajouter l'écouteur d'événement pour l'attaque
        moveBtn.addEventListener('click', () => handleMoveClick(index));
        
        movesGrid.appendChild(moveBtn);
    });
}

// Gestionnaire pour le clic sur une attaque
function handleMoveClick(moveIndex) {
    if (appState.battleOver) return;
    
    const selectedMove = appState.myPokemonMoves[moveIndex];
    
    // Calculer les dégâts
    const damageToEnemy = calculateDamage(
        appState.myPokemon,
        appState.enemyPokemon,
        selectedMove.power
    );
    
    // Mettre à jour les HP de l'ennemi
    appState.enemyPokemonHP = Math.max(0, appState.enemyPokemonHP - damageToEnemy);
    
    // Ajouter au journal de combat
    appState.battleLog.push(
        `${capitalizeFirstLetter(appState.myPokemon.name)} utilise ${capitalizeFirstLetter(selectedMove.name.replace('-', ' '))} et inflige ${damageToEnemy} dégâts !`
    );
    
    // Déclencher l'animation d'attaque du joueur
    const playerAttackEvent = new CustomEvent('battle:attack', {
        detail: {
            attacker: 'player',
            moveType: selectedMove.type
        }
    });
    document.dispatchEvent(playerAttackEvent);
    
    // Vérifier si l'ennemi est K.O.
    if (appState.enemyPokemonHP <= 0) {
        appState.battleLog.push(`${capitalizeFirstLetter(appState.enemyPokemon.name)} est K.O. ! Vous avez gagné !`);
        appState.battleOver = true;
        displayPokemonInBattle();
        return;
    }
    
    // Attaque de l'ennemi après un délai
    setTimeout(() => {
        // Attaque de l'ennemi
        const enemyAttack = appState.enemyPokemonMoves[Math.floor(Math.random() * appState.enemyPokemonMoves.length)];
        const damageToMe = calculateDamage(
            appState.enemyPokemon,
            appState.myPokemon,
            enemyAttack.power
        );
        
        // Mettre à jour mes HP
        appState.myPokemonHP = Math.max(0, appState.myPokemonHP - damageToMe);
        
        // Ajouter au journal de combat
        appState.battleLog.push(
            `${capitalizeFirstLetter(appState.enemyPokemon.name)} utilise ${capitalizeFirstLetter(enemyAttack.name.replace('-', ' '))} et inflige ${damageToMe} dégâts !`
        );
        
        // Déclencher l'animation d'attaque de l'ennemi
        const enemyAttackEvent = new CustomEvent('battle:attack', {
            detail: {
                attacker: 'enemy',
                moveType: enemyAttack.type
            }
        });
        document.dispatchEvent(enemyAttackEvent);
        
        // Vérifier si mon Pokémon est K.O.
        if (appState.myPokemonHP <= 0) {
            appState.battleLog.push(`${capitalizeFirstLetter(appState.myPokemon.name)} est K.O. ! Vous avez perdu !`);
            appState.battleOver = true;
        }
        
        // Mettre à jour l'affichage
        displayPokemonInBattle();
    }, 1000);
}

// Fonction pour retourner au mode Pokédex
function returnToPokedex() {
    // Réinitialiser le mode combat
    appState.mode = 'pokedex';
    appState.enemyPokemon = null;
    appState.myPokemonHP = 0;
    appState.myPokemonMaxHP = 0;
    appState.enemyPokemonHP = 0;
    appState.enemyPokemonMaxHP = 0;
    appState.battleLog = [];
    appState.myPokemonMoves = [];
    appState.enemyPokemonMoves = [];
    appState.battleOver = false;
    
    // Changer le titre
    document.getElementById('pageTitle').textContent = 'Pokédex Aléatoire';
    
    // Cacher le mode combat et afficher le mode Pokédex
    document.getElementById('battleMode').style.display = 'none';
    document.getElementById('pokedexMode').style.display = 'block';
    
    // Retirer la classe battle-container
    document.getElementById('mainContainer').classList.remove('battle-container');
}

// Fonction utilitaire pour mettre en majuscule la première lettre
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Écouteurs d'événements
document.addEventListener('DOMContentLoaded', () => {
    // Bouton pour obtenir un Pokémon aléatoire
    document.getElementById('randomBtn').addEventListener('click', async () => {
        const pokemon = await getRandomPokemon();
        if (pokemon) {
            appState.myPokemon = pokemon;
            displayPokemonInPokedex(pokemon);
        }
    });
    
    // Bouton pour commencer un combat
    document.getElementById('battleBtn').addEventListener('click', async () => {
        if (!appState.myPokemon) {
            // Si aucun Pokémon n'est sélectionné, en générer un
            appState.myPokemon = await getRandomPokemon();
            displayPokemonInPokedex(appState.myPokemon);
        }
        
        appState.mode = 'battle';
        initBattleMode();
    });
    
    // Bouton pour un nouveau combat
    document.getElementById('newBattleBtn').addEventListener('click', () => {
        // Réinitialiser le combat
        appState.enemyPokemon = null;
        appState.myPokemonHP = 0;
        appState.myPokemonMaxHP = 0;
        appState.enemyPokemonHP = 0;
        appState.enemyPokemonMaxHP = 0;
        appState.battleLog = [];
        appState.myPokemonMoves = [];
        appState.enemyPokemonMoves = [];
        appState.battleOver = false;
        
        // Initialiser un nouveau combat
        initBattleMode();
    });
    
    // Bouton pour retourner au mode Pokédex
    document.getElementById('returnBtn').addEventListener('click', returnToPokedex);
    
    // Initialiser l'application avec un Pokémon aléatoire
    document.getElementById('randomBtn').click();
}); 