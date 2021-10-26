
const hex2bin = hex => {
    const buffer = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < buffer.length; i++) {
        buffer[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buffer;
};

const PUBLIC_KEY = crypto.subtle.importKey(
    'raw',
    hex2bin(process.env.PUBLIC_KEY),
    {
        name: 'NODE-ED25519',
        namedCurve: 'NODE-ED25519',
        public: true,
    },
    true,
    ['verify'],
);

const encoder = new TextEncoder();

module.exports = async (request, bodyText) => {
    const timestamp = request.headers.get('X-Signature-Timestamp') || '';
    const signature = hex2bin(request.headers.get('X-Signature-Ed25519'));
    return crypto.subtle.verify(
        'NODE-ED25519',
        await PUBLIC_KEY,
        signature,
        encoder.encode(timestamp + bodyText),
    );
};
