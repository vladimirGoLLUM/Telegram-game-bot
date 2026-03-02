import logging
import asyncio
import sys
import json
import os
from flask import Flask, request, jsonify, send_from_directory
from telegram import Update, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

TOKEN = os.getenv("BOT_TOKEN")
from database import init_db, save_player, get_player

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

# Путь к папке с веб-файлами
WEBAPP_DIR = os.path.join(os.path.dirname(__file__), 'webapp')

# URL твоего приложения (ngrok или другой)
WEB_APP_URL = "https://web-production-d46f0.up.railway.app"

# === Flask приложение ===
flask_app = Flask(__name__)


# API: Получение данных игрока
@flask_app.route('/api/player')
def api_get_player():
    user_id = request.args.get('user_id')
    if not user_id or not user_id.isdigit():
        return jsonify({"error": "Invalid user_id"}), 400
    player = get_player(int(user_id))
    return jsonify(player) if player else jsonify(None)

# Статические файлы: /index.html, /style.css и т.д.
@flask_app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(WEBAPP_DIR, filename)

# Главная страница
@flask_app.route('/')
def index():
    """Главная страница — игра"""
    return send_from_directory('webapp', 'index.html')


# Запуск Flask в отдельном потоке
def run_flask():
    flask_app.run(host='0.0.0.0', port=8000, threaded=True)

# === Генерация главного меню с user_id в URL ===
def get_main_menu(user_id):
    url = f"{WEB_APP_URL}?user_id={user_id}"
    return ReplyKeyboardMarkup([
        [KeyboardButton("🎮 Играть", web_app=WebAppInfo(url=url))],
    ], resize_keyboard=True)

@flask_app.route('/api/create', methods=['POST'])
def api_create_character():
    data = request.get_json()
    user_id = data.get('user_id')
    name = data.get('name')
    race = data.get('race')
    cls = data.get('class')
    attributes = data.get('attributes')

    if not all([user_id, name, race, cls, attributes]):
        return jsonify({"error": "Missing data"}), 400

    # Создаём игрока с пустым инвентарём
    save_player(
        user_id=int(user_id),
        name=name,
        race=race,
        cls=cls,
        attributes=attributes,
        level=1,
        exp=0,
        gold=100,
        inventory={}
    )
    return jsonify({"success": True, "name": name})

# === Обработчики Telegram ===
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    first_name = update.effective_user.first_name

    # Всегда показываем кнопку "Играть", независимо от наличия персонажа
    url = f"{WEB_APP_URL}?user_id={user_id}"
    keyboard = [[KeyboardButton("🎮 Играть", web_app=WebAppInfo(url=url))]]

    await update.message.reply_text(
        f"🌟 Добро пожаловать, {first_name}!\n"
        "Нажми «Играть», чтобы начать приключение.\n"
        "Создание персонажа — прямо в игре!",
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    )

async def handle_webapp_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        raw_data = update.effective_message.web_app_data.data
        logger.info(f"Получены RAW данные: {raw_data}")

        data = json.loads(raw_data)
        action = data.get("action")
        user_id = update.effective_user.id

        if action == "create_character":
            name = data["name"]
            race = data["race"]
            cls = data["class"]
            attrs = data["attributes"]
            save_player(user_id, name, race, cls, attrs)

        elif action == "start_battle":
            monster = data["monster"]
            level = data["level"]
            player = get_player(user_id)
            if player:
                new_exp = player["exp"] + 50
                new_gold = player["gold"] + 30
                # Обнови exp и gold при необходимости
                save_player(
                    user_id=user_id,
                    name=player["name"],
                    race=player["race"],
                    cls=player["class"],
                    attributes=player["attributes"],
                    level=player["level"],
                    exp=new_exp,
                    gold=new_gold,
                    inventory=player["inventory"]
                )

        elif action == "upgrade_stat":
            stat = data["stat"]
            # Логика прокачки (можно добавить стоимость)

        elif action == "buy_item":
            item = data["item"]
            player = get_player(user_id)
            if not player:
                return  # ❌ Не можем купить — выходим

            prices = {"health_potion": 100, "mana_potion": 80}
            if player["gold"] < prices.get(item, 999):
                # Недостаточно денег — ничего не делаем
                return

            inventory = player["inventory"]
            inventory[item] = inventory.get(item, 0) + 1
            new_gold = player["gold"] - prices[item]

            save_player(
                user_id=user_id,
                name=player["name"],
                race=player["race"],
                cls=player["class"],
                attributes=player["attributes"],
                level=player["level"],
                exp=player["exp"],
                gold=new_gold,
                inventory=inventory
            )

        elif action == "use_item":
            item = data["item"]
            player = get_player(user_id)
            if not player or player["inventory"].get(item, 0) == 0:
                return  # ❌ Не можем использовать — выходим

            inventory = player["inventory"]
            inventory[item] -= 1
            if inventory[item] <= 0:
                del inventory[item]

            # Здесь можно начислить HP/MP при использовании
            save_player(
                user_id=user_id,
                name=player["name"],
                race=player["race"],
                cls=player["class"],
                attributes=player["attributes"],
                level=player["level"],
                exp=player["exp"],
                gold=player["gold"],
                inventory=inventory
            )

    except Exception as e:
        logger.error(f"Ошибка обработки WebApp данных: {e}")

@flask_app.route('/api/use_item', methods=['POST'])
def api_use_item():
    data = request.get_json()
    user_id = data.get('user_id')
    item = data.get('item')

    player = get_player(user_id)
    if not player or player['inventory'].get(item, 0) == 0:
        return jsonify({"error": "No item"}), 400

    inventory = player['inventory']
    inventory[item] -= 1
    if inventory[item] <= 0:
        del inventory[item]

    save_player(
        user_id=user_id,
        name=player['name'],
        race=player['race'],
        cls=player['class'],
        attributes=player['attributes'],
        level=player['level'],
        exp=player['exp'],
        gold=player['gold'],
        inventory=inventory
    )
    return jsonify({"success": True})

@flask_app.route('/api/battle_reward', methods=['POST'])
def api_battle_reward():
    data = request.get_json()
    user_id = data.get('user_id')
    exp = data.get('exp', 0)
    gold = data.get('gold', 0)

    player = get_player(user_id)
    if not player:
        return jsonify({"error": "Player not found"}), 400

    new_exp = player['exp'] + exp
    new_gold = player['gold'] + gold

    # Простая система уровней
    level = player['level']
    while new_exp >= level * 100:
        new_exp -= level * 100
        level += 1

    save_player(
        user_id=user_id,
        name=player['name'],
        race=player['race'],
        cls=player['class'],
        attributes=player['attributes'],
        level=level,
        exp=new_exp,
        gold=new_gold,
        inventory=player['inventory']
    )
    return jsonify({"success": True, "level": level})

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE):
    logger.error(f"Ошибка: {context.error}")

# === Запуск приложения ===
if __name__ == '__main__':
    init_db()

    # Запускаем Flask
    from threading import Thread
    Thread(target=run_flask, daemon=True).start()

    # Запуск Telegram бота
    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler('start', start))
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))
    application.add_error_handler(error_handler)

    print("🚀 Бот и Flask-сервер запущены!")
    print(f"Открой в браузере: {WEB_APP_URL}")

    if sys.version_info >= (3, 12):
        with asyncio.Runner() as runner:
            runner.run(application.run_polling())
    else:
        asyncio.run(application.run_polling())