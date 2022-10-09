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
sizeOf("client/assets/car_green.png", (err, dimensions) => {
    images.playerImage = { width: dimensions.width, height: dimensions.height }
});

// connect socket and calculate any events
io.on('connection', (socket) => {
    socket.on('new player', (username, color) => {
        for (let player of entities.players) {
            if (username === player.name) {
                io.emit("nickname exists");
                return;
            }
        }
        entities.players.push({
            id: socket.id,
            name: username,
            score: 0,
            x: 200,
            y: 200,
            angle: 0,
            velocity: 0,
            color: color,
        });
        io.emit("successful connection");
    });

    // if client says that someone is driving
    socket.on('move', (keysDown) => {
        let player = entities.players.find((player) => player.id === socket.id);
        if (typeof player !== "undefined") {
            if (player.velocity > 0.1 || player.velocity < -0.1) {
                player.y -= player.velocity * Math.cos(player.angle * Math.PI / 180);
                player.x += player.velocity * Math.sin(player.angle * Math.PI / 180);
                if (player.x > 1260) {
                    player.x = 1259;
                }
                if (player.x < 20) {
                    player.x = 21;
                }
                if (player.y > 700) {
                    player.y = 699;
                }
                if (player.y < 20) {
                    player.y = 21;
                }
            }

            if (38 in keysDown || 87 in keysDown) { // Player is holding up key
                player.velocity < 4 && (player.velocity += 0.15);
            } else {
                player.velocity > 0 && (player.velocity -= 0.15);
                player.velocity < 0.15 && (!40 in keysDown) && (player.velocity = 0);
            }
            if (40 in keysDown || 83 in keysDown) { // Player is holding down key
                player.velocity > -4 && (player.velocity -= 0.15);
            } else {
                player.velocity < 0 && (player.velocity += 0.15);
                player.velocity > -0.15 && (!38 in keysDown) && (player.velocity = 0);
            }
            if (37 in keysDown || 65 in keysDown) { // Player is holding left key
                player.velocity > 0 && (player.angle -= 2);
                player.velocity < 0 && (player.angle += 2);
            }
            if (39 in keysDown || 68 in keysDown) { // Player is holding right key
                player.velocity < 0 && (player.angle -= 2);
                player.velocity > 0 && (player.angle += 2);
            }

            for (let player of entities.players) {
                for (let coin of entities.coins) {
                    let playerCoords = { x: player.x - images.playerImage.width / 2, y: player.y - images.playerImage.height / 2, x1: player.x + images.playerImage.width / 2, y1: player.y + images.playerImage.height / 2  };
                    let coinCoords = { x: coin.x, y: coin.y, x1: coin.x + images.coinImage.width, y1: coin.y + images.coinImage.height };

                    // collision player and coin. Algorithm src https://xdan.ru/how-to-check-intersect-two-rectangles.html
                    if ((((playerCoords.x >= coinCoords.x && playerCoords.x<=coinCoords.x1) || (playerCoords.x1 >= coinCoords.x && playerCoords.x1 <= coinCoords.x1))
                            && ((playerCoords.y >= coinCoords.y && playerCoords.y <= coinCoords.y1 ) || (playerCoords.y1 >= coinCoords.y && playerCoords.y1 <= coinCoords.y1)))
                        || (((coinCoords.x >= playerCoords.x && coinCoords.x <= playerCoords.x1 ) || (coinCoords.x1 >= playerCoords.x && coinCoords.x1 <= playerCoords.x1))
                            && ((coinCoords.y >= playerCoords.y && coinCoords.y <= playerCoords.y1 ) || ( coinCoords.y1 >= playerCoords.y && coinCoords.y1 <= playerCoords.y1 )))
                        || ((((playerCoords.x >= coinCoords.x && playerCoords.x <= coinCoords.x1 ) || ( playerCoords.x1 >= coinCoords.x && playerCoords.x1 <= coinCoords.x1))
                                && (( coinCoords.y >= playerCoords.y && coinCoords.y <= playerCoords.y1 ) || ( coinCoords.y1 >= playerCoords.y && coinCoords.y1 <= playerCoords.y1 )))
                            || (((coinCoords.x >= playerCoords.x && coinCoords.x <= playerCoords.x1 ) || ( coinCoords.x1 >= playerCoords.x && coinCoords.x1 <= playerCoords.x1 ))
                                && ((playerCoords.y >= coinCoords.y && playerCoords.y <= coinCoords.y1 ) || ( playerCoords.y1 >= coinCoords.y && playerCoords.y1 <= coinCoords.y1))))) {
                        player.score++;
                        coin.x = Math.floor(Math.random() * 1260);
                        coin.y = Math.floor(Math.random() * 700);
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