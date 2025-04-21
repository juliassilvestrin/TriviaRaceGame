Vue.createApp({
    data: function () {
        return {
            socket: null,
            playerId: null,
            playerName: "",
            playerColor: "#3498db",
            availableColors: ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"],
            usedColors: [],
            gameState: "login",
            isReady: false,
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
            raceTrackLength: 10,
            connectionStatus: "disconnected"
        };
    },

    methods: {
        connectSocket: function () {
            this.connectionStatus = "connecting";

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


                    this.usedColors = this.players
                        .filter(player => player.id !== this.playerId)
                        .map(player => player.color);


                    if (this.usedColors.includes(this.playerColor) && this.gameState === "login") {
                        const availableColor = this.availableColors.find(color => !this.usedColors.includes(color));
                        if (availableColor) {
                            this.playerColor = availableColor;
                        }
                    }


                    const currentPlayer = this.players.find(p => p.id === this.playerId);
                    if (currentPlayer) {
                        this.isReady = currentPlayer.ready;
                    }
                    break;

                case 'gameStarting':
                    this.gameState = "playing";
                    this.countdown = data.countdown;
                    this.countdownMessage = `Race starting in ${this.countdown}...`;

                    // starts countdown
                    const countdownInterval = setInterval(() => {
                        this.countdown--;
                        this.countdownMessage = `Race starting in ${this.countdown}...`;
                        if (this.countdown <= 0) {
                            clearInterval(countdownInterval);
                            this.countdownMessage = "GO! GO! GO!";


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

                    //start timer
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
                    this.isReady = false;
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

        toggleReady: function () {
            if (this.isReady) return;

            this.isReady = true;

            this.socket.send(JSON.stringify({
                action: 'playerReady',
                playerId: this.playerId
            }));
        },

        submitAnswer: function (answerIndex) {
            if (this.selectedAnswer !== null || this.answerResult !== null) {
                return;
            }

            this.selectedAnswer = answerIndex;


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

            const startPosition = 5;

            const finishPosition = 95;


            const totalDistance = finishPosition - startPosition;


            const currentPercentage = position / this.raceTrackLength;


            const leftPosition = startPosition + (totalDistance * currentPercentage);

            return {
                left: `${leftPosition}%`
            };
        },

        returnToLobby: function () {
            //reset player data
            this.playerName = "";
            this.playerColor = "#3498db";
            this.selectedAnswer = null;
            this.answerResult = null;
            this.currentQuestion = null;
            this.isReady = false;

            this.gameState = "login";


            this.errorMessage = "";


            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close();
            }
            this.connectSocket();
        }
    },

    created: function () {
        console.log("trivia race app loaded");
        this.connectSocket();
    }
}).mount("#app");