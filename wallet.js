const EthereumTx = require('ethereumjs-tx');
const _ = require('lodash');

class Wallet {
  constructor(web3, address, privateKey) {
    this.web3 = web3;
    this.address = address;
    this.privateKey = Buffer.from(privateKey, 'hex');
  }

  getGasPrice() {
    return new Promise((resolve, reject) => {
      this.web3.eth.getGasPrice((error, gasPrice) => {
        if (error) {
          return reject(error);
       }
          
        resolve(gasPrice);
      });
    });
  };

  getTransactionCount(address) {
    return new Promise((resolve, reject) => {
      this.web3.eth.getTransactionCount(address, 'pending', (error, transactionCount) => {
          if (error) {
              reject(error);
          } else {
              resolve(transactionCount);
          }
      });
    });
  }

  sendTransaction({method, params, gas}) {
    let transactionParams = {
      from: this.address
    };

    return Promise.resolve()
      .then(() => {
        let encodedTransaction = method.request.apply(method, params);
        let encodedParams = encodedTransaction.params[0];
        transactionParams.to = encodedParams.to;
        transactionParams.data = encodedParams.data;
      })
      .then(() => this.getGasPrice())
      .then(gasPrice => {
        transactionParams.gasPrice = this.web3.toHex(gasPrice);
        transactionParams.gas = this.web3.toHex(gas);
      })
      .then(() => this.getTransactionCount(this.address))        
      .then(transactionCount => {
        let nonce = _.isFinite(this._nonce)
          ? Math.max(transactionCount, Wallet._nonce + 1)
          : transactionCount;

        transactionParams.nonce = this.web3.toHex(nonce);

        return nonce;
      })
      .then(() => {
        const tx = new EthereumTx(transactionParams);
        tx.sign(this.privateKey)
        const serializedTx = tx.serialize();

        return '0x' + serializedTx.toString('hex');
      })
      .then(signedData => {
        return new Promise((resolve, reject) => {
          this.web3.eth.sendRawTransaction(signedData, (error, transactionHash) => {
            if (error) {
              // clear nonce
              this._nonce = undefined;
              reject(error);
            } else {
              console.log(`transaction #${transactionHash} sent`);
              resolve(transactionHash);
            }
          });
        });
      });
  }
}


module.exports = Wallet;