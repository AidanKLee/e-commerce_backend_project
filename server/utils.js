// authentication
const crypto = require('crypto');

const hashPassword = (password, salt, iterations, keylen, digest) => {
    return new Promise((res, rej) => {
        crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, hash) => {
            hash = hash.toString('hex');
            console.log(hash)
            err ? rej(next(err)) : res(hash);
        });
    })
}

const passwordMatch = (password, salt, iterations, keylen, digest, password2) => {
    return new Promise((res, rej) => {
        crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, hash) => {
            hash = hash.toString('hex');
            if (password2 !== hash || err) {
                rej(false);
            }
            res(true)
        })
    })
}

module.exports = {
    passwordMatch, hashPassword
}