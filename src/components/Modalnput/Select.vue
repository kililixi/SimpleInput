<script setup lang="ts">
  /**
   * 2022-09-14 14:58:40
   * modal+select 下拉框：modal和select组合，调整了样式，使用方式为：一个实例需求一个组件。
   * 
   * 还没搞定如何传入内容不同的json数组，然后再通过传入的KeyPair对象来解析生成select 的 option，如：
   * 
   * [{
      "code": "china",
      "name": "中国",
      "key": "cn"
      }]
     配合 new SelectKeyValuePair('code', 'name')

     或者

     [{
      "place": "bj",
      "cplace": "北京",
      "key": "bj"
      },]
      配合 new SelectKeyValuePair('code', 'name')
      再监听props来变更data属性，实现一个实例即可应付复数的下拉框需求。

      可是没明白如何在父组件中，如何给一个指定的ref(传入本组件的)对象，一个对象属性不同的json数组(上面例子)，ts总是报错。
   * 
   */

  import { ref, nextTick, watch, Ref } from 'vue'
  import SelectKeyValuePair from '@/model/SelectKeyValuePair'
  import Keyboard from 'simple-keyboard'
  import 'simple-keyboard/build/css/index.css'
  // import { debounce } from '@/utils/CommonUtils'

  export interface IStringIndex {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  export interface Props {
    id?: string
    title?: string
    modelValue: string
    disabled?: boolean
    ruleName?: string
    placeholder?: string
    data: IStringIndex[]
    optimization?: boolean
    border?: boolean
    keyNamePair: SelectKeyValuePair
  }

  const props = withDefaults(defineProps<Props>(), {
    id: undefined,
    title: '',
    ruleName: undefined,
    placeholder: '请选择您的选项',
    optimization: false,
    border: true,
  })

  const emit = defineEmits<{
    (e: 'change', value: IStringIndex): void
    (e: 'update:modelValue', value: string): void
  }>()

  const select = ref<InstanceType<typeof ElSelect>>()
  // simple-keyboard对象
  const keyBoard = ref<InstanceType<typeof Keyboard>>()

  // const select = ref(null)
  const value = ref(props.modelValue)

  let isClickTrigger = false
  // 是否首次打开，此时如果有输入，将是 = 而不是 +
  let isFirstOpen = true

  // 显示在input框的值，取 text
  const inputValue = ref(props.modelValue)
  const defaultValue = props.data.find(
    (v) => v[props.keyNamePair.keyName] === props.modelValue
  )
  // console.log('defaultValue', props.title, props.data, props.modelValue)
  if (defaultValue !== undefined) {
    inputValue.value = defaultValue[props.keyNamePair.valueName]
  }
  const dialogVisible = ref(false)
  let dataSource: Ref<Array<IStringIndex>>
  // 如果需要优化选项过多的情况，一开始并不加载全部选项
  if (props.optimization) {
    // 如果有默认选项，dataSource即为当前的选项
    if (defaultValue !== undefined) {
      dataSource = ref<Array<IStringIndex>>([defaultValue])
    } else {
      dataSource = ref<Array<IStringIndex>>([])
    }
  } else {
    dataSource = ref(props.data)
  }

  function prepare() {
    dialogVisible.value = true
    nextTick(() => {
      setTimeout(() => {
        select.value?.focus()
      }, 500)
      select.value?.toggleMenu()
      // 打开菜单后，调用focus方法
      // const selectEle = document.querySelector(
      //   '.el-dialog .el-select .el-input__inner'
      // ) as HTMLVideoElement
      // selectEle.focus()
      if (keyBoard.value == undefined) {
        keyBoard.value = new Keyboard(props.id, {
          keyboardDOMClass: 'simple-keyboard1',
          mergeDisplay: true,
          layoutName: 'default',
          layout: {
            default: [
              'q w e r t y u i o p',
              'a s d f g h j k l',
              'z x c v b n m {backspace}',
            ],
          },
          display: {
            '{backspace}': '删',
          },
          onKeyPress: (button: string) => {
            // console.log('getInput', keyBoard.value?.getInput())
            if (button === '{backspace}') {
              if (value.value.length > 0) {
                value.value = value.value.slice(0, value.value.length - 1)
                // if (value.value.length === 0) {
                //   keyBoard.value?.clearInput()
                // }
              }
            } else {
              if (isFirstOpen) {
                value.value = button
                isFirstOpen = false
              } else {
                value.value = value.value + button
              }

              setTimeout(() => {
                select.value?.focus()
                filterData(value.value)
              }, 500)
            }
          },
        })
      }
    })
  }

  const open = () => {
    if (props.disabled) {
      return
    }
    prepare()
  }

  const clear = () => {
    inputValue.value = ''
    value.value = ''
    emit('update:modelValue', '')
  }

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      prepare()
    }
  }

  const onSelectChange = (value: string) => {
    isClickTrigger = true
    // 选中后，再次输入的时候，当作 =
    isFirstOpen = true
    const selectValue = props.data.find(
      (v) => v[props.keyNamePair.keyName] === value
    )
    if (selectValue !== undefined) {
      // value = selectValue[props.keyNamePair.valueName]
      emit('change', selectValue)
      // 赋note的值给inputValue
      inputValue.value = selectValue[props.keyNamePair.valueName]
    }

    emit('update:modelValue', value)
    // 退出时清空keyboard对象内部的值，防止
    keyBoard.value?.clearInput()
    dialogVisible.value = false
  }
  const filterData = (filterText: string) => {
    if (filterText == '') {
      if (props.optimization) {
        return
      } else {
        dataSource.value = props.data
      }
    }
    filterText = filterText.toUpperCase()
    dataSource.value = props.data.filter((v) => {
      return (
        v[props.keyNamePair.keyName].indexOf(filterText) === 0 ||
        v[props.keyNamePair.valueName].indexOf(filterText) === 0 ||
        (props.keyNamePair.keyTip
          ? v[props.keyNamePair.keyTip].indexOf(filterText) === 0
          : false)
      )
    })
  }
  const handleClose = (done: () => void) => {
    keyBoard.value?.clearInput()
    done()
  }

  // 使用 指令的 updated参数来聚焦input的话，触发次数太多了，性能不好
  // mounted 没有达到效果,因为要先toggleMenu展开菜单，这时focus方法没有效果。
  const vFocus = {
    mounted: (el: {
      querySelector: (arg0: string) => {
        (): any
        new (): any
        click: { (): void; new (): any }
        focus: { (): void; new (): any }
      }
    }) => {
      el.querySelector('.select-trigger').click()
      el.querySelector('.el-input__inner').focus()
    },
  }

  // watchEffect(() => {
  //   // 会在 props 变化时打印
  //   console.log('watchEffect', props.modelValue, props.title)
  // })

  watch(props, () => {
    /* 深层级变更状态所触发的回调
       但是手动选择值的时候也会触发该方法
    */
    if (isClickTrigger) {
      isClickTrigger = false
      return
    }
    // console.log('watch value', props, props.data.length, props.keyNamePair)
    // 如果新变更的值 modelValue 与 旧的值不相等，变更新的值
    if (props.modelValue != value.value) {
      const defaultValue = props.data.find(
        (v) => v[props.keyNamePair.keyName] === props.modelValue
      )
      // console.log('watch defaultValue', defaultValue)
      if (defaultValue !== undefined) {
        // 如果是需要优化的，此时需要变更dataSource
        if (props.optimization) {
          dataSource.value = [defaultValue]
        }
        inputValue.value = defaultValue[props.keyNamePair.valueName]
        value.value = props.modelValue
      }
    }
  })

  defineExpose({
    open,
    clear,
  })
</script>
<template>
  <el-form-item :prop="ruleName" style="width: 100%">
    <el-input
      :id="id"
      ref="iii"
      v-model="inputValue"
      :class="[border ? '' : 'non-border', 'input']"
      style="width: 100%"
      size="large"
      :disabled="props.disabled"
      :placeholder="placeholder"
      @keyup="onKeyPress"
      @click="open"
    />
  </el-form-item>
  <div>
    <el-dialog
      v-model="dialogVisible"
      width="70%"
      top="50px"
      :show-close="false"
      class="custom_modal"
      :before-close="handleClose"
    >
      <template #title>
        <div style="padding: 5px 10px; font-size: 20px">
          {{ title }}
        </div>
      </template>
      <div class="input_bar">
        <div :class="props.id"></div>
      </div>
      <div class="modal_input input_bar">
        <form class="modal_input input_form">
          <el-select
            ref="select"
            v-model="value"
            filterable
            :filter-method="filterData"
            class="el-select"
            :placeholder="placeholder"
            :value-key="keyNamePair.valueName"
            size="large"
            @change="onSelectChange"
          >
            <el-option
              v-for="item in dataSource"
              :key="item[keyNamePair.keyName]"
              :label="item[keyNamePair.valueName]"
              :value="item[keyNamePair.keyName]"
            />
          </el-select>
        </form>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import { ElSelect } from 'element-plus'
  export default defineComponent({
    name: 'ModalSelect',
  })
</script>

<style scoped>
  :deep() .el-select {
    height: 100%;
    width: 100%;
    color: #0057c2;
  }

  :deep() .select-trigger {
    height: 100%;
  }

  :deep() .el-input {
    height: 100%;
  }

  .el-select,
  :deep() .el-input.is-focus .el-input__wrapper {
    box-shadow: inset 0 0 0 2px #0057c2 !important;
  }

  :deep() .el-input__wrapper .el-input__inner {
    font-size: 1em;
  }

  .el-input__wrapper,
  :deep() .el-input__prefix {
    color: #0057c2 !important;
  }

  .el-input__wrapper,
  :deep() .el-input__suffix {
    color: #0057c2 !important;
  }
  .input_bar {
    display: flex;
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
    position: relative;
    width: 100%;
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

  .hg-theme-default ::v-deep(.hg-button) {
    height: 60px;
    font-size: 30px;
  }

  .el-input ::v-deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #333333 inset;
    border-radius: 3px;
  }
</style>
