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

function initDatabase(callback) {
    const db = new sqlite3.Database(dbPath);
    
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Match'", (err, matchTable) => {
        if (err || !matchTable) {
            console.log('Missing tables detected. Running full schema...');
            runSchemaFile(db, callback);
        } else {
            db.get("SELECT COUNT(*) as count FROM User", (err, countRow) => {
                if (err || !countRow || countRow.count === 0) {
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
    const statements = sql.split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.match(/^\s*$/));
    
    db.serialize(() => {
        let index = 0;
        let hasError = false;
        
        function runNext() {
            if (index >= statements.length) {
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
                    if (!err.message.includes('already exists') && 
                        !err.message.includes('UNIQUE constraint') &&
                        !err.message.includes('duplicate column name')) {
                        console.error(`SQL error:`, err.message);
                        hasError = true;
                    }
                }
                runNext();
            });
        }
        
        runNext();
    });
}

let db;

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

app.post('/api/login', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username, passwordLength: password?.length });
    
    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required' });
    }
    
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
        
        if (userRow.password === password) {
            console.log('Login successful for:', username);
            res.json({ success: true, username: userRow.Username });
        } else {
            console.log('Password mismatch for:', username);
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
});

app.get('/api/matches', (req, res) => {
    if (!db) {
        return res.status(503).json({ error: 'Database not ready' });
    }
    
    const username = req.query.username || null;
    
    const query = `
        SELECT m.matchID, m.matchDate, m.home_teamID, m.away_teamID,
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
        
        if (username) {
            db.all('SELECT matchID, HomeWin FROM Vote WHERE Username = ?', [username], (voteErr, votes) => {
                if (voteErr) {
                    console.error('Vote query error:', voteErr);
                    return res.json({ matches: rows || [] });
                }
                
                db.all('SELECT teamID FROM User_Team_Follows WHERE Username = ?', [username], (favErr, favorites) => {
                    if (favErr) {
                        console.error('Favorite query error:', favErr);
                        return res.json({ matches: rows || [] });
                    }
                    
                    const favoriteTeamIDs = favorites.map(f => f.teamID);
                    const voteMap = {};
                    votes.forEach(v => {
                        voteMap[v.matchID] = v.HomeWin === 1;
                    });
                    
                    rows.forEach(match => {
                        match.userVote = voteMap[match.matchID] !== undefined ? voteMap[match.matchID] : null;
                        match.homeTeamFavorite = favoriteTeamIDs.includes(match.home_teamID);
                        match.awayTeamFavorite = favoriteTeamIDs.includes(match.away_teamID);
                    });
                    
                    res.json({ matches: rows || [] });
                });
            });
        } else {
            res.json({ matches: rows || [] });
        }
    });
});

app.post('/api/vote', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, matchID, homeWin } = req.body;
    
    console.log('Vote request:', { username, matchID, homeWin });
    
    if (!username || !matchID || homeWin === undefined) {
        return res.json({ success: false, message: 'Username, matchID, and homeWin are required' });
    }
    
    const time = new Date().toTimeString().split(' ')[0];
    
    db.run('INSERT OR REPLACE INTO Vote (Username, matchID, HomeWin, time) VALUES (?, ?, ?, ?)',
        [username, parseInt(matchID), homeWin ? 1 : 0, time],
        (err) => {
            if (err) {
                console.error('Vote error:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            console.log('Vote saved successfully');
            res.json({ success: true });
        }
    );
});

app.post('/api/favorite-team', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, teamID } = req.body;
    
    console.log('Favorite team request:', { username, teamID });
    
    if (!username || !teamID) {
        return res.json({ success: false, message: 'Username and teamID are required' });
    }
    
    db.run('INSERT OR IGNORE INTO User_Team_Follows (Username, teamID) VALUES (?, ?)',
        [username, parseInt(teamID)],
        (err) => {
            if (err) {
                console.error('Favorite team error:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            console.log('Favorite team saved successfully');
            res.json({ success: true });
        }
    );
});

app.delete('/api/favorite-team', (req, res) => {
    if (!db) {
        return res.status(503).json({ success: false, message: 'Database not ready' });
    }
    
    const { username, teamID } = req.body;
    
    console.log('Remove favorite request:', { username, teamID });
    
    if (!username || !teamID) {
        return res.json({ success: false, message: 'Username and teamID are required' });
    }
    
    db.run('DELETE FROM User_Team_Follows WHERE Username = ? AND teamID = ?',
        [username, parseInt(teamID)],
        (err) => {
            if (err) {
                console.error('Remove favorite error:', err);
                return res.status(500).json({ success: false, message: err.message });
            }
            console.log('Favorite team removed successfully');
            res.json({ success: true });
        }
    );
});

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