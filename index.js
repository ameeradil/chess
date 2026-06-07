alert('Iam currnetly working on this project')

// //Things I have learned from this project:
// //1) when you do querySelectorAll you got NodeArray not Array so be careful

//2) the calbacks inside the addEventListener only accept event object nothing else

//3) qureySelector can select the child inside the parent (.main-container .square)



const pieces = document.querySelectorAll('.main-container img')
const squares = document.querySelectorAll('.main-container .square')

let selectedPiece = null

pieces.forEach(piece => {
    piece.addEventListener('click', (e) => {
        e.stopPropagation()
        selectedPiece = piece
    })
})

squares.forEach(square => {
    square.addEventListener('click', () => {
        if (!selectedPiece) return
        square.appendChild(selectedPiece)
        selectedPiece = null
    })
})