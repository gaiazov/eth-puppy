pragma solidity ^0.4.0;
contract Puppian {
    address admin;
    mapping(uint => address) public puppyOwners;

    function Puppian() {
        admin = msg.sender;
    }
    
    function addPuppy(uint puppyId, address owner) callableByAdmin public {
        if (puppyOwners[puppyId] != 0x0) {
            throw;
        }
        
        puppyOwners[puppyId] = owner;
    }

    function sell(uint puppyId, bytes32 hash, 
        address buyer,  uint8 buyer_v,  bytes32 buyer_r,  bytes32 buyer_s,
        address seller, uint8 seller_v, bytes32 seller_r, bytes32 seller_s
    ) callableByAdmin public {
        
        /* confirm that buyer signed */
        if (ecrecover(hash, buyer_v, buyer_r, buyer_s) != buyer) {
            throw;
        }
        
        /* confirm that seller signed */
        if (ecrecover(hash, seller_v, seller_r, seller_s) != seller) {
            throw;
        }
        
        if (puppyOwners[puppyId] != seller) {
            throw;
        }
        
        puppyOwners[puppyId] = buyer;
    }
    
    function puppyOwner(uint puppyId) constant returns (address owner) {
        return puppyOwners[puppyId];
    }
    
    function transfer(uint puppyId, address newOwner) {
        /* only owner can transfer their puppy */
        if (puppyOwners[puppyId] != msg.sender) {
            throw;
        }
        
        puppyOwners[puppyId] = newOwner;
    }
    
    modifier callableByAdmin {
        if (admin == msg.sender) {
            _;
        } else {
            throw;
        }
    }
}