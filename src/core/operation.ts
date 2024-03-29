import { AlexElement } from '../Element'
import { AlexRange } from '../Range'
import { AlexPoint } from '../Point'
import { element as DapElement, data as DapData } from 'dap-util'
import { isContains } from './tool'
import { isUndo, isRedo } from './keyboard'
import { AlexEditor } from '../Editor'

/**
 * 初始化校验stack
 */
export const checkStack = function (this: AlexEditor) {
	const elements = AlexElement.flatElements(this.stack).filter(el => {
		return !el.isEmpty() && !AlexElement.VOID_NODES.includes(el.parsedom!)
	})
	if (elements.length == 0) {
		const ele = new AlexElement('block', AlexElement.BLOCK_NODE, null, null, null)
		const breakEle = new AlexElement('closed', 'br', null, null, null)
		this.addElementTo(breakEle, ele)
		this.stack = [ele]
	}
}

/**
 * 更新焦点的元素为最近的可设置光标的元素
 */
export const setRecentlyPoint = function (this: AlexEditor, point: AlexPoint) {
	const previousElement = this.getPreviousElementOfPoint(point)
	const nextElement = this.getNextElementOfPoint(point)
	const block = point.element.getBlock()
	const inblock = point.element.getInblock()
	if (previousElement && !AlexElement.VOID_NODES.includes(previousElement.parsedom!) && inblock && inblock.isContains(previousElement)) {
		point.moveToEnd(previousElement)
	} else if (nextElement && !AlexElement.VOID_NODES.includes(nextElement.parsedom!) && inblock && inblock.isContains(nextElement)) {
		point.moveToStart(nextElement)
	} else if (previousElement && !AlexElement.VOID_NODES.includes(previousElement.parsedom!) && block.isContains(previousElement)) {
		point.moveToEnd(previousElement)
	} else if (nextElement && !AlexElement.VOID_NODES.includes(nextElement.parsedom!) && block.isContains(nextElement)) {
		point.moveToStart(nextElement)
	} else if (previousElement && !AlexElement.VOID_NODES.includes(previousElement.parsedom!)) {
		point.moveToEnd(previousElement)
	} else if (nextElement && !AlexElement.VOID_NODES.includes(nextElement.parsedom!)) {
		point.moveToStart(nextElement)
	}
}

/**
 * 清空默认行为的内部块元素
 */
export const emptyDefaultBehaviorInblock = function (this: AlexEditor, element: AlexElement) {
	if (!element.isInblock()) {
		return
	}
	if (element.behavior != 'default') {
		return
	}
	if (element.hasChildren()) {
		element.children!.forEach(item => {
			if (item.isInblock()) {
				emptyDefaultBehaviorInblock.apply(this, [item])
			} else {
				item.toEmpty()
				if (item.parent!.isEmpty()) {
					const breakEl = new AlexElement('closed', 'br', null, null, null)
					this.addElementTo(breakEl, item.parent!)
				}
			}
		})
	}
}

/**
 * 判断焦点是否在可视范围内，如果不在则进行设置
 */
export const setRangeInVisible = function (this: AlexEditor) {
	const fn = async (root: HTMLElement) => {
		const scrollHeight = DapElement.getScrollHeight(root)
		const scrollWidth = DapElement.getScrollWidth(root)
		//存在横向或者垂直滚动条
		if (root.clientHeight < scrollHeight || root.clientWidth < scrollWidth) {
			const selection = window.getSelection()!
			if (selection.rangeCount == 0) {
				return
			}
			const range = selection.getRangeAt(0)
			const rects = range.getClientRects()
			let target: Range | HTMLElement = range
			if (rects.length == 0) {
				target = this.range!.focus.element.elm!
			}
			const childRect = target.getBoundingClientRect()
			const parentRect = root.getBoundingClientRect()

			//存在垂直滚动条
			if (root.clientHeight < scrollHeight) {
				//如果光标所在元素不在视图内则滚动到视图内
				if (childRect.top < parentRect.top) {
					await DapElement.setScrollTop({
						el: root,
						number: 0
					})
					const tempChildRect = target.getBoundingClientRect()
					const tempParentRect = root.getBoundingClientRect()
					DapElement.setScrollTop({
						el: root,
						number: tempChildRect.top - tempParentRect.top
					})
				} else if (childRect.bottom > parentRect.bottom) {
					await DapElement.setScrollTop({
						el: root,
						number: 0
					})
					const tempChildRect = target.getBoundingClientRect()
					const tempParentRect = root.getBoundingClientRect()
					DapElement.setScrollTop({
						el: root,
						number: tempChildRect.bottom - tempParentRect.bottom
					})
				}
			}
			//存在横向滚动条
			if (root.clientWidth < scrollWidth) {
				//如果光标所在元素不在视图内则滚动到视图内
				if (childRect.left < parentRect.left) {
					await DapElement.setScrollLeft({
						el: root,
						number: 0
					})
					const tempChildRect = target.getBoundingClientRect()
					const tempParentRect = root.getBoundingClientRect()
					DapElement.setScrollLeft({
						el: root,
						number: tempChildRect.left - tempParentRect.left + 20
					})
				} else if (childRect.right > parentRect.right) {
					await DapElement.setScrollLeft({
						el: root,
						number: 0
					})
					const tempChildRect = target.getBoundingClientRect()
					const tempParentRect = root.getBoundingClientRect()
					DapElement.setScrollLeft({
						el: root,
						number: tempChildRect.right - tempParentRect.right + 20
					})
				}
			}
		}
	}
	if (this.range && this.range.focus.element.elm) {
		let root = this.range.focus.element.elm
		while (DapElement.isElement(root) && root != document.documentElement) {
			fn(root)
			root = <HTMLElement>root.parentNode
		}
	}
}

/**
 * 判断stack是否为空，为空则进行初始化
 */
export const handleStackEmpty = function (this: AlexEditor) {
	const elements = AlexElement.flatElements(this.stack).filter(el => {
		return !el.isEmpty() && !AlexElement.VOID_NODES.includes(el.parsedom!)
	})
	if (elements.length == 0) {
		const ele = new AlexElement('block', AlexElement.BLOCK_NODE, null, null, null)
		const breakEle = new AlexElement('closed', 'br', null, null, null)
		this.addElementTo(breakEle, ele)
		this.stack = [ele]
		if (this.range) {
			this.range.anchor.moveToStart(breakEle)
			this.range.focus.moveToStart(breakEle)
		}
	}
}

/**
 * 监听selection改变
 */
export const handleSelectionChange = function (this: AlexEditor) {
	//如果是中文输入则不更新range
	if (this.__isInputChinese) {
		return
	}
	//如果是内部修改range则不触发
	if (this.__innerSelectionChange) {
		return
	}
	const selection = window.getSelection()
	if (selection && selection.rangeCount) {
		const range = selection.getRangeAt(0)
		if (isContains(this.$el, <HTMLElement>range.startContainer) && isContains(this.$el, <HTMLElement>range.endContainer)) {
			let anchorNode = null
			let focusNode = null
			let anchorOffset = null
			let focusOffset = null
			//如果起点所在是文本节点
			if (range.startContainer.nodeType == 3) {
				anchorNode = range.startContainer.parentNode
				anchorOffset = range.startOffset
			}
			//如果起点所在是元素节点
			else if (range.startContainer.nodeType == 1) {
				const childNodes = Array.from(range.startContainer.childNodes)
				if (childNodes.length) {
					anchorNode = childNodes[range.startOffset] ? childNodes[range.startOffset] : childNodes[range.startOffset - 1]
					anchorOffset = childNodes[range.startOffset] ? 0 : 1
					if (anchorNode.nodeType == 3) {
						anchorOffset = anchorOffset == 0 ? 0 : anchorNode.textContent!.length
						anchorNode = anchorNode.parentNode
					}
				}
				//如果没有子节点，表示是被认为是closed的元素
				else {
					anchorNode = range.startContainer
					anchorOffset = 0
				}
			}
			//如果终点所在是文本节点
			if (range.endContainer.nodeType == 3) {
				focusNode = range.endContainer.parentNode
				focusOffset = range.endOffset
			}
			//如果终点所在是元素节点
			else if (range.endContainer.nodeType == 1) {
				const childNodes = Array.from(range.endContainer.childNodes)
				if (childNodes.length) {
					focusNode = childNodes[range.endOffset] ? childNodes[range.endOffset] : childNodes[range.endOffset - 1]
					focusOffset = childNodes[range.endOffset] ? 0 : 1
					if (focusNode.nodeType == 3) {
						focusOffset = focusOffset == 0 ? 0 : focusNode.textContent!.length
						focusNode = focusNode.parentNode
					}
				}
				//如果没有子节点，表示是被认为是closed的元素
				else {
					focusNode = range.endContainer
					focusOffset = 1
				}
			}
			const anchorKey = DapData.get(<HTMLElement>anchorNode, 'data-alex-editor-key')
			const focusKey = DapData.get(<HTMLElement>focusNode, 'data-alex-editor-key')
			const anchorEle = this.getElementByKey(anchorKey)
			const focusEle = this.getElementByKey(focusKey)
			const anchor = new AlexPoint(<AlexElement>anchorEle, anchorOffset!)
			const focus = new AlexPoint(<AlexElement>focusEle, focusOffset!)
			if (this.range) {
				this.range.anchor = anchor
				this.range.focus = focus
			} else {
				this.range = new AlexRange(anchor, focus)
			}
			this.history.updateCurrentRange(this.range)
			this.emit('rangeUpdate', this.range)
		}
	}
}

/**
 * 监听beforeinput
 */
export const handleBeforeInput = function (this: AlexEditor, e: Event) {
	if (this.disabled) {
		return
	}
	//以下输入类型不进行处理
	if ((<InputEvent>e).inputType == 'deleteByCut' || (<InputEvent>e).inputType == 'insertFromPaste' || (<InputEvent>e).inputType == 'deleteByDrag' || (<InputEvent>e).inputType == 'insertFromDrop') {
		return
	}
	//禁用系统默认行为
	e.preventDefault()
	//插入文本
	if ((<InputEvent>e).inputType == 'insertText' && (<InputEvent>e).data) {
		this.insertText((<InputEvent>e).data!)
		this.formatElementStack()
		this.domRender()
		this.rangeRender()
	}
	//插入段落
	else if ((<InputEvent>e).inputType == 'insertParagraph' || (<InputEvent>e).inputType == 'insertLineBreak') {
		this.insertParagraph()
		this.formatElementStack()
		this.domRender()
		this.rangeRender()
	}
	//删除内容
	else if ((<InputEvent>e).inputType == 'deleteContentBackward') {
		this.delete()
		this.formatElementStack()
		this.domRender()
		this.rangeRender()
	}
}

/**
 * 监听中文输入
 */
export const handleChineseInput = function (this: AlexEditor, e: Event) {
	if (this.disabled) {
		return
	}
	e.preventDefault()
	if (e.type == 'compositionstart') {
		//每次开始输入中文时先清除延时器
		if (this.__chineseInputTimer) {
			clearTimeout(this.__chineseInputTimer)
			this.__chineseInputTimer = null
		}
		//改变标识
		this.__isInputChinese = true
	} else if (e.type == 'compositionend') {
		//在中文输入结束后插入数据
		if ((<InputEvent>e).data) {
			this.insertText((<InputEvent>e).data!)
			this.formatElementStack()
			this.domRender()
			this.rangeRender()
		}
		//加上延时器避免过早修改中文输入标识导致删除中文拼音时触发range更新
		this.__chineseInputTimer = setTimeout(() => {
			this.__isInputChinese = false
		}, 0)
	}
}

/**
 * 监听键盘按下
 */
export const handleKeydown = function (this: AlexEditor, e: Event) {
	if (this.disabled) {
		return
	}
	if (this.__isInputChinese) {
		return
	}
	//撤销
	if (isUndo(<KeyboardEvent>e)) {
		e.preventDefault()
		const historyRecord = this.history.get(-1)
		if (historyRecord) {
			this.history.current = historyRecord.current
			this.stack = historyRecord.stack
			this.range = historyRecord.range
			this.formatElementStack()
			this.domRender(true)
			this.rangeRender()
		}
	}
	//重做
	else if (isRedo(<KeyboardEvent>e)) {
		e.preventDefault()
		const historyRecord = this.history.get(1)
		if (historyRecord) {
			this.history.current = historyRecord.current
			this.stack = historyRecord.stack
			this.range = historyRecord.range
			this.formatElementStack()
			this.domRender(true)
			this.rangeRender()
		}
	}
}

/**
 * 监听编辑器复制
 */
export const handleCopy = async function (this: AlexEditor, e: Event) {
	e.preventDefault()
	await this.copy()
}

/**
 * 监听编辑器剪切
 */
export const handleCut = async function (this: AlexEditor, e: Event) {
	e.preventDefault()
	const result = await this.cut()
	if (result && !this.disabled) {
		this.formatElementStack()
		this.domRender()
		this.rangeRender()
	}
}

/**
 * 监听编辑器粘贴
 */
export const handlePaste = async function (this: AlexEditor, e: Event) {
	e.preventDefault()
	if (this.disabled) {
		return
	}
	await this.paste()
	this.formatElementStack()
	this.domRender()
	this.rangeRender()
}

/**
 * 监听编辑器拖拽和拖放
 */
export const handleDragDrop = function (this: AlexEditor, e: Event) {
	e.preventDefault()
}

/**
 * 监听编辑器获取焦点
 */
export const handleFocus = function (this: AlexEditor) {
	if (this.disabled) {
		return
	}
	this.emit('focus', this.value)
}

/**
 * 监听编辑器失去焦点
 */
export const handleBlur = function (this: AlexEditor) {
	if (this.disabled) {
		return
	}
	this.emit('blur', this.value)
}
