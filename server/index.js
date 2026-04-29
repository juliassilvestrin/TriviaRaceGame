const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();


app.use(cors());


app.get('/health', (req, res) => {
    res.status(200).send('OK');
});


app.use(express.static(path.join(__dirname, 'public')));


const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Trivia Race server running on port ${PORT}`);
    console.log(`Server is ready, Open http://localhost:${PORT} in your browser.`);
});


const wss = new WebSocket.WebSocketServer({ server });


let players = [];
let gameInProgress = false;
let currentQuestion = null;
let questionTimeout = null;
let currentAnswersCount = 0;
let usedQuestionIndices = new Set();
const raceTrackLength = 10;


const triviaQuestions = [
    {
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: 2
    },
    {
        question: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correctAnswer: 1
    },
    {
        question: "What is the largest mammal?",
        options: ["Elephant", "Giraffe", "Blue Whale", "Polar Bear"],
        correctAnswer: 2
    },
    {
        question: "Which element has the chemical symbol 'O'?",
        options: ["Gold", "Oxygen", "Osmium", "Oganesson"],
        correctAnswer: 1
    },
    {
        question: "In which year did World War II end?",
        options: ["1943", "1944", "1945", "1946"],
        correctAnswer: 2
    },
    {
        question: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
        correctAnswer: 2
    },
    {
        question: "Which country has the largest population?",
        options: ["USA", "India", "China", "Russia"],
        correctAnswer: 2
    },
    {
        question: "What is the largest organ in the human body?",
        options: ["Heart", "Brain", "Liver", "Skin"],
        correctAnswer: 3
    },
    {
        question: "How many sides does a hexagon have?",
        options: ["5", "6", "7", "8"],
        correctAnswer: 1
    },
    {
        question: "Which of these is not a primary color?",
        options: ["Red", "Blue", "Green", "Yellow"],
        correctAnswer: 2
    },
    {
        question: "Who wrote 'Romeo and Juliet'?",
        options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
        correctAnswer: 1
    },
    {
        question: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correctAnswer: 2
    },
    {
        question: "Which ocean is the largest?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correctAnswer: 3
    },
    {
        question: "How many bones are in the adult human body?",
        options: ["206", "186", "216", "246"],
        correctAnswer: 0
    },
    {
        question: "What is the capital of Japan?",
        options: ["Beijing", "Seoul", "Tokyo", "Bangkok"],
        correctAnswer: 2
    },
    {
        question: "Which planet is closest to the Sun?",
        options: ["Venus", "Mercury", "Earth", "Mars"],
        correctAnswer: 1
    },
    {
        question: "What is the tallest mountain in the world?",
        options: ["K2", "Mount Kilimanjaro", "Mount Everest", "Mount Fuji"],
        correctAnswer: 2
    },
    {
        question: "Which element is represented by the symbol 'Fe'?",
        options: ["Iron", "Fluorine", "Francium", "Fermium"],
        correctAnswer: 0
    },
    {
        question: "In which year did the Titanic sink?",
        options: ["1905", "1912", "1920", "1931"],
        correctAnswer: 1
    },
    {
        question: "Who is known as the father of modern physics?",
        options: ["Isaac Newton", "Albert Einstein", "Galileo Galilei", "Nikola Tesla"],
        correctAnswer: 1
    },
    {
        question: "What's the smallest country in the world?",
        options: ["Monaco", "Malta", "Vatican City", "San Marino"],
        correctAnswer: 2
    },
    {
        question: "Which animal is known as the 'King of the Jungle'?",
        options: ["Elephant", "Tiger", "Lion", "Gorilla"],
        correctAnswer: 2
    },
    {
        question: "How many continents are there?",
        options: ["5", "6", "7", "8"],
        correctAnswer: 2
    },
    {
        question: "Who painted 'Starry Night'?",
        options: ["Vincent van Gogh", "Pablo Picasso", "Claude Monet", "Leonardo da Vinci"],
        correctAnswer: 0
    },
    {
        question: "What is the largest desert in the world?",
        options: ["Sahara Desert", "Gobi Desert", "Arabian Desert", "Antarctic Desert"],
        correctAnswer: 3
    },
    {
        question: "Which planet has the most moons?",
        options: ["Earth", "Jupiter", "Saturn", "Neptune"],
        correctAnswer: 1
    },
    {
        question: "What's the hardest natural substance on Earth?",
        options: ["Titanium", "Platinum", "Steel", "Diamond"],
        correctAnswer: 3
    },
    {
        question: "What year was the first iPhone released?",
        options: ["2005", "2007", "2009", "2010"],
        correctAnswer: 1
    },
    {
        question: "Which country invented tea?",
        options: ["India", "England", "China", "Japan"],
        correctAnswer: 2
    },
    {
        question: "Who discovered penicillin?",
        options: ["Alexander Fleming", "Marie Curie", "Louis Pasteur", "Joseph Lister"],
        correctAnswer: 0
    },
    {
        question: "What's the capital of Australia?",
        options: ["Sydney", "Melbourne", "Canberra", "Perth"],
        correctAnswer: 2
    },
    {
        question: "Which planet is known as the 'Morning Star'?",
        options: ["Mars", "Jupiter", "Venus", "Mercury"],
        correctAnswer: 2
    },
    {
        question: "What is the most spoken language in the world?",
        options: ["English", "Spanish", "Hindi", "Mandarin Chinese"],
        correctAnswer: 3
    },
    {
        question: "Who wrote 'To Kill a Mockingbird'?",
        options: ["J.K. Rowling", "Harper Lee", "Stephen King", "Ernest Hemingway"],
        correctAnswer: 1
    },
    {
        question: "What's the currency of Japan?",
        options: ["Yuan", "Won", "Yen", "Ringgit"],
        correctAnswer: 2
    },
    {
        question: "How many teeth does an adult human have?",
        options: ["28", "30", "32", "36"],
        correctAnswer: 2
    },
    {
        question: "What is the chemical symbol for silver?",
        options: ["Si", "Sv", "Sl", "Ag"],
        correctAnswer: 3
    },
    {
        question: "Which is the largest species of shark?",
        options: ["Great White Shark", "Hammerhead Shark", "Whale Shark", "Tiger Shark"],
        correctAnswer: 2
    },
    {
        question: "In computing, what does CPU stand for?",
        options: ["Central Processing Unit", "Computer Personal Unit", "Central Processor Unit", "Control Processing Unit"],
        correctAnswer: 0
    },
    {
        question: "Which gas do plants absorb from the atmosphere?",
        options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
        correctAnswer: 2
    },
    {
        question: "What is the largest bird in the world?",
        options: ["Eagle", "Condor", "Ostrich", "Albatross"],
        correctAnswer: 2
    },
    {
        question: "Who is the author of 'Harry Potter' series?",
        options: ["Stephen King", "J.R.R. Tolkien", "J.K. Rowling", "George R.R. Martin"],
        correctAnswer: 2
    },
    {
        question: "What is the smallest prime number?",
        options: ["0", "1", "2", "3"],
        correctAnswer: 2
    },
    {
        question: "In what year did World War I begin?",
        options: ["1912", "1914", "1916", "1918"],
        correctAnswer: 1
    },
    {
        question: "Which is the longest river in the world?",
        options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
        correctAnswer: 1
    }
];

function getRandomQuestion() {

    if (usedQuestionIndices.size >= triviaQuestions.length) {
        usedQuestionIndices.clear();
        console.log("All questions have been used, resetting the question pool");
    }


    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * triviaQuestions.length);
    } while (usedQuestionIndices.has(randomIndex));


    usedQuestionIndices.add(randomIndex);
    console.log(`Using question #${randomIndex}, ${usedQuestionIndices.size}/${triviaQuestions.length} used`);

    return triviaQuestions[randomIndex];
}


function broadcast(data) {
    wss.clients.forEach(function (client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}


function sendNewQuestion() {
    currentQuestion = getRandomQuestion();
    currentAnswersCount = 0;

    broadcast({
        action: 'newQuestion',
        question: currentQuestion.question,
        options: currentQuestion.options
    });

    clearTimeout(questionTimeout);
    questionTimeout = setTimeout(() => {
        broadcast({
            action: 'questionTimeout',
            correctAnswer: currentQuestion.correctAnswer,
            correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer]
        });

        setTimeout(sendNewQuestion, 5000);
    }, 15000);
}


function checkAllPlayersReady() {

    if (players.length === 0) return false;


    return players.every(player => player.ready);
}


function checkWinner() {
    for (let player of players) {
        if (player.position >= raceTrackLength) {
            gameInProgress = false;
            clearTimeout(questionTimeout);
            broadcast({
                action: 'gameOver',
                winner: player.name
            });

            setTimeout(resetGame, 10000);
            return true;
        }
    }
    return false;
}

function resetGame() {
    for (let player of players) {
        player.position = 0;
        player.ready = false;
    }

    broadcast({
        action: 'resetGame',
        players: players.map(p => ({
            id: p.id,
            name: p.name,
            position: p.position,
            color: p.color,
            ready: p.ready
        }))
    });

    gameInProgress = false;
    currentQuestion = null;
    currentAnswersCount = 0;
    clearTimeout(questionTimeout);
}

wss.on('connection', function connection(ws) {
    console.log("New player connected!");


    const playerId = Date.now().toString();


    ws.send(JSON.stringify({
        action: 'welcome',
        playerId: playerId,
        gameInProgress: gameInProgress
    }));


    ws.on('message', function (data) {
        try {
            const message = JSON.parse(data);

            switch (message.action) {
                case 'joinGame':

                    const colorIsUsed = players.some(p => p.color === message.playerColor);


                    let finalColor = message.playerColor;
                    if (colorIsUsed) {
                        const usedColors = players.map(p => p.color);
                        const availableColors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"]
                            .filter(color => !usedColors.includes(color));

                        if (availableColors.length > 0) {
                            finalColor = availableColors[0];
                        }
                    }

                    const newPlayer = {
                        id: playerId,
                        name: message.playerName,
                        color: finalColor,
                        position: 0,
                        ready: false,
                        socket: ws
                    };

                    players.push(newPlayer);
                    console.log(`Player ${message.playerName} joined the game (color: ${finalColor})`);


                    broadcast({
                        action: 'playerList',
                        players: players.map(p => ({
                            id: p.id,
                            name: p.name,
                            position: p.position,
                            color: p.color,
                            ready: p.ready
                        }))
                    });
                    break;

                case 'playerReady':

                    const playerToReady = players.find(p => p.id === message.playerId);
                    if (playerToReady) {
                        playerToReady.ready = true;
                        console.log(`Player ${playerToReady.name} is ready!`);


                        broadcast({
                            action: 'playerList',
                            players: players.map(p => ({
                                id: p.id,
                                name: p.name,
                                position: p.position,
                                color: p.color,
                                ready: p.ready
                            }))
                        });

                        //check if everyone is ready
                        if (players.length >= 2 && checkAllPlayersReady() && !gameInProgress) {
                            gameInProgress = true;
                            setTimeout(sendNewQuestion, 3000);

                            broadcast({
                                action: 'gameStarting',
                                countdown: 3
                            });
                        }
                    }
                    break;

                case 'submitAnswer':
                    const player = players.find(p => p.id === message.playerId);
                    if (!player) return;

                    currentAnswersCount++;

                    if (currentQuestion && message.answerIndex === currentQuestion.correctAnswer) {
                        player.position++;

                        ws.send(JSON.stringify({
                            action: 'correctAnswer',
                            correctAnswer: currentQuestion.correctAnswer,
                            correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer]
                        }));

                        broadcast({
                            action: 'playerAdvanced',
                            playerId: player.id,
                            newPosition: player.position
                        });

                        const gameOver = checkWinner();
                        if (gameOver) break;
                    } else if (currentQuestion) {
                        ws.send(JSON.stringify({
                            action: 'wrongAnswer',
                            correctAnswer: currentQuestion.correctAnswer,
                            correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer]
                        }));
                    }

                    if (currentAnswersCount >= players.length) {
                        clearTimeout(questionTimeout);
                        setTimeout(sendNewQuestion, 2000);
                    }
                    break;

                case 'resetGame':
                    const playerToReset = players.find(p => p.id === message.playerId);
                    if (playerToReset) {
                        playerToReset.position = 0;
                        playerToReset.ready = false;

                        broadcast({
                            action: 'playerList',
                            players: players.map(p => ({
                                id: p.id,
                                name: p.name,
                                position: p.position,
                                color: p.color,
                                ready: p.ready
                            }))
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });


    ws.on('close', function () {
        const index = players.findIndex(p => p.socket === ws);
        if (index !== -1) {
            const playerName = players[index].name;
            console.log(`Player ${playerName} disconnected`);
            players.splice(index, 1);


            broadcast({
                action: 'playerList',
                players: players.map(p => ({
                    id: p.id,
                    name: p.name,
                    position: p.position,
                    color: p.color,
                    ready: p.ready
                }))
            });


            if (players.length < 2 && gameInProgress) {
                gameInProgress = false;
                clearTimeout(questionTimeout);

                broadcast({
                    action: 'gameEnded',
                    reason: 'Not enough players'
                });
            }
        }
    });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});