// Editor-Variablen
let grid = [];
let cols = 0, rows = 0;
let cellSize = 0;
let player = { x: 1, y: 1, dir: 2 };
let goal = { x: 0, y: 0 };
let max_blocks = 10;

const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');

// Elemente
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
let maxBlocksInput = document.getElementById('maxBlocksInput');
const modeWallBtn = document.getElementById('modeWall');
const modeStartBtn = document.getElementById('modeStart');
const modeGoalBtn = document.getElementById('modeGoal');
const resetBtn = document.getElementById('resetBtn');
const importBtn = document.getElementById('importBtn');
const dirLabel = document.getElementById('dirLabel');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportConstBtn = document.getElementById('exportConstBtn');
// Direktausrichtung bei Auswahländerung
if (dirSelect) {
  dirSelect.addEventListener('change', () => {
    player.dir = parseInt(dirSelect.value);
    draw();
  });
}
// Bilder laden
const wallImg = new Image(); wallImg.src = 'img/brickwall.svg';
const robotImg = new Image(); robotImg.src = 'img/robot.svg';
const treasureImg = new Image(); treasureImg.src = 'img/treasure.svg';

// Modus
let mode = 'wall';
modeWallBtn.addEventListener('click', () => setMode('wall'));
modeStartBtn.addEventListener('click', () => setMode('start'));
modeGoalBtn.addEventListener('click', () => setMode('goal'));

function setMode(m) {
  mode = m;
  document.querySelectorAll('#toolbar button').forEach(b => b.classList.remove('active'));
  document.getElementById('mode' + m.charAt(0).toUpperCase() + m.slice(1)).classList.add('active');
  dirLabel.style.display = (m === 'start') ? 'inline-flex' : 'none';
}

// Raster erstellen
document.getElementById('createGridBtn').addEventListener('click', () => {
  cols = parseInt(widthInput.value);
  rows = parseInt(heightInput.value);
  widthInput.disabled = heightInput.disabled = true;
  grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) grid[y][x] = 1;
  player = { x: 1, y: 1, dir: parseInt(document.getElementById('dirSelect').value) };
  goal = { x: cols - 2, y: rows - 2 };
  cellSize = Math.min(Math.floor(canvas.width / cols), Math.floor(canvas.height / rows));
  [modeWallBtn, modeStartBtn, modeGoalBtn, exportJsonBtn, exportConstBtn].forEach(b => b.disabled = false);
  draw();
});

// Zurücksetzen
resetBtn.addEventListener('click', () => {
  grid = [];
  cols = rows = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  [modeWallBtn, modeStartBtn, modeGoalBtn, exportJsonBtn,exportConstBtn].forEach(b => b.disabled = true);
  widthInput.disabled = heightInput.disabled = false;
  dirLabel.style.display = 'none';
});

// Export mit grid-Reihe ohne Zeilenumbrüche


function prepareData(asConst = false) {
  maxBlocksInput = document.getElementById('maxBlocksInput');
  max_blocks = parseInt(maxBlocksInput.value);

  if (asConst) {
    let code = 'const maze = {\n';
    code += '  grid: [\n';
    code += grid.map(row => `    ${JSON.stringify(row)}`).join(',\n') + '\n';
    code += '  ],\n';
    code += `  player: { x: ${player.x}, y: ${player.y}, dir: ${player.dir} },\n`;
    code += `  goal: { x: ${goal.x}, y: ${goal.y} },\n`;
    code += `  max_blocks: ${max_blocks}\n`;
    code += '};';
    return code;
  } else {
    return JSON.stringify({ grid, player, goal, max_blocks }, null, 2);
  }
}

async function exportData(asConst = false) {
  const content = prepareData(asConst);
  const blob = new Blob([content], { type: 'application/json' });

  // File System Access API (Chrome/Edge)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: asConst ? 'config_maze.js' : 'maze.json',
        types: [{
          description: asConst ? 'JavaScript-Datei' : 'JSON-Datei',
          accept: { [asConst ? 'application/javascript' : 'application/json']: [asConst ? '.js' : '.json'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    } catch (err) {
      if (err.name !== 'AbortError') {
        alert('❌ Fehler beim Speichern:\n' + err.message);
      }
      return;
    }
  }

  // Fallback für Firefox etc.
  let filename = prompt('Dateiname für den Export:', asConst ? 'config_maze.js' : 'maze.json');
  if (!filename) return;
  if (!filename.toLowerCase().endsWith(asConst ? '.js' : '.json')) {
    filename += asConst ? '.js' : '.json';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Eventlistener für neue Buttons
exportJsonBtn.addEventListener('click', () => exportData(false));
exportConstBtn.addEventListener('click', () => exportData(true));



// Import
importBtn.addEventListener('click', () => document.getElementById('importInput').click());
document.getElementById('importInput').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      ({ grid, player, goal, max_blocks } = data);
      rows = grid.length; cols = grid[0].length;
      widthInput.value = cols; heightInput.value = rows; maxBlocksInput.value = max_blocks;
      widthInput.disabled = heightInput.disabled = true;
      cellSize = Math.min(Math.floor(canvas.width / cols), Math.floor(canvas.height / rows));
      [modeWallBtn, modeStartBtn, modeGoalBtn, exportJsonBtn, exportConstBtn].forEach(b => b.disabled = false);
      draw();
    } catch (err) {
      alert('Ungültiges JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// Klick-Handler
canvas.addEventListener('click', e => {
  if (!cols || !rows) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / cellSize);
  const y = Math.floor((e.clientY - rect.top) / cellSize);
  if (x < 0 || x >= cols || y < 0 || y >= rows) return;
  if (mode === 'wall') {
    // Wände toggeln, auch Außenwände
    if ((player.x === x && player.y === y) || (goal.x === x && goal.y === y)) return;
    grid[y][x] = grid[y][x] === 1 ? 0 : 1;
  } else if (mode === 'start') {
    // Start nicht auf Ziel setzen
    if (x === goal.x && y === goal.y) return;
    grid[y][x] = 0; player.x = x; player.y = y;
    player.dir = parseInt(document.getElementById('dirSelect').value);
  } else if (mode === 'goal') {
    // Ziel nicht auf Start setzen
    if (x === player.x && y === player.y) return;
    grid[y][x] = 0; goal.x = x; goal.y = y;
  }
  draw();
});

// Zeichnen
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let yy = 0; yy < rows; yy++) {
    for (let xx = 0; xx < cols; xx++) {
      const px = xx * cellSize, py = yy * cellSize;
      ctx.strokeStyle = '#ccc'; ctx.strokeRect(px, py, cellSize, cellSize);
      if (grid[yy][xx] === 1) ctx.drawImage(wallImg, px, py, cellSize, cellSize);
    }
  }
  ctx.drawImage(treasureImg, goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);
  const cx = player.x * cellSize + cellSize / 2;
  const cy = player.y * cellSize + cellSize / 2;
  // Rotation so dass dir=2 (Süd) keine Drehung benötigt
  const dirs = [Math.PI /*0:Nord*/, -Math.PI / 2 /*1:Ost*/, 0 /*2:Süd*/, Math.PI / 2 /*3:West*/];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(dirs[player.dir]);
  ctx.drawImage(robotImg, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
  ctx.restore();
}


// Neu laden Button (reload)
const reloadBtn = document.getElementById('reloadBtn');
if (reloadBtn) {
  reloadBtn.addEventListener('click', () => {
    location.reload();
  });
}