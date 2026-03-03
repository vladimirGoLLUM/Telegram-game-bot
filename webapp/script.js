let attributes = { STR: 5, AGI: 5, INT: 5, VIT: 5, DEX: 5, LUK: 5 };
let pointsLeft = 25;

// Конфигурация спрайтов — можно заменить на свои URL
const SPRITES = {
    // Тело (по полу)
    body: {
        Мужской: "https://i.imgur.com/XqCJbYf.png",
        Женский: "https://i.imgur.com/9uRqJ5T.png"
    },
    // Причёски
    hair: {
        "Короткие": "https://i.imgur.com/mVXeZkL.png",
        "Длинные": "https://i.imgur.com/KeF2nl7.png",
        "Лысый": null,
        "Косы": "https://i.imgur.com/KeF2nl7_tress.png"
    },
    // Одежда по классу
    classOutfit: {
        "Воин": "https://i.imgur.com/rmFQa1c.png",
        "Маг": "https://i.imgur.com/8Wt6R0D.png",
        "Разбойник": "https://i.imgur.com/5VvB1Nj.png",
        "Жрец": "https://i.imgur.com/7GgMnYp.png"
    },
    // Цвет кожи → фильтр яркости/насыщенности
    skinTone: {
        "Светлая": "brightness(1) saturate(1)",
        "Средняя": "brightness(0.85) saturate(1.1)",
        "Тёмная": "brightness(0.6) saturate(1.3)"
    }
};

// Обновление интерфейса
function updateStatDisplay() {
    document.getElementById('str').textContent = attributes.STR;
    document.getElementById('agi').textContent = attributes.AGI;
    document.getElementById('int').textContent = attributes.INT;
    document.getElementById('vit').textContent = attributes.VIT;
    document.getElementById('dex').textContent = attributes.DEX;
    document.getElementById('luk').textContent = attributes.LUK;
    document.getElementById('points-left').textContent = pointsLeft;

    // Активность кнопки
    const btn = document.getElementById('create-btn');
    btn.disabled = pointsLeft !== 0 || !document.getElementById('char-name').value.trim();

    // Обновляем предпросмотр
    updatePreview();
}

// Обновление предпросмотра персонажа
function updatePreview() {
    const gender = document.getElementById('char-gender').value;
    const skin = document.getElementById('char-skin').value;
    const hair = document.getElementById('char-hair').value;
    const cls = document.getElementById('char-class').value;

    // --- Слой: Тело ---
    const bodyImg = document.getElementById('body-sprite');
    bodyImg.src = SPRITES.body[gender] || SPRITES.body['Мужской'];
    bodyImg.style.filter = SPRITES.skinTone[skin] || 'none';

    // --- Слой: Причёска ---
    const hairImg = document.getElementById('hair-sprite');
    const hairSrc = SPRITES.hair[hair];
    if (hairSrc) {
        hairImg.src = hairSrc;
        hairImg.style.display = 'block';
    } else {
        hairImg.style.display = 'none'; // Лысый
    }

    // --- Слой: Одежда ---
    const classImg = document.getElementById('class-sprite');
    classImg.src = SPRITES.classOutfit[cls] || "";

    // --- Описание ---
    document.getElementById('preview-desc').textContent =
        `${gender}, ${skin} кожа, ${hair}`;
}

// Прокачка характеристик
function incStat(stat) {
    if (pointsLeft > 0) {
        attributes[stat]++;
        pointsLeft--;
        updateStatDisplay();
    }
}

function decStat(stat) {
    if (attributes[stat] > 1) {
        attributes[stat]--;
        pointsLeft++;
        updateStatDisplay();
    }
}

// Создание персонажа
async function createCharacter() {
    const name = document.getElementById('char-name').value.trim();
    const race = document.getElementById('char-race').value;
    const cls = document.getElementById('char-class').value;

    if (!name) {
        alert("Введите имя!");
        return;
    }

    if (pointsLeft !== 0) {
        alert("Распределите все очки!");
        return;
    }

    const appearance = {
        gender: document.getElementById('char-gender').value,
        skin: document.getElementById('char-skin').value,
        hair: document.getElementById('char-hair').value
    };

    const userData = {
        user_id: new URLSearchParams(window.location.search).get('user_id'),
        name,
        race,
        class: cls,
        attributes: { ...attributes },
        appearance
    };

    try {
        const response = await fetch('/api/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            alert(`Персонаж "${name}" создан!\nКласс: ${cls}\nРаса: ${race}`);
window.location.href = '/inventory.html' + window.location.search;
        } else {
            alert("Ошибка при создании");
        }
    } catch (err) {
        console.error(err);
        alert("Ошибка соединения");
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    updateStatDisplay();

    // Добавляем слушатели
    document.getElementById('char-gender').onchange = updatePreview;
    document.getElementById('char-skin').onchange = updatePreview;
    document.getElementById('char-hair').onchange = updatePreview;
    document.getElementById('char-class').onchange = updatePreview;
});