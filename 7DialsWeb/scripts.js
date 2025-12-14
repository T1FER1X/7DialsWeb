// ====================================================================================
// НАСТРОЙКИ FIREBASE (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ВАШИМИ ДАННЫМИ!)
// ====================================================================================

const firebaseConfig = {
    apiKey: "AIzaSyC1FHjNtG0yLCzTAqHOiXiJBOQd7_kLOJM", // ЗАМЕНИТЕ НА СВОЙ
    authDomain: "web-84026.firebaseapp.com", // ЗАМЕНИТЕ НА СВОЙ
    databaseURL: "https://web-84026-default-rtdb.asia-southeast1.firebasedatabase.app", // ЗАМЕНИТЕ НА СВОЙ
    projectId: "web-84026", // ЗАМЕНИТЕ НА СВОЙ
    storageBucket: "web-84026.firebasestorage.app", // ЗАМЕНИТЕ НА СВОЙ
    messagingSenderId: "22249639918", // ЗАМЕНИТЕ НА СВОЙ
    appId: "1:22249639918:web:f804a6fe19d9e2c7f8c8ff" // ЗАМЕНИТЕ НА СВОЙ
};

// Инициализация Firebase
if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Глобальные переменные для пользователя и игры
let currentUserName = localStorage.getItem('7dials_username') || 'Гость';
let currentGameId = null;
let playerSymbol = null;
let isMyTurn = false;
let rpsPlayerScore = 0;
let rpsComputerScore = 0;
let reactionTimer;
let reactionTimeout;
let reactionStartTime;
let reactionBestTime = localStorage.getItem('reactionBestTime') || 'Н/Д';

// Обновление никнейма на главной и в чате при загрузке
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userName').value = currentUserName;
    document.getElementById('displayUserName').textContent = currentUserName;
    document.getElementById('reactionResult').innerHTML = `Лучшее время: ${reactionBestTime} ${reactionBestTime !== 'Н/Д' ? 'мс' : ''}`;
    
    // Загрузка чата
    loadChatMessages();
    
    // Инициализация навигации
    setupNavigation();
});

// ====================================================================================
// 1. УПРАВЛЕНИЕ НИКНЕЙМОМ
// ====================================================================================

window.setUserName = function() {
    const newName = document.getElementById('userName').value.trim();
    if (newName && newName.length >= 2) {
        currentUserName = newName;
        localStorage.setItem('7dials_username', currentUserName);
        document.getElementById('displayUserName').textContent = currentUserName;
        alert(`🥳 Никнейм успешно сохранен: ${currentUserName}`);
    } else {
        alert("Имя должно быть не менее 2 символов!");
    }
}

// ====================================================================================
// 2. НАВИГАЦИЯ (Sidebar)
// ====================================================================================

function setupNavigation() {
    const buttons = document.querySelectorAll('.sidebar button');
    const sections = document.querySelectorAll('.game-section');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');

            // Скрытие всех разделов
            sections.forEach(section => {
                section.classList.remove('active');
            });

            // Отображение целевого раздела
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }

            // Обновление активной кнопки
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// ====================================================================================
// 3. ОНЛАЙН ЧАТ (Firebase)
// ====================================================================================

const chatRef = database.ref('chat/messages');

function loadChatMessages() {
    chatRef.limitToLast(50).on('value', (snapshot) => {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.innerHTML = '';
        
        snapshot.forEach((childSnapshot) => {
            const msg = childSnapshot.val();
            const messageElement = document.createElement('p');
            
            // Форматирование времени
            const date = new Date(msg.timestamp);
            const timeString = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            // Стиль для сообщения
            messageElement.innerHTML = `[${timeString}] <strong style="color: ${msg.user === currentUserName ? '#ff00ff' : '#00ffff'};">${msg.user}</strong>: ${msg.text}`;
            chatWindow.appendChild(messageElement);
        });

        // Прокрутка вниз
        chatWindow.scrollTop = chatWindow.scrollHeight;
    });
}

window.sendMessage = function() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();

    if (messageText) {
        if (currentUserName === 'Гость') {
            alert('Сначала сохраните свой никнейм на Главной странице!');
            return;
        }

        const newMessage = {
            user: currentUserName,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        chatRef.push(newMessage);
        chatInput.value = ''; // Очистка поля ввода
    }
}

document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// ====================================================================================
// 4. ЛОКАЛЬНАЯ ИГРА: КАМЕНЬ/НОЖНИЦЫ
// ====================================================================================

window.playRPS = function(playerChoice) {
    const choices = ['rock', 'paper', 'scissors'];
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];
    let resultMessage = '';
    let resultClass = 'result';

    // Логика победы
    if (playerChoice === computerChoice) {
        resultMessage = `НИЧЬЯ! Обе стороны выбрали ${getRPSText(playerChoice)}.`;
        resultClass = 'result';
    } else if (
        (playerChoice === 'rock' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'rock') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
        rpsPlayerScore++;
        resultMessage = `ПОБЕДА! ${getRPSText(playerChoice)} бьет ${getRPSText(computerChoice)}.`;
        resultClass = 'result win';
    } else {
        rpsComputerScore++;
        resultMessage = `ПРОИГРЫШ! ${getRPSText(computerChoice)} бьет ${getRPSText(playerChoice)}.`;
        resultClass = 'result lose';
    }

    document.getElementById('rpsResult').className = resultClass;
    document.getElementById('rpsResult').innerHTML = `Счет: Игрок ${rpsPlayerScore} - Компьютер ${rpsComputerScore}<br>${resultMessage}`;
    document.getElementById('rpsLastMove').textContent = `Вы: ${getRPSText(playerChoice)}, Компьютер: ${getRPSText(computerChoice)}`;
}

function getRPSText(choice) {
    switch(choice) {
        case 'rock': return 'КАМЕНЬ 👊';
        case 'paper': return 'БУМАГА ✋';
        case 'scissors': return 'НОЖНИЦЫ ✌️';
        default: return '---';
    }
}

// ====================================================================================
// 5. ЛОКАЛЬНАЯ ИГРА: КЛИК-ТЕСТ
// ====================================================================================

const reactionStartButton = document.getElementById('reactionStartButton');
const reactionTarget = document.getElementById('reactionTarget');
const reactionResult = document.getElementById('reactionResult');

reactionStartButton.onclick = startReactionTest;
reactionTarget.onclick = handleReactionClick;

function startReactionTest() {
    reactionStartButton.disabled = true;
    reactionTarget.className = 'wait';
    reactionTarget.textContent = 'ЖДИ';
    reactionResult.textContent = 'Ожидание...';

    // Случайная задержка от 1 до 5 секунд
    const delay = Math.floor(Math.random() * 4000) + 1000;

    reactionTimeout = setTimeout(() => {
        reactionTarget.className = 'go';
        reactionTarget.textContent = 'КЛИКНИ!';
        reactionStartTime = performance.now();
    }, delay);
}

function handleReactionClick() {
    if (reactionTarget.classList.contains('wait')) {
        // Кликнули слишком рано
        clearTimeout(reactionTimeout);
        reactionTarget.className = 'fail';
        reactionTarget.textContent = 'СЛИШКОМ РАНО!';
        reactionResult.textContent = 'Начните заново!';
        reactionStartButton.disabled = false;
    } else if (reactionTarget.classList.contains('go')) {
        // Успешный клик
        const endTime = performance.now();
        const reactionTime = Math.round(endTime - reactionStartTime);

        // Обновление лучшего времени
        if (reactionBestTime === 'Н/Д' || reactionTime < parseInt(reactionBestTime)) {
            reactionBestTime = reactionTime.toString();
            localStorage.setItem('reactionBestTime', reactionBestTime);
        }

        reactionTarget.className = 'success';
        reactionTarget.textContent = 'УСПЕХ!';
        reactionResult.innerHTML = `Ваше время: <span style="color:#ffff00;">${reactionTime} мс</span>. Лучшее время: ${reactionBestTime} мс.`;
        reactionStartButton.disabled = false;
    }
    // Если класс 'fail' или 'success', ничего не делаем
}

// ====================================================================================
// 6. ОНЛАЙН КРЕСТИКИ-НОЛИКИ (Firebase) - ЛОББИ и УПРАВЛЕНИЕ
// ====================================================================================

// --- Функции ЛОББИ ---

window.createGame = function() {
    if (currentUserName === 'Гость') {
        alert('Сначала сохраните свой никнейм на Главной странице!');
        return;
    }
    
    // Создание нового ID комнаты
    currentGameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const gameRef = database.ref('games/' + currentGameId);

    // Структура новой игры
    const newGame = {
        id: currentGameId,
        player1: currentUserName,
        player2: null,
        board: Array(9).fill(null), // 3x3
        turn: 'X', // X ходит первым
        status: 'waiting', // waiting, playing, finished
        winner: null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    gameRef.set(newGame).then(() => {
        playerSymbol = 'X';
        updateGameStatus(`Комната создана! ID: ${currentGameId}. Ожидание игрока...`, 'X');
        listenToGameChanges(currentGameId);
    });
}

window.joinRandomGame = function() {
    if (currentUserName === 'Гость') {
        alert('Сначала сохраните свой никнейм на Главной странице!');
        return;
    }
    
    database.ref('games').orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Найдена ожидающая игра
            const gameData = snapshot.val();
            const foundGameId = Object.keys(gameData)[0];
            joinGame(foundGameId);
        } else {
            // Игр нет, создаем новую
            alert('Нет свободных игр. Создаем новую комнату...');
            createGame();
        }
    });
}

window.joinGameById = function() {
    const id = document.getElementById('gameIdInput').value.trim().toUpperCase();
    if (id) {
        joinGame(id);
    } else {
        alert('Введите ID комнаты!');
    }
}

function joinGame(gameId) {
    if (currentUserName === 'Гость') {
        alert('Сначала сохраните свой никнейм на Главной странице!');
        return;
    }

    const gameRef = database.ref('games/' + gameId);
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        if (game && game.status === 'waiting') {
            // Подключаемся как Игрок O
            gameRef.update({
                player2: currentUserName,
                status: 'playing'
            }).then(() => {
                currentGameId = gameId;
                playerSymbol = 'O';
                updateGameStatus(`Вы присоединились! ID: ${currentGameId}. Игра началась!`, 'O');
                listenToGameChanges(currentGameId);
            });
        } else if (game) {
            alert('Игра уже идет или завершена!');
        } else {
            alert('Комната не найдена!');
        }
    });
}

window.leaveGame = function() {
    if (currentGameId) {
        const gameRef = database.ref('games/' + currentGameId);
        // Удаляем игру из Firebase (или меняем статус на "отменена")
        gameRef.remove().then(() => {
            alert(`Игра ${currentGameId} покинута и удалена.`);
            currentGameId = null;
            playerSymbol = null;
            document.getElementById('gameArea').style.display = 'none';
            document.getElementById('lobbyControls').style.display = 'block';
            document.getElementById('currentGameInfo').textContent = 'Статус: Не в игре.';
            document.getElementById('tictactoe-board').innerHTML = '';
        });
    }
}

// --- УПРАВЛЕНИЕ ИГРОВОЙ ЛОГИКОЙ ---

function updateGameStatus(message, symbol) {
    const info = document.getElementById('currentGameInfo');
    const role = document.getElementById('playerRole');
    const lobby = document.getElementById('lobbyControls');
    const gameArea = document.getElementById('gameArea');

    info.textContent = message;
    role.textContent = `Вы играете за: ${symbol}`;
    lobby.style.display = 'none';
    gameArea.style.display = 'block';
}

function listenToGameChanges(gameId) {
    const gameRef = database.ref('games/' + gameId);
    
    // Отслеживание изменений
    gameRef.on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            // Игра была удалена
            document.getElementById('tictactoeResult').textContent = 'Игра завершена (комната удалена).';
            window.leaveGame();
            return;
        }

        // Обновление доски и статуса
        renderBoard(game.board, game.turn);
        updateGameDisplay(game);
    });
}

function updateGameDisplay(game) {
    const resultElement = document.getElementById('tictactoeResult');
    const isCurrentPlayerTurn = (game.turn === playerSymbol);
    isMyTurn = isCurrentPlayerTurn;

    if (game.status === 'waiting') {
        resultElement.textContent = 'Ожидание второго игрока...';
    } else if (game.status === 'playing') {
        const opponent = playerSymbol === 'X' ? game.player2 : game.player1;
        document.getElementById('currentGameInfo').textContent = `ID: ${game.id}. Соперник: ${opponent || '...ожидание'}`;
        if (isCurrentPlayerTurn) {
            resultElement.textContent = `ТВОЙ ХОД! (${game.turn})`;
            resultElement.style.color = '#ffff00';
        } else {
            resultElement.textContent = `Ход соперника... (${game.turn})`;
            resultElement.style.color = '#ff00ff';
        }
    } else if (game.status === 'finished') {
        if (game.winner === 'DRAW') {
            resultElement.textContent = 'НИЧЬЯ! Нажмите "Начать Заново".';
            resultElement.style.color = '#00ffff';
        } else if (game.winner === playerSymbol) {
            resultElement.textContent = '🎉 ПОБЕДА! 🎉 Нажмите "Начать Заново".';
            resultElement.style.color = '#00ff00';
        } else {
            resultElement.textContent = `😞 Поражение. Победил: ${game.winner}.`;
            resultElement.style.color = '#ff0000';
        }
    }
}

function renderBoard(board, currentTurn) {
    const boardElement = document.getElementById('tictactoe-board');
    boardElement.innerHTML = '';
    board.forEach((cellValue, index) => {
        const cell = document.createElement('div');
        cell.classList.add('tictactoe-cell');
        cell.textContent = cellValue || '';
        
        // Установка стиля для символа
        if (cellValue === 'X') {
            cell.style.color = '#ff0000'; // Красный для X
        } else if (cellValue === 'O') {
            cell.style.color = '#00ffff'; // Голубой для O
        }

        // Добавляем обработчик клика, если ход наш и ячейка пуста
        if (!cellValue && isMyTurn && currentGameId) {
            cell.classList.add('clickable');
            cell.onclick = () => makeMove(index);
        }

        boardElement.appendChild(cell);
    });
}

window.makeMove = function(index) {
    if (!isMyTurn || !currentGameId || document.getElementById('tictactoe-board').children[index].textContent !== '') {
        return; // Не наш ход, нет игры, или ячейка занята
    }

    const gameRef = database.ref('games/' + currentGameId);
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        if (game.status !== 'playing' || game.turn !== playerSymbol) return;

        // Делаем локальный ход
        game.board[index] = playerSymbol;
        
        // Проверяем статус игры
        const checkResult = checkGameStatus(game.board);

        let updates = {};
        if (checkResult.status === 'finished') {
            // Игра окончена (победа или ничья)
            updates = {
                board: game.board,
                status: 'finished',
                winner: checkResult.winner,
            };
        } else {
            // Передаем ход
            updates = {
                board: game.board,
                turn: playerSymbol === 'X' ? 'O' : 'X'
            };
        }

        gameRef.update(updates);
    });
}

function checkGameStatus(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]            // diagonals
    ];

    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { status: 'finished', winner: board[a] };
        }
    }

    if (board.every(cell => cell !== null)) {
        return { status: 'finished', winner: 'DRAW' };
    }

    return { status: 'playing', winner: null };
}

window.resetGame = function() {
    if (!currentGameId) return;

    const gameRef = database.ref('games/' + currentGameId);
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();

        if (game && game.player2) {
            // Сброс доски, смена игрока, который начинает
            const newTurn = game.turn === 'X' ? 'O' : 'X';
            gameRef.update({
                board: Array(9).fill(null),
                turn: 'X', // Всегда начинаем с X
                status: 'playing',
                winner: null
            });
        } else if (game) {
             alert('Нельзя начать заново, пока нет второго игрока!');
        }
    });
}

// ====================================================================================
// 7. МУЗЫКА
// ====================================================================================

// Здесь нужен аудио-элемент, который вы добавите в HTML, или который создадим тут.
const musicButton = document.getElementById('toggleMusicButton');
const audio = new Audio('path/to/your/retro_track.mp3'); // ЗАМЕНИТЕ НА СВОЙ ПУТЬ
audio.loop = true;
audio.volume = 0.5;

musicButton.onclick = function() {
    if (audio.paused) {
        audio.play().then(() => {
            musicButton.textContent = '🔇 Выкл. Музыку';
        }).catch(error => {
            console.log('Ошибка воспроизведения, возможно, браузер блокирует автозапуск.', error);
            alert('Чтобы включить музыку, пожалуйста, взаимодействуйте с сайтом (например, кликните еще раз)');
        });
    } else {
        audio.pause();
        musicButton.textContent = '🔊 Вкл. Музыку';
    }
}
