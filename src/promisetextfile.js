const TextFile = require('./textfile');

class PromiseTextFile {

    /**
     *
     * @param {*} fullName
     * @returns 返回 Promise ({textContent, textFileOptions})
     */
    static read(fullName) {
        return new Promise((resolve, reject) => {
            TextFile.read(fullName, (err, textContent, textFileOptions) => {
                if (err) {
                    reject(err);
                }else {
                    resolve({textContent, textFileOptions});
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @param {*} offset
     * @param {*} length
     * @param {*} trimStart
     * @param {*} trimEnd
     * @returns 返回 Promise ({textContent, textFileOptions})
     */
    static readPartial(fullName, offset, length, trimStart, trimEnd) {
        return new Promise((resolve, reject) => {
            TextFile.readPartial(fullName, offset, length, trimStart, trimEnd,
                (err, textContent, textFileOptions) => {
                if (err) {
                    reject(err);
                }else {
                    resolve({textContent, textFileOptions});
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @param {*} length
     * @returns 返回 Promise ({textContent, textFileOptions})
     */
    static readHead(fullName, length) {
        return new Promise((resolve, reject) => {
            TextFile.readHead(fullName, length, (err, textContent, textFileOptions) => {
                if (err) {
                    reject(err);
                }else {
                    resolve({textContent, textFileOptions});
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @param {*} length
     * @returns 返回 Promise ({textContent, textFileOptions})
     */
    static readTail(fullName, length) {
        return new Promise((resolve, reject) => {
            TextFile.readTail(fullName, length, (err, textContent, textFileOptions) => {
                if (err) {
                    reject(err);
                }else {
                    resolve({textContent, textFileOptions});
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @param {*} textContent
     * @param {*} textFileOptions
     * @returns 返回 Promise ()
     */
    static write(fullName, textContent, textFileOptions) {
        return new Promise((resolve, reject) => {
            TextFile.write(fullName, textContent, textFileOptions, (err) => {
                if (err) {
                    reject(err);
                }else {
                    resolve();
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @returns 返回 Promise ({textLines, textFileOptions})
     */
    static readLinesFromFile(fullName) {
        return new Promise((resolve, reject) => {
            TextFile.readLinesFromFile(fullName, (err, textLines, textFileOptions) => {
                if (err) {
                    reject(err);
                }else {
                    resolve({textLines, textFileOptions});
                }
            });
        });
    }

    /**
     *
     * @param {*} fullName
     * @param {*} textLines
     * @param {*} textFileOptions
     * @returns 返回 Promise ()
     */
    static writeLinesToFile(fullName, textLines, textFileOptions) {
        return new Promise((resolve, reject) => {
            TextFile.writeLinesToFile(fullName, textLines, textFileOptions, (err) => {
                if (err) {
                    reject(err);
                }else {
                    resolve();
                }
            });
        });
    }
}

module.exports = PromiseTextFile;