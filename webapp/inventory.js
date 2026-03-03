let player = { inventory: {}, equipped: {}, attributes: {} };
let selectedItem = null;

async function loadPlayer() {
    const urlParams = new URLSearchParams(window.location.search);
    const user_id = urlParams.get('user_id');

    if (!user_id) {
        alert("Не указан user_id");
        return;
    }

    try {
        const response = await fetch(`/api/player?user_id=${user_id}`);
        player = await response.json();

        // ✅ Если персонажа НЕТ — перенаправляем на создание
        if (!player) {
            window.location.href = '/index.html' + window.location.search;
            return;
        }

        updateUI();
    } catch (err) {
        console.error(err);
    }
}

function updateUI() {
    document.getElementById('player-level').textContent = player.level || 1;
    document.getElementById('health').textContent = `${player.health || 100}/${player.maxHealth || 100}`;
    document.getElementById('gold').textContent = player.gold || 0;
    document.getElementById('armor').textContent = player.armor || 0;
    document.getElementById('dps').textContent = player.dps || 0;
    document.getElementById('sign-intensity').textContent = player.signIntensity ? `${player.signIntensity}%` : "+0%";

    renderInventory();
    renderEquipped();
}

function renderInventory() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';

    const category = document.querySelector('.cat-btn.active').dataset.cat;
    const items = player.inventory[category] || [];

    items.forEach(item => {
        const slot = document.createElement('div');
        slot.className = 'item-slot';
        slot.dataset.name = item.name;

        const img = document.createElement('img');
        img.className = 'item-icon';
        img.src = item.icon || 'https://i.imgur.com/mVXeZkL.png';
        img.alt = item.name;

        slot.appendChild(img);
        slot.onclick = () => selectItem(item);
        slot.onmouseenter = (e) => showTooltip(item, e);
        slot.onmouseleave = hideTooltip;

        grid.appendChild(slot);
    });
}

function selectItem(item) {
    selectedItem = item;
    document.querySelectorAll('.item-slot').forEach(el => {
        el.style.borderColor = 'transparent';
    });
    event.target.style.borderColor = '#d4af37';
}

function renderEquipped() {
    for (const [slot, item] of Object.entries(player.equipped)) {
        const el = document.getElementById(`slot-${slot}`);
        if (el && item) {
            el.innerHTML = `<img src="${item.icon}" alt="${item.name}" title="${item.name}" style="width:100%;height:100%;object-fit:cover">`;
        }
    }
}

function showTooltip(item, e) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'block';
    tooltip.style.left = e.clientX + 'px';
    tooltip.style.top = e.clientY + 'px';

    document.getElementById('item-name').textContent = item.name;
    document.getElementById('item-desc').textContent = item.desc || '';

    const statsList = document.getElementById('item-stats');
    statsList.innerHTML = '';
    if (item.stats) {
        Object.entries(item.stats).forEach(([k, v]) => {
            const li = document.createElement('li');
            li.textContent = `${k}: ${v}`;
            statsList.appendChild(li);
        });
    }
}

function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

// Переключение категорий
document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.cat-btn.active').classList.remove('active');
        btn.classList.add('active');
        renderInventory();
    });
});

// Действия
document.getElementById('btn-equip').onclick = () => {
    if (selectedItem) {
        // Логика экипировки
        alert(`Экипировано: ${selectedItem.name}`);
    }
};

document.getElementById('btn-drop').onclick = async () => {
    if (!selectedItem) return;
    await fetch('/api/drop_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: new URLSearchParams(window.location.search).get('user_id'), item: selectedItem.name })
    });
    loadPlayer();
};

window.onload = loadPlayer;