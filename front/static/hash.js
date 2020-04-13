// 引入spark-md5
self.importScripts('spark-md5.min.js')

self.onmessage = e => {
    // 接受主线程传递的数据
    const { chunks } = e.data
    const spark = new self.SparkMD5.ArrayBuffer()

    let pargress = 0
    let count = 0

    const loadNext = index => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(chunks[index].file)
        reader.onload = function (e) {
            count++
            spark.append(e.target.result)
            if (count == chunks.length) {
                self.postMessage({
                    progress: 100,
                    hash: spark.end()
                })
            } else {
                self.postMessage({
                    progress: index / chunks.length
                })
                loadNext(count)
            }
        }

    }
    loadNext(0)
}