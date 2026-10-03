from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import uuid
import os

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)

DB_FILE = 'contacts.db'

FIELDS = [
    "first_name", "last_name", "display_name", "nickname",
    "primary_email", "secondary_email", "screen_name",
    "work_phone", "home_phone", "fax_number", "pager_number", "mobile_number",
    "home_address", "home_address_2", "home_city", "home_state", "home_zipcode", "home_country",
    "work_address", "work_address_2", "work_city", "work_state", "work_zipcode", "work_country",
    "job_title", "department", "organization",
    "web_page_1", "web_page_2",
    "birth_year", "birth_month", "birth_day",
    "custom_1", "custom_2", "custom_3", "custom_4", "notes"
]

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    columns_sql = ",\n    ".join([f"{field} TEXT" for field in FIELDS])
    c.execute(f'''
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            {columns_sql}
        )
    ''')
    conn.commit()
    conn.close()

init_db()


@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/contacts', methods=['GET'])
def get_contacts():
    conn = get_db_connection()
    contacts = conn.execute('SELECT * FROM contacts').fetchall()
    conn.close()
    return jsonify([dict(ix) for ix in contacts])

@app.route('/contacts', methods=['POST'])
def add_contact():
    data = request.json
    contact_id = data.get('id', str(uuid.uuid4()))

    conn = get_db_connection()
    columns = ['id'] + FIELDS
    placeholders = ', '.join(['?'] * len(columns))

    values = [contact_id]
    for field in FIELDS:
        values.append(data.get(field, ''))

    conn.execute(
        f'INSERT INTO contacts ({", ".join(columns)}) VALUES ({placeholders})',
        values
    )
    conn.commit()
    conn.close()

    return jsonify({'id': contact_id}), 201

@app.route('/contacts/batch', methods=['POST'])
def add_contacts_batch():
    data = request.json
    if not isinstance(data, list):
        return jsonify({'error': 'Expected a list of contacts'}), 400

    conn = get_db_connection()
    c = conn.cursor()
    columns = ['id'] + FIELDS
    placeholders = ', '.join(['?'] * len(columns))

    for contact_data in data:
        contact_id = contact_data.get('id', str(uuid.uuid4()))
        values = [contact_id]
        for field in FIELDS:
            values.append(contact_data.get(field, ''))

        c.execute(
            f'INSERT INTO contacts ({", ".join(columns)}) VALUES ({placeholders})',
            values
        )

    conn.commit()
    conn.close()
    return jsonify({'message': f'Added {len(data)} contacts'}), 201

@app.route('/contacts/<id>', methods=['PUT'])
def update_contact(id):
    data = request.json

    set_clause = ', '.join([f"{field} = ?" for field in FIELDS])
    values = [data.get(field, '') for field in FIELDS]
    values.append(id)

    conn = get_db_connection()
    conn.execute(
        f'UPDATE contacts SET {set_clause} WHERE id = ?',
        values
    )
    conn.commit()
    conn.close()

    return jsonify({'message': 'Contact updated'})

@app.route('/contacts/<id>', methods=['DELETE'])
def delete_contact(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM contacts WHERE id = ?', (id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Contact deleted'})

@app.route('/contacts/batch', methods=['DELETE'])
def delete_contacts_batch():
    data = request.json
    ids = data.get('ids', [])

    if not ids:
        return jsonify({'error': 'No ids provided'}), 400

    conn = get_db_connection()
    placeholders = ', '.join(['?'] * len(ids))
    conn.execute(f'DELETE FROM contacts WHERE id IN ({placeholders})', ids)
    conn.commit()
    conn.close()

    return jsonify({'message': f'Deleted {len(ids)} contacts'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
