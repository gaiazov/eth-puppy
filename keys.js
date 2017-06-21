const keythereum = require("keythereum");
const key1 = require("./keys/key1.json");


var privateKey = keythereum.recover("nopass", key1);
console.log(privateKey.toString('hex'));