<?php
session_start();

// Fonction pour récupérer un Pokémon aléatoire (entre 1 et 898)
function getRandomPokemon() {
    $random_id = rand(1, 898);
    $ch = curl_init("https://pokeapi.co/api/v2/pokemon/$random_id");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Fonction pour calculer les HP basés sur les stats
function calculateHP($base_stat) {
    return $base_stat * 2 + 50; // Formule améliorée
}

// Fonction pour calculer les dégâts en fonction des types
function calculateDamage($attacker, $defender, $attack_stat) {
    $type_multiplier = getTypeMultiplier($attacker['types'], $defender['types']);
    $base_damage = $attack_stat * (rand(85, 100) / 100);
    return max(1, round($base_damage * $type_multiplier));
}

// Fonction pour obtenir le multiplicateur de type
function getTypeMultiplier($attacker_types, $defender_types) {
    $type_chart = [
        'fire' => ['grass' => 2, 'water' => 0.5, 'fire' => 0.5],
        'water' => ['fire' => 2, 'grass' => 0.5, 'water' => 0.5],
        'grass' => ['water' => 2, 'fire' => 0.5, 'grass' => 0.5],
        // ...ajouter d'autres types ici...
    ];
    $multiplier = 1;
    foreach ($attacker_types as $attacker_type) {
        foreach ($defender_types as $defender_type) {
            $multiplier *= $type_chart[$attacker_type['type']['name']][$defender_type['type']['name']] ?? 1;
        }
    }
    return $multiplier;
}

// Fonction pour récupérer les attaques d'un Pokémon
function getPokemonMoves($pokemon) {
    $moves = array_slice($pokemon['moves'], 0, 4);
    $formatted_moves = [];
    foreach ($moves as $move) {
        $ch = curl_init("https://pokeapi.co/api/v2/move/" . basename($move['move']['url']));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        $response = curl_exec($ch);
        curl_close($ch);
        $move_data = json_decode($response, true);
        $formatted_moves[] = [
            'name' => $move['move']['name'],
            'power' => $move_data['power'] ?? 50,
            'type' => $move_data['type']['name'],
            'accuracy' => $move_data['accuracy'] ?? 100
        ];
    }
    return $formatted_moves;
}

// Vérifier si nous sommes en mode combat
$battle_mode = isset($_GET['battle']);

// Récupération de notre Pokémon
if (isset($_POST['random']) || !isset($_SESSION['my_pokemon'])) {
    $_SESSION['my_pokemon'] = getRandomPokemon();
}

// Si on est en mode combat et qu'on n'a pas encore d'ennemi
if ($battle_mode && !isset($_SESSION['enemy_pokemon'])) {
    $_SESSION['enemy_pokemon'] = getRandomPokemon();
    while ($_SESSION['enemy_pokemon']['id'] == $_SESSION['my_pokemon']['id']) {
        $_SESSION['enemy_pokemon'] = getRandomPokemon();
    }
    
    $_SESSION['my_pokemon_hp'] = calculateHP($_SESSION['my_pokemon']['stats'][0]['base_stat']);
    $_SESSION['my_pokemon_max_hp'] = $_SESSION['my_pokemon_hp'];
    $_SESSION['enemy_pokemon_hp'] = calculateHP($_SESSION['enemy_pokemon']['stats'][0]['base_stat']);
    $_SESSION['enemy_pokemon_max_hp'] = $_SESSION['enemy_pokemon_hp'];
    $_SESSION['battle_log'] = ["Le combat commence !"];
    $_SESSION['my_pokemon_moves'] = getPokemonMoves($_SESSION['my_pokemon']);
    $_SESSION['enemy_pokemon_moves'] = getPokemonMoves($_SESSION['enemy_pokemon']);
}

// Simulation d'un tour de combat
if (isset($_POST['move'])) {
    $move_index = $_POST['move'];
    $selected_move = $_SESSION['my_pokemon_moves'][$move_index];
    $damage_to_enemy = calculateDamage(
        $_SESSION['my_pokemon'],
        $_SESSION['enemy_pokemon'],
        $selected_move['power']
    );
    
    $_SESSION['enemy_pokemon_hp'] = max(0, $_SESSION['enemy_pokemon_hp'] - $damage_to_enemy);
    $_SESSION['battle_log'][] = ucfirst($_SESSION['my_pokemon']['name']) . " utilise " . 
        str_replace('-', ' ', ucfirst($selected_move['name'])) . " et inflige " . $damage_to_enemy . " dégâts !";
    
    if ($_SESSION['enemy_pokemon_hp'] <= 0) {
        $_SESSION['battle_log'][] = ucfirst($_SESSION['enemy_pokemon']['name']) . " est K.O. ! Vous avez gagné !";
        $_SESSION['battle_over'] = true;
    } else {
        $enemy_attack = $_SESSION['enemy_pokemon_moves'][rand(0, count($_SESSION['enemy_pokemon_moves']) - 1)];
        $damage_to_me = calculateDamage(
            $_SESSION['enemy_pokemon'],
            $_SESSION['my_pokemon'],
            $enemy_attack['power']
        );
        $_SESSION['my_pokemon_hp'] = max(0, $_SESSION['my_pokemon_hp'] - $damage_to_me);
        $_SESSION['battle_log'][] = ucfirst($_SESSION['enemy_pokemon']['name']) . " utilise " . 
            str_replace('-', ' ', ucfirst($enemy_attack['name'])) . " et inflige " . $damage_to_me . " dégâts !";
        
        if ($_SESSION['my_pokemon_hp'] <= 0) {
            $_SESSION['battle_log'][] = ucfirst($_SESSION['my_pokemon']['name']) . " est K.O. ! Vous avez perdu !";
            $_SESSION['battle_over'] = true;
        }
    }
}

// Réinitialiser le combat
if (isset($_POST['new_battle'])) {
    unset($_SESSION['enemy_pokemon'], $_SESSION['my_pokemon_hp'], $_SESSION['enemy_pokemon_hp'], $_SESSION['battle_log'], $_SESSION['battle_over'], $_SESSION['my_pokemon_moves'], $_SESSION['enemy_pokemon_moves']);
    header("Location: index.php?battle=1");
    exit;
}

// Retour à l'accueil
if (isset($_POST['return'])) {
    unset($_SESSION['enemy_pokemon'], $_SESSION['my_pokemon_hp'], $_SESSION['enemy_pokemon_hp'], $_SESSION['battle_log'], $_SESSION['battle_over'], $_SESSION['my_pokemon_moves'], $_SESSION['enemy_pokemon_moves']);
    header("Location: index.php");
    exit;
}
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $battle_mode ? 'Combat Pokémon' : 'Pokédex Aléatoire' ?></title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container <?= $battle_mode ? 'battle-container' : '' ?>">
        <h1><?= $battle_mode ? 'Combat Pokémon' : 'Pokédex Aléatoire' ?></h1>
        
        <?php if (!$battle_mode): ?>
            <!-- Mode Pokédex -->
            <div class="buttons-container">
                <form method="post">
                    <button type="submit" name="random" class="random-btn">Pokémon Aléatoire</button>
                </form>
                <a href="?battle=1" class="battle-btn">Commencer un Combat</a>
            </div>
            
            <?php if (isset($_SESSION['my_pokemon'])): ?>
                <div class="pokemon-card">
                    <div class="pokemon-header">
                        <div class="pokemon-name"><?= ucfirst($_SESSION['my_pokemon']['name']) ?> #<?= $_SESSION['my_pokemon']['id'] ?></div>
                        <div class="pokemon-types">
                            <?php foreach ($_SESSION['my_pokemon']['types'] as $type): ?>
                                <div class="type <?= $type['type']['name'] ?>"><?= $type['type']['name'] ?></div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                    <div class="pokemon-content">
                        <div class="pokemon-image">
                            <img src="<?= $_SESSION['my_pokemon']['sprites']['other']['official-artwork']['front_default'] ?>" alt="<?= $_SESSION['my_pokemon']['name'] ?>">
                        </div>
                        <div class="pokemon-info">
                            <div class="section-header">Caractéristiques</div>
                            <table>
                                <tr>
                                    <td>Taille</td>
                                    <td><?= $_SESSION['my_pokemon']['height'] / 10 ?> m</td>
                                </tr>
                                <tr>
                                    <td>Poids</td>
                                    <td><?= $_SESSION['my_pokemon']['weight'] / 10 ?> kg</td>
                                </tr>
                                <tr>
                                    <td>Expérience de base</td>
                                    <td><?= $_SESSION['my_pokemon']['base_experience'] ?> XP</td>
                                </tr>
                            </table>
                            
                            <div class="section-header">Statistiques</div>
                            <table>
                                <?php foreach ($_SESSION['my_pokemon']['stats'] as $stat): ?>
                                    <tr>
                                        <td><?= ucfirst(str_replace('-', ' ', $stat['stat']['name'])) ?></td>
                                        <td>
                                            <div class="stat-bar-container">
                                                <?php $percentage = min(100, ($stat['base_stat'] / 255) * 100); ?>
                                                <div class="stat-bar" style="width: <?= $percentage ?>%"><?= $stat['base_stat'] ?></div>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </table>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            
        <?php else: ?>
            <!-- Mode Combat -->
            <div class="battle-arena">
                <!-- Pokémon ennemi en haut à droite -->
                <div class="battle-pokemon enemy-pokemon">
                    <div class="battle-info">
                        <div class="battle-name"><?= ucfirst($_SESSION['enemy_pokemon']['name']) ?></div>
                        <div class="battle-hp-bar">
                            <div class="hp-label">HP: <?= $_SESSION['enemy_pokemon_hp'] ?>/<?= $_SESSION['enemy_pokemon_max_hp'] ?></div>
                            <div class="hp-bar-container">
                                <?php $enemy_hp_percentage = ($_SESSION['enemy_pokemon_hp'] / $_SESSION['enemy_pokemon_max_hp']) * 100; ?>
                                <div class="hp-bar" style="width: <?= $enemy_hp_percentage ?>%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="battle-sprite enemy-sprite">
                        <img src="<?= $_SESSION['enemy_pokemon']['sprites']['other']['official-artwork']['front_default'] ?>" alt="<?= $_SESSION['enemy_pokemon']['name'] ?>">
                    </div>
                </div>
                
                <!-- Mon Pokémon en bas à gauche -->
                <div class="battle-pokemon my-pokemon">
                    <div class="battle-sprite my-sprite">
                        <img src="<?= $_SESSION['my_pokemon']['sprites']['other']['official-artwork']['back_default'] ?? $_SESSION['my_pokemon']['sprites']['back_default'] ?? $_SESSION['my_pokemon']['sprites']['other']['official-artwork']['front_default'] ?>" alt="<?= $_SESSION['my_pokemon']['name'] ?>">
                    </div>
                    <div class="battle-info">
                        <div class="battle-name"><?= ucfirst($_SESSION['my_pokemon']['name']) ?></div>
                        <div class="battle-hp-bar">
                            <div class="hp-label">HP: <?= $_SESSION['my_pokemon_hp'] ?>/<?= $_SESSION['my_pokemon_max_hp'] ?></div>
                            <div class="hp-bar-container">
                                <?php $my_hp_percentage = ($_SESSION['my_pokemon_hp'] / $_SESSION['my_pokemon_max_hp']) * 100; ?>
                                <div class="hp-bar" style="width: <?= $my_hp_percentage ?>%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Contrôles de combat -->
            <div class="battle-controls">
                <div class="battle-log">
                    <?php foreach (array_slice($_SESSION['battle_log'], -5) as $log): ?>
                        <p><?= $log ?></p>
                    <?php endforeach; ?>
                </div>
                
                <div class="battle-buttons">
                    <?php if (!isset($_SESSION['battle_over'])): ?>
                        <div class="moves-grid">
                            <?php foreach ($_SESSION['my_pokemon_moves'] as $index => $move): ?>
                                <button type="button" 
                                        class="move-btn <?= $move['type'] ?>"
                                        data-type="<?= $move['type'] ?>"
                                        data-power="<?= $move['power'] ?>"
                                        data-name="<?= str_replace('-', ' ', ucfirst($move['name'])) ?>">
                                    <?= str_replace('-', ' ', ucfirst($move['name'])) ?>
                                    <span class="move-power"><?= $move['power'] ?></span>
                                </button>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>
                </div>
                
                <div class="control-buttons">
                    <form method="post">
                        <button type="submit" name="new_battle" class="new-battle-btn">Nouveau Combat</button>
                    </form>
                    <form method="post">
                        <button type="submit" name="return" class="return-btn">Retour</button>
                    </form>
                </div>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Script pour les animations de combat -->
    <script src="battle.js"></script>
</body>
</html>