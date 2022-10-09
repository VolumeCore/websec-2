let modal = document.getElementById("myModal");
let continueButton = document.querySelector(".continue-button");
let input = document.querySelector("#username");
let colorPicker = document.querySelector(".color-picker");
let errorMessage = document.querySelector("#message");
let socket = io();
let readyToStart = false;

for (let color of colorPicker.children) {
    color.onclick = () => {
        for (let c of colorPicker.children) {
            c.classList.remove("active");
        }
        color.classList.add("active");
    }
}

continueButton.onclick = () => {
    console.log(input.value);
    if (!input.value.trim().length) {
        errorMessage.classList.add("invalid-message");
        input.classList.add("invalid-input");
        errorMessage.innerHTML = "Введите от 3 до 10 символов";
        return;
    }
    if (document.querySelector(".color-picker > .active") === null) {
        errorMessage.classList.add("invalid-message");
        input.classList.add("invalid-input");
        errorMessage.innerHTML = "Выберите цвет машинки";
        return;
    }
    socket.emit("new player", input.value, document.querySelector(".color-picker > .active").classList[0]);
    socket.on("nickname exists", () => {
        errorMessage.classList.add("invalid-message");
        input.classList.add("invalid-input");
        errorMessage.innerHTML = "Игрок с таким именем уже играет, придумайте другое";
    });
    socket.on("successful connection", () => {
        modal.style.display = "none";
        readyToStart = true;
    });
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
bgImage.onload = () => {
    bgReady = true;
};
bgImage.src = "assets/background.png";

let playerImages = [];
let playerImage; // random car image (same width & height) to calculate any events
playerImages.push(new Image());
playerImages[0].src = "assets/car_green.png";
playerImages.push(new Image());
playerImages[1].src = "assets/car_yellow.png";
playerImages.push(new Image());
playerImages[2].src = "assets/car_blue.png";
let playerImagesLoaded = 0;
let playerReady = false;
for (let image of playerImages) {
    image.onload = () => {
        playerImagesLoaded++;
        playerImagesLoaded === playerImages.length && (playerReady = true);
        playerImage = playerImages[0];
    }
}

let coinReady = false;
let coinImage = new Image();
coinImage.onload = () => {
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

let entities = { players: [], coins: [] };

// Draw everything on the canvas
function render(entities) {
    if (bgReady) {
        ctx.drawImage(bgImage, 0, 0);
    }
    if (playerReady) {
        for (let player of entities.players) {
            let playerImageToDraw;
            switch (player.color) {
                case "green":
                    playerImageToDraw = playerImages[0];
                    break;
                case "yellow":
                    playerImageToDraw = playerImages[1];
                    break;
                case "blue":
                    playerImageToDraw = playerImages[2];
                    break;
            }
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.angle * Math.PI / 180);
            ctx.translate(-playerImage.width / 2, -playerImage.height / 2);
            ctx.drawImage(playerImageToDraw, 0, 0);
            ctx.restore();

            ctx.fillStyle = "rgb(181,0,255)";
            ctx.font = "16px Helvetica";
            ctx.textAlign = "center";
            ctx.fillText(player.name, player.x, player.y - 45);
        }
    }
    if (coinReady) {
        for (let coin of entities.coins) {
            ctx.drawImage(coinImage, coin.x, coin.y);
        }
    }
    ctx.fillStyle = "rgb(181,0,255)";
    ctx.font = "bold 16px Helvetica";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Leaderboard: ", 20, 30);
    for (let i = 0; i < (entities.players.length > 5 ? 5 : entities.players.length); i++) {
        ctx.fillText(entities.players[i].name + " : " + entities.players[i].score, 20, 50 + i * 25);
    }
}

function main() {
    // run the update function
    if (readyToStart) {
        socket.emit('move', keysDown);
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