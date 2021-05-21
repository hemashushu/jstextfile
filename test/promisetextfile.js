const assert = require('assert/strict');
const path = require('path');
const fsPromises = require('fs/promises');

const tmp = require('tmp');

const { ObjectUtils } = require('jsobjectutils');
const { NewLineChar, PromiseTextFile, TextFileOptions } = require('../index');

let testDir = __dirname;

it('Test text file writing/reading', (done) => {
    tmp.tmpName((err, tempFilePath) => {
        if (err) {
            assert.fail(err.message);
            return;
        }

        let textContent1 = '千山鸟飞绝，万径人踪灭。\n孤舟蓑笠翁，独钓寒江雪。'

        PromiseTextFile.write(tempFilePath, textContent1)
            .then(() => PromiseTextFile.read(tempFilePath))
            .then(({ textContent, textFileOptions }) => {
                assert.equal(textContent, textContent1);
                assert.equal(textFileOptions.encoding, 'UTF-8');
                assert.equal(textFileOptions.newLineChar, NewLineChar.Lf);
                assert.equal(textFileOptions.utf8bom, false);
            })
            .then(() => fsPromises.unlink(tempFilePath))
            .then(() => done());
    });
});

describe('Test partial text reading', () => {
    it('Test readHead() - End position in the middle of the line', (done) => {
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln01n
        // ln02n
        // ln03n
        //   ^----- offset = 12, length = 13
        PromiseTextFile.readHead(textFilePath1, 13)
            .then(({ textContent, textFileOptions }) => {

                assert.equal(textContent, 'ln01\nln02\n');
                assert.equal(textFileOptions.encoding, 'ascii');
                assert.equal(textFileOptions.newLineChar, NewLineChar.Lf);
                assert.equal(textFileOptions.utf8bom, false);
                done();
            });
    });

    it('Test readTail() - Start position in the middle of the line', (done) => {
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

        PromiseTextFile.readTail(textFilePath1, 18)
            .then(({ textContent, textFileOptions }) => {

                assert.equal(textContent, 'ln18\nln19\nln20.');
                assert.equal(textFileOptions.encoding, 'ascii');
                assert.equal(textFileOptions.newLineChar, NewLineChar.Lf);
                assert.equal(textFileOptions.utf8bom, false);

                done();
            });
    });

    it('Test readParital() trim start & trim end', (done) => {
        let textFilePath1 = path.join(testDir, 'resources', 'text2.txt');
        // ln02n
        // ln03n
        //   ^----- offset: 12
        // ln04n
        // ln05n
        //   ^----- length: 10

        PromiseTextFile.readPartial(textFilePath1, 12, 10, true, true)
            .then(({ textContent, textFileOptions }) => {

                assert.equal(textContent, 'ln04\n');
                assert.equal(textFileOptions.encoding, 'ascii');
                assert.equal(textFileOptions.newLineChar, NewLineChar.Lf);
                assert.equal(textFileOptions.utf8bom, false);

                done();
            });
    });
});

it('Test read/write lines', (done) => {

    let textLines1 = ['hello', 'world', '你好', '世界'];

    tmp.tmpName((err, tempFilePath) => {
        if (err) {
            assert.fail(err.message);
            return;
        }

        PromiseTextFile.writeLinesToFile(tempFilePath, textLines1, {})
            .then(() => PromiseTextFile.read(tempFilePath))
            .then(({ textContent, textFileOptions }) => {
                assert.equal(textContent, textLines1.join('\n'));
            })
            .then(() => PromiseTextFile.readLinesFromFile(tempFilePath))
            .then(({ textLines, textFileOptions }) => {
                assert(ObjectUtils.arrayEquals(textLines, textLines1));
            })
            .then(() => fsPromises.unlink(tempFilePath))
            .then(() => done());

    });
});