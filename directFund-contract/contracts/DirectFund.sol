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

    address payable public recipient;
    address finalCustomer;
    
    uint finalSellingPrice = 0;
    Phase public state = Phase.Init;
    buyerDetails public saleDetails;
    
    mapping(address => Propose) allProposals;
    mapping(address => uint) returnAmount;


    // Events
    event SaleEnded(address finalBuyer, uint finalCost);
    event ProposalPhaseStarted();
    event BuyPhaseStarted();
    event SaleInit();
    event ZeroBalance();
    
    // modifier to check if recipient
    modifier onlyRecipient(){
        require (msg.sender == recipient, "Only the recipient can perform this action");
        _;
    }
    
    // modifier to check if phase is valid
    modifier checkPhase(Phase ph){
        require (ph == state, "Invalid phase for the action");
        _;
    }
    
    // modifier to check if the user is not the recipient
    modifier notRecipient(){
        require (msg.sender != recipient, "Only buyers must perform this action");
        _;
    }
    
    constructor() public {
        recipient = msg.sender;
        emit SaleInit();
    }
    
    // function to make a donation
    function donate() public payable notRecipient{
        // donationAmt = donationAmt*1000000000000000000; // making all transactions in ether
        // uint donationBalance = 0;
        recipient.transfer(msg.value);
        // donationBalance = msg.value - donationAmt;
        // msg.sender.transfer(donationBalance);
    }
    
    // function to change the phase
    function nextPhase() public onlyRecipient{
        if (state == Phase.Done){
            state = Phase.Init;
        }else{
            state = Phase(uint(state)+1);
        }
        if (state == Phase.Init) emit SaleInit();
        if (state == Phase.Proposal) emit ProposalPhaseStarted();
        if (state == Phase.Sale) emit BuyPhaseStarted();
    }
    
    // function to send proposal to the recipient (who is the seller here)
    function propose(bytes32 encodedAmount) public payable checkPhase(Phase.Proposal) notRecipient{
        require(msg.value > 0,"Deposit amount must be greater than proposal amount");
        allProposals[msg.sender] = Propose({
            proposal: encodedAmount,
            amount: msg.value
        });
    }
    
    // funtion to finalise the sale.
    function buy(uint proposedRate, bytes32 secret) public checkPhase(Phase.Sale) notRecipient{
        uint saleBalance = 0;
        Propose storage checkProp = allProposals[msg.sender];
        // check if the proposal is right one
        if (checkProp.proposal == computeKeccak(proposedRate,secret)){
            proposedRate = proposedRate*1000000000000000000; // making all transactions in ether
            saleBalance += checkProp.amount;  // has the proposed value as well as msg.value 
            if ((checkProp.amount >= proposedRate) && (checkMaxSale(msg.sender, proposedRate)))
                saleBalance -= proposedRate;
        }
        msg.sender.transfer(saleBalance);
        checkProp.proposal = bytes32(0);
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
        if (saleReturns > 0){
            returnAmount[msg.sender] = 0;
            msg.sender.transfer(saleReturns);
        }else{
            emit ZeroBalance();
        }
    }
    
    // end the sale and transfer balance to the recipient
    function finishSale() public checkPhase(Phase.Done){
        recipient.transfer(finalSellingPrice);
        finalSellingPrice = finalSellingPrice/1000000000000000000;
        saleDetails = buyerDetails({
            buyer:finalCustomer,
            boughtPrice:finalSellingPrice
        });
        // emit SaleEnded(finalCustomer,finalSellingPrice);
    }
    
    function getSaleDetails() public {
        emit SaleEnded(finalCustomer,finalSellingPrice);
    }
}

/* Please use these for dry run or generate your own values

Password
0x4265260000000000000000000000000000000000000000000000000000000000

bid 1:
20
0xf33027072471274d489ff841d4ea9e7e959a95c4d57d5f4f9c8541d474cb817a

bid 2:
30
0xfaa88b88830698a2f37dd0fa4acbc258e126bc785f1407ba9824f408a905d784

Deposit:
50


*/