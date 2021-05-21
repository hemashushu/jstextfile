/**
 * 文本文件的属性
 *
 * - 在读取文件时，库会返回一个 TextFileOptions 对象以反映
 *   目标文件的特性。
 * - 在写入文件时，传入一个 TextFileOptions 对象以指定写入
 *   文件的特性。
 */
class TextFileOptions {
    constructor(encoding, newLineChar, utf8bom) {

        /**
         * 文件的编码格式
         *
         * - 在读取一个文件时，库会自动侦测文件的编码格式，如果无法判断
         *   则此属性值为 undefined.
         * - 在写入文件时，如果省略则默认值为 'UTF-8'
         *
         * 常见的编码有：UTF-8, GB2312, UTF-16BE (big endian), UTF-16LE
         *
         */
        this.encoding = encoding;

        /**
         * 文本文件的断行字符，可能的值有：
         * - Lf，即 '\n'，常见于 Linux/Unix 系统
         * - CrLf，即 '\r\n'，常见于 Windows 系统
         * - Cr，即 '\r'，出现于早期的 Mac 系统，现在很少见。
         *
         *
         * - 在读取一个文件时，如果文件是空的，或者无法检测（比如文件内容
         *   里面没有任何换行符），则此属性值为 undefined.
         * - 在写入文件时，如果省略此属性，则默认值为 '\n'
         * - 需注意为了方便处理文本，本库读取文本文件之后，会把所有的
         *   换行符都统一转换为 '\n'，而这个属性仅仅反映文件原始的换行符状况。
         *
         */
        this.newLineChar = newLineChar;

        /**
         * 一个 Boolean 型数值，表示文件是否带有 BOM（Byte order mark）文件头
         *
         * - 在读取文件时，如果文件的编码为 'UTF-8/UTF-16' 且带有 BOM
         *   文件头时，该属性值为 true。
         * - 在写入文件时，如果该属性值为 true，则写入 BOM 文件头。
         * - 在 Linux/Unix 系统里，不推荐使用 BOM，而在 Windows 系统里，有些
         *   应用程序创建的文本文件会带有 BOM。
         *   比如 Windows 7 记事本（Notepad）保存文件为 UTF-8 编码时，会自动写入 BOM。
         *
         * BOM 标记：
         * UTF-8: 0xEF 0xBF 0xBB
         * UTF-16(BE): 0xFE 0xFF
         * UTF-16(LE): 0xFF 0xFE
         * https://www.w3.org/International/questions/qa-byte-order-mark
         * https://en.wikipedia.org/wiki/Byte_order_mark
         *
         */
        this.utf8bom = utf8bom;
    }
}

module.exports = TextFileOptions;