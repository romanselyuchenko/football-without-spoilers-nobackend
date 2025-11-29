from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
import requests
from datetime import datetime, timedelta, timezone
from data import my_api_key
import json

app = Flask(__name__, static_url_path='', static_folder='.')
CORS(app)

API_KEY = my_api_key
URL = "https://v3.football.api-sports.io/fixtures"

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/api/matches', methods=['GET'])
def get_matches_api():
    # Получаем дату из параметров запроса или используем сегодняшнюю дату
    selected_date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    matches = get_matches(selected_date, API_KEY)
    
    # Преобразуем данные в формат, подходящий для нашего фронтенда
    formatted_leagues = {}
    
    for match in matches:
        league = match['league']
        
        # Фильтруем только АПЛ, Ла Лигу и Лигу Чемпионов
        if not ((league['name'].lower() == "premier league" and league['country'].lower() == "england") or
                (league['name'].lower() == "la liga" and league['country'].lower() == "spain") or
                (league['name'].lower() == "uefa champions league" and league['country'].lower() == "world")):
            continue
            
        league_name = f"{league['name']} ({league['country']})"
        
        if league_name not in formatted_leagues:
            formatted_leagues[league_name] = {
                "leagueName": league_name,
                "matches": []
            }
            
        match_info = {
            "homeTeam": match['teams']['home']['name'],
            "awayTeam": match['teams']['away']['name'],
            "score": format_score(match),
            "timeInfo": format_time_info(match['fixture'])
        }
        
        formatted_leagues[league_name]["matches"].append(match_info)
    
    return jsonify(list(formatted_leagues.values()))

def get_matches(date, api_key):
    headers = {
        "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        "x-rapidapi-key": api_key
    }
    querystring = {"date": date, "status": "FT"}
    response = requests.get(URL, headers=headers, params=querystring)
    data = response.json()

    # Записываем данные в файл matches.json
    with open('matches.json', 'w') as json_file:
        json.dump(data, json_file, indent=4)  # Записываем данные в формате JSON с отступами

    return data.get('response', [])

def format_time_info(fixture):
    match_start = datetime.fromisoformat(fixture['date'].replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)

    if fixture['status']['long'].lower() != "match finished":
        minutes_played = (now - match_start).seconds // 60
        return f"Match ongoing for {minutes_played} minutes"
    else:
        match_end = match_start + timedelta(minutes=fixture['status'].get('elapsed', 90))
        if match_end.date() == now.date():
            minutes_ago = (now - match_end).seconds // 60
            return f"Match finished {minutes_ago} minutes ago"
        else:
            return f"Date: {match_start.strftime('%Y-%m-%d')}"

def format_score(match):
    status = match['fixture']['status']['long']
    if status.lower() == "match finished":
        home_score = match['goals']['home']
        away_score = match['goals']['away']
        return {
            'display': 'Finished',
            'score': f"{home_score}-{away_score}"
        }
    else:
        return {
            'display': '?',
            'score': '?'
        }

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(debug=True)
