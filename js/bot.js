function Bot(gamemanager) {
  this.gm = gamemanager;
  this.doMove(this.downCentric);
}

Bot.prototype.doMove = function (strategy) {

  var self = this;
  strategy.call(self);

  if (!self.gm.over && !self.gm.won) {
    setTimeout(function(){self.doMove(strategy)}, 50);
  }
};


Bot.prototype.downCentric = function () {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  var downGrid = owl.deepCopy(self.gm.grid);
  // do a down if you can
  if (self.simulateMove(2, downGrid) > -1) {
    self.gm.move(2);
  }
  // do a left or right, whichever maximizes avaialble gride space
  else {
    var leftGrid = owl.deepCopy(self.gm.grid);
    var rightGrid = owl.deepCopy(self.gm.grid);
  
    var leftVal = self.simulateMove(3, leftGrid);
    var rightVal = self.simulateMove(1, rightGrid);
    
    if (leftVal > -1 || rightVal > -1) {
      if (leftVal == rightVal) {
        if (Math.floor(Math.random() * 2) === 1)
          self.gm.move(3);
      else
        self.gm.move(1);
      return;
      }
    
      if (leftVal > rightVal)
        self.gm.move(3);
      else
        self.gm.move(1);
    }
    // if all else fails, do an up
    else {
      self.gm.move(0)
    }
  }
};

Bot.prototype.maximizeCells = function () {

  var self = this;

  var sims = {
    0: { cells: 0 },
    1: { cells: 0 },
    2: { cells: 0 },
    3: { cells: 0 }
  };

  var bestCells = 0;
  var bestMove = 0;
  
  for (var i=0; i<4; i++) {
    var obj = owl.deepCopy(self.gm.grid);
    sims[i] = self.simulateMove(i, obj);
    if (sims[i] > bestCells) {
      bestCells = sims[i];
      bestMove = i;
    }
    else if (sims[i] === bestCells && Math.floor(Math.random() * 2) === 1) {
      bestMove = i;
    }   
  }
  self.gm.move(bestMove);
};

// Move tiles on the grid in the specified direction
Bot.prototype.simulateMove = function (direction, grid) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;
  
  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  self.prepareTiles(grid);
  
  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector, grid);
        var next      = grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          grid.insertTile(merged);
          grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

        }
        else {
          self.moveTile(tile, positions.farthest, grid);
        }
        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });
  if (moved == false)
    return -1;
  else
    return grid.availableCells().length;
};

// Get the vector representing the chosen direction
Bot.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
Bot.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < 4; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

Bot.prototype.findFarthestPosition = function (cell, vector, grid) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (grid.withinBounds(cell) &&
           grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};


// Save all tile positions and remove merger info
Bot.prototype.prepareTiles = function (grid) {
  grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

Bot.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
  
// Move a tile and its representation
Bot.prototype.moveTile = function (tile, cell, grid) {
  grid.cells[tile.x][tile.y] = null;
  grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};