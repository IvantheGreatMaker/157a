


CREATE TABLE League (
leagueID INTEGER PRIMARY KEY,
name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE User (
Username VARCHAR(25) PRIMARY KEY,
email VARCHAR(50) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL CHECK (LENGTH(password) >= 8)
);

CREATE TABLE Season (
seasonID INTEGER PRIMARY KEY, 
start_date DATE NOT NULL,
end_date DATE NOT NULL,
leagueID INTEGER NOT NULL,
FOREIGN KEY (leagueID) REFERENCES League(leagueID)
);
CREATE TABLE Stadium (
stadiumID INTEGER PRIMARY KEY,
name VARCHAR(100) NOT NULL UNIQUE,
address VARCHAR(200) NOT NULL,
YearFounded INTEGER,
maxCapacity INTEGER
);

CREATE TABLE Team (
teamID INTEGER PRIMARY KEY,
name VARCHAR(100) NOT NULL UNIQUE,
stadiumID INTEGER,
FOREIGN KEY (stadiumID) REFERENCES Stadium(stadiumID) ON DELETE SET NULL
);

CREATE TABLE Match (
matchID INTEGER PRIMARY KEY,
matchTime TIME NOT NULL,
matchDate DATE NOT NULL,
home_teamID INTEGER NOT NULL,
away_teamID INTEGER NOT NULL,
seasonID INTEGER NOT NULL,
FOREIGN KEY (home_teamID) REFERENCES Team(teamID),
FOREIGN KEY (away_teamID) REFERENCES Team(teamID),
FOREIGN KEY (seasonID) REFERENCES Season(seasonID),
CONSTRAINT different_teams CHECK (home_teamID != away_teamID),
INDEX indexMatchSeason (seasonID),
INDEX indexMatchDate (matchDate)
);
CREATE TABLE Goal (
matchID INTEGER,
minute INTEGER,
second INTEGER,
teamID INTEGER NOT NULL,
PRIMARY KEY (matchID, minute, second),
FOREIGN KEY (matchID) REFERENCES Match(matchID) ON DELETE CASCADE,
FOREIGN KEY (teamID) REFERENCES Team(teamID),
CONSTRAINT valid_minute CHECK (minute >= 0 AND minute <= 120), 
CONSTRAINT valid_second CHECK (second >= 0 AND second < 60)
);
CREATE TABLE Vote (
Username VARCHAR(25),
matchID INTEGER,
HomeWin BOOLEAN NOT NULL,
time TIME NOT NULL,
PRIMARY KEY (Username, matchID),
FOREIGN KEY (Username) REFERENCES User(Username) ON DELETE CASCADE,
FOREIGN KEY (matchID) REFERENCES Match(matchID) ON DELETE CASCADE
);
CREATE TABLE Article (
articleID INTEGER PRIMARY KEY,
title VARCHAR(200) NOT NULL,
content TEXT NOT NULL,
date DATE NOT NULL,
matchID INTEGER NOT NULL,
Username VARCHAR(25) NOT NULL,
FOREIGN KEY (matchID) REFERENCES Match(matchID) ON DELETE CASCADE,
FOREIGN KEY (Username) REFERENCES User(Username) ON DELETE CASCADE,
INDEX idx_article_match (matchID)
);

CREATE TABLE Comment (
commentID INTEGER PRIMARY KEY,
date DATE NOT NULL,
information TEXT NOT NULL,
matchID INTEGER NOT NULL,
Username VARCHAR(25) NOT NULL,
FOREIGN KEY (matchID) REFERENCES Match(matchID) ON DELETE CASCADE,
FOREIGN KEY (Username) REFERENCES User(Username) ON DELETE CASCADE
);
CREATE TABLE User_Team_Follows (
Username VARCHAR(25),
teamID INTEGER,
PRIMARY KEY (Username, teamID),
FOREIGN KEY (Username) REFERENCES User(Username) ON DELETE CASCADE,
FOREIGN KEY (teamID) REFERENCES Team(teamID) ON DELETE CASCADE
);




INSERT INTO League (leagueID, name) VALUES
(1, 'League 1'),
(2, 'League 2');

INSERT INTO User (Username, email, password) VALUES
('user1', 'user1@example.com', 'password123'),
('user2', 'user2@example.com', 'password123'),
('user3', 'user3@example.com', 'password123'),
('user4', 'user4@example.com', 'password123'),
('user5', 'user5@example.com', 'password123'),
('user6', 'user6@example.com', 'password123');

INSERT INTO Season (seasonID, start_date, end_date, leagueID) VALUES
(1, '2025-12-01', '2025-12-31', 1),
(2, '2025-12-01', '2025-12-31', 2);

INSERT INTO Stadium (stadiumID, name, address, YearFounded, maxCapacity) VALUES
(1, 'Stadium 1', 'Address 1', 1900, 50000),
(2, 'Stadium 2', 'Address 2', 1901, 50000),
(3, 'Stadium 3', 'Address 3', 1902, 50000),
(4, 'Stadium 4', 'Address 4', 1903, 50000),
(5, 'Stadium 5', 'Address 5', 1904, 50000),
(6, 'Stadium 6', 'Address 6', 1905, 50000),
(7, 'Stadium 7', 'Address 7', 1906, 50000),
(8, 'Stadium 8', 'Address 8', 1907, 50000);

INSERT INTO Team (teamID, name, stadiumID) VALUES
(1, 'Team 1', 1),
(2, 'Team 2', 2),
(3, 'Team 3', 3),
(4, 'Team 4', 4),
(5, 'Team 5', 5),
(6, 'Team 6', 6),
(7, 'Team 7', 7),
(8, 'Team 8', 8);

INSERT INTO Match (matchID, matchTime, matchDate, home_teamID, away_teamID, seasonID) VALUES
(1, '15:00:00', '2025-12-01', 1, 2, 1),
(2, '15:00:00', '2025-12-01', 3, 4, 1),
(3, '15:00:00', '2025-12-02', 5, 6, 2),
(4, '15:00:00', '2025-12-02', 7, 8, 2),
(5, '15:00:00', '2025-12-03', 2, 3, 1),
(6, '15:00:00', '2025-12-03', 4, 1, 1),
(7, '15:00:00', '2025-12-04', 6, 7, 2),
(8, '15:00:00', '2025-12-04', 8, 5, 2),
(9, '15:00:00', '2025-12-05', 1, 3, 1),
(10, '15:00:00', '2025-12-05', 5, 7, 2);

INSERT INTO Goal (matchID, minute, second, teamID) VALUES
(1, 5, 30, 1),
(1, 10, 30, 2),
(1, 15, 30, 1),
(2, 5, 30, 3),
(2, 10, 30, 4),
(2, 15, 30, 3),
(3, 5, 30, 5),
(3, 10, 30, 6),
(3, 15, 30, 5),
(4, 5, 30, 7),
(4, 10, 30, 8),
(5, 5, 30, 2),
(5, 10, 30, 3),
(6, 5, 30, 4),
(7, 5, 30, 6),
(8, 5, 30, 8),
(9, 5, 30, 1),
(10, 5, 30, 5);

INSERT INTO Vote (Username, matchID, HomeWin, time) VALUES
('user1', 1, TRUE, '10:00:00'),
('user2', 1, FALSE, '10:00:00'),
('user3', 3, TRUE, '10:00:00'),
('user4', 3, FALSE, '10:00:00'),
('user5', 9, TRUE, '10:00:00'),
('user6', 10, TRUE, '10:00:00');

INSERT INTO Article (articleID, title, content, date, matchID, Username) VALUES
(1, 'Article 1', 'Talking about the game 1', '2025-12-01', 1, 'user1'),
(2, 'Article 2', 'Talking about the game 3', '2025-12-02', 3, 'user2'),
(3, 'Article 3', 'Talking about the game 5.', '2025-12-03', 5, 'user3');

INSERT INTO Comment (commentID, date, information, matchID, Username) VALUES
(1, '2025-12-01', 'Comment 1', 1, 'user1'),
(2, '2025-12-01', 'Comment 2', 1, 'user2'),
(3, '2025-12-01', 'Comment 3', 2, 'user3'),
(4, '2025-12-02', 'Comment 4', 3, 'user4'),
(5, '2025-12-02', 'Comment 5', 4, 'user5'),
(6, '2025-12-03', 'Comment 6', 5, 'user6'),
(7, '2025-12-03', 'Comment 7', 6, 'user1'),
(8, '2025-12-04', 'Comment 8', 7, 'user2'),
(9, '2025-12-05', 'Comment 9', 9, 'user3');

INSERT INTO User_Team_Follows (Username, teamID) VALUES
('user1', 1),
('user1', 5),
('user2', 2),
('user3', 3),
('user4', 5),
('user5', 6),
('user6', 7);
