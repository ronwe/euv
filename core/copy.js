
function copyText(text) {
    var textField = document.createElement('textarea')
    textField.innerText = text
    document.body.appendChild(textField)
    textField.select()
    document.execCommand('copy')
    textField.remove()
}

function selectNode(node){
	var selection = window.getSelection()
	var range = document.createRange()
	range.selectNode(node)
	selection.removeAllRanges()
	selection.addRange(range)
} 

exports.selectNode = selectNode
exports.copyText = copyText
