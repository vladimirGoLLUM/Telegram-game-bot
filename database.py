import sqlite3
import json
import os

# Папка для базы данных
if not os.path.exists("data"):
    os.makedirs("data")

DB_PATH = "data/players.db"

def init_db():
    """Создаёт таблицу игроков с полем inventory"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS players (
                user_id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                race TEXT NOT NULL,
                class TEXT NOT NULL,
                attributes TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                exp INTEGER DEFAULT 0,
                gold INTEGER DEFAULT 100,
                inventory TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

def save_player(user_id, name, race, cls, attributes, level=None, exp=None, gold=None, inventory=None):
    """Сохраняет игрока с возможностью обновления отдельных полей"""
    player = get_player(user_id)

    # Если игрок уже есть — используем его данные по умолчанию
    if player:
        level = level or player['level']
        exp = exp or player['exp']
        gold = gold or player['gold']
        inventory = inventory or player['inventory']
    else:
        level = level or 1
        exp = exp or 0
        gold = gold or 100
        inventory = inventory or {}

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO players 
            (user_id, name, race, class, attributes, level, exp, gold, inventory)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            name,
            race,
            cls,
            json.dumps(attributes),
            level,
            exp,
            gold,
            json.dumps(inventory)
        ))

def get_player(user_id):
    """Получает игрока из БД"""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row  # Чтобы можно было обращаться по имени колонки
        cursor = conn.execute("SELECT * FROM players WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            data = dict(row)
            data['attributes'] = json.loads(data['attributes'])
            data['inventory'] = json.loads(data['inventory'])  # Преобразуем JSON строку в словарь
            return data
        return None