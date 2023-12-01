<script setup lang="ts">
  import { ref, nextTick, watch } from 'vue'
  import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

  export interface Props {
    id?: string
    title?: string
    modelValue?: string | undefined
    ruleName?: string
    placeholder?: string
    format?: string
    valueFormat?: string
    border?: boolean
    disabled?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    id: undefined,
    title: '',
    ruleName: undefined,
    placeholder: undefined,
    modelValue: undefined,
    border: true,
    format: 'YYYY/MM/DD',
    valueFormat: 'YYYY/MM/DD',
  })

  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
  }>()

  const input = ref<InstanceType<typeof HTMLElement>>()
  const value = ref(props.modelValue)
  const inputValue = ref(props.modelValue)

  const dialogVisible = ref(false)

  const open = () => {
    if (props.disabled) {
      return
    }
    dialogVisible.value = true
    nextTick(() => {
      setTimeout(() => {
        input.value?.focus()
      }, 500)
    })
  }

  const onKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      dialogVisible.value = true
      nextTick(() => {
        input.value?.focus()
      })
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      dialogVisible.value = false
    }
  }
  const onChange = (event: Event) => {
    // console.log(value.value)
    inputValue.value = value.value
    emit('update:modelValue', inputValue.value)
    dialogVisible.value = false
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
      width="60%"
      :show-close="false"
      :append-to-body="true"
      class="custom_modal"
      :before-close="handleClose"
    >
      <template #title>
        <div style="padding: 5px 10px; font-size: 20px">
          {{ title }}
        </div>
      </template>

      <div class="modal_input input_bar">
        <div class="modal_input input_form">
          <el-config-provider :locale="zhCn">
            <el-date-picker
              ref="input"
              v-model="value"
              type="date"
              placeholder="请选择"
              :clear-icon="'CloseBold'"
              :size="'large'"
              :format="format"
              :value-format="valueFormat"
              @keydown="onKeyDown"
              @change="onChange"
            />
          </el-config-provider>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  export default defineComponent({
    name: 'ModalDateTime',
    methods: {
      handleClose(done: () => void) {
        done()
      },
    },
  })
</script>

<style scoped>
  :deep() .el-date-editor {
    height: 56px;
    width: 100%;
    color: #0057c2;
    box-shadow: inset 0 0 0 2px #0057c2;
  }

  :deep() .el-date-editor .el-input__wrapper {
    box-shadow: inset 0 0 0 2px #0057c2;
  }

  .el-input__wrapper :deep() .el-input__prefix {
    color: #0057c2 !important;
  }

  .el-input__wrapper :deep() .el-input__suffix {
    color: #0057c2 !important;
  }

  .input_bar {
    display: flex;
    padding: 12px 12px 0;
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

  .el-input,
  ::v-deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px #333333 inset;
    border-radius: 3px;
  }
</style>
