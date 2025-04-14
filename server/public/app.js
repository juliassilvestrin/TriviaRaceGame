Vue.createApp({
    data: function () {
        return {
            socket: null,
            playerId: null,
            playerName: "",
            playerColor: "#3498db",
            availableColors: ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"],
            usedColors: [], // Track colors that are already in use
            gameState: "login", // login, waiting, playing, gameOver
            players: [],
            currentQuestion: null,
            questionOptions: [],
            countdown: 0,
            selectedAnswer: null,
            answerResult: null,
            timeLeft: 15,
            timerInterval: null,
            winner: null,
            countdownMessage: "",
            errorMessage: "",
            raceTrackLength: 5,
            connectionStatus: "disconnected" // disconnected, connecting, connected
        };
    },

    methods: {
        connectSocket: function () {
            this.connectionStatus = "connecting";

            // Dynamically determine WebSocket URL based on current protocol and host
            const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
            const wsUrl = wsProtocol + window.location.host;

            console.log(`Connecting to WebSocket server at ${wsUrl}`);
            this.socket = new WebSocket(wsUrl);

            this.socket.addEventListener("open", () => {
                console.log("Connected to WebSocket server");
                this.connectionStatus = "connected";
            });

            this.socket.addEventListener("message", message => {
                this.handleSocketMessage(message);
            });

            this.socket.addEventListener("close", () => {
                console.log("Disconnected from server");
                this.connectionStatus = "disconnected";

                // Try to reconnect after 3 seconds
                setTimeout(this.connectSocket, 3000);
            });

            this.socket.addEventListener("error", (error) => {
                console.error("WebSocket error:", error);
                this.connectionStatus = "disconnected";
            });
        },

        handleSocketMessage: function (message) {
            console.log("Message received:", message.data);
            const data = JSON.parse(message.data);

            switch (data.action) {
                case 'welcome':
                    this.playerId = data.playerId;
                    break;

                case 'playerList':
                    this.players = data.players;

                    // Update used colors based on the player list
                    this.usedColors = this.players.map(player => player.color);

                    // If current player's selected color is already used, pick the first available color
                    if (this.usedColors.includes(this.playerColor) && this.gameState === "login") {
                        const availableColor = this.availableColors.find(color => !this.usedColors.includes(color));
                        if (availableColor) {
                            this.playerColor = availableColor;
                        }
                    }
                    break;

                case 'gameStarting':
                    this.gameState = "playing";
                    this.countdown = data.countdown;
                    this.countdownMessage = `Race starting in ${this.countdown}...`;

                    // Start countdown
                    const countdownInterval = setInterval(() => {
                        this.countdown--;
                        this.countdownMessage = `Race starting in ${this.countdown}...`;
                        if (this.countdown <= 0) {
                            clearInterval(countdownInterval);
                            this.countdownMessage = "GO! GO! GO!";

                            // Clear the "GO!" message after 1.5 seconds
                            setTimeout(() => {
                                this.countdownMessage = "";
                            }, 1500);
                        }
                    }, 1000);
                    break;

                case 'newQuestion':
                    this.currentQuestion = data.question;
                    this.questionOptions = data.options;
                    this.selectedAnswer = null;
                    this.answerResult = null;
                    this.timeLeft = 15;

                    // Start timer
                    clearInterval(this.timerInterval);
                    this.timerInterval = setInterval(() => {
                        this.timeLeft--;
                        if (this.timeLeft <= 0) {
                            clearInterval(this.timerInterval);
                        }
                    }, 1000);
                    break;

                case 'questionTimeout':
                    clearInterval(this.timerInterval);
                    this.answerResult = {
                        correct: false,
                        correctAnswerIndex: data.correctAnswer,
                        correctAnswerText: data.correctAnswerText
                    };
                    break;

                case 'wrongAnswer':
                    clearInterval(this.timerInterval);
                    this.answerResult = {
                        correct: false,
                        correctAnswerIndex: data.correctAnswer,
                        correctAnswerText: data.correctAnswerText
                    };
                    break;

                case 'correctAnswer':
                    clearInterval(this.timerInterval);
                    this.answerResult = {
                        correct: true,
                        correctAnswerIndex: data.correctAnswer,
                        correctAnswerText: data.correctAnswerText
                    };
                    break;

                case 'playerAdvanced':
                    const player = this.players.find(p => p.id === data.playerId);
                    if (player) {
                        player.position = data.newPosition;

                        // Add a short animation for the advancing player
                        const playerElem = document.querySelector(`.player-marker[data-name="${player.name}"]`);
                        if (playerElem) {
                            playerElem.classList.add('advancing');
                            setTimeout(() => {
                                playerElem.classList.remove('advancing');
                            }, 800);
                        }
                    }
                    break;

                case 'gameOver':
                    this.gameState = "gameOver";
                    this.winner = data.winner;
                    clearInterval(this.timerInterval);
                    break;

                case 'resetGame':
                    this.players = data.players;
                    this.gameState = "waiting";
                    this.currentQuestion = null;
                    this.selectedAnswer = null;
                    this.answerResult = null;
                    this.winner = null;
                    clearInterval(this.timerInterval);
                    break;

                case 'gameEnded':
                    this.gameState = "waiting";
                    this.countdownMessage = data.reason;
                    setTimeout(() => {
                        this.countdownMessage = "";
                    }, 3000);
                    clearInterval(this.timerInterval);
                    break;
            }
        },

        joinGame: function () {
            if (!this.playerName.trim()) {
                this.errorMessage = "Please enter your name";
                return;
            }

            this.errorMessage = "";
            this.gameState = "waiting";

            this.socket.send(JSON.stringify({
                action: 'joinGame',
                playerName: this.playerName,
                playerColor: this.playerColor
            }));
        },

        submitAnswer: function (answerIndex) {
            if (this.selectedAnswer !== null || this.answerResult !== null) {
                return; // Already answered
            }

            this.selectedAnswer = answerIndex;

            // Stop the timer for this player while they wait for others
            clearInterval(this.timerInterval);

            this.socket.send(JSON.stringify({
                action: 'submitAnswer',
                playerId: this.playerId,
                answerIndex: answerIndex
            }));
        },

        getAnswerClass: function (index) {
            if (this.answerResult !== null) {
                if (index === this.answerResult.correctAnswerIndex) {
                    return 'correct-answer';
                } else if (index === this.selectedAnswer && !this.answerResult.correct) {
                    return 'wrong-answer';
                }
            } else if (index === this.selectedAnswer) {
                return 'selected-answer';
            }
            return '';
        },

        getPlayerPositionStyle: function (position) {
            // Calculate starting position (5% from left edge)
            const startPosition = 5;

            // Calculate finish position (95% from left edge)
            const finishPosition = 95;

            // Calculate the total distance to travel
            const totalDistance = finishPosition - startPosition;

            // Calculate the current position as a percentage of the total distance
            const currentPercentage = position / this.raceTrackLength;

            // Calculate the actual left position
            const leftPosition = startPosition + (totalDistance * currentPercentage);

            return {
                left: `${leftPosition}%`
            };
        },

        returnToLobby: function () {
            // Reset player data
            this.playerName = "";
            this.playerColor = "#3498db";
            this.selectedAnswer = null;
            this.answerResult = null;
            this.currentQuestion = null;

            // Change game state to login
            this.gameState = "login";

            // Clear any previous errors
            this.errorMessage = "";

            // Reconnect to server to get a fresh connection
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            this.connectSocket();
        }
    },

    created: function () {
        console.log("Trivia Race App loaded!");
        this.connectSocket();
    }
}).mount("#app");