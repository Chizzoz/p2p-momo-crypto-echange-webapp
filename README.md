# e-Mpiya P2P MoMo Crypto eXchange

## Useful Links... TL;DR

1.  Frontend repository: https://github.com/Chizzoz/p2p-momo-crypto-echange-webapp

    Demo DApp:           https://p2p.oneziko.com/

2. Smart Contract repository (HardHat): https://github.com/Chizzoz/p2p-momo-crypto-exchange

## About the DApp

1.  DApp tech stack
    * HardHat
    * Alchemy SDK for Javascript
    * ethers.js library
    * Polygonscan API
    * Metamask API
    * Laravel 9
    * Laravel Jetstream
    * InertiaJS
    * ReactJS (Typescript)
    * Tailwind CSS
    * MySQL DB
    * 543 Konse Konse Merchant API (SOAP Webservice)
    * MTN MoMo API (OAuth2.0 Open API)

2. Product / Service use case

This project is aimed at simplifying the process of trading, exchanging or liquidating crypto tokens, in developing countries, like Zambia, where options to trade crypto are limited to a few Centralised Crypto Exchanges that require one to have a bank account and use VISA or MasterCard cards. Mobile Money penetration has surged in recent years, in a lot of developing countries in Africa and deposits, transactions and accounts have surpassed traditional banking numbers. In order to foster finacial inclusion and extend the crypto space to the majority mobile money users, it makes sense to offer a P2P service that integrates crypto with mobile money and break the barriers to entry in this space for users in developing nations.

3. Brief description

e-Mpiya P2P MoMo Crypto eXchange is a peer-to-peer crypto exchange that leverages mobile money and web3 technogoies to trade between users, with an escrow smart contract as a trust layer for the arbitration process.

There are two main processes involved on the platform:
1. Listing: A user can post or list an amount of crypto token, Polygon MATIC in this case, that will be listed as available for any user to buy using their mobile money account. The listing process is facilitated by debiting the sellers account and crediting the escrow account with the listing amount. The listed amount is held in the escrow smart contract account, until it is either bought or withdrawn by seller who deposited it. The Arbitration account can also return the deposited MATIC tokens to the seller or depositing sddress.

2. Buying: A listed post can be bought by any user on the platform. The user who initiates the buying process will receive a push notification on their mobile phone, requesting them to enter their mobile money wallet PIN to authorise payment, after which, a successful PIN authentication will move funds from users wallet to the e-Mpiya merchant wallet, adding a positive balance to the MATIC sellers account and this can be sent to their own mobile money account. At the same time, after the transaction by buyer is confirmed, the escrow smart contract initiates a transfer from the escrow smart contract to the buyers wallet address on Polygon, with the listed MATIC amount.

## Smart Contracts

1.  Contract Name:    EmpiyaP2P

    Contract Address: 0xF5e8705a763f4581140203f2DA16ecB649aAcD1a

    Contract Link:    https://mumbai.polygonscan.com/address/0xf5e8705a763f4581140203f2da16ecb649aacd1a#code

2.  Contract Name:    Escrow

    Contract Address: 0x026bef8093104723D91E2D9A5059d36C61CF05B1

    Contract Link:    https://mumbai.polygonscan.com/address/0x026bef8093104723d91e2d9a5059d36c61cf05b1#code

### Contracts Management

The two above contracts were deployed by the address: 0x6102118dda3E57d5D1c29A84ee7410A0E160DaBc which then assumed Admin rights over *EmpiyaP2P* Contract. The *EmpiyaP2P* Contract address was then used in the contsructor of *Escrow* Contract to assign it *Arbitrator* rights over the *Escrow* Contract. Therefore, only Admin address can call *onlyAdmin* functions on the *EmpiyaP2P* Contract and only the *EmpiyaP2P* Contract address can call all the functions on *Escrow* Contract. Other wallet addresses can check their balance, deposit tokens to the *Escrow* Contract and withdraw their deposited tokens from the *Escrow* Contract

### Contract Functions

01. function **setAdmin(address _admin)** external onlyAdmin
02. function **getCaller()** external view onlyAdmin returns (address caller)
03. function **getOwner()** external view onlyAdmin returns (address owner)
04. function **getUserBalance()** external view returns (uint balance)
05. function **getEscrowAddress()** external view onlyAdmin returns (address owner)
06. function **setEscrowContract(Escrow escrowContractAccount)** external onlyAdmin returns (address)
07. function **getTotalBalance()** external view onlyAdmin returns (uint256 balance)
08. function **getUserTransaction(uint256 transactionKey)** external view returns (UserTransactionType.UserTransaction memory transaction)
09. function **getUserTransactionByUser(address userAddress, uint256 transactionKey)** external view returns (UserTransactionType.UserTransaction memory transaction)
10. function **getUserTransactions()** external view returns (UserTransactionType.UserTransaction[] memory transactions)
11. function **getTransactionsByUser(address userAddress)** external view onlyAdmin returns (UserTransactionType.UserTransaction[] memory transactions)
12. function **deposit()** external payable returns (uint256, UserTransactionType.UserTransaction memory)
13. function **withdraw(uint256 transactionKey, bytes32 transactionNumber)** external payable returns (uint256 _transactionKey, UserTransactionType.UserTransaction memory userTransaction)
14. function **transfer(uint256 transactionKey, bytes32 transactionNumber, address payable recipient)** external returns (uint256 _transactionKey, UserTransactionType.UserTransaction memory userTransaction)
15. function **transferByDepositor(address depositor, uint256 transactionKey, bytes32 transactionNumber, address payable recipient)** external onlyAdmin returns (uint256 _transactionKey, UserTransactionType.UserTransaction memory userTransaction)
