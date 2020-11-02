pragma solidity >=0.4.22 <=0.6.0;

contract DirectFund {
    
    struct Propose {
        bytes32 proposal;
        uint amount;
    }
    
    struct buyerDetails {
        address buyer;
        uint boughtPrice;
    }
    
    enum Phase {Init, Proposal, Sale, Done}

    address payable recipient;
    address finalCustomer;
    
    uint finalSellingPrice = 0;
    Phase public state = Phase.Init;
    buyerDetails public saleDetails;
    
    mapping(address => Propose) allProposals;
    mapping(address => uint) returnAmount;

    // modifier to check if recipient
    modifier onlyRecipient(){
        require (msg.sender == recipient);
        _;
    }
    
    // modifier to check if phase is valid
    modifier checkPhase(Phase ph){
        require (ph == state);
        _;
    }
    
    // modifier to check if the user is not the recipient
    modifier notRecipient(){
        require (msg.sender != recipient);
        _;
    }
    
    constructor() public {
        recipient = msg.sender;
        state = Phase.Proposal;
    }
    
    // function to make a donation
    function donate(uint donationAmt) public payable notRecipient{
        uint donationBalance = 0;
        recipient.transfer(donationAmt);
        donationBalance = msg.value - donationAmt;
        msg.sender.transfer(donationBalance);
    }
    
    // function to change the phase
    function changePhase(Phase nextPhase) public onlyRecipient{
        if (uint(nextPhase) < 1) revert();
        state = nextPhase;
    }
    
    // function to send proposal to the recipient (who is the seller here)
    function propose(bytes32 encodedAmount) public payable checkPhase(Phase.Proposal){
        
        allProposals[msg.sender] = Propose({
            proposal: encodedAmount,
            amount: msg.value
        });
    }
    
    // funtion to finalise the sale.
    function buy(uint proposedRate, bytes32 secret) public checkPhase(Phase.Sale){
        uint saleBalance = 0;
        Propose storage checkProp = allProposals[msg.sender];
        // check if the proposal is right one
        if (checkProp.proposal == computeKeccak(proposedRate,secret)){
            saleBalance += checkProp.amount;  // has the proposed value as well as msg.value 
            if ((checkProp.amount >= proposedRate) && (checkMaxSale(msg.sender, proposedRate)))
                saleBalance -= proposedRate;
        }
        msg.sender.transfer(saleBalance);
    }
    
    // encoding the proposed value
    function computeKeccak(uint propValue, bytes32 secret) internal returns(bytes32) {
        bytes32 x = keccak256(abi.encodePacked(propValue,secret));
        return x;
    }
    
    // to check for the highest rate proposed
    function checkMaxSale(address buyer, uint propValue) internal returns (bool status) {
        if (propValue <= finalSellingPrice) return false;
        if (finalCustomer != buyer) returnAmount[finalCustomer] += finalSellingPrice;
        finalSellingPrice = propValue;
        finalCustomer = buyer;
        return true;
    }
    
    // return the amount to the buyers who didn't get the item
    function getReturns() public checkPhase(Phase.Done) notRecipient{
        uint saleReturns = returnAmount[msg.sender];
        require (saleReturns > 0);
        returnAmount[msg.sender] = 0;
        msg.sender.transfer(saleReturns);
    }
    
    // end the sale and transfer balance to the recipient
    function finishSale() public checkPhase(Phase.Done) onlyRecipient{
        recipient.transfer(finalSellingPrice);
        saleDetails = buyerDetails({
            buyer:finalCustomer,
            boughtPrice:finalSellingPrice
        });
    }
    
}

/* Please use these for dry run or generate your own values

Password
0x4265260000000000000000000000000000000000000000000000000000000000

bid 1:
20000000000000000000
0xabb7d85c7fe09d8882710e188e34e627259a9858bf3d30d6cd3db8f9ee4a81d5

bid 2:
30000000000000000000
0x44b4d6f86f3a6ffc2ca7766341b64560d0b322aa2def31b44614a535c599daac

Deposit:
50000000000000000000


*/