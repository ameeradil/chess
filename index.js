// init and board/move logic

const squareNodes = Array.from(document.querySelectorAll('.main-container .square'))

// Board model: 8x8 array of null or {type, color, dom}
const BOARD_SIZE = 8
let board = []
let imgToPos = new Map()
let currentTurn = 'white'
let selected = null

function parsePiece(img) {
  if (!img) return null
  const alt = (img.alt || '').toLowerCase()
  const parts = alt.split('-')
  if (parts.length < 2) return null
  return { type: parts[1], color: parts[0], dom: img }
}

function initBoard() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  squareNodes.forEach((sq, idx) => {
    const r = Math.floor(idx / BOARD_SIZE)
    const c = idx % BOARD_SIZE
    const img = sq.querySelector('img')
    const piece = parsePiece(img)
    if (piece) {
      board[r][c] = { type: piece.type, color: piece.color, dom: img }
      imgToPos.set(piece.dom, [r, c])
    }
  })
}

function inBounds(r, c) { return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE }

function cloneBoard(b) {
  return b.map(row => row.map(cell => cell ? { type: cell.type, color: cell.color } : null))
}

function findKing(b, color) {
  for (let r = 0; r < BOARD_SIZE; r++) for (let c = 0; c < BOARD_SIZE; c++) {
    const p = b[r][c]
    if (p && p.type === 'king' && p.color === color) return [r, c]
  }
  return null
}

function isSquareAttacked(b, tr, tc, byColor) {
  const pawnDir = byColor === 'white' ? -1 : 1
  const pawnAttackOffsets = [[pawnDir, -1], [pawnDir, 1]]
  for (let [dr, dc] of pawnAttackOffsets) {
    const r = tr + dr, c = tc + dc
    if (inBounds(r, c) && b[r][c] && b[r][c].color === byColor && b[r][c].type === 'pawn') return true
  }
  const knightOffsets = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
  for (let [dr,dc] of knightOffsets) {
    const r = tr + dr, c = tc + dc
    if (inBounds(r,c) && b[r][c] && b[r][c].color === byColor && b[r][c].type === 'knight') return true
  }
  const orth = [[1,0],[-1,0],[0,1],[0,-1]]
  for (let [dr,dc] of orth) {
    let r = tr + dr, c = tc + dc
    while (inBounds(r,c)) {
      if (b[r][c]) {
        const p = b[r][c]
        if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true
        break
      }
      r += dr; c += dc
    }
  }
  const diag = [[1,1],[1,-1],[-1,1],[-1,-1]]
  for (let [dr,dc] of diag) {
    let r = tr + dr, c = tc + dc
    while (inBounds(r,c)) {
      if (b[r][c]) {
        const p = b[r][c]
        if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true
        break
      }
      r += dr; c += dc
    }
  }
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr===0 && dc===0) continue
    const r = tr + dr, c = tc + dc
    if (inBounds(r,c) && b[r][c] && b[r][c].color === byColor && b[r][c].type === 'king') return true
  }
  return false
}

function wouldLeaveKingInCheck(fromR, fromC, toR, toC) {
  const b2 = cloneBoard(board)
  b2[toR][toC] = b2[fromR][fromC]
  b2[fromR][fromC] = null
  const moverColor = board[fromR][fromC].color
  const kingPos = findKing(b2, moverColor)
  if (!kingPos) return true
  const [kr,kc] = kingPos
  return isSquareAttacked(b2, kr, kc, moverColor === 'white' ? 'black' : 'white')
}

function generatePseudoLegal(fromR, fromC) {
  const p = board[fromR][fromC]
  if (!p) return []
  const moves = []
  const color = p.color
  const enemy = color === 'white' ? 'black' : 'white'
  switch(p.type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1
      const r1 = fromR + dir
      if (inBounds(r1, fromC) && !board[r1][fromC]) moves.push([r1, fromC])
      const startRow = color === 'white' ? 6 : 1
      const r2 = fromR + 2*dir
      if (fromR === startRow && inBounds(r2, fromC) && !board[r1][fromC] && !board[r2][fromC]) moves.push([r2, fromC])
      for (let dc of [-1,1]) {
        const rc = fromR + dir, cc = fromC + dc
        if (inBounds(rc,cc) && board[rc][cc] && board[rc][cc].color === enemy) moves.push([rc,cc])
      }
      break
    }
    case 'rook': {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
      for (let [dr,dc] of dirs) {
        let r = fromR + dr, c = fromC + dc
        while (inBounds(r,c)) {
          if (!board[r][c]) { moves.push([r,c]) }
          else { if (board[r][c].color !== color) moves.push([r,c]); break }
          r += dr; c += dc
        }
      }
      break
    }
    case 'bishop': {
      const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]]
      for (let [dr,dc] of dirs) {
        let r = fromR + dr, c = fromC + dc
        while (inBounds(r,c)) {
          if (!board[r][c]) { moves.push([r,c]) }
          else { if (board[r][c].color !== color) moves.push([r,c]); break }
          r += dr; c += dc
        }
      }
      break
    }
    case 'queen': {
      const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
      for (let [dr,dc] of dirs) {
        let r = fromR + dr, c = fromC + dc
        while (inBounds(r,c)) {
          if (!board[r][c]) { moves.push([r,c]) }
          else { if (board[r][c].color !== color) moves.push([r,c]); break }
          r += dr; c += dc
        }
      }
      break
    }
    case 'knight': {
      const offs = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
      for (let [dr,dc] of offs) {
        const r = fromR + dr, c = fromC + dc
        if (inBounds(r,c) && (!board[r][c] || board[r][c].color !== color)) moves.push([r,c])
      }
      break
    }
    case 'king': {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (dr===0 && dc===0) continue
        const r = fromR + dr, c = fromC + dc
        if (inBounds(r,c) && (!board[r][c] || board[r][c].color !== color)) moves.push([r,c])
      }
      break
    }
  }
  return moves
}

function generateLegalMoves(fromR, fromC) {
  const pseudo = generatePseudoLegal(fromR, fromC)
  return pseudo.filter(([r,c]) => !wouldLeaveKingInCheck(fromR, fromC, r, c))
}

function clearHighlights() {
  squareNodes.forEach(sq => { sq.style.outline = '' })
}

function highlightSquares(list) {
  for (let [r,c] of list) {
    const idx = r * BOARD_SIZE + c
    const sq = squareNodes[idx]
    if (sq) sq.style.outline = '3px solid rgba(0,200,0,0.6)'
  }
}

function movePiece(fromR, fromC, toR, toC) {
  const piece = board[fromR][fromC]
  const targetCell = board[toR][toC]
  const toIdx = toR * BOARD_SIZE + toC
  const toSq = squareNodes[toIdx]
  toSq.appendChild(piece.dom)
  board[toR][toC] = { type: piece.type, color: piece.color, dom: piece.dom }
  board[fromR][fromC] = null
  imgToPos.set(piece.dom, [toR,toC])
}

function onPieceClick(e) {
  e.stopPropagation()
  const img = e.currentTarget
  const pos = imgToPos.get(img)
  if (!pos) return
  const [r,c] = pos
  const p = board[r][c]
  if (!p) return
  if (selected) {
    const legal = generateLegalMoves(selected.r, selected.c)
    if (legal.some(([rr,cc]) => rr===r && cc===c)) {
      movePiece(selected.r, selected.c, r, c)
      selected = null
      clearHighlights()
      currentTurn = currentTurn === 'white' ? 'black' : 'white'
      return
    }
  }
  if (p.color !== currentTurn) return
  selected = { r, c }
  clearHighlights()
  const legal = generateLegalMoves(r,c)
  highlightSquares(legal)
}

function onSquareClick(e) {
  const sq = e.currentTarget
  const idx = squareNodes.indexOf(sq)
  if (idx === -1) return
  const r = Math.floor(idx / BOARD_SIZE), c = idx % BOARD_SIZE
  if (!selected) return
  const legal = generateLegalMoves(selected.r, selected.c)
  if (legal.some(([rr,cc]) => rr===r && cc===c)) {
    movePiece(selected.r, selected.c, r, c)
    selected = null
    clearHighlights()
    currentTurn = currentTurn === 'white' ? 'black' : 'white'
  }
}

function attachHandlers() {
  squareNodes.forEach(sq => sq.addEventListener('click', onSquareClick))
  document.querySelectorAll('.main-container img').forEach(img => img.addEventListener('click', onPieceClick))
}

initBoard()
attachHandlers()
