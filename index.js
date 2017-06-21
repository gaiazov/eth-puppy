const express = require('express');
const bodyParser = require('body-parser');
const coder = require('web3/lib/solidity/coder');
const keythereum = require("keythereum");
const util = require('ethereumjs-util');
const Wallet = require('./sendTransaction');

const contractAbi = require('./contract.json');

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('https://ropsten.infura.io/')); // http://d73b3ec9.ngrok.io/

const app = express();

const wallet = new Wallet(web3, "0x008582beb5fcf34d7d17743faf1fccd2efd90163", "7ca8cc37efd5b1935a72efdee3ac4c09397b85e46ebeca88ea3273d56de539ea");
const contractDefinition = web3.eth.contract(contractAbi);

const contract = contractDefinition.at("0x44a83ebc7660315a30a66caa4fe3402fc8948b39");

function hashParams(types, params) {
  let encodedMsg = coder.encodeParams(types, params);
  let msg = util.sha3(encodedMsg);
  return msg;
}

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.post('/api/createKeystore', function(req, res) {
  console.log('createKeystore');

  let password = req.body.password;

  var dk = keythereum.create();
  var keystore = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv);

  res.json({
    address: '0x' + keystore.address,
    keystore: JSON.stringify(keystore)
  });
});

app.post('/api/verifyKeystore', function(req, res) {
  console.log('verifyKeystore');

  let {password, keystore} = req.body;
  let keyObject = JSON.parse(keystore);

  try {
    let privateKey = keythereum.recover(password, keyObject);
    res.sendStatus(200);  
  } catch (e) {
    res.sendStatus(422);
  }
});

app.post('/api/sign/', function(req, res) {
  console.log('sign');
  let {password, keystore, message, types} = req.body;

  try {
    let keyObject = JSON.parse(keystore);

    let privateKey = keythereum.recover(password, keyObject);

    let msg = hashParams(types, message);

    let signed = util.ecsign(msg, privateKey);
    let {r, s, v} = signed;

    res.json({
      address: '0x' + keyObject.address,
      r: '0x' + r.toString('hex'),
      s: '0x' + s.toString('hex'),
      v
    });
  } catch (ex) {
    res.status(422).json({
      message: ex.toString()
    });
  }
});

app.post('/api/addPuppy', function(req, res) {
  console.log('/api/addPuppy');

  let {puppyId, owner} = req.body;

  wallet.sendTransaction({
    method: contract.addPuppy, 
    params: [puppyId, owner], 
    gas: 300000
  })
  .then(transactionHash => {
    res.json({
      transactionHash
    });
  })
  .catch(error => {
    console.error(error);
    res.status(500).send(error);
  });
});

app.post('/api/sell', function(req, res) {
  console.log('/api/sell');

  let {
    puppyId,
    price,
    buyer,
    buyer_r,
    buyer_s,
    buyer_v,
    seller,
    seller_r,
    seller_s,
    seller_v
  } = req.body;

  let hash = '0x' + hashParams(
    ['uint256', 'uint256', 'address', 'address'],
    [puppyId, price, buyer, seller]
  ).toString('hex');

  let params = [
    puppyId, 
    hash,
    buyer,
    buyer_v,
    buyer_r,
    buyer_s,
    seller,
    seller_v,
    seller_r,
    seller_s
  ];

/*
uint puppyId, bytes32 hash, 
        address buyer,  uint8 buyer_v,  bytes32 buyer_r,  bytes32 buyer_s,
        address seller, uint8 seller_v, bytes32 seller_r, bytes32 seller_s
*/
  wallet.sendTransaction({
      method: contract.sell, 
      params, 
      gas: 1000000
    })
    .then(transactionHash => {
      res.json({
        transactionHash
      });
    })
    .catch(error => {
      console.error(error);
      res.status(500).send(error);
    });
});

app.get('/api/transaction/:transaction', function(req, res) {
  let transactionHash = req.params.transaction;

  console.log(`/api/transaction/${transactionHash}`);

  web3.eth.getTransaction(transactionHash, (error, transaction) => {
    if (error) {
      console.error(error);
      return res.sendStatus(400);
    }

    web3.eth.getTransactionReceipt(transactionHash, (error, receipt) => {
      if (error) {
        console.error(error);
        return res.sendStatus(400);
      }

      let {blockHash, blockNumber} = transaction;

      let confirmationBlocks = blockNumber ? web3.eth.blockNumber - blockNumber : null;
      let failed = receipt 
        // if all the gas was used, the transaction failed. not 100% true but a good assumption
        ? transaction.gas == receipt.gasUsed 
        : false;

      let completed = !failed && confirmationBlocks >= 6;

      res.json({
        transactionHash,
        blockHash,
        blockNumber,
        confirmationBlocks,
        failed,
        completed
      });
    });
  })
});

app.get('/api/owner/:puppyId', function(req, res) {
  let puppyId = req.params.puppyId;

  console.log(`/api/owner/${puppyId}`);
  contract.puppyOwner(puppyId, (error, owner) => {
    if (error) {
      console.error(error);
      return res.sendStatus(400);
    }

    res.json({
      owner,
      puppyId
    });
  });
});

app.listen(3000, function () {
  console.log('App listening on port 3000!')
});


