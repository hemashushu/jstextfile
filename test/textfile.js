const assert = require('assert/strict');
const path = require('path');
const fs = require('fs');

const tmp = require('tmp');

const {ObjectUtils} = require('jsobjectutils');
const {NewLineChar, TextFile, TextFileOptions} = require('../index');

let testDir = __dirname;

describe('Test text file reading', ()=>{
    it('Test read()', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text1.txt');
        TextFile.read(textFilePath1, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'hello world!\n世界你还好吗？');
            assert.equal(lastTextFileOptions.encoding, 'UTF-8');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });

    it('Test read() with windows 10 notepad created text file', (done) => {
        let textFilePath1 = path.join(testDir, 'resources', 'windows10-notepad-utf-8-default.txt');
        TextFile.read(textFilePath1, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, '天地玄黄，宇宙洪荒，日月盈昃，辰宿列张');
            assert.equal(lastTextFileOptions.encoding, 'UTF-8');
            assert.equal(lastTextFileOptions.newLineChar, undefined); // 单行文本，未能侦测到换行符
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });

    it('Test read() with windows 7 notepad created text file', (done) => {
        let textFilePath1 = path.join(testDir, 'resources', 'windows7-notepad-multiple-line-ansi-default.txt');
        TextFile.read(textFilePath1, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, '天地玄黄，\n宇宙洪荒，\n日月盈昃，\n辰宿列张');
            assert.equal(lastTextFileOptions.encoding, 'GB2312');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.CrLf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });
});

let testFileEncoding = (name, textContent, encoding, newLineChar, utf8bom, done) => {
    let textFilePath1 = path.join(testDir, 'resources', name);
    TextFile.read(textFilePath1, (err, lastTextContent, lastTextFileOptions) => {
        if (err) {
            fail(err.message);
            return;
        }

        assert.equal(lastTextContent, textContent);
        assert.equal(lastTextFileOptions.encoding, encoding);
        assert.equal(lastTextFileOptions.newLineChar, newLineChar);
        assert.equal(lastTextFileOptions.utf8bom, utf8bom);

        done();
    });
};

describe('Test text encoding', ()=>{
    let singleLineItems = [
        {name: 'windows10-notepad-ansi.txt', encoding: 'GB2312', newLineChar: undefined, utf8bom: false},
        {name: 'windows10-notepad-utf-16-be.txt', encoding: 'UTF-16BE', newLineChar: undefined, utf8bom: false},
        {name: 'windows10-notepad-utf-16-le.txt', encoding: 'UTF-16LE', newLineChar: undefined, utf8bom: false},
        {name: 'windows10-notepad-utf-8-bom.txt', encoding: 'UTF-8', newLineChar: undefined, utf8bom: true},
        {name: 'windows10-notepad-utf-8-default.txt', encoding: 'UTF-8', newLineChar: undefined, utf8bom: false},
        {name: 'windows7-notepad-ansi-default.txt', encoding: 'GB2312', newLineChar: undefined, utf8bom: false},
        {name: 'windows7-notepad-unicode-big-endian.txt', encoding: 'UTF-16BE', newLineChar: undefined, utf8bom: false},
        {name: 'windows7-notepad-unicode.txt', encoding: 'UTF-16LE', newLineChar: undefined, utf8bom: false},
        {name: 'windows7-notepad-utf-8.txt', encoding: 'UTF-8', newLineChar: undefined, utf8bom: true} // Windows 7 保存 UTF-8 时会自动写入 BOM
    ];

    let multipleLineItems = [
        {name: 'windows10-notepad-multiple-line-utf-8-default.txt', encoding: 'UTF-8', newLineChar: 'CrLf', utf8bom: false},
        {name: 'windows7-notepad-multiple-line-ansi-default.txt', encoding: 'GB2312', newLineChar: 'CrLf', utf8bom: false}
    ];

    // https://mochajs.org/#dynamically-generating-tests
    singleLineItems.forEach(({name, encoding, newLineChar, utf8bom})=>{
        it('Test ' + name, (done) => {
            testFileEncoding(name, '天地玄黄，宇宙洪荒，日月盈昃，辰宿列张', encoding, newLineChar, utf8bom, done);
        });
    });

    multipleLineItems.forEach(({name, encoding, newLineChar, utf8bom})=>{
        it('Test ' + name, (done) => {
            testFileEncoding(name, '天地玄黄，\n宇宙洪荒，\n日月盈昃，\n辰宿列张', encoding, newLineChar, utf8bom, done);
        });
    });

});

describe('Test text file writing', ()=> {
    it('Test write with default TextFileOptions', (done) => {
        tmp.tmpName((err, tempFilePath) => {
            if (err) {
                assert.fail(err.message);
                return;
            }

            let textContent1 ='千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。'

            TextFile.write(tempFilePath, textContent1, {}, (err)=>{
                if (err) {
                    fail(err.message);
                    return;
                }

                TextFile.read(tempFilePath, (err, lastTextContent, lastTextFileOptions) => {
                    if (err) {
                        fail(err.message);
                        return;
                    }

                    assert.equal(lastTextContent, textContent1);
                    assert.equal(lastTextFileOptions.encoding, 'UTF-8');
                    assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
                    assert.equal(lastTextFileOptions.utf8bom, false);

                    // delete tmp file
                    fs.unlink(tempFilePath, ()=>{
                        done();
                    });
                });
            });
        });
    });

    it('Test write with custom TextFileOptions', (done) => {
        tmp.tmpName((err, tempFilePath) => {
            if (err) {
                assert.fail(err.message);
                return;
            }

            let textContent1 ='千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。'
            let textFileOptions1 = new TextFileOptions('GB2312', NewLineChar.CrLf, false);

            TextFile.write(tempFilePath, textContent1, textFileOptions1, (err)=>{
                if (err) {
                    fail(err.message);
                    return;
                }

                TextFile.read(tempFilePath, (err, lastTextContent, lastTextFileOptions) => {
                    if (err) {
                        fail(err.message);
                        return;
                    }

                    assert.equal(lastTextContent, textContent1);
                    assert(ObjectUtils.equals(lastTextFileOptions, textFileOptions1));

                    // delete tmp file
                    fs.unlink(tempFilePath, ()=>{
                        done();
                    });
                });
            });
        });
    });
});

describe('Test partial text reading', ()=>{
    it('Test readHead() - End position in the middle of the line', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln01n
        // ln02n
        // ln03n
        //   ^----- offset = 12, length = 13
        TextFile.readHead(textFilePath1, 13, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln01\nln02\n');
            assert.equal(lastTextFileOptions.encoding, 'ascii');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });

    it('Test readHead() - The end position is at the end of the line (\\n)', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln01n
        // ln02n
        // ln03n
        //     ^----- offset = 14, length = 15
        TextFile.readHead(textFilePath1, 15, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln01\nln02\nln03\n');
            done();
        });
    });

    it('Test readHead() - End position at the beginning of the line', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln01n
        // ln02n
        // ln03n
        // ln04n
        // ^----- offset = 15, length = 16
        TextFile.readHead(textFilePath1, 16, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln01\nln02\nln03\n');
            done();
        });
    });

    it('Test readTail() - Start position in the middle of the line', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln16n
        // ln17n
        //   ^---- 18
        // ln18n
        // ln19n
        // ln20.
        //
        //       vv------- length 18 = offset 82
        // 80 81 82 83 84 ... ln17n
        // 85 86 87 88 89 ... ln18n
        // 90 91 92 93 94 ... ln19n
        // 95 96 97 98 99 ... ln20.

        TextFile.readTail(textFilePath1, 18, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln18\nln19\nln20.');
            assert.equal(lastTextFileOptions.encoding, 'ascii');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });

    it('Test readTail() - Start end position is at the end of the line (\\n)', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln16n
        // ln17n
        //     ^---- 16
        // ln18n
        // ln19n
        // ln20.

        TextFile.readTail(textFilePath1, 16, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln18\nln19\nln20.');
            done();
        });
    });

    it('Test readTail() - End position at the beginning of the line', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln17n
        // ln18n
        // ^---- 15
        // ln19n
        // ln20.
        TextFile.readTail(textFilePath1, 15, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln19\nln20.');
            done();
        });
    });

    it('Test readParital() trim start & trim end', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln02n
        // ln03n
        //   ^----- offset: 12
        // ln04n
        // ln05n
        //   ^----- length: 10

        TextFile.readPartial(textFilePath1, 12, 10, true, true, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, 'ln04\n');
            assert.equal(lastTextFileOptions.encoding, 'ascii');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });

    it('Test readParital() neither trim start & nor trim end', (done)=>{
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln02n
        // ln03n
        //   ^----- offset: 12 (position include)
        // ln04n
        // ln05n
        //   ^----- length: 10 (position exclude)

        TextFile.readPartial(textFilePath1, 12, 10, false, false, (err, lastTextContent, lastTextFileOptions) => {
            if (err) {
                fail();
                return;
            }

            assert.equal(lastTextContent, '03\nln04\nln');
            assert.equal(lastTextFileOptions.encoding, 'ascii');
            assert.equal(lastTextFileOptions.newLineChar, NewLineChar.Lf);
            assert.equal(lastTextFileOptions.utf8bom, false);

            done();
        });
    });
});

describe('Test read/write lines', ()=>{
    it('Test base', (done) => {
        let textLines1 = ['hello', 'world', '你好', '世界'];

        tmp.tmpName((err, tempFilePath) => {
            if (err) {
                assert.fail(err.message);
                return;
            }

            TextFile.writeLinesToFile(tempFilePath, textLines1, {}, (err)=>{
                if (err) {
                    fail(err.message);
                    return;
                }

                TextFile.read(tempFilePath, (err, lastTextContent, lastTextFileOptions) => {
                    if (err) {
                        fail(err.message);
                        return;
                    }

                    assert.equal(lastTextContent, textLines1.join('\n'));

                    TextFile.readLinesFromFile(tempFilePath, (err, lastTextLines, lastTextFileOptions) => {
                        if (err) {
                            fail(err.message);
                            return;
                        }

                        assert(ObjectUtils.arrayEquals(lastTextLines, textLines1));

                        // delete tmp file
                        fs.unlink(tempFilePath, ()=>{
                            done();
                        });
                    });
                });
            });
        });
    });
});