const PORT = process.env.PORT || 8000;
let express = require('express');
let http = require('http');
let path = require('path');
let socketIO = require('socket.io');
let app = express();
let server = http.Server(app);
let io = socketIO(server);
let bp = require('body-parser');
let sizeOf = require('image-size');

app.use(express.static(__dirname + '/client'));
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});
server.listen(PORT, function() {
    console.log('Server listening on 8000 . . .');
});

// define game objects and their params (like image width & height)
let entities = {
    players: [],
    coins: [{ x: 300, y: 400 }, { x: 1000, y: 450 }, { x: 800, y: 900 }, { x: 700, y: 600 }]
};
let images = { coinImage: {}, playerImage: {} };

sizeOf("client/assets/coin.png", (err, dimensions) => {
    images.coinImage = { width: dimensions.width, height: dimensions.height };
});
sizeOf("client/assets/car.png", (err, dimensions) => {
    images.playerImage = { width: dimensions.width, height: dimensions.height }
});

// connect socket and calculate any events
io.on('connection', (socket) => {
    socket.on('new player', (username) => {
        entities.players.push({
            id: socket.id,
            name: username,
            score: 0,
            x: 200,
            y: 200,
            angle: 0,
            velocity: 0
        });
    });

    // if client says that someone is driving
    socket.on('move', (keysDown) => {
        let player = entities.players.find((player) => player.id === socket.id);
        if (typeof player !== "undefined") {
            if (player.velocity > 0.1 || player.velocity < -0.1) {
                player.y -= player.velocity * Math.cos(player.angle * Math.PI / 180);
                player.x += player.velocity * Math.sin(player.angle * Math.PI / 180);
                if (player.x > 1280) {
                    player.x = 1279;
                }
                if (player.x < 0) {
                    player.x = 1;
                }
                if (player.y > 720) {
                    player.y = 719;
                }
                if (player.y < 0) {
                    player.y = 1;
                }
            }

            if (38 in keysDown) { // Player is holding up key
                player["increase1"] = setInterval(() => {
                    player.velocity < 4 && (player.velocity += 0.02);
                }, 10);
            } else {
                if (typeof player["increase1"] !== 'undefined') {
                    clearInterval(player["increase1"]);
                }
                player["decrease2"] = setInterval(() => {
                    player.velocity > 0 && (player.velocity -= 0.05);
                }, 10);
                if (player.velocity <= 0.05) {
                    if (typeof player["decrease2"] !== 'undefined') {
                        clearInterval(player["decrease2"]);
                    }
                }
            }
            if (40 in keysDown) { // Player is holding down key
                player["decrease1"] = setInterval(() => {
                    player.velocity > -4 && (player.velocity -= 0.02);
                }, 10);
            } else {
                if (typeof player["decrease1"] !== 'undefined') {
                    clearInterval(player["decrease1"]);
                }
                if (player.velocity)
                    player["increase2"] = setInterval(() => {
                        player.velocity < 0 && (player.velocity += 0.05);
                    }, 10);
                if (player.velocity >= 0.05) {
                    if (typeof player["increase2"] !== 'undefined') {
                        clearInterval(player["increase2"]);
                    }
                }
            }
            if (37 in keysDown) { // Player is holding left key
                player.angle -= 2;
            }
            if (39 in keysDown) { // Player is holding right key
                player.angle += 2;
            }

            for (let player of entities.players) {
                for (let coin of entities.coins) {
                    let playerCoords = { x: player.x - images.playerImage.width / 2, y: player.y - images.playerImage.height / 2, x1: player.x + images.playerImage.width / 2, y1: player.y + images.playerImage.height / 2  };
                    let coinCoords = { x: coin.x, y: coin.y, x1: coin.x + images.coinImage.width, y1: coin.y + images.coinImage.height };

                    // algorithm src https://xdan.ru/how-to-check-intersect-two-rectangles.html
                    if ((((playerCoords.x >= coinCoords.x && playerCoords.x<=coinCoords.x1) || (playerCoords.x1 >= coinCoords.x && playerCoords.x1 <= coinCoords.x1))
                            && ((playerCoords.y >= coinCoords.y && playerCoords.y <= coinCoords.y1 ) || (playerCoords.y1 >= coinCoords.y && playerCoords.y1 <= coinCoords.y1)))
                        || (((coinCoords.x >= playerCoords.x && coinCoords.x <= playerCoords.x1 ) || (coinCoords.x1 >= playerCoords.x && coinCoords.x1 <= playerCoords.x1))
                            && ((coinCoords.y >= playerCoords.y && coinCoords.y <= playerCoords.y1 ) || ( coinCoords.y1 >= playerCoords.y && coinCoords.y1 <= playerCoords.y1 )))
                        || ((((playerCoords.x >= coinCoords.x && playerCoords.x <= coinCoords.x1 ) || ( playerCoords.x1 >= coinCoords.x && playerCoords.x1 <= coinCoords.x1))
                                && (( coinCoords.y >= playerCoords.y && coinCoords.y <= playerCoords.y1 ) || ( coinCoords.y1 >= playerCoords.y && coinCoords.y1 <= playerCoords.y1 )))
                            || (((coinCoords.x >= playerCoords.x && coinCoords.x <= playerCoords.x1 ) || ( coinCoords.x1 >= playerCoords.x && coinCoords.x1 <= playerCoords.x1 ))
                                && ((playerCoords.y >= coinCoords.y && playerCoords.y <= coinCoords.y1 ) || ( playerCoords.y1 >= coinCoords.y && playerCoords.y1 <= coinCoords.y1))))) {
                        player.score++;
                        coin.x = Math.floor(Math.random() * 1280);
                        coin.y = Math.floor(Math.random() * 720);
                    }
                }
            }
            entities.players.sort((a, b) => b.score - a.score);
            io.emit('update entities', entities);
        }
    });
    socket.on('disconnect', () => {
        entities.players.splice(entities.players.find((player) => player.id === socket.id), 1);
    });
})