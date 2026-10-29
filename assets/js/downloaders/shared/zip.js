// Zip minimal, sans compression : le woff2 est déjà compressé.
// entries : [{ name, data: Uint8Array }]

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// Date et heure au format DOS
function dosDateTime(date) {
    return {
        time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
        date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
}

function localHeader(name, data, crc, stamp) {
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04034B50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true); // noms en UTF-8
    header.setUint16(8, 0, true); // stocké, sans compression
    header.setUint16(10, stamp.time, true);
    header.setUint16(12, stamp.date, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, data.length, true);
    header.setUint32(22, data.length, true);
    header.setUint16(26, name.length, true);
    return new Uint8Array(header.buffer);
}

function centralHeader(name, data, crc, stamp, offset) {
    const header = new DataView(new ArrayBuffer(46));
    header.setUint32(0, 0x02014B50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 20, true);
    header.setUint16(8, 0x0800, true);
    header.setUint16(10, 0, true);
    header.setUint16(12, stamp.time, true);
    header.setUint16(14, stamp.date, true);
    header.setUint32(16, crc, true);
    header.setUint32(20, data.length, true);
    header.setUint32(24, data.length, true);
    header.setUint16(28, name.length, true);
    header.setUint32(42, offset, true);
    return new Uint8Array(header.buffer);
}

function endOfDirectory(count, size, offset) {
    const record = new DataView(new ArrayBuffer(22));
    record.setUint32(0, 0x06054B50, true);
    record.setUint16(8, count, true);
    record.setUint16(10, count, true);
    record.setUint32(12, size, true);
    record.setUint32(16, offset, true);
    return new Uint8Array(record.buffer);
}

export function makeZip(entries) {
    const encoder = new TextEncoder();
    const stamp = dosDateTime(new Date());
    const files = [];
    const directory = [];
    let offset = 0;

    entries.forEach((entry) => {
        const name = encoder.encode(entry.name);
        const crc = crc32(entry.data);
        files.push(localHeader(name, entry.data, crc, stamp), name, entry.data);
        directory.push(centralHeader(name, entry.data, crc, stamp, offset), name);
        offset += 30 + name.length + entry.data.length;
    });

    const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
    return new Blob(
        [...files, ...directory, endOfDirectory(entries.length, directorySize, offset)],
        { type: 'application/zip' }
    );
}
