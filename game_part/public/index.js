const mapImage = new Image();
mapImage.src = '/snowy-sheet.png'
const socket = io(`http://10.196.41.17:4367/`);

const playerImage = new Image();
playerImage.src = '/soldier_small.png'

const walkSound = new Audio('/running.mp3');
const bulletSound = new Audio('/bullet_sound.mp3');
walkSound.loop = true;
bulletSound.loop =false;
const canvasEL = document.getElementById("canvas");
console.log(canvasEL)
canvasEL.width = window.innerWidth;
canvasEL.height = window.innerHeight;
const TILE_SIZE = 32;
const canvas = canvasEL.getContext("2d");

socket.on('connect', () => {
    console.log('connected');
});

let groundMap = [[]];
let decalMap = [[]];
let players=[];
let bullets=[];
socket.on("map", (loadedMap) => {
    groundMap = loadedMap.ground;
    decalMap = loadedMap.decal;
})

socket.on("players", (serverPlayers) => {
    players = serverPlayers;
})

socket.on("bullets", (serverBullets) => {
    bullets = serverBullets;
})
const inputs={
    up: false,
    down: false,
    left: false,
    right: false
}
window.addEventListener('keydown', (e) => {
    if(e.key === 'w') inputs.up = true;
    if(e.key === 's') inputs.down = true;
    if(e.key === 'a') inputs.left = true;
    if(e.key === 'd') inputs.right = true;
    if(["a","w","s","d"].includes(e.key) && walkSound.paused )
        { walkSound.play(); }
    socket.emit('inputs',inputs);
})

window.addEventListener('keyup', (e) => {
    if(e.key === 'w') inputs.up = false;
    if(e.key === 's') inputs.down = false;
    if(e.key === 'a') inputs.left = false;
    if(e.key === 'd') inputs.right = false;

    if(["a","w","s","d"].includes(e.key)){ 
        walkSound.pause();
        walkSound.currentTime = 0;
    }
    socket.emit('inputs',inputs);
})

window.addEventListener("click", (e)=>{
    const angle = Math.atan2(
        e.clientY - canvasEL.height / 2, 
        e.clientX - canvasEL.width / 2);
    bulletSound.currentTime = 0;
    bulletSound.play();
    socket.emit('bullet',angle);
})
function loop() {
    canvas.clearRect(0, 0, canvasEL.width, canvasEL.height);

    const myPlayer= players.find((player)=>player.id === socket.id);
    const TILES_IN_ROW = 8;
    let cameraX = 0;
    let cameraY = 0;
    if(myPlayer){
        cameraX = parseInt(myPlayer.x - canvasEL.width /2);
        cameraY = parseInt(myPlayer.y - canvasEL.height /2);
    }
    for (let row = 0; row < groundMap.length; row++) {
        for (let col = 0; col < groundMap[0].length; col++) {
            let { id } = groundMap[row][col];
            const imageRow = parseInt(id / TILES_IN_ROW);
            const imageCol = id % TILES_IN_ROW;
            canvas.drawImage(
                mapImage,
                imageCol * TILE_SIZE,
                imageRow * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE,
                col * TILE_SIZE - cameraX,
                row * TILE_SIZE - cameraY,
                TILE_SIZE,
                TILE_SIZE
            );
        }
    }
    for (let row = 0; row < decalMap.length; row++) {
        for (let col = 0; col < decalMap[0].length; col++) {
          let { id } = decalMap[row][col] ?? { id: undefined };
          const imageRow = parseInt(id / TILES_IN_ROW);
          const imageCol = id % TILES_IN_ROW;
    
          canvas.drawImage(
            mapImage,
            imageCol * TILE_SIZE,
            imageRow * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
            col * TILE_SIZE - cameraX,
            row * TILE_SIZE - cameraY,
            TILE_SIZE,
            TILE_SIZE
          );
        }
    }
    
    for(const player of players){
        canvas.drawImage(playerImage,player.x -cameraX,player.y -cameraY);
    }

    for(const bullet of bullets){
        canvas.beginPath();
        canvas.arc(bullet.x -cameraX,bullet.y -cameraY, 5, 0, 2 * Math.PI);
        canvas.fillStyle = 'orange';
        canvas.fill();
    }

    window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);
