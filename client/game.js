let modal = document.getElementById("myModal");
let continueButton = document.querySelector(".continue-button");
let input = document.querySelector("#username");
let socket = io();
input.value = "";
let readyToStart = false;

continueButton.onclick = () => {
    if (input.value !== "") {
        modal.style.display = "none";
        socket.emit("new player", input.value);
        readyToStart = true;
    } else {
        input.classList.add("invalid-input");
        document.querySelector("#message").classList.add("invalid-message");
    }
};


let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
canvas.width = 1280;
canvas.height = 720;
canvas.style.display = "block";
canvas.style.margin = "0 auto"
document.body.appendChild(canvas);

// load assets
let bgReady = false;
let bgImage = new Image();
bgImage.onload = function () {
    bgReady = true;
};
bgImage.src = "assets/background.png";
let playerReady = false;
let playerImage = new Image();
playerImage.onload = function () {
    playerReady = true;
};
playerImage.src = "assets/car.png";
let coinReady = false;
let coinImage = new Image();
coinImage.onload = function () {
    coinReady = true;
};
coinImage.src = "assets/coin.png";

// handle keyboard controls
let keysDown = {};
// Check for keys pressed where key represents the keycode captured
addEventListener("keydown", function (key) {
    keysDown[key.keyCode] = true;
}, false);
addEventListener("keyup", function (key) {
    delete keysDown[key.keyCode];
}, false);

// Update game objects - change player position based on key pressed
function update() {
    socket.emit('move', keysDown);
}

let entities = { players: [], coins: [] };

// Draw everything on the canvas
function render(entities) {
    if (bgReady) {
        ctx.drawImage(bgImage, 0, 0);
    }
    if (playerReady) {
        for (let player of entities.players) {
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.angle * Math.PI / 180);
            ctx.translate(-16, -30);
            ctx.drawImage(playerImage, 0, 0);
            ctx.restore();
        }
    }
    if (coinReady) {
        for (let coin of entities.coins) {
            ctx.drawImage(coinImage, coin.x, coin.y);
        }
    }
    // Display score and time
    ctx.fillStyle = "rgb(181,0,255)";
    ctx.font = "16px Helvetica";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Leaderboard: ", 20, 30);
    for (let i = 0; i < (entities.players.length > 5 ? 5 : entities.players.length); i++) {
        ctx.fillText(entities.players[i].name + " : " + entities.players[i].score, 20, 50 + i * 25);
    }
    // // Display game over message when timer finished
    // if (finished === true) {
    //     ctx.fillText("Game over!", 200, 220);
    // }
}
// timer interval is every second (1000ms)
// setInterval(counter, 1000);
function main() {
    // run the update function
    if (readyToStart) {
        update(); // do not change
        // run the render function
        render(entities);
    }
    // Request to do this again ASAP
    requestAnimationFrame(main);
}
// Cross-browser support for requestAnimationFrame
let w = window;
requestAnimationFrame = w.requestAnimationFrame || w.webkitRequestAnimationFrame || w.msRequestAnimationFrame || w.mozRequestAnimationFrame;

main();

socket.on('update entities', (newEntities) => {
    entities = newEntities;
})