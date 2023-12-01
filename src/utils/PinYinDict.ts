import '../assets/pinyin/pinyin_dict_notone.js'
interface IStringJsonIndex {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pinyin_dict_firstletter: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pinyin_dict_withtone: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pinyin_dict_notone: any
  }
}

const toneMap: IStringJsonIndex = {
  ā: 'a1',
  á: 'a2',
  ǎ: 'a3',
  à: 'a4',
  ō: 'o1',
  ó: 'o2',
  ǒ: 'o3',
  ò: 'o4',
  ē: 'e1',
  é: 'e2',
  ě: 'e3',
  è: 'e4',
  ī: 'i1',
  í: 'i2',
  ǐ: 'i3',
  ì: 'i4',
  ū: 'u1',
  ú: 'u2',
  ǔ: 'u3',
  ù: 'u4',
  ü: 'v0',
  ǖ: 'v1',
  ǘ: 'v2',
  ǚ: 'v3',
  ǜ: 'v4',
  ń: 'n2',
  ň: 'n3',
  '': 'm2',
}

interface IStringIndex {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface Dict {
  firstletter?: object
  notone?: IStringIndex
  py2hz?: IStringJsonIndex
  py2hz2?: IStringJsonIndex
  withtone?: IStringIndex
}
const dict: Dict = {} // 存储所有字典数据

function parseDict() {
  // 如果导入了 pinyin_dict_firstletter.js
  if (window.pinyin_dict_firstletter) {
    dict.firstletter = window.pinyin_dict_firstletter
  }
  // 如果导入了 pinyin_dict_notone.js
  if (window.pinyin_dict_notone) {
    dict.notone = {}
    dict.py2hz = window.pinyin_dict_notone // 拼音转汉字
    for (const i in window.pinyin_dict_notone) {
      const temp: string = window.pinyin_dict_notone[i]
      for (let j = 0, len = temp.length; j < len; j++) {
        if (!dict.notone[temp[j]]) dict.notone[temp[j]] = i // 不考虑多音字
      }
    }
  }
  // 如果导入了 pinyin_dict_withtone.js
  if (window.pinyin_dict_withtone) {
    dict.withtone = {} // 汉字与拼音映射，多音字用空格分开，类似这种结构：{'大': 'da tai'}
    const temp = window.pinyin_dict_withtone.split(',')
    for (let i = 0, len = temp.length; i < len; i++) {
      // 这段代码耗时28毫秒左右，对性能影响不大，所以一次性处理完毕
      dict.withtone[String.fromCharCode(i + 19968)] = temp[i] // 这里先不进行split(' ')，因为一次性循环2万次split比较消耗性能
    }

    // 拼音 -> 汉字
    if (window.pinyin_dict_notone) {
      // 对于拼音转汉字，我们优先使用pinyin_dict_notone字典文件
      // 因为这个字典文件不包含生僻字，且已按照汉字使用频率排序
      dict.py2hz = window.pinyin_dict_notone // 拼音转汉字
    } else {
      // 将字典文件解析成拼音->汉字的结构
      // 与先分割后逐个去掉声调相比，先一次性全部去掉声调然后再分割速度至少快了3倍，前者大约需要120毫秒，后者大约只需要30毫秒（Chrome下）
      const notone = removeTone(window.pinyin_dict_withtone).split(',')
      const py2hz: IStringIndex = {}
      let py, hz
      for (let i = 0, len = notone.length; i < len; i++) {
        hz = String.fromCharCode(i + 19968) // 汉字
        py = notone[i].split(' ') // 去掉了声调的拼音数组
        for (let j = 0; j < py.length; j++) {
          py2hz[py[j]] = (py2hz[py[j]] || '') + hz
        }
      }
      dict.py2hz = py2hz
    }
  }
}

/**
 * 去除拼音中的声调，比如将 xiǎo míng tóng xué 转换成 xiao ming tong xue
 * @param pinyin 需要转换的拼音
 */
function removeTone(pinyin: string) {
  return pinyin.replace(
    /[āáǎàōóǒòēéěèīíǐìūúǔùüǖǘǚǜńň]/g,
    function (m: string) {
      return toneMap[m][0]
    }
  )
}

parseDict()
console.log('dict', dict)

export default dict
