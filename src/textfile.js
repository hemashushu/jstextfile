const fs = require('fs');
const jschardet = require('jschardet');
const iconv = require('iconv-lite');

const { ObjectUtils } = require('jsobjectutils');
const { IOException, IsDirectoryException } = require('jsexception');

const NewLineChar = require('./newlinechar');
const TextFileOptions = require('./textfileoptions');

const defaultTextFileOptions = new TextFileOptions(
    'UTF-8', NewLineChar.Lf, false);

class TextFile {

    /**
     * 读取整个文本文件
     *
     * @param {*} fullName
     * @param {*} callback 返回 (err, textContent, textFileOptions)
     */
    static read(fullName, callback) {
        fs.readFile(fullName, (err, buffer) => {
            if (err) {
                callback(err);
                return;
            }

            // 检查文件是否文本文件
            // 这里使用简单的检查方法：搜索 '\0' 字符，如果找到这个字符
            // 即判断为 ”非文本文件“，并回调一个 IOException
            //
            // https://nodejs.org/api/buffer.html#buffer_buf_indexof_value_byteoffset_encoding

            if (buffer.indexOf(0) >= 0) {
                let ioException = new IOException(
                    `File "${fullName}" is not a text file.`,
                    null,
                    'ENOTTEXT'
                );
                callback(ioException);
                return;
            }

            if (buffer.length === 0) {
                // 文件是空的
                let textFileOptions = new TextFileOptions(
                    undefined,
                    undefined,
                    false);
                callback(null, '', textFileOptions);
                return;
            }

            // 准备读取文件内容

            // 检测文本的编码格式
            // https://www.npmjs.com/package/jschardet

            let encoding; // 默认值是 'UTF-8'
            let encodingDetected = jschardet.detect(buffer);

            // 实践中当文本内容较短时，UTF-8 编码的的内容也会被检测为 “windows-1252” 且
            // confidence = 0.95, 所以这里仅接受 confidence is >= 0.99 的 “windows-1252” 判断结果，
            // 其他判断结果都被忽略，并采用默认值 UTF-8.

            if (encodingDetected.encoding !== null) {
                if (encodingDetected.encoding === 'windows-1252') {
                    if (encodingDetected.confidence >= 0.99) {
                        encoding = 'windows-1252';
                    }
                } else {
                    encoding = encodingDetected.encoding;
                }
            }

            // BOM (Byte order mark)
            // https://www.w3.org/International/questions/qa-byte-order-mark
            // https://en.wikipedia.org/wiki/Byte_order_mark
            let utf8bom = false;

            // 当编码为 utf-8 and utf-16 时，检测 BOM（Byte order mark）
            // 虽然采用其他编码的文件也可能有 BOM，但比较少见，所以这里就不检测了。
            //
            // UTF-8[a]: EF BB BF - 239 187 191
            // UTF-16(BE): FE FF - 254 255
            // UTF-16(LE): FF FE - 255 254
            if (encoding === 'UTF-8') {
                if (buffer[0] === 0xEF &&
                    buffer[1] === 0xBB &&
                    buffer[2] === 0xBF) {
                    utf8bom = true;
                }
            } else if (encoding === 'UTF-16') {
                if ((buffer[0] === 0xFE && buffer[1] === 0xFF) ||
                    (buffer[0] === 0xFF && buffer[1] === 0xFE)) {
                    utf8bom = true;
                }
            }

            // 编码转换
            // https://github.com/ashtuchkin/iconv-lite
            // https://github.com/ashtuchkin/iconv-lite/wiki/Supported-Encodings
            let encodingForDecode = encoding ?? 'UTF-8';
            let textContent = iconv.decode(buffer, encodingForDecode);

            // 检测换行符
            //
            // Lf = '\n' = ascii 10
            // CrLf = '\r\n' = ascii 13,10
            // Cr = '\r' = ascii 13

            let newLineChar;
            if (textContent.indexOf('\r\n') >= 0) {
                newLineChar = NewLineChar.CrLf;
            } else if (textContent.indexOf('\r') >= 0) {
                newLineChar = NewLineChar.Cr;
            } else if (textContent.indexOf('\n') >= 0) {
                newLineChar = NewLineChar.Lf;
            }

            // 为简化文件处理起见，替换所有 '\r\n' 和 '\r' 为 '\n'
            textContent = textContent.replace(/\r\n/g, '\n');
            textContent = textContent.replace(/\r/g, '\n');

            let textFileOptions = new TextFileOptions(encoding, newLineChar, utf8bom);
            callback(null, textContent, textFileOptions);
        });
    }

    /**
     * 读取文件的部分内容
     *
     * @param {*} fullName
     * @param {*} offset 开始读取的文件位置
     *   - 如果 offset 为正数，则表示从文件头部开始数起的索引值，如果开始位置超出了文件的长度，会抛出 IOException。
     *   - 如果 offset 为负数，则从文件末尾开始读取，即从 “文件长度 + offset（负数）” 位置开始读取，
     *     比如 -1 表示从最后一个字节开始，如果 offset 超出文件头，则从文件的第 1 个字节开始读取。
     *     或者简单来说，当 offset 为负数时，表示从尾部开始读取 abs(offset) 个字节数据。
     *   - 该位置的字符会被包含进结果字符串里。
     * @param {*} length 读取的最大长度
     *   - 如果 offset 为整数，最后以实际内容长度为准
     *   - 如果 offset 为负数，则 length 参数会被忽略，最后读取的内容长度是
     *     从 “文件长度 + offset” 位置开始直到文件末尾。
     * @param {*} trimStart 是否丢弃不完整的首行
     * @param {*} trimEnd 是否丢弃不完整的尾行
     * @param {*} callback 返回 (err, textContent, textFileOptions)
     */
    static readPartial(fullName, offset, length, trimStart, trimEnd, callback) {
        // https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
        // https://nodejs.org/api/errors.html#errors_common_system_errors
        // https://nodejs.org/api/fs.html#fs_class_fs_stats
        fs.stat(fullName, (err, stats) => {
            if (err) {
                callback(err);
                return;
            }

            if (!stats.isFile()) {
                let isDirectoryException = new IsDirectoryException(
                    `Can not read a directory "${fullName}"`);
                callback(isDirectoryException);
                return;
            }

            let totalLength = stats.size;

            if (offset < 0) {
                // 从文件末尾开始读取，比如 -1 表示从最后一个字节开始
                // 开始位置为 “文件长度 + offset（负数）”
                // 或者简单来说，当 offset 为负数时，表示从尾部开始读取 abs(offset) 个字节数据。
                offset = totalLength + offset;

                // 如果开始位置超出文件头，则从第 1 字节开始读取
                if (offset < 0) {
                    offset = 0;
                }

                length = totalLength - offset;

            } else {
                if (offset >= totalLength - 1) {
                    // 起始位置超出了文件的范围
                    let outOfFileRangeException = new IOException(
                        `Out of file range, file: ${fullName}, offset: ${offset}`);
                    callback(outOfFileRangeException);
                    return;
                }

                // length 超出了有效内容长度
                if (offset + length > totalLength) {
                    length = totalLength - offset;
                }
            }

            if (totalLength === 0) {
                // 文件是空的
                let textFileOptions = new TextFileOptions(
                    undefined,
                    undefined,
                    false);
                callback(null, '', textFileOptions);
                return;
            }

            // https://nodejs.org/api/fs.html#fs_fs_open_path_flags_mode_callback
            fs.open(fullName, 'r', (err, fd) => {
                if (err) {
                    callback(err);
                    return;
                }

                // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_alloc_size_fill_encoding
                let buffer = Buffer.alloc(length); // 等同于 new Buffer(bufferLength)

                // https://nodejs.org/api/fs.html#fs_fs_read_fd_buffer_offset_length_position_callback
                fs.read(fd, buffer, 0, length, offset, (err, bytesRead, buffer) => {
                    if (err) {
                        // https://nodejs.org/api/fs.html#fs_fs_close_fd_callback
                        fs.close(fd, (closeErr) => {
                            if (closeErr) {
                                callback(closeErr);
                                return;
                            }

                            callback(err);
                        });

                        return;
                    }

                    if (bytesRead !== length) {
                        // 读取的数据不足
                        let readFileDataException = new IOException(
                            `Read file data error, file: ${fullName}`);
                        callback(readFileDataException);
                        return;
                    }

                    // 检查文件是否文本文件
                    if (buffer.indexOf(0) >= 0) {
                        fs.close(fd, (err) => {
                            if (err) {
                                callback(err);
                                return;
                            }

                            let ioException = new IOException(
                                `File "${fullName}" is not a text file.`,
                                null,
                                'ENOTTEXT'
                            );
                            callback(ioException);
                        });
                        return;
                    }

                    // 准备截取头部或者尾部不完整的行

                    if (offset === 0) {
                        // 从文件头开始读取，不需要截头
                        trimStart = false;
                    }

                    if (offset + length === totalLength) {
                        // 已经读到文件的末尾，不需要截尾
                        trimEnd = false;
                    }

                    let startPos = 0;    // pos 位置的字符包括在结果中
                    let endPos = length; // pos 位置的字符**不**包括在结果中

                    // 截去头部
                    // 以行分隔符号作为行是否完整的判断依据
                    // 搜索第一个 '\n' 字节
                    // '\n' = Lf = ascii 10
                    if (trimStart) {
                        let pos = buffer.indexOf(10);
                        if (pos >= 0) {
                            startPos = pos + 1; // 从第一个 '\n' 后的第一个字符开始
                        }
                    }

                    // 截去头部
                    // 从末尾开始反向搜索 '\n' 字节
                    if (trimEnd) {
                        let pos = buffer.lastIndexOf(10);
                        if (pos >= startPos) {
                            endPos = pos + 1;
                        }
                    }

                    // 截取后的内容是空的
                    if (endPos === startPos) {
                        let textFileOptions = new TextFileOptions(
                            undefined,
                            undefined,
                            false);
                        callback(null, '', textFileOptions);
                        return;
                    }

                    // 复制裁剪后的 Buffer
                    if (startPos !== 0 || endPos !== length) {
                        // 构建新的 buffer 对象
                        let targetBuffer = Buffer.alloc(endPos - startPos);

                        // 复制数据到新 buffer 对象
                        //
                        // https://nodejs.org/api/buffer.html#buffer_static_method_buffer_from_arraybuffer_byteoffset_length
                        // https://nodejs.org/api/buffer.html#buffer_buf_copy_target_targetstart_sourcestart_sourceend

                        buffer.copy(targetBuffer, 0, startPos, endPos);

                        // 替换原 buffer 对象
                        buffer = targetBuffer;
                    }

                    let encoding; // 默认值是 'UTF-8'
                    let encodingDetected = jschardet.detect(buffer);

                    // 检测文本的编码格式
                    if (encodingDetected.encoding !== null) {
                        if (encodingDetected.encoding === 'windows-1252') {
                            if (encodingDetected.confidence >= 0.99) {
                                encoding = 'windows-1252';
                            }
                        } else {
                            encoding = encodingDetected.encoding;
                        }
                    }

                    // 当编码为 utf-8 and utf-16 时，检测 BOM（Byte order mark）
                    let utf8bom = false;
                    if (encoding === 'UTF-8') {
                        if (buffer[0] === 0xEF &&
                            buffer[1] === 0xBB &&
                            buffer[2] === 0xBF) {
                            utf8bom = true;
                        }
                    } else if (encoding === 'UTF-16') {
                        if ((buffer[0] === 0xFE && buffer[1] === 0xFF) ||
                            (buffer[0] === 0xFF && buffer[1] === 0xFE)) {
                            utf8bom = true;
                        }
                    }

                    // 编码转换
                    let encodingForDecode = encoding ?? 'UTF-8';
                    let textContent = iconv.decode(buffer, encodingForDecode);

                    // 检测换行符
                    let newLineChar;
                    if (textContent.indexOf('\r\n') >= 0) {
                        newLineChar = NewLineChar.CrLf;
                    } else if (textContent.indexOf('\r') >= 0) {
                        newLineChar = NewLineChar.Cr;
                    } else if (textContent.indexOf('\n') >= 0) {
                        newLineChar = NewLineChar.Lf;
                    }

                    // 为简化文件处理起见，替换所有 '\r\n' 和 '\r' 为 '\n'
                    textContent = textContent.replace(/\r\n/g, '\n');
                    textContent = textContent.replace(/\r/g, '\n');

                    // https://nodejs.org/api/fs.html#fs_fs_close_fd_callback
                    fs.close(fd, (err) => {
                        if (err) {
                            callback(err);
                            return;
                        }

                        let textFileOptions = new TextFileOptions(encoding, newLineChar, utf8bom);
                        callback(null, textContent, textFileOptions);
                    });
                });
            });
        });
    }

    /**
     * 读取指定长度的文件头部
     *
     * 如果最后一行不完整（即没有读到文件的末尾，且最后一个字符不是 '\n'），
     * 则会丢弃最后一行，示例：
     *
     * line1\n
     * .....\n
     * line6\n <-- 倒数第二行，末尾 '\n' 字符将会保留。
     * lin     <-- 最后一行，将被丢弃。
     *   ^-------- 指定读到这个位置。
     *
     * @param {*} fullName
     * @param {*} length 读取的最大长度
     * @param {*} callback 返回 (err, textContent, textFileOptions)
     */
    static readHead(fullName, length, callback) {
        TextFile.readPartial(fullName, 0, length, false, true,
            (err, lastTextContent, lastTextFileOptions) => {

                if (err) {
                    callback(err);
                    return;
                }

                callback(null, lastTextContent, lastTextFileOptions);
            });
    }

    /**
     * 读取指定长度的文件尾部
     *
     * 如果第一行不完整（即不是从文件头开始读取，也不是以 '\n' 开头），
     * 则会丢弃第一行，示例：
     *
     * V----------- 指定从这个位置开始读取
     * ne5\n    <-- 第一行，丢弃
     * line6\n
     * end.     <-- 文件末尾行。
     *
     * 需注意，即使开始读取位置恰好为一行的第 1 个字符，这行
     * 仍然会被丢弃，因为它不检测开始位置之前的内容，所以不知道
     * 开始位置是否为一行的第 1 个字符。
     *
     * @param {*} fullName
     * @param {*} length
     * @param {*} callback
     */
    static readTail(fullName, length, callback) {
        TextFile.readPartial(fullName, -length, 0, true, false,
            (err, lastTextContent, lastTextFileOptions) => {

                if (err) {
                    callback(err);
                    return;
                }

                callback(null, lastTextContent, lastTextFileOptions);
            });
    }

    static readHeadByLines(fullName, lineCount, callback) {
        // TODO::
    }

    static readTailByLines(fullName, lineCount, callback) {
        // TODO::
    }

    /**
     *
     * @param {*} fullName
     * @param {*} textContent 文本的换行符必须是 '\n'
     * @param {*} textFileOptions
     * @param {*} callback 返回 (err)
     */
    static write(
        fullName, textContent, textFileOptions = {},
        callback) {

        // 合并默认 TextFileOptions
        let combinedTextFileOptions = ObjectUtils.objectMerge(textFileOptions, defaultTextFileOptions);

        // 处理换行符
        if (combinedTextFileOptions.newLineChar !== NewLineChar.Lf) {
            let char = combinedTextFileOptions.newLineChar === NewLineChar.CrLf ?
                '\r\n' :
                '\r';

            textContent = textContent.replace(/\n/g, char);
        }

        // 处理编码
        let encodingForWrite = 'UTF-8';

        // 当指定使用 ASCII 编码储存文档时，仍然使用 UTF-8 编码，
        // 因为有时一个新文档开始编辑时，可能只包含 ASCII 字符，但随后
        // 用户可能会往文档输入 Unicode 字符，所以总是使用 UTF-8 编码
        // 保存被判断为 ASCII 的文档是可以的。
        if (combinedTextFileOptions.encoding !== 'ascii' &&
            combinedTextFileOptions.encoding !== 'ASCII') {
            encodingForWrite = combinedTextFileOptions.encoding;
        }

        // 为 iconv.encode 方法准备的选项
        // https://github.com/ashtuchkin/iconv-lite
        let encodeOptions = (combinedTextFileOptions.utf8bom === true) ?
            { addBOM: true } :
            undefined;

        // logger.debug('TextFileStream.write, fullName: %s, encoding: %s, newLineChar: %s, utf8bom: %s',
        //     fullName, encodingForWrite, newLineChar, utf8bom);

        // 转换编码
        let buffer = iconv.encode(textContent, encodingForWrite, encodeOptions);

        // https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
        fs.writeFile(fullName, buffer, (err) => {
            if (err) {
                callback(err);
                return;
            }

            callback();
        });
    }

    /**
     * 读取一个文本文件到一个字符串数组，数组中的每个元素为文本的每一行内容。
     *
     * @param {*} fullName
     * @param {*} callback 返回 (err, textLines, textFileOptions)
     *   当目标文件不存在时 textLines 的值为 undefined。
     *   当文件内容为空时 textLines 为空数组。
     */
    static readLinesFromFile(fullName, callback) {
        TextFile.read(fullName, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // 目标文件不存在，返回 undefined.
                    callback(null, undefined, lastTextFileOptions);
                } else {
                    callback(err);
                }
                return;
            }

            if (lastTextContent === '') {
                // 目标文件内容为空，返回空数组
                callback(null, [], lastTextFileOptions);
                return;
            }

            let textLines = lastTextContent.split('\n');
            callback(null, textLines, lastTextFileOptions);
        });
    }

    /**
     * 将一个字符串数组写入到目标文本文件。
     *
     * 目标文件的内容将会被覆盖。
     *
     * @param {*} fullName
     * @param {*} textLines 字符串数组
     * @param {*} textFileOptions
     * @param {*} callback 返回 (err)
     */
    static writeLinesToFile(fullName, textLines, textFileOptions = {}, callback) {
        let textContent = '';

        if (textLines.length > 0) {
            textContent = textLines.join('\n');
        }

        TextFile.write(fullName, textContent, textFileOptions, (err) => {
            if (err) {
                callback(err);
                return;
            }

            callback();
        });
    }
}

module.exports = TextFile;