const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const dbPath = './database.db';

// Initialize database
function initDatabase(callback) {
    const db = new sqlite3.Database(dbPath);
    
    // Check if Match table exists (if it exists, all tables should exist)
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Match'", (err, matchTable) => {
        if (err || !matchTable) {
            // Match table doesn't exist - run full schema to create all tables
            console.log('Missing tables detected. Running full schema...');
            runSchemaFile(db, callback);
        } else {
            // All tables exist, check if we have data
            db.get("SELECT COUNT(*) as count FROM User", (err, countRow) => {
                if (err || !countRow || countRow.count === 0) {
                    // Tables exist but no users, insert data only
                    console.log('Tables exist but empty. Inserting data...');
                    insertDataOnly(db, callback);
                } else {
                    console.log(`Database ready with ${countRow.count} users`);
                    callback(null, db);
                }
            });
        }
    });
}

function insertDataOnly(db, callback) {
    const sql = fs.readFileSync('./database.sql', 'utf8');
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.toUpperCase().startsWith('INSERT'));
    
    db.serialize(() => {
        let index = 0;
        
        function runNext() {
            if (index >= statements.length) {
                db.get("SELECT COUNT(*) as count FROM User", (err, row) => {
                    if (err || !row || row.count === 0) {
                        db.close();
                        return callback(new Error('Failed to insert data'));
                    }
                    console.log(`Data inserted successfully with ${row.count} users`);
                    callback(null, db);
                });
                return;
            }
            
            const stmt = statements[index++];
            db.run(stmt, (err) => {
                if (err && !err.message.includes('UNIQUE constraint')) {
                    console.error('Insert error:', err.message);
                }
                runNext();
            });
        }
        
        runNext();
    });
}

function runSchemaFile(db, callback) {
    const sql = fs.readFileSync('./database.sql', 'utf8');
    // Split by semicolon and filter out empty statements
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.match(/^\s*$/));
    
    db.serialize(() => {
        let index = 0;
        let hasError = false;
        
        function runNext() {
            if (index >= statements.length) {
                // All statements executed, verify we have users
                db.get("SELECT COUNT(*) as count FROM User", (err, row) => {
                    if (err) {
                        db.close();
                        return callback(new Error('Failed to verify database'));
                    }
                    if (row.count === 0) {
                        db.close();
                        return callback(new Error('Database initialization failed - no users found'));
                    }
                    console.log(`Database initialized successfully with ${row.count} users`);
                    callback(null, db);
                });
                return;
            }
            
            const stmt = statements[index++];
            db.run(stmt, (err) => {
                if (err) {
                    // Ignore "already exists" errors (tables/constraints already exist)
                    // Ignore "UNIQUE constraint" errors (data already inserted)
                    if (!err.message.includes('already exists') && 
                        !err.message.includes('UNIQUE constraint') &&
                        !err.message.includes('duplicate column name')) {
                        console.error(`SQL error:`, err.message);
                        hasError = true;
                    }
                }
                // Continue with next statement regardless
                runNext();
            });
        }
        
        runNext();
    });
}

let db;

// Test endpoint to check database
app.get('/api/test', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not ready' });
    }
    db.all('SELECT Username, email FROM User LIMIT 5', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ users: rows });
    });
});

// Register endpoint
app.post('/api/register', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.json({ success: false, message: 'Username, email, and password are required' });
    }
    
    if (password.length < 8) {
        return res.json({ success: false, message: 'Password must be at least 8 characters long' });
    }
    
    db.run('INSERT INTO User (Username, email, password) VALUES (?, ?, ?)', 
        [username, email, password], 
        (err) => {
            if (err) {
                if (err.message.includes('UNIQUE constraint') || err.message.includes('duplicate')) {
                    if (err.message.includes('Username')) {
                        return res.json({ success: false, message: 'Username already exists' });
                    } else if (err.message.includes('email')) {
                        return res.json({ success: false, message: 'Email already exists' });
                    }
                }
                console.error('Registration error:', err);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            console.log('Account created successfully for:', username);
            res.json({ success: true, username: username });
        }
    );
});

// Login endpoint
app.post('/api/login', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, passwordLength: password?.length });
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required' });
    }
    
    // First check if user exists
    db.get('SELECT * FROM User WHERE Username = ?', [username], (err, userRow) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        
        if (!userRow) {
            console.log('User not found:', username);
            return res.json({ success: false, message: 'Invalid username or password' });
        }
        
        console.log('User found:', { username: userRow.Username, storedPassword: userRow.password });
        
        // Check password
        if (userRow.password === password) {
            console.log('Login successful for:', username);
            res.json({ success: true, username: userRow.Username });
        } else {
            console.log('Password mismatch for:', username);
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
});

// Matches endpoint
app.get('/api/matches', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not ready' });
    }
    
    const query = `
        SELECT m.matchID, m.matchDate, 
               ht.name as homeTeam, at.name as awayTeam,
               (SELECT COUNT(*) FROM Goal WHERE matchID = m.matchID AND teamID = m.home_teamID) as homeScore,
               (SELECT COUNT(*) FROM Goal WHERE matchID = m.matchID AND teamID = m.away_teamID) as awayScore
        FROM Match m
        JOIN Team ht ON m.home_teamID = ht.teamID
        JOIN Team at ON m.away_teamID = at.teamID
        ORDER BY m.matchDate
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Matches query error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ matches: rows || [] });
    });
});

// Initialize database and start server
initDatabase((err, database) => {
    if (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
    db = database;
    
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});

