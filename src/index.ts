//导出编辑器对象
export { AlexEditor as default, AlexEditor } from './Editor'
//导出元素对象
export { AlexElement } from './Element'
//导出历史对象
export { AlexHistory } from './History'
//导出光标点对象
export { AlexPoint } from './Point'
//导出光标范围对象
export { AlexRange } from './Range'
//导出类型
export type { AlexElementRangeType, AlexElementsRangeType, AlexElementConfigType } from './Editor'
export type { AlexElementType, AlexElementCreateConfigType } from './Element'
export type { AlexHistoryRecordsItemType, AlexHistoryResultType } from './History'
//导出版本
export const version = '1.4.18'
//显示版本信息
console.log(`%c alex-editor %c v${version} `, 'padding: 2px 1px; border-radius: 3px 0 0 3px; color: #fff; background: #606060; font-weight: bold;', 'padding: 2px 1px; border-radius: 0 3px 3px 0; color: #fff; background: #42c02e; font-weight: bold;')
