let player = { attributes: {}, inventory: {} };

// Загрузка данных игрока
async function loadPlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    const user_id = urlParams.get('user_id');

    if (!user_id) {
        alert("Не указан user_id");
        return;
    }

    const response = await fetch(`/api/player?user_id=${user_id}`);
    player = await response.json();

    if (!player) {
        // Создание персонажа
        await createCharacter(user_id);
    }

    updateUI();
}

// Создание персонажа
async function createCharacter(user_id) {
    const data = {
        action: "create_character",
        user_id: user_id,
        name: "Герой",
        race: "Человек",
        class: "Воин",
        attributes: { STR: 10, AGI: 5, INT: 3, VIT: 8, DEX: 6, LUK: 2 }
    };

    await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    player = await (await fetch(`/api/player?user_id=${user_id}`)).json();
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('player-name').textContent = player.name || 'Герой';
    document.getElementById('player-level').textContent = player.level || 1;
    document.getElementById('gold').textContent = player.gold || 0;

    const exp = player.exp || 0;
    const level = player.level || 1;
    const nextLevelExp = level * 100;
    const expPercent = (exp / nextLevelExp) * 100;
    document.getElementById('exp-bar').style.width = `${Math.min(expPercent, 100)}%`;

    // Характеристики
    for (const [key, value] of Object.entries(player.attributes)) {
        const el = document.getElementById(key.toLowerCase());
        if (el) el.textContent = value;
    }

    // Инвентарь
    const invEl = document.getElementById('inventory-items');
    invEl.innerHTML = '';
    for (const [item, count] of Object.entries(player.inventory)) {
        const itemEl = document.createElement('div');
        itemEl.textContent = `${item}: ${count} шт.`;
        itemEl.style.margin = '5px 0';
        itemEl.onclick = () => useItem(item);
        invEl.appendChild(itemEl);
    }
}

// Прокачка характеристики
async function upgradeStat(stat) {
    const data = {
        action: "upgrade_stat",
        stat: stat,
        user_id: new URLSearchParams(window.location.search).get('user_id')
    };

    await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    // Обновляем локально (или можно перезагрузить)
    player.attributes[stat] = (player.attributes[stat] || 1) + 1;
    updateUI();
}

// Покупка предмета
async function buyItem(item) {
    const data = {
        action: "buy_item",
        item: item,
        user_id: new URLSearchParams(window.location.search).get('user_id')
    };

    await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    // Перезагружаем игрока
    loadPlayer();
}

// Использование предмета
async function useItem(item) {
    const data = {
        action: "use_item",
        item: item,
        user_id: new URLSearchParams(window.location.search).get('user_id')
    };

    await fetch('/api/use_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    loadPlayer();
}

// Начало боя
async function startBattle() {
    const monster = "Гоблин";
    const level = 1;

    const data = {
        action: "start_battle",
        monster: monster,
        level: level,
        user_id: new URLSearchParams(window.location.search).get('user_id')
    };

    await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    // Награда за бой
    await fetch('/api/battle_reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.user_id, exp: 50, gold: 30 })
    });

    alert(`Победил ${monster}! +50 опыта, +30 золота`);
    loadPlayer();
}

// Загружаем игрока при старте
window.onload = loadPlayer;