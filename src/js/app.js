App = {
    web3Provider: null,
    contracts: {},
    account: 0X0,
    loading: false,

    init: async () => {
        return App.initWeb3();
    },

    initWeb3: async () => {
        if (window.ethereum) {
            // Modern dapp browsers
            window.web3 = new Web3(window.ethereum);
            try {
                await window.ethereum.enable();
                App.displayAccountInfo();
                return App.initContract();
            } catch (error) {
                // User denied account access...
                console.error("Unable to retrieve your accounts! You have to approve this application on Metamask.");
            }
        } else if(window.web3) {
            // Legacy dapp browsers
            window.web3 = new Web3(window.web3.currentProvider || "ws://localhost:8545");
            App.displayAccountInfo();
            return App.initContract(); 
        } else {
            // Non-dapp browsers...
            console.log("Non-ethereum browser detected. You should consider trying Metamask");
        }
    },

    displayAccountInfo: async () => {
        const accounts = await window.web3.eth.getAccounts();
        App.account = accounts[0];
        $("#account").text(App.account);
        const balance = await window.web3.eth.getBalance(App.account);
        $("#accountBalance").text(window.web3.utils.fromWei(balance, "ether") + " ETH");
    },

    initContract: function () {
        $.getJSON('ChainList.json', artifact => {
            // Get the necessary contract artifact file and use it to instantiate a truffle contract abstraction.
            App.contracts.ChainList = TruffleContract(artifact);

            // Set the provider for our contract.
            App.contracts.ChainList.setProvider(window.web3.currentProvider);

            // Listen to events
            App.listenToEvents();

            // Retrieve the article from the smart contract
            return App.reloadArticles();
        });
    },

    listenToEvents: async () => {
        const chainListInstance = await App.contracts.ChainList.deployed();
        if(App.logSellArticleEventListener == null) {
            // watch for new article
            App.logSellArticleEventListener = chainListInstance
                .LogSellArticle({fromBlock: '0'})
                .on("data", event => {
                    $("#" + event.id).remove();
                    $("#events").append(
                        '<li class="list-group-item" id="' + event.id + '">' + event.returnValues._name + ' is for sale</li>'
                    );
                    App.reloadArticles();
                })
                .on("error", error => {
                    console.error(error);
                });
        }
        if(App.logBuyArticleEventListener == null) {
            // watch for sold article
            App.logBuyArticleEventListener = chainListInstance
                .LogBuyArticle({fromBlock: '0'})
                .on("data", event => {
                    $("#" + event.id).remove();
                    $("#events").append(
                        '<li class="list-group-item" id:"' + event.id + '">' + event.returnValues._buyer + ' bought ' + event.returnValues._name + '</li>'
                    );
                    App.reloadArticles();
                })
                .on("error", error => {
                    console.error(error);
                });
        }
        // switch button visibility
        $('.btn-subscribe').hide();
        $('.btn-unsubscribe').show();
        $('.btn-show-events').show();
    },

    stopListeningToEvents: async () => {
        if(App.logSellArticleEventListener != null) {
            console.log("Unsubscribe from LogSellArticle");
            await App.logSellArticleEventListener.removeAllListeners();
            App.logSellArticleEventListener = null;
        }
        if(App.logBuyArticleEventListener != null) {
            console.log("Unsubscribe from LogBuyArticle");
            await App.logBuyArticleEventListener.removeAllListeners();
            App.logBuyArticleEventListener = null;
        }
        // force a close of the events section
        $("#events")[0].className = "list-group-collapse";

        // switch button visibility
        $('.btn-subscribe').show();
        $('.btn-unsubscribe').hide();
        $('.btn-show-events').hide();
    },

    sellArticle: async () => {
        const articlePriceValue = parseFloat($("#article_price").val());
        const articlePrice = isNaN(articlePriceValue) ? "0" : articlePriceValue.toString();   
        
        const _name = $("#article_name").val();
        const _description = $("#article_description").val();
        const _price = window.web3.utils.toWei(articlePrice, "ether"); 

        if (_name.trim() == "" || _price === "0") {
            // nothing to sell
            return false;
        }

        try {
            const chainListInstance = await App.contracts.ChainList.deployed();
            const transactionReceipt = await chainListInstance
                .sellArticle(_name, _description, _price, {from: App.account, gas: 500000})
                .on("transactionHash", hash => {
                    console.log("Transaction hash: " + hash);
                });
            console.log("Transaction receipt", transactionReceipt);
        } catch(error) {
            console.error(error.message);
        }
    },

    buyArticle: async () => {
        event.preventDefault();

        // retrieve the article price
        const _articleId = $(event.target).data('id');
        const articlePriceValue = parseFloat($(event.target).data('value'));
        const articlePrice = isNaN(articlePriceValue) ? "0" : articlePriceValue.toString(); 
        const _price = window.web3.utils.toWei(articlePrice, "ether");
        
        try {
            const chainListInstance = await App.contracts.ChainList.deployed();
            const transactionReceipt = await chainListInstance
                .buyArticle(_articleId, {
                    from: App.account, 
                    gas: 500000, 
                    value: _price
                })
                .on("transactionHash", hash => {
                    console.log("Transaction hash: " + hash);
                });
            console.log("Transaction receipt", transactionReceipt);
        } catch(error) {

        }
    },

    reloadArticles: async () => {
        // avoid reentry
        if (App.loading) {
            return;
        }
        App.loading = true;

        // refresh account information because the balance may have changed
        App.displayAccountInfo();

        try {
            const chainListInstance = await App.contracts.ChainList.deployed();
            const articleIds = await chainListInstance.getArticlesForSale();

            // retrieve the articles placeholder and clear it
            $("#articlesRow").empty();

            for(let i = 0; i < articleIds.length; i++) {
                const article = await chainListInstance.articles(articleIds[i]);
                App.displayArticle(
                    article[0],
                    article[1],
                    article[3],
                    article[4],
                    article[5]
                );
            }
            App.loading = false;
        } catch(error) {
            console.error(error);
            App.loading = false;
        }
    },

    displayArticle: (id, seller, name, description, price) => {
        // Retrieve the article placeholder
        const articlesRow = $('#articlesRow');

        const etherPrice = window.web3.utils.fromWei(price, "ether");

        // Retrieve and fill the article template
        const articleTemplate = $('#articleTemplate');
        articleTemplate.find('.panel-title').text(name);
        articleTemplate.find('.article-description').text(description);
        articleTemplate.find('.article-price').text(etherPrice + " ETH");
        articleTemplate.find('.btn-buy').attr('data-id', id);
        articleTemplate.find('.btn-buy').attr('data-value', etherPrice);

        // seller?
        if (seller == App.account) {
            articleTemplate.find('.article-seller').text("You");
            articleTemplate.find('.btn-buy').hide();
        } else {
            articleTemplate.find('.article-seller').text(seller);
            articleTemplate.find('.btn-buy').show();
        }

        // add this new article
        articlesRow.append(articleTemplate.html());
    },
};

$(function () {
    $(window).load(function () {
        App.init();
    });
});
