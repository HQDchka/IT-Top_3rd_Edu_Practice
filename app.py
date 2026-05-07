import os
import sqlite3
import hashlib
import secrets
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, session, g, send_from_directory
from flask_cors import CORS
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True
CORS(app, supports_credentials=True)

EMAIL_ADDRESS = os.getenv('EMAIL', 'daniilgaponov05@gmail.com')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD', 'yrld rnfw qhwp zgne')
DATABASE = 'support.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        cursor = db.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS replies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_from_support INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        admin_pass = hashlib.sha256('admin123'.encode()).hexdigest()
        cursor.execute('INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                      ('admin', admin_pass, 'admin@support.com', 'admin'))
        
        specialist_pass = hashlib.sha256('spec123'.encode()).hexdigest()
        cursor.execute('INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                      ('specialist', specialist_pass, 'spec@support.com', 'specialist'))
        
        # Добавим тестового пользователя если нет
        test_pass = hashlib.sha256('user123'.encode()).hexdigest()
        cursor.execute('INSERT OR IGNORE INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                      ('testuser', test_pass, 'test@test.com', 'user'))
        
        db.commit()

def send_email(to_email, subject, message_text):
    try:
        smtp_server = smtplib.SMTP("smtp.gmail.com", 587)
        smtp_server.starttls()
        smtp_server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        
        msg = MIMEMultipart()
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = to_email
        msg["Subject"] = subject
        
        msg.attach(MIMEText(message_text, "plain"))
        smtp_server.sendmail(EMAIL_ADDRESS, to_email, msg.as_string())
        smtp_server.quit()
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Unauthorized'}), 401
            if session.get('role') not in roles:
                return jsonify({'error': 'Forbidden'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# Статические страницы
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/login.html')
def login_page():
    return send_from_directory('static', 'login.html')

@app.route('/admin')
@login_required
@role_required(['admin', 'specialist'])
def admin_panel():
    return send_from_directory('static', 'admin.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# API: Регистрация
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    if not all([username, password, email]):
        return jsonify({'error': 'Все поля обязательны'}), 400
    
    if len(password) < 4:
        return jsonify({'error': 'Пароль минимум 4 символа'}), 400
    
    db = get_db()
    hashed = hashlib.sha256(password.encode()).hexdigest()
    
    try:
        db.execute('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                  (username, hashed, email, 'user'))
        db.commit()
        return jsonify({'message': 'Регистрация успешна'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Логин или email уже существуют'}), 400

# API: Вход
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    db = get_db()
    hashed = hashlib.sha256(password.encode()).hexdigest()
    user = db.execute('SELECT id, username, email, role FROM users WHERE username = ? AND password = ?',
                     (username, hashed)).fetchone()
    
    if user:
        session.clear()
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        session['email'] = user['email']
        return jsonify({'message': 'OK', 'role': user['role']}), 200
    return jsonify({'error': 'Неверный логин или пароль'}), 401

# API: Выход
@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'message': 'OK'}), 200

# API: Текущий пользователь
@app.route('/api/user', methods=['GET'])
@login_required
def get_user():
    return jsonify({
        'id': session['user_id'],
        'username': session['username'],
        'role': session['role'],
        'email': session['email']
    }), 200

# API: Обращения пользователя
@app.route('/api/tickets', methods=['GET'])
@login_required
def get_user_tickets():
    db = get_db()
    tickets = db.execute('''
        SELECT t.*, 
               (SELECT COUNT(*) FROM replies WHERE ticket_id = t.id AND is_from_support = 1) as support_replies
        FROM tickets t 
        WHERE t.user_id = ? 
        ORDER BY t.created_at DESC
    ''', (session['user_id'],)).fetchall()
    return jsonify([dict(t) for t in tickets]), 200

@app.route('/api/tickets', methods=['POST'])
@login_required
def create_ticket():
    data = request.json
    name = data.get('name')
    subject = data.get('subject')
    message = data.get('message')
    
    if not all([name, subject, message]):
        return jsonify({'error': 'Заполните все поля'}), 400
    
    db = get_db()
    cursor = db.execute('''
        INSERT INTO tickets (user_id, name, subject, message, status)
        VALUES (?, ?, ?, ?, ?)
    ''', (session['user_id'], name, subject, message, 'open'))
    db.commit()
    
    ticket_id = cursor.lastrowid
    
    send_email(
        session['email'],
        f"Обращение #{ticket_id} создано",
        f"Здравствуйте, {session['username']}!\n\nВаше обращение принято.\nТема: {subject}\n\nСпециалист ответит в ближайшее время."
    )
    
    return jsonify({'id': ticket_id, 'message': 'OK'}), 201

@app.route('/api/tickets/<int:ticket_id>/replies', methods=['GET'])
@login_required
def get_ticket_replies(ticket_id):
    db = get_db()
    ticket = db.execute('SELECT user_id FROM tickets WHERE id = ?', (ticket_id,)).fetchone()
    
    if not ticket or ticket['user_id'] != session['user_id']:
        return jsonify({'error': 'Нет доступа'}), 403
    
    replies = db.execute('''
        SELECT r.*, u.username, u.role
        FROM replies r
        JOIN users u ON r.user_id = u.id
        WHERE r.ticket_id = ?
        ORDER BY r.created_at ASC
    ''', (ticket_id,)).fetchall()
    
    return jsonify([dict(r) for r in replies]), 200

@app.route('/api/tickets/<int:ticket_id>/replies', methods=['POST'])
@login_required
def add_user_reply(ticket_id):
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Введите сообщение'}), 400
    
    db = get_db()
    ticket = db.execute('SELECT user_id, subject FROM tickets WHERE id = ?', (ticket_id,)).fetchone()
    
    if not ticket or ticket['user_id'] != session['user_id']:
        return jsonify({'error': 'Нет доступа'}), 403
    
    db.execute('''
        INSERT INTO replies (ticket_id, user_id, message, is_from_support)
        VALUES (?, ?, ?, ?)
    ''', (ticket_id, session['user_id'], message, 0))
    db.commit()
    
    admins = db.execute('SELECT email FROM users WHERE role IN ("admin", "specialist")').fetchall()
    for admin in admins:
        send_email(
            admin['email'],
            f"Новое сообщение в обращении #{ticket_id}",
            f"Пользователь {session['username']} добавил сообщение:\n\n{message}"
        )
    
    return jsonify({'message': 'OK'}), 201

# ============= АДМИНСКИЕ ЭНДПОИНТЫ =============

@app.route('/api/admin/tickets', methods=['GET'])
@login_required
@role_required(['admin', 'specialist'])
def admin_get_tickets():
    db = get_db()
    tickets = db.execute('''
        SELECT t.*, u.username, u.email
        FROM tickets t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
    ''').fetchall()
    return jsonify([dict(t) for t in tickets]), 200

@app.route('/api/admin/tickets/<int:ticket_id>/replies', methods=['GET'])
@login_required
@role_required(['admin', 'specialist'])
def admin_get_replies(ticket_id):
    db = get_db()
    replies = db.execute('''
        SELECT r.*, u.username, u.role
        FROM replies r
        JOIN users u ON r.user_id = u.id
        WHERE r.ticket_id = ?
        ORDER BY r.created_at ASC
    ''', (ticket_id,)).fetchall()
    return jsonify([dict(r) for r in replies]), 200

@app.route('/api/admin/tickets/<int:ticket_id>/reply', methods=['POST'])
@login_required
@role_required(['admin', 'specialist'])
def admin_reply_ticket(ticket_id):
    data = request.json
    message = data.get('message')
    
    if not message:
        return jsonify({'error': 'Введите сообщение'}), 400
    
    db = get_db()
    ticket = db.execute('SELECT user_id, subject FROM tickets WHERE id = ?', (ticket_id,)).fetchone()
    
    if not ticket:
        return jsonify({'error': 'Обращение не найдено'}), 404
    
    db.execute('''
        INSERT INTO replies (ticket_id, user_id, message, is_from_support)
        VALUES (?, ?, ?, ?)
    ''', (ticket_id, session['user_id'], message, 1))
    db.commit()
    
    db.execute('UPDATE tickets SET status = "in_progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?', (ticket_id,))
    db.commit()
    
    user = db.execute('SELECT email, username FROM users WHERE id = ?', (ticket['user_id'],)).fetchone()
    send_email(
        user['email'],
        f"Ответ на обращение #{ticket_id}",
        f"Здравствуйте, {user['username']}!\n\nНовый ответ от поддержки:\n\n{message}"
    )
    
    return jsonify({'message': 'OK'}), 201

@app.route('/api/admin/tickets/<int:ticket_id>/close', methods=['PUT'])
@login_required
@role_required(['admin', 'specialist'])
def admin_close_ticket(ticket_id):
    db = get_db()
    db.execute('UPDATE tickets SET status = "closed", updated_at = CURRENT_TIMESTAMP WHERE id = ?', (ticket_id,))
    db.commit()
    return jsonify({'message': 'OK'}), 200

@app.route('/api/admin/stats', methods=['GET'])
@login_required
@role_required(['admin', 'specialist'])
def admin_get_stats():
    db = get_db()
    total = db.execute('SELECT COUNT(*) as count FROM tickets').fetchone()['count']
    open_tickets = db.execute('SELECT COUNT(*) as count FROM tickets WHERE status = "open"').fetchone()['count']
    in_progress = db.execute('SELECT COUNT(*) as count FROM tickets WHERE status = "in_progress"').fetchone()['count']
    closed = db.execute('SELECT COUNT(*) as count FROM tickets WHERE status = "closed"').fetchone()['count']
    
    return jsonify({
        'total': total or 0,
        'open': open_tickets or 0,
        'in_progress': in_progress or 0,
        'closed': closed or 0
    }), 200

@app.route('/api/admin/users', methods=['GET'])
@login_required
@role_required(['admin'])
def admin_get_users():
    db = get_db()
    users = db.execute('SELECT id, username, email, role, created_at FROM users').fetchall()
    return jsonify([dict(u) for u in users]), 200

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@login_required
@role_required(['admin'])
def admin_change_role(user_id):
    data = request.json
    role = data.get('role')
    
    if role not in ['user', 'specialist', 'admin']:
        return jsonify({'error': 'Неверная роль'}), 400
    
    if user_id == session['user_id']:
        return jsonify({'error': 'Нельзя изменить свою роль'}), 400
    
    db = get_db()
    db.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
    db.commit()
    
    return jsonify({'message': 'OK'}), 200

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@login_required
@role_required(['admin'])
def admin_delete_user(user_id):
    if user_id == session['user_id']:
        return jsonify({'error': 'Нельзя удалить себя'}), 400
    
    db = get_db()
    tickets = db.execute('SELECT COUNT(*) as count FROM tickets WHERE user_id = ?', (user_id,)).fetchone()
    if tickets['count'] > 0:
        return jsonify({'error': 'У пользователя есть обращения'}), 400
    
    db.execute('DELETE FROM users WHERE id = ?', (user_id,))
    db.commit()
    
    return jsonify({'message': 'OK'}), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)