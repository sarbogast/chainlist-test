// Contract to be tested
const ChainList = artifacts.require("./ChainList.sol");

// Test suite
contract('ChainList', function (accounts) {
    let chainListInstance;
    const seller = accounts[1];
    const buyer = accounts[2];
    const articleId = 1;
    const articleName = "article 1";
    const articleDescription = "Description for article 1";
    const articlePrice = web3.utils.toBN(10);

    before("setup contract for each test", async () => {
        chainListInstance = await ChainList.deployed();
    });

    // Test case: buying an article when no article for sale yet
    it("should throw an exception if you try to buy an article when there is no article for sale", async () => {
        try {
            await chainListInstance.buyArticle(articleId, {
                from: buyer,
                value: web3.utils.toWei(articlePrice, "ether")
            });
            assert.fail()
        } catch(error) {
            assert.equal(error.reason, "There should be at least one article");
        }
        
        const numberOfArticles = await chainListInstance.getNumberOfArticles();
        //make sure sure the contract state was not altered
        assert.equal(numberOfArticles.toNumber(), 0, "number of articles must be zero");
    });

    // Test case: buying an article that does not exist
    it("should throw an exception if you try to buy an article that does not exist", async () => {
        const receipt = chainListInstance.sellArticle(articleName, articleDescription, web3.utils.toWei(articlePrice, "ether"), {
            from: seller
        });
        try {
            await chainListInstance.buyArticle(2, {
                from: seller,
                value: web3.utils.toWei(articlePrice, "ether")
            });
            assert.fail();
        } catch(error) {
            assert.equal(error.reason, "Article with this id does not exist");
        }

        const article = await chainListInstance.articles(articleId);
        assert.equal(article[0].toNumber(), articleId, "article id must be " + articleId);
        assert.equal(article[1], seller, "seller must be " + seller);
        assert.equal(article[2], 0x0, "buyer must be empty");
        assert.equal(article[3], articleName, "article name must be " + articleName);
        assert.equal(article[4], articleDescription, "article description must be " + articleDescription);
        assert.equal(article[5].toString(), web3.utils.toWei(articlePrice, "ether").toString(), "article price must be " + web3.utils.toWei(articlePrice, "ether"));
    });

    // Test case: buying an article you are selling
    it("should throw an exception if you try to buy your own article", async () => {
        try {
            await chainListInstance.buyArticle(articleId, {
                from: seller,
                value: web3.utils.toWei(articlePrice, "ether")
            });
            assert.fail();
        } catch(error) {
            assert.equal(error.reason, "Seller cannot buy his own article");    
        }
        
        const article = await chainListInstance.articles(articleId);
        //make sure sure the contract state was not altered
        assert.equal(article[0].toNumber(), articleId, "article id must be " + articleId);
        assert.equal(article[1], seller, "seller must be " + seller);
        assert.equal(article[2], 0x0, "buyer must be empty");
        assert.equal(article[3], articleName, "article name must be " + articleName);
        assert.equal(article[4], articleDescription, "article description must be " + articleDescription);
        assert.equal(article[5].toString(), web3.utils.toWei(articlePrice, "ether").toString(), "article price must be " + web3.utils.toWei(articlePrice, "ether"));
    });

    // Test case: incorrect value
    it("should throw an exception if you try to buy an article for a value different from its price", async () => {
        try {
            await chainListInstance.buyArticle(articleId, {
                from: buyer,
                value: web3.utils.toWei(articlePrice + 1, "ether")
            });
            assert.fail();
        } catch(error) {
            assert.equal(error.reason, "Value provided does not match price of article");
        }
         
        const article = await chainListInstance.articles(articleId);
        //make sure sure the contract state was not altered
        assert.equal(article[0].toNumber(), articleId, "article id must be " + articleId);
        assert.equal(article[1], seller, "seller must be " + seller);
        assert.equal(article[2], 0x0, "buyer must be empty");
        assert.equal(article[3], articleName, "article name must be " + articleName);
        assert.equal(article[4], articleDescription, "article description must be " + articleDescription);
        assert.equal(article[5].toString(), web3.utils.toWei(articlePrice, "ether").toString(), "article price must be " + web3.utils.toWei(articlePrice, "ether"));
    });

    // Test case: article has already been sold
    it("should throw an exception if you try to buy an article that has already been sold", async () => {
        await chainListInstance.buyArticle(articleId, {
            from: buyer,
            value: web3.utils.toWei(articlePrice, "ether")
        });
        
        try {
            await chainListInstance.buyArticle(articleId, {
                from: accounts[0],
                value: web3.utils.toWei(articlePrice, "ether")
            });
            assert.fail();
        } catch(error) {
            assert.equal(error.reason, "Article was already sold");
        }
        
        const article = await chainListInstance.articles(articleId);
        //make sure sure the contract state was not altered
        assert.equal(article[0].toNumber(), articleId, "article id must be " + articleId);
        assert.equal(article[1], seller, "seller must be " + seller);
        assert.equal(article[2], buyer, "buyer must be " + buyer);
        assert.equal(article[3], articleName, "article name must be " + articleName);
        assert.equal(article[4], articleDescription, "article description must be " + articleDescription);
        assert.equal(article[5].toString(), web3.utils.toWei(articlePrice, "ether").toString(), "article price must be " + web3.utils.toWei(articlePrice, "ether"));
    });
});