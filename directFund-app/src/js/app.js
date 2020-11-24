App = {
  web3Provider: null,
  contracts: {},
  names: new Array(),
  url: 'http://127.0.0.1:7545',
  // network_id: 5777,
  chairPerson: null,
  currentAccount: null,
  buyingPhases: {
    "SaleInit": { 'id': 0, 'text': "Sale Not Started" },
    "ProposalPhaseStarted": { 'id': 1, 'text': "Rate Proposal Started" },
    "BuyPhaseStarted": { 'id': 2, 'text': "Buying Phase Started" },
    "SaleEnded": { 'id': 3, 'text': "Sale Ended" },
    "ZeroBalance": { 'id': 4, 'text': "Zero Balance"}
  },
  salePhases: {
    "0": "Sale Not Started",
    "1": "Proposal Phase Started",
    "2": "Buy Phase Started",
    "3": "Sale Ended",
    "4": "Zero Balance"
  },

  init: function () {
    console.log("Checkpoint 0");
    return App.initWeb3();
  },

  initWeb3: function () {
    // Is there is an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fallback to the TestRPC
      App.web3Provider = new Web3.providers.HttpProvider(App.url);
    }
    web3 = new Web3(App.web3Provider);
    ethereum.enable();
    App.populateAddress();
    return App.initContract();
  },

  initContract: function () {
    $.getJSON('DirectFund.json', function (data) {  
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var voteArtifact = data;
      App.contracts.vote = TruffleContract(voteArtifact);
      App.contracts.mycontract = data;
      // Set the provider for our contract
      App.contracts.vote.setProvider(App.web3Provider);
      App.currentAccount = web3.eth.coinbase;
      jQuery('#current_account').text(App.currentAccount);
      jQuery('#current_account1').text(App.currentAccount);
      App.getCurrentPhase();
      App.getChairperson();
      return App.bindEvents();
    });
  },

  bindEvents: function () {
    $(document).on('click', '#submit-bid', App.handleBid);
    $(document).on('click', '#change-phase', App.handlePhase);
    $(document).on('click', '#generate-winner', App.handleWinner);
    $(document).on('click', '#submit-reveal', App.handleReveal);
    $(document).on('click', '#close-auction', App.handleSaleEnd);
    $(document).on('click', '#withdraw-bid', App.handleWithdraw);
    $(document).on('click', '#donate-amt', App.handleDonation);
    $(document).on('click', '#register', function(){ var ad = $('#enter_address').val(); App.handleRegister(ad); });
  },

  populateAddress: function () {
    new Web3(new Web3.providers.HttpProvider(App.url)).eth.getAccounts((err, accounts) => {
      jQuery.each(accounts, function (i) {
        if (web3.eth.coinbase != accounts[i]) {
          var optionElement = '<option value="' + accounts[i] + '">' + accounts[i] + '</option';
          jQuery('#enter_address').append(optionElement);
        }
      });
    });
  },

  getCurrentPhase: function() {
    App.contracts.vote.deployed().then(function(instance) {
      return instance.state();
    }).then(function(result) {
      App.currentPhase = result;
      var notificationText = App.salePhases[App.currentPhase];
      console.log(App.currentPhase);
      console.log(notificationText);
      $('#phase-notification-text').text(notificationText);
      console.log("Phase set");
    })
  },

  getChairperson: function() {
    App.contracts.vote.deployed().then(function(instance) {
      return instance.recipient();
    }).then(function(result) {
      App.chairPerson = result;
      if(App.currentAccount == App.chairPerson) {
        $(".chairperson").css("display", "inline");
        $(".img-chairperson").css("width", "100%");
        $(".img-chairperson").removeClass("col-lg-offset-2");
      } else {
        $(".other-user").css("display", "inline");
      }
    })
  },

  handlePhase: function (event) {
    App.contracts.vote.deployed().then(function (instance) {
      return instance.nextPhase();
    })
      .then(function (result) {
        //console.log(result);
        if (result) {
          console.log(result);
          if (parseInt(result.receipt.status) == 1) {
            if (result.logs.length > 0) {
              App.showNotification(result.logs[0].event);
            }
            else {
              App.showNotification("SaleEnded");
            }
            App.contracts.vote.deployed().then(function(latestInstance) {
              return latestInstance.state();
            }).then(function(result) {
              console.log("This is also working, new phase updated")
              App.currentPhase = result;
            })
            return;
          }
          else {
            console.log(err);
            toastr["error"]("Error in changing to next Event");
          }
        }
        else {
          console.log(err);
          toastr["error"]("Error in changing to next Event");
        }
      })
      .catch(function (err) {
        console.log(err);
        toastr["error"]("Error in changing to next Event");
      });
  },

  handleBid: function () {
    event.preventDefault();
    var bidValue = $("#bet-value").val();
    var msgValue = $("#message-value").val();
    web3.eth.getAccounts(function (error, accounts) {
      var account = accounts[0];

      App.contracts.vote.deployed().then(function (instance) {
        bidInstance = instance;

        return bidInstance.propose(bidValue, { value: web3.toWei(msgValue, "ether") });
      }).then(function (result, err) {
        if (result) {
          console.log(result.receipt.status);
          if (parseInt(result.receipt.status) == 1)
            toastr.info("Your Proposal has been made!", "", { "iconClass": 'toast-info notification0' });
          else
            toastr["error"]("Error in Proposal. Proposal Reverted!");
        } else {
          console.log(err);
          toastr["error"]("Proposal Failed!");
        }
      }).catch(function (err) {
        console.log(err);
        toastr["error"]("Proposal Failed!");
      });
    });
  },

  handleDonation:function (){
    console.log("button clicked");
    event.preventDefault();
    // var donationValue = $("#donation-reveal").val();
    var depositValue = $("#deposit-value").val();
    // console.log(parseInt(donationValue));
    console.log(parseInt(depositValue));
    web3.eth.getAccounts(function (error, accounts) {
      var account = accounts[0];

      App.contracts.vote.deployed().then(function (instance) {
        curInstance = instance;

        return curInstance.donate({ value: web3.toWei(depositValue, "ether") });
      }).then(function (result, err) {
        if (result) {
          console.log(result.receipt.status);
          if (parseInt(result.receipt.status) == 1)
            toastr.info("Donation Successful", "", { "iconClass": 'toast-info notification0' });
          else
            toastr["error"]("Error in Doantion. Doantion Reverted!");
        } else {
          toastr["error"]("Doantion Failed!");
        }
      }).catch(function (err) {
        toastr["error"]("Donation Failed!");
      });
    });
  },

  handleReveal: function () {
    console.log("button clicked");
    event.preventDefault();
    var bidRevealValue = $("#bet-reveal").val();
    console.log(parseInt(bidRevealValue));
    var bidRevealSecret = $("#password").val();
    web3.eth.getAccounts(function (error, accounts) {
      var account = accounts[0];

      App.contracts.vote.deployed().then(function (instance) {
        bidInstance = instance;

        return bidInstance.buy(parseInt(bidRevealValue), bidRevealSecret);
      }).then(function (result, err) {
        if (result) {
          console.log(result.receipt.status);
          if (parseInt(result.receipt.status) == 1)
            toastr.info("Your Proposal has been fixed! Wait for next phase", "", { "iconClass": 'toast-info notification0' });
          else
            toastr["error"]("Error in Buying. Buying Reverted!");
        } else {
          toastr["error"]("Buying Failed!");
        }
      }).catch(function (err) {
        toastr["error"]("Buying Failed!");
      });
    });
  },


  handleSaleEnd: function () {
    console.log("To get winner");
    var bidInstance;
    App.contracts.vote.deployed().then(function (instance) {
      bidInstance = instance;
      return bidInstance.finishSale();
    }).then(function (res) {
      console.log(res);
      // var winner = res.logs[0].args.finalBuyer;
      // var highestBid = res.logs[0].args.finalCost.toNumber();
      toastr.info("Sale Ended Successfully", "", { "iconClass": 'toast-info notification3' });
    }).catch(function (err) {
      console.log(err);
      toastr["error"]("Error! Sale not over!");
    })
  },

  handleWithdraw: function() {
    if(App.currentPhase == 3) {
      console.log("Inside handleWithdraw")
      App.contracts.vote.deployed().then(function(instance) {
        console.log("Trying to call withdraw with currentAccount: " + App.currentAccount);
        return instance.getReturns({from: App.currentAccount });
      }).then(function(result, error) {
        if(result.receipt.status) {
          toastr.info('Your balance has been withdrawn');
        }  
      }).catch(function(error) {
        console.log(err.message);
        toastr["error"]("Error in withdrawing the balance");
      })
    } else {
      toastr["error"]("Not in a valid phase to withdraw balance!");
    }
  },

  handleWinner: function() {
    if(App.currentPhase == 3) {
      console.log("this worked");
      App.contracts.vote.deployed().then(function(instance) {
        return instance.getSaleDetails()
      }).then(function(res) {
      var winner = res.logs[0].args.finalBuyer;
      var highestBid = res.logs[0].args.finalCost.toNumber();
     toastr.info("Final Selling Price is " + highestBid + "<br>" + "Final Buyer is " + winner, "", { "iconClass": 'toast-info notification3' });
      })
    } else {
      toastr["error"]("Not in a valid phase to view winner!");
    }
  },

  //Function to show the notification of auction phases
  showNotification: function (phase) {
    var notificationText = App.buyingPhases[phase];
    $('#phase-notification-text').text(notificationText.text);
    toastr.info(notificationText.text, "", { "iconClass": 'toast-info notification' + String(notificationText.id) });
  }
};


$(function () {
  $(window).load(function () {
    App.init();
    //Notification UI config
    toastr.options = {
      "showDuration": "1000",
      "positionClass": "toast-top-left",
      "preventDuplicates": true,
      "closeButton": true
    };
  });
});
