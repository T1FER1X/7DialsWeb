// ====================================================================================
// НАСТРОЙКИ FIREBASE (ОБЯЗАТЕЛЬНО ЗАМЕНИТЕ ВАШИМИ ДАННЫМИ!)
// ====================================================================================

const firebaseConfig = {
    apiKey: "AIzaSyC1FHjNtG0yLCzTAqHOiXiJBOQd7_kLOJM", // ВАШ КЛЮЧ
    authDomain: "web-84026.firebaseapp.com",
    databaseURL: "https://web-84026-default-rtdb.asia-southeast1.firebasedatabase.app", // ВАШ URL
    projectId: "web-84026",
    storageBucket: "web-84026.firebasestorage.app",
    messagingSenderId: "22249639918",
    appId: "1:22249639918:web:f804a6fe19d9e2c7f8c8ff"
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

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЗАЩИТЫ ОТ СПАМА
let lastMessageTime = 0;
const SPAM_DELAY_MS = 3000; // Минимальная задержка между сообщениями (3 секунды)

// --- ССЫЛКИ НА АУДИО ЭЛЕМЕНТЫ (НОВЫЕ) ---
let backgroundMusic;
let chatSound;
let clickSound;
let winSound;
let loseSound;
let musicButton; 

// Обновление никнейма на главной и в чате при загрузке
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('userName').value = currentUserName;
    document.getElementById('displayUserName').textContent = currentUserName;
    document.getElementById('reactionResult').innerHTML = `Лучшее время: ${reactionBestTime} ${reactionBestTime !== 'Н/Д' ? 'мс' : ''}`;
    
    // Загрузка чата
    loadChatMessages();
    
    // Инициализация навигации
    setupNavigation();

    // --- ИНИЦИАЛИЗАЦИЯ АУДИО (НОВОЕ) ---
    backgroundMusic = document.getElementById('backgroundMusic');
    chatSound = document.getElementById('chatSound');
    clickSound = document.getElementById('clickSound');
    winSound = document.getElementById('winSound');
    loseSound = document.getElementById('loseSound');
    musicButton = document.getElementById('toggleMusicButton');

    setupMusicControls(); // Вызов новой функции
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

// *** ФУНКЦИЯ ОТПРАВКИ: ДОБАВЛЕН ФИЛЬТР, ЗАЩИТА ОТ СПАМА И ЗВУК ***
window.sendMessage = function() {
    const chatInput = document.getElementById('chatInput');
    let messageText = chatInput.value.trim();

    // 1. ПРОВЕРКА НА СПАМ (ОГРАНИЧЕНИЕ СКОРОСТИ)
    const currentTime = Date.now();
    if (currentTime - lastMessageTime < SPAM_DELAY_MS) {
        alert(`❌ Защита от спама: подождите ${Math.ceil((SPAM_DELAY_MS - (currentTime - lastMessageTime)) / 1000)} сек. перед отправкой.`);
        return;
    }

    if (messageText) {
        if (currentUserName === 'Гость') {
            alert('Сначала сохраните свой никнейм на Главной странице!');
            return;
        }
        
        // 2. ФИЛЬТР ССЫЛОК
        const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9]+\.(com|net|org|ru|xyz))/gi;

        if (linkRegex.test(messageText)) {
            messageText = messageText.replace(linkRegex, '[ССЫЛКА ЗАБЛОКИРОВАНА]');
        }

        const newMessage = {
            user: currentUserName,
            text: messageText,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        // Отправка с обработкой ошибок
        chatRef.push(newMessage).then(() => {
            console.log("Сообщение успешно отправлено!");
            chatInput.value = ''; // Очистка поля ввода
            
            // >>> ЗВУК <<<
            playSound(chatSound);
            
            // 3. ОБНОВЛЕНИЕ ВРЕМЕНИ ПОСЛЕДНЕГО СООБЩЕНИЯ
            lastMessageTime = currentTime; 
            
        }).catch(error => {
            console.error("ОШИБКА FIREBASE ПРИ ОТПРАВКЕ:", error);
            alert(`Ошибка отправки! Проверьте консоль браузера (F12) и правила безопасности Firebase!`);
        });
    }
}
// *****************************************************************

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
    let soundToPlay = clickSound; // По умолчанию клик

    // Логика победы
    if (playerChoice === computerChoice) {
        resultMessage = `НИЧЬЯ! Обе стороны выбрали ${getRPSText(playerChoice)}.`;
        resultClass = 'result';
        soundToPlay = loseSound; // Ничья - как поражение (для простоты)
    } else if (
        (playerChoice === 'rock' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'rock') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
        rpsPlayerScore++;
        resultMessage = `ПОБЕДА! ${getRPSText(playerChoice)} бьет ${getRPSText(computerChoice)}.`;
        resultClass = 'result win';
        soundToPlay = winSound;
    } else {
        rpsComputerScore++;
        resultMessage = `ПРОИГРЫШ! ${getRPSText(computerChoice)} бьет ${getRPSText(playerChoice)}.`;
        resultClass = 'result lose';
        soundToPlay = loseSound;
    }
    
    playSound(soundToPlay); // Воспроизведение звука

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
    playSound(clickSound); // Звук при старте

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
        playSound(loseSound);
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
        playSound(winSound);
    }
    // Если класс 'fail' или 'success', ничего не делаем
}

// ====================================================================================
// 6. ОНЛАЙН КРЕСТИКИ-НОЛИКИ (Firebase) - ЛОББИ и УПРАВЛЕНИЕ
// ====================================================================================

// --- Функции ЛОББИ (ОСТАЛИСЬ БЕЗ ИЗМЕНЕНИЙ) ---
window.createGame = function() {
    if (currentUserName === 'Гость') {
        alert('Сначала сохраните свой никнейм на Главной странице!');
        return;
    }
    
    currentGameId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const gameRef = database.ref('games/' + currentGameId);

    const newGame = {
        id: currentGameId,
        player1: currentUserName,
        player2: null,
        board: Array(9).fill(null),
        turn: 'X',
        status: 'waiting',
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
            const gameData = snapshot.val();
            const foundGameId = Object.keys(gameData)[0];
            joinGame(foundGameId);
        } else {
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

// --- УПРАВЛЕНИЕ ИГРОВОЙ ЛОГИКОЙ: ДОБАВЛЕНЫ ЗВУКИ ---

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
    
    gameRef.on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            document.getElementById('tictactoeResult').textContent = 'Игра завершена (комната удалена).';
            window.leaveGame();
            return;
        }

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
            playSound(loseSound); // Звук ничьей
        } else if (game.winner === playerSymbol) {
            resultElement.textContent = '🎉 ПОБЕДА! 🎉 Нажмите "Начать Заново".';
            resultElement.style.color = '#00ff00';
            playSound(winSound); // Звук победы
        } else {
            resultElement.textContent = `😞 Поражение. Победил: ${game.winner}.`;
            resultElement.style.color = '#ff0000';
            playSound(loseSound); // Звук поражения
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
        
        if (cellValue === 'X') {
            cell.style.color = '#ff0000';
        } else if (cellValue === 'O') {
            cell.style.color = '#00ffff';
        }

        if (!cellValue && isMyTurn && currentGameId) {
            cell.classList.add('clickable');
            cell.onclick = () => makeMove(index);
        }

        boardElement.appendChild(cell);
    });
}

window.makeMove = function(index) {
    if (!isMyTurn || !currentGameId || document.getElementById('tictactoe-board').children[index].textContent !== '') {
        return;
    }

    const gameRef = database.ref('games/' + currentGameId);
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        if (game.status !== 'playing' || game.turn !== playerSymbol) return;

        game.board[index] = playerSymbol;
        
        const checkResult = checkGameStatus(game.board);

        let updates = {};
        if (checkResult.status === 'finished') {
            updates = {
                board: game.board,
                status: 'finished',
                winner: checkResult.winner,
            };
        } else {
            updates = {
                board: game.board,
                turn: playerSymbol === 'X' ? 'O' : 'X'
            };
        }

        gameRef.update(updates).then(() => {
            // >>> ЗВУК КЛИКА ПРИ УСПЕШНОМ ХОДЕ <<<
            playSound(clickSound);
        });
    });
}

function checkGameStatus(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
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
            gameRef.update({
                board: Array(9).fill(null),
                turn: 'X',
                status: 'playing',
                winner: null
            });
            playSound(clickSound); // Звук сброса
        } else if (game) {
             alert('Нельзя начать заново, пока нет второго игрока!');
        }
    });
}

// ====================================================================================
// 7. МУЗЫКА И ЗВУКИ (Обновленная секция)
// ====================================================================================

function setupMusicControls() {
    // Установка громкости по умолчанию
    if (backgroundMusic) backgroundMusic.volume = 0.5;
    if (chatSound) chatSound.volume = 0.8;
    if (clickSound) clickSound.volume = 0.8;
    if (winSound) winSound.volume = 0.8;
    if (loseSound) loseSound.volume = 0.8;

    if (musicButton && backgroundMusic) {
        musicButton.onclick = function() {
            if (backgroundMusic.paused) {
                // Пытаемся начать воспроизведение
                backgroundMusic.play().then(() => {
                    musicButton.textContent = '🔇 Выкл. Музыку';
                }).catch(error => {
                    // Браузер заблокировал автозапуск
                    console.error('Ошибка воспроизведения (блокировка браузером).', error);
                    alert('Для включения музыки необходимо однократное действие пользователя.');
                });
            } else {
                backgroundMusic.pause();
                musicButton.textContent = '🔊 Вкл. Музыку';
            }
        }
    }
}

// Вспомогательная функция для проигрывания звуков
window.playSound = function(audioElement) {
    if (audioElement) {
        // Сброс и проигрывание (важно для быстро повторяющихся звуков)
        audioElement.currentTime = 0;
        audioElement.play().catch(e => {
            // Обычно, это происходит, если браузер блокирует медиа до взаимодействия
            console.log('Не удалось воспроизвести звук:', e);
        });
    }
}
