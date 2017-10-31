function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

function getFn(cell, ctx) {
	return (side) => {
		return cell.sides.has(side) ? 
			(x, y) => ctx.lineTo(x, y) : (x, y) => ctx.moveTo(x, y); 
	};
}

const Rect = {
	Sides: {
		LEFT: 'left',
		RIGHT: 'right',
		TOP: 'top', 
		BOTTOM: 'bottom',
	},

	Cell: class {
		constructor() {
			this.sides = new Set(Object.values(Rect.Sides));
		}

		getSides() {
			return this.sides;
		}

		removeSide(side) {
			this.sides.delete(side);
		}

		hasAllSides() {
			return this.sides.size == 4;
		}

		draw(ctx, x, y, cellWidth, cellHeight) {
			ctx.beginPath();
			ctx.moveTo(x * cellWidth, y * cellHeight);
			const get = getFn(this, ctx);
			const corners = [
				{x: (x + 1) * cellWidth, y: y * cellHeight},
				{x: (x + 1) * cellWidth, y: (y + 1) * cellHeight},
				{x: x * cellWidth, y: (y + 1) * cellHeight},
				{x: x * cellWidth, y: y * cellHeight}
			];
			const apply_corner = (fn, corner) => fn(corner.x, corner.y);
			apply_corner(get(Rect.Sides.TOP), corners[0]);
			apply_corner(get(Rect.Sides.RIGHT), corners[1]);
			apply_corner(get(Rect.Sides.BOTTOM), corners[2]);
			apply_corner(get(Rect.Sides.LEFT), corners[3]);
			ctx.stroke();

			ctx.beginPath();
			apply_corner((x, y) => ctx.moveTo(x, y), corners[0]);
			for (let i=1; i<4; i++)
				apply_corner((x, y) => ctx.lineTo(x, y), corners[i]);
			ctx.fill();
		}
	},

	Pos: class {
		constructor(x, y) {
			this.x = x;
			this.y = y;
		}
	},

	Grid: class {
		constructor(width, height) {
			this.width = width;
			this.height = height;
			this.grid = new Array(width * height);
			for (let x = 0; x < width; x++)
				for(let y = 0; y < height; y++)
					this.set(x, y, new Rect.Cell());
		}

		set(x, y, value) {
			this.grid[x + y * this.width] = value;
		}

		getStart() {
			return new Rect.Pos(0, 0);
		}

		get(x, y) {
			return this.grid[x + y * this.width];
		}

		getPos(p) {
			return this.get(p.x, p.y);
		}

		inGrid(p) {
			return p.x >= 0 && p.y >=0 && p.x < this.width && p.y < this.height;
		}

		getNeighbors(pos) {
			const x = pos.x;
			const y = pos.y;
			return [new Rect.Pos(x - 1, y),
				new Rect.Pos(x + 1, y),
				new Rect.Pos(x, y - 1),
				new Rect.Pos(x, y + 1)];
		}

		breakWallBetween(pos1, pos2) {
			const cell1 = this.getPos(pos1);
			const cell2 = this.getPos(pos2);
			if (pos1.y == pos2.y) {
				if (pos1.x < pos2.x) {
					cell1.removeSide(Rect.Sides.RIGHT);
					cell2.removeSide(Rect.Sides.LEFT);
				} else {
					cell1.removeSide(Rect.Sides.LEFT);
					cell2.removeSide(Rect.Sides.RIGHT);
				}
			} else {
				if (pos1.y < pos2.y) {
					cell1.removeSide(Rect.Sides.BOTTOM);
					cell2.removeSide(Rect.Sides.TOP);
				} else {
					cell1.removeSide(Rect.Sides.TOP);
					cell2.removeSide(Rect.Sides.BOTTOM);
				}
			}
		}

		draw(canvas, ctx) {
			const cellWidth = canvas.width / this.width;
			const cellHeight = canvas.height / this.height;
			for (let x = 0; x < this.width; x++) {
				for (let y = 0; y < this.height; y++) {
					this.get(x, y).draw(ctx, x, y, cellWidth, cellHeight);
				}
			}
		}
	},
}

const Hex = {
	Sides: {
		TOP_LEFT: 'top-left',
		TOP_RIGHT: 'top-right',
		LEFT: 'left',
		RIGHT: 'right',
		BOTTOM_LEFT: 'bottom-left',
		BOTTOM_RIGHT: 'bottom-right',
	},

	Cell: class {
		constructor() {
			this.sides = new Set(Object.values(Hex.Sides));
		}

		getSides() {
			return this.sides;
		}

		removeSide(side) {
			this.sides.delete(side);
		}

		hasAllSides() {
			return this.sides.size == 6;
		}

		hexCorner(x, y, size, i) {
			const angle_deg = 60 * i + 30;
			const angle_rad = Math.PI / 180 * angle_deg;
			return {
				x: x + size * Math.cos(angle_rad),
				y: y + size * Math.sin(angle_rad)
			};
		}

		draw(ctx, x, y, size) {
			const hex_corner = (i) => this.hexCorner(x, y, size, i);
			const get = getFn(this, ctx);
			const apply_corner = (corner, fn) => fn(corner.x, corner.y);
			ctx.beginPath();
			apply_corner(hex_corner(0), (x, y) => ctx.moveTo(x, y));
			apply_corner(hex_corner(1), get(Hex.Sides.BOTTOM_RIGHT));
			apply_corner(hex_corner(2), get(Hex.Sides.BOTTOM_LEFT));
			apply_corner(hex_corner(3), get(Hex.Sides.LEFT));
			apply_corner(hex_corner(4), get(Hex.Sides.TOP_LEFT));
			apply_corner(hex_corner(5), get(Hex.Sides.TOP_RIGHT));
			apply_corner(hex_corner(6), get(Hex.Sides.RIGHT));
			ctx.stroke();

			ctx.beginPath();
			apply_corner(hex_corner(0), (x, y) => ctx.moveTo(x, y));
			for (let i = 1; i < 7; i++)
				apply_corner(hex_corner(i), (x, y) => ctx.lineTo(x, y));
			ctx.fill();
		}
	},

	// Axial coordinate system
	// See https://www.redblobgames.com/grids/hexagons/
	Pos: class {
		constructor(q, r) {
			this.q = q;
			this.r = r;
			this.s = -q - r;
		}

		to_s() {
			return `{q: ${this.q}, r: ${this.r}}`;
		}

		static from_s(s) {
			const regex = /{q: (-?\d), r: (-?\d)}/;
			const matches = regex.exec(s);
			return new Hex.Pos(parseInt(matches[1]), parseInt(matches[2]));
		}
	},

	Grid: class {
		constructor(size) {
			this.size = size;
			this.grid = new Map();
			for (let q = -size; q <= size; q++) {
				for (let r = -size; r <= size; r++) {
					const pos = new Hex.Pos(q, r);
					if (this.inGrid(pos)) {
						this.grid.set(pos.to_s(), new Hex.Cell());
					}
				}
			}
		}

		set(q, r, value) {
			this.grid.set(new Hex.Pos(q, r).to_s(), value);
		}
		
		getStart() {
			return new Hex.Pos(0, 0);
		}

		get(q, r) {
			return this.grid.get(new Hex.Pos(q, r).to_s());
		}

		getPos(p) {
			return this.get(p.q, p.r);
		}

		inGrid(pos) {
			return Math.abs(pos.q) + Math.abs(pos.r) + Math.abs(pos.s) <= this.size * 2;
		}

		getNeighbors(pos) {
			const q = pos.q;
			const r = pos.r;
			return [new Hex.Pos(q + 1, r),
				new Hex.Pos(q + 1, r - 1),
				new Hex.Pos(q, r - 1),
				new Hex.Pos(q - 1,  r),
				new Hex.Pos(q - 1, r + 1),
				new Hex.Pos(q, r + 1)];
		}

		breakWallBetween(pos1, pos2) {
			const cell1 = this.getPos(pos1);
			const cell2 = this.getPos(pos2);
			if (pos1.q == pos2.q) {
				if (pos1.r - 1 == pos2.r) {
					cell1.removeSide(Hex.Sides.TOP_LEFT);
					cell2.removeSide(Hex.Sides.BOTTOM_RIGHT);
				} else {
					cell1.removeSide(Hex.Sides.BOTTOM_RIGHT);
					cell2.removeSide(Hex.Sides.TOP_LEFT);
				}
			} else if (pos1.q - 1 == pos2.q) {
				if (pos1.r == pos2.r) {
					cell1.removeSide(Hex.Sides.LEFT);
					cell2.removeSide(Hex.Sides.RIGHT);
				} else {
					cell1.removeSide(Hex.Sides.BOTTOM_LEFT);
					cell2.removeSide(Hex.Sides.TOP_RIGHT);
				}
			} else {
				if (pos1.r == pos2.r) {
					cell1.removeSide(Hex.Sides.RIGHT);
					cell2.removeSide(Hex.Sides.LEFT);
				} else {
					cell1.removeSide(Hex.Sides.TOP_RIGHT);
					cell2.removeSide(Hex.Sides.BOTTOM_LEFT);
				}
			}
		}

		draw(canvas, ctx) {
			const hex_size = 40;
			const cw = canvas.width / 2;
			const ch = canvas.height / 2;

			for (const [pos_s, cell] of this.grid) {
				const pos = Hex.Pos.from_s(pos_s);
				const x = hex_size * Math.sqrt(3) * (pos.q + pos.r/2) + cw;
				const y = hex_size * 1.5 * pos.r + ch;
				cell.draw(ctx, x, y, hex_size);
			}
		}
	},
};

class Maze {
	constructor(cells) {
		this.cells = this.generateCells(cells);
	}

	generateCells(cells) {

		const stack = [cells.getStart()];
		const neighbor_pos = (p) => cells.getNeighbors(p);
		while (stack.length) {
			const pos = stack.pop();

			const neighbors = neighbor_pos(pos)
				.filter(p => cells.inGrid(p))
				.filter(p => cells.getPos(p).hasAllSides());
			if (neighbors.length > 0) {
				stack.push(pos);
				const chosen = getRandomInt(0, neighbors.length);
				stack.push(neighbors[chosen]);
				cells.breakWallBetween(pos, neighbors[chosen]);
			}
		}

		return cells;
	}

	draw(canvas, ctx) {
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'white';
		ctx.lineWidth = 1;
		this.cells.draw(canvas, ctx);
	}
}

function main() {
	const rect_canvas = document.getElementById('rectMaze');
	const hex_canvas = document.getElementById('hexMaze');
	const rect_ctx = rect_canvas.getContext('2d');
	const hex_ctx = hex_canvas.getContext('2d');

	const rectCells = new Rect.Grid(16, 16);
	const hexCells = new Hex.Grid(5);
	const maze1 = new Maze(rectCells);
	const maze2 = new Maze(hexCells);
	maze1.draw(rect_canvas, rect_ctx);
	maze2.draw(hex_canvas, hex_ctx);
}

main();
