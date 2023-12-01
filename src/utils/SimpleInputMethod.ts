/**
 * 简单的JS版输入法，拿来玩玩还而已，没有多大实际使用意义
 * simple-input-method.js
 */
import dict from './PinYinDict'

interface PinyinResult {
  finish: boolean
  currentPage: number
  totalPage: number
  inputValue: string
  hasNext: boolean
  hasPre: boolean
  data: string[]
}
class SimpleInputMethod {
  hanzi = '' // 候选汉字
  pinyin = '' // 候选拼音
  result = [''] // 当前匹配到的汉字集合
  pageCurrent = 1 // 当前页
  pageSize = 8 // 每页大小
  pageCount = 0 // 总页数
  /**
   * 初始化字典配置
   */
  initDict() {
    if (!dict.py2hz) {
      throw '未找到合适的字典文件！'
    }
    // 这一步仅仅是给字母a-z扩充，例如根据b找不到相关汉字，就把bi的结果赋值给b
    // 当然这种方式只是很简单的实现，真正的拼音输入法肯定不能这么简单处理
    dict.py2hz2 = {}
    dict.py2hz2['i'] = 'i' // i比较特殊，没有符合的汉字，所以特殊处理
    for (let i = 97; i <= 123; i++) {
      const ch = String.fromCharCode(i)
      if (!dict.py2hz[ch]) {
        for (const j in dict.py2hz) {
          if (j.indexOf(ch) == 0) {
            dict.py2hz2[ch] = dict.py2hz[j]
            break
          }
        }
      }
    }
  }

  input(keyCode: number): PinyinResult | null {
    // console.log('input keycode', keyCode)
    if (keyCode >= 97 && keyCode <= 122) {
      // a-z
      return this.addChar(String.fromCharCode(keyCode))
    } else if (keyCode == 8) {
      // 删除键
      return this.delChar()
    } else if (keyCode >= 48 && keyCode <= 57 && this.pinyin) {
      // 1-9
      return this.selectHanzi(keyCode - 48)
    } else if (keyCode == 32 && this.pinyin) {
      // 空格
      return this.selectHanzi(1)
    } else if (keyCode == 33 && this.pageCount > 0 && this.pageCurrent > 1) {
      // 上翻页
      this.pageCurrent--
      return this.reCalculate()
    } else if (
      keyCode == 34 &&
      this.pageCount > 0 &&
      this.pageCurrent < this.pageCount
    ) {
      // 下翻页
      this.pageCurrent++
      return this.reCalculate()
    } else
      return {
        finish: true,
        currentPage: this.pageCurrent,
        totalPage: this.pageCount,
        hasNext: this.pageCurrent < this.pageCount,
        hasPre: this.pageCount > 1,
        inputValue: String.fromCharCode(keyCode),
        data: [],
      }
  }
  /**
   * 单个拼音转单个汉字，例如输入 "a" 返回 "阿啊呵腌嗄吖锕"
   */
  getSingleHanzi(pinyin: string) {
    return dict.py2hz2?.[pinyin] || dict.py2hz?.[pinyin] || ''
  }

  /**
   * 拼音转汉字
   * @param pinyin 需要转换的拼音，如 zhongguo
   * @return 返回一个数组，格式类似：[["中","重","种","众","终","钟","忠"], "zhong'guo"]
   */
  getHanzi(pinyin: string): [string[], string] {
    let result = this.getSingleHanzi(pinyin)
    // console.log('result', result)
    if (result) {
      return [result.split(''), pinyin]
    }
    let temp = ''
    for (let i = 0, len = pinyin.length; i < len; i++) {
      temp += pinyin[i]
      result = this.getSingleHanzi(temp)
      if (!result) {
        continue
      }
      // flag表示如果当前能匹配到结果、并且往后5个字母不能匹配结果，因为最长可能是5个字母，如 zhuang
      let flag = false
      if (i + 1 < pinyin.length) {
        for (let j = 1, len = pinyin.length; j <= 5 && i + j < len; j++) {
          if (this.getSingleHanzi(pinyin.substr(0, i + j + 1))) {
            flag = true
            break
          }
        }
      }
      if (!flag) {
        return [
          result.split(''),
          pinyin.substr(0, i + 1) + "'" + pinyin.substr(i + 1),
        ]
      }
    }
    return [[], ''] // 理论上一般不会出现这种情况
  }
  /**
   * 选择某个汉字，i有效值为1-pageSize
   */
  selectHanzi(i: number): PinyinResult | null {
    const hz = this.result[(this.pageCurrent - 1) * this.pageSize + i - 1]
    if (!hz) {
      return null
    }
    this.hanzi += hz
    const idx = this.pinyin.indexOf("'")
    if (idx > 0) {
      this.pinyin = this.pinyin.substr(idx + 1)
      // 如果是v或者u，这个匹配不到汉子
      if (this.pinyin === 'v' || this.pinyin === 'u') {
        const result = this.hanzi
        this.reset()
        return {
          finish: true,
          currentPage: this.pageCurrent,
          totalPage: this.pageCount,
          inputValue: result,
          hasNext: this.pageCurrent < this.pageCount,
          hasPre: this.pageCount > 1,
          data: [],
        }
      }
      return this.refresh()
    } else {
      const result = this.hanzi
      // 如果没有单引号，表示已经没有候选词了
      this.reset()
      return {
        finish: true,
        currentPage: this.pageCurrent,
        totalPage: this.pageCount,
        inputValue: result,
        hasNext: this.pageCurrent < this.pageCount,
        hasPre: this.pageCount > 1,
        data: [],
      }
    }
  }
  /**
   * 将拼音转换成汉字候选词，并显示在界面上
   */
  refresh(): PinyinResult {
    const temp = this.getHanzi(this.pinyin.replace(/'/g, ''))
    this.result = temp[0]
    this.pinyin = temp[1]
    const count = this.result.length
    this.pageCurrent = 1
    this.pageCount = Math.ceil(count / this.pageSize)

    return this.reCalculate()
  }

  reCalculate(): PinyinResult {
    return {
      finish: false,
      currentPage: this.pageCurrent,
      totalPage: this.pageCount,
      inputValue: this.hanzi + this.pinyin,
      hasNext: this.pageCount > this.pageCurrent,
      hasPre: this.pageCurrent > 1,
      data: this.result.slice(
        (this.pageCurrent - 1) * this.pageSize,
        this.pageCurrent * this.pageSize
      ),
    }
  }

  addChar(ch: string): PinyinResult | null {
    this.pinyin += ch
    return this.refresh()
  }

  delChar(): PinyinResult | null {
    // 如果只剩一个待匹配的拼音，即重制所有变量
    if (this.pinyin.length <= 1) {
      const existHanzi = this.hanzi
      this.reset()
      const result = this.reCalculate()
      result.data = []
      result.inputValue = existHanzi
      result.finish = true
      return result
    }
    this.pinyin = this.pinyin.substr(0, this.pinyin.length - 1)
    return this.refresh()
  }

  reset() {
    this.hanzi = ''
    this.pinyin = ''
    this.result = []
    this.pageCurrent = 1
    this.pageCount = 0
  }
}

export default SimpleInputMethod
