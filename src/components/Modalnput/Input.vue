<!--
  输入组件

  虚拟键盘使用：https://github.com/hodgef/simple-keyboard
  拼音输入参考：https://github.com/sxei/pinyinjs/
  simple-keyboard也支持中文提示，但是不太符合使用习惯，所以这边没使用。
-->
<script setup lang="ts">
import { ref, nextTick, watch, inject } from 'vue'
import PinYin from '@/utils/SimpleInputMethod'
import { ElMessageBox } from 'element-plus'
import Keyboard from 'simple-keyboard'
import keycode from 'keycode'
import { ipcRenderer } from 'electron'
// import HandWriting from '../HandWriting.vue'
import 'simple-keyboard/build/css/index.css'
import { debounce } from '@/utils/CommonUtils'

export interface Props {
  id?: string
  title?: string
  modelValue: string
  ruleName?: string
  placeholder?: string
  type?: string
  border?: boolean
  disabled?: boolean
}
interface PinyinResult {
  finish: boolean
  currentPage: number
  totalPage: number
  inputValue: string
  hasNext: boolean
  hasPre: boolean
  data: string[]
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  title: '',
  ruleName: undefined,
  placeholder: undefined,
  type: 'text',
  border: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'confirm'): void
}>()

const EN = '1',
  CH = '2',
  EN_UPPER = '3'

const handWritingSoftware: string = inject('handWritingSoftware') + ''

// 外层的input 元素
const input = ref<InstanceType<typeof HTMLInputElement>>()
// 外层的input元素的值
const inputValue = ref(props.modelValue)
// dialog显示标志
const dialogVisible = ref(false)
const mode = ref('pinyin')

// const handWriting = ref<InstanceType<typeof HandWriting>>()
// dialog展开后显示的input值
const value = ref(props.modelValue)

// simple-keyboard对象
const keyBoard = ref<InstanceType<typeof Keyboard>>()
// 拼音输入匹配的结果集
const pinyinMatchResult = ref<Array<string>>([])
const hasPre = ref(false)
const hasNext = ref(true)

// 拼音对象
const pinyin = new PinYin()
pinyin.initDict()

// 保存拼音输入确定前的值，确保输入框中显示的是: 旧值+输入中的值； 符合使用习惯。
let originalValue: string
// 当前input框的selectionStart
let currentSelectionStart: number | null = 0

// 当前的输入法状态，1:英文 2:中文 3:大写
let inputMode = CH

const setSelection = debounce(() => {
  input!.value!.setSelectionRange(
    currentSelectionStart!,
    currentSelectionStart!
  )
}, 300)

const open = () => {
  if (props.disabled) {
    return
  }
  dialogVisible.value = true
  // 新打开窗口也要保存原有值
  originalValue = value.value
  // 更新 currentSelection的值
  nextTick(() => {
    setTimeout(() => {
      input.value?.focus()
      updateCurrentSelection()
    }, 500)
    if (mode.value === 'pinyin') {
      initKeyboard()
    }
  })
}

const initKeyboard = () => {
  // console.log('keyBoard.value', keyBoard.value)
  if (keyBoard.value == undefined) {
    let defaultLayout = undefined
    if (props.type === 'number') {
      defaultLayout = {
        ch: ['1 2 3', '4 5 6', '7 8 9', '0 - {bksp}'],
      }
    } else
      defaultLayout = {
        en: [
          '1 2 3 4 5 6 7 8 9 0 {bksp}',
          '{En} q w e r t y u i o p',
          '{lock} a s d f g h j k l',
          '{switch} z x c v b n m',
          '{hand} @ {space}',
        ],
        EN: [
          '1 2 3 4 5 6 7 8 9 0 {bksp}',
          '{En} Q W E R T Y U I O P',
          '{lock} A S D F G H J K L',
          '{switch} Z X C V B N M',
          '{hand} @ {space}',
        ],
        ch: [
          '1 2 3 4 5 6 7 8 9 0 {bksp}',
          '{Ch} q w e r t y u i o p',
          '{lock} a s d f g h j k l',
          '{switch} z x c v b n m',
          '{hand} @ {space}',
        ],
      }
    // 初始化虚拟键盘
    keyBoard.value = new Keyboard(props.id, {
      keyboardDOMClass: 'simple-keyboard1',
      mergeDisplay: true,
      // 两个布局，中/英输入
      layoutName: 'ch',
      layout: defaultLayout,
      display: {
        '{En}': '英',
        '{Ch}': '中',
        '{switch}': '英/中',
        '{lock}': '大小写',
        '{bksp}': '删',
        '{hand}': '手写',
      },
      onKeyPress: (button: string, e: MouseEvent | undefined) => {
        let result: any = null
        // 如果点击的是输入法切换，改变布局
        if (button === '{switch}') {
          // 如果是中文，就变成英文；反之亦然。
          if (inputMode === CH) {
            inputMode = EN
            // 切换时重置拼音输入的状态
            pinyin.reset()
            pinyinMatchResult.value = []
          } else {
            inputMode = CH
            // 切换到中文或着大写后，保存原始值，因为两者处理逻辑一致
            originalValue = value.value
          }
          // 改变键盘布局
          keyBoard.value?.setOptions({
            layoutName: inputMode === CH ? 'ch' : 'en',
          })
          // 如果点击中/英的按钮，忽略
        } else if (button === '{En}' || button === '{Ch}') {
          return
        } else if (button === '{lock}') {
          // 如果当然是大写状态，就变成小写，否则一律变为大写
          // 切换时重置拼音输入的状态
          pinyin.reset()
          pinyinMatchResult.value = []
          if (inputMode === EN_UPPER) {
            inputMode = EN
          } else {
            inputMode = EN_UPPER
            // 切换到中文或着大写后，保存原始值，因为两者处理逻辑一致
            originalValue = value.value
          }

          keyBoard.value?.setOptions({
            layoutName: inputMode === EN_UPPER ? 'EN' : 'en',
          })
        } else if (button === '{hand}') {
          turnHandWritingMode()
        } else {
          // 输入分为 小写英文 中文 大写英文；根据ASCII码来看，并忽略中文符号的区别，具体可以分为两类处理：小写英文 和 大写+中文
          if (inputMode === EN) {
            // 删除按钮
            if (button === '{bksp}') {
              deleteSelectionBySelection()
              // 空格
            } else if (button === '{space}') {
              insertSelectionBySelection(' ')
              // 再保存变更前的值，为下次输入做准备
              originalValue = value.value
            } else {
              insertSelectionBySelection(button)
              // 再保存变更前的值，为下次输入做准备
              originalValue = value.value
            }
          } else {
            // 中文输入
            if (button === '{bksp}') {
              // 记录删前的拼音匹配数
              const preDeleteCount = pinyinMatchResult.value.length

              result = pinyin.input(keycode.codes.backspace)
              value.value = originalValue + result.inputValue
              // console.log('删除', result)
              // 区分当前是否输完中文了，即判断result.finish是否为true
              if (result.finish) {
                console.log('preDeleteCount', preDeleteCount)
                // 只有在删前的拼音匹配数等于0，此时表示删除输入的拼音删完后的删除操作，避免只是删除拼音的操作也当成是删除汉字的操作
                preDeleteCount === 0 && deleteSelectionBySelection()
                pinyinMatchResult.value = []
              }
            } else if (button === '{space}') {
              // 空格，在选词时，默认第一个
              result = pinyin.input(keycode.codes.space)
            } else {
              result = pinyin.input(button.charCodeAt(0))
            }
            console.log('result', result)
            pinyinMatchResult.value = result.data
            if (result != null) {
              if (result.finish && result.inputValue.length > 0) {
                // 如果没有候选的拼音匹配结果，代表输入结束，最终值等于： 拼音输入前的值+选择的词
                // value.value = originalValue + result.inputValue
                insertSelectionBySelection(result.inputValue)
                // 再保存变更前的值，为下次输入做准备
                originalValue = value.value
              } else {
                // 如果还在输入，最终值等于： 拼音输入前的值+当前输入的值
                insertPinyinProcess(result.inputValue)
              }
            }
          }
          setPageUpDownStatus(result)
          // 完成赋值
          inputValue.value = value.value
          emit('update:modelValue', inputValue.value)
        }
      },
    })
  }
}

const handleClose = (done: () => void) => {
  clearPinyin()
  emit('update:modelValue', value.value)
  done()
}

// reset的时候，把拼音输入的状态一并重置
const reset = () => {
  value.value = ''
  inputValue.value = ''
  originalValue = ''
  currentSelectionStart = 0
  pinyin.reset()
  pinyinMatchResult.value = []
  input.value?.focus()
  emit('update:modelValue', value.value)
}

// 取消拼音输入的状态，没有选择的结果也不选了
const clearPinyin = () => {
  pinyin.reset()
  hasNext.value = true
  hasPre.value = false
  // keyBoard.value?.destroy()
  // keyBoard.value = undefined
  pinyinMatchResult.value = []
  originalValue = ''
  inputValue.value = value.value
}

const close = () => {
  clearPinyin()
  emit('confirm')
  emit('update:modelValue', value.value)
  dialogVisible.value = false
}

const onBlur = () => {
  input.value?.focus()
}

const onKeyUp = (event: KeyboardEvent) => {
  inputValue.value = value.value
  emit('update:modelValue', inputValue.value)
  if (event.key === 'Enter') {
    emit('confirm')
    dialogVisible.value = false
  }
}

// 更新当前的selection记录
const updateCurrentSelection = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  currentSelectionStart = input.value!.selectionStart
}

// 选择汉字
const selectHanzi = (index: number) => {
  const result = pinyin.input((index + '').charCodeAt(0))

  if (result != null) {
    pinyinMatchResult.value = result.data

    if (result.finish) {
      insertSelectionBySelection(result.inputValue)
      // 再保存变更前的值，为下次输入做准备
      originalValue = value.value
    } else {
      // 如果还在输入，最终值等于： 拼音输入前的值+当前输入的值
      insertPinyinProcess(result.inputValue)
    }
  }
}

const pageUp = () => {
  if (!hasPre.value) {
    return
  }
  const result = pinyin.input(33)
  if (result != null) {
    pinyinMatchResult.value = result.data
    setPageUpDownStatus(result)
  }
}

const pageDown = () => {
  if (!hasNext.value) {
    return
  }
  const result = pinyin.input(34)
  if (result != null) {
    pinyinMatchResult.value = result.data
    setPageUpDownStatus(result)
    // hasPre.value = result.hasPre
    // hasNext.value = result.hasNext
  }
}

const setPageUpDownStatus = (result: PinyinResult | null) => {
  if (result) {
    hasPre.value = result.hasPre
    hasNext.value = result.hasNext
  }
}

const turnHandWritingMode = () => {
  keyBoard.value?.destroy()
  keyBoard.value = undefined
  mode.value = 'hand'
  switchHandWritingComp(handWritingSoftware)
}

const turnPinyinMode = () => {
  mode.value = 'pinyin'
  switchHandWritingComp('kill' + handWritingSoftware)
  originalValue = value.value
  updateCurrentSelection()
  nextTick(() => {
    initKeyboard()
  })
}

const switchHandWritingComp = (handle: string) => {
  ipcRenderer
    .invoke(handle)
    .then((result) => {
      if (!result.isOpenSuccess) {
        ElMessageBox.alert(result.error, '失败', {
          confirmButtonText: '关闭',
        })
      } else {
        setTimeout(() => {
          input.value?.focus()
        }, 500)
      }
    })
    .catch((err) => {
      ElMessageBox.alert(err.error, '失败', {
        confirmButtonText: '关闭',
      })
    })
}

const deleteInput = () => {
  ipcRenderer.invoke('key:tap', keycode.codes.backspace).then(() => {
    originalValue = value.value
    updateCurrentSelection()
    emit('update:modelValue', value.value)
  })
}

// 通过user32.dll，调用删除按键
const deleteSelectionBySelection = () => {
  ipcRenderer.invoke('key:tap', keycode.codes.backspace).then(() => {
    // console.log('after delete: ', value.value)
    originalValue = value.value
    // 更新当前的selection
    updateCurrentSelection()
  })

  // setSelection()
}

// 通过全局保存的selectionStart位置在指定位置插入字符
const insertSelectionBySelection = (insertChar: string) => {
  // console.log('当前的selectionStart: ', input.value?.selectionStart)
  console.log('current selectrion: ', currentSelectionStart)
  const current =
    currentSelectionStart !== null
      ? currentSelectionStart
      : input.value?.selectionStart
  if (
    input.value !== null &&
    input.value !== undefined &&
    current !== undefined &&
    current !== null
  ) {
    value.value =
      originalValue.slice(0, current) +
      insertChar +
      originalValue.slice(current, originalValue.length)

    // 插入的时候，selectionStart位置手动+插入字符串的长度
    currentSelectionStart = current + insertChar.length
    setSelection()
  } else {
    value.value += insertChar
  }
}

const insertPinyinProcess = (insertChar: string) => {
  let theSelectionStart = currentSelectionStart ? currentSelectionStart : 0
  if (input.value !== null && input.value !== undefined) {
    value.value =
      originalValue.slice(0, theSelectionStart) +
      insertChar +
      originalValue.slice(theSelectionStart, originalValue.length)

    // 插入的时候，selectionStart位置手动+1
    theSelectionStart += insertChar.length

    nextTick(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      input!.value!.focus()
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      input!.value!.setSelectionRange(theSelectionStart, theSelectionStart)
    })
  }
}

watch(
  () => props.modelValue,
  (currValue, prevValue) => {
    value.value = currValue
    inputValue.value = value.value
  }
)
defineExpose({
  open,
})
</script>
<template>
  <el-form-item :prop="ruleName" style="width: 100%">
    <el-input :id="id" v-model="inputValue" :clearable="true" :class="[border ? '' : 'non-border', 'input']"
      style="width: 100%" :disabled="props.disabled" size="large" :placeholder="placeholder" @click="open" />
  </el-form-item>
  <div>
    <el-dialog v-model="dialogVisible" width="90%" top="50px" :show-close="false" :close-on-click-modal="false"
      :before-close="handleClose" :append-to-body="true" class="custom_modal">
      <template #title>
        <div style="padding: 5px 10px; font-size: 20px">
          {{ title }}
        </div>
      </template>

      <div class="modal_input input_bar">
        <div class="modal_input input_form">
          <input id="modal_input" ref="input" v-model="value" class="modal_input input" autocomplete="off"
            autocorrect="off" autofocus autocapitalize="off" spellcheck="false" :placeholder="placeholder" maxlength="64"
            type="text" @blur="onBlur" @click="updateCurrentSelection" @keyup="onKeyUp" />

          <button type="button" title="Clear the input" class="reset" @click="reset">
            <svg class="icon" viewBox="0 0 1024 1024" width="32" height="32">
              <path
                d="M550.848 502.496l308.64-308.896a31.968 31.968 0 1 0-45.248-45.248l-308.608 308.896-308.64-308.928a31.968 31.968 0 1 0-45.248 45.248l308.64 308.896-308.64 308.896a31.968 31.968 0 1 0 45.248 45.248l308.64-308.896 308.608 308.896a31.968 31.968 0 1 0 45.248-45.248l-308.64-308.864z"
                fill="#0057c2"></path>
            </svg>
          </button>
        </div>
        <div v-if="mode == 'pinyin'">
          <div class="simple-input-method">
            <div v-show="pinyinMatchResult.length > 0" class="result">
              <ol>
                <li v-for="(item, index) in pinyinMatchResult" :key="'py_' + index" @click="selectHanzi(index + 1)">
                  {{ item }}
                </li>
              </ol>
              <div class="page-up-down">
                <span :class="['page-up', hasPre ? '' : 'disabled']" @click="pageUp">▲</span>
                <span :class="['page-down', hasNext ? '' : 'disabled']" @click="pageDown">▼</span>
              </div>
            </div>
          </div>
          <div :class="props.id"></div>
        </div>
        <div v-else>
          <el-row style="
              margin-top: 5px;
              display: flex;
              justify-content: space-around;
            ">
            <el-button :icon="'CaretLeft'" type="primary" @click="deleteInput">删除</el-button>
            <el-button :icon="'EditPen'" type="primary"
              @click="switchHandWritingComp(handWritingSoftware)">显示输入板</el-button>
            <el-button type="primary" @click="turnPinyinMode">拼音输入</el-button>
          </el-row>
        </div>
      </div>
      <div class="modal_footer close_btn">
        <el-button icon="Select" size="large" type="primary" @click="close">确 认</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ModalInputV2',
})
</script>

<style scoped>
.custom_modal {
  --el-dialog-padding-primary: 0px;
}

.input_bar {
  /* display: flex; */
  padding: 2px 12px 0;
}

.input_form {
  align-items: center;
  background: #fff;
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px #0057c2;
  display: flex;
  height: 56px;
  margin: 0;
  padding: 0 12px;
  position: relative;
  /* width: 100%; */
}

.input {
  appearance: none;
  background: 0 0;
  border: 0;
  color: #1c1e21;
  flex: 1;
  font-size: 1.2em;
  height: 100%;
  outline: 0;
  padding: 0 0 0 0;
  width: 80%;
}

.reset {
  animation: 0.1s ease-in forwards f;
  appearance: none;
  background: none;
  border-radius: 50%;
  color: #0057c2;
  padding: 2px;
  right: 0;
  border: 0;
  align-items: center;
  display: flex;
  justify-content: center;
}

.modal_footer {
  margin-top: 10px;
  text-align: center;
}

.simple-input-method {
  background: #fff;
  border: solid 1px #b5c5d2;
  font-family: 'Arial';
  color: #0364cd;
  min-height: 48px;
  border-radius: 2px;
}

.simple-input-method .result {
  padding: 4px 10px 4px 0px;
}

.simple-input-method .result ol {
  font-size: 25px;
  margin: 0;
  padding: 0;
  display: inline-block;
  vertical-align: middle;
}

.simple-input-method .result ol:after {
  content: '';
  display: block;
  clear: left;
}

.simple-input-method .result ol li {
  float: left;
  margin-left: 30px;
  cursor: pointer;
  padding-left: 4px;
  padding-right: 6px;
}

.simple-input-method .result ol li:first-child {
  color: red;
}

.simple-input-method .page-up-down {
  display: inline-block;
  border: solid 1px #badbff;
  font-size: 25px;
  color: #4c9aef;
  border-radius: 1px;
  margin-left: 20px;
  vertical-align: middle;
}

.simple-input-method .page-up-down .page-down {
  border-left: solid 1px #badbff;
}

.simple-input-method .page-up-down .page-up.disabled {
  color: #dcdfe6;
  cursor: not-allowed;
}

.simple-input-method .page-up-down .page-down.disabled {
  border-left: solid 1px #badbff;
  color: #dcdfe6;
  cursor: not-allowed;
}

.simple-input-method .page-up-down span {
  cursor: pointer;
}

.simple-input-method .page-up-down span.disable {
  opacity: 0.3;
}

.handwriting-area {
  margin-top: 5px;
}

.char-picker {
  border: 1px solid #a0a0a0;
  padding: 3px;
  height: 70px;
  width: 100%;
  font-size: 48px;
  background-color: #fafafa;
  overflow: hidden;
  color: #606060;
}

.hg-theme-default ::v-deep(.hg-button) {
  height: 80px;
  font-size: 35px;
}

.el-input,
::v-deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #333333 inset;
  border-radius: 3px;
}

.el-dialog ::v-deep(.el-dialog__header) {
  margin-top: 20px;
}
</style>
