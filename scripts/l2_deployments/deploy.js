const { ethers } = require('hardhat');
const w3utils = require('web3-utils');
const snx = require('synthetix-2.50.4-ovm');
const { artifacts, contract, web3 } = require('hardhat');

const { getTargetAddress, setTargetAddress } = require('../helpers');

const { toBytes32 } = require('../../index');

const aggregators = {
	AUD: '0x5813A90f826e16dB392abd2aF7966313fc1fd5B8',
	BAT: '0x8e67A0CFfbbF6A346ce87DFe06daE2dc782b3219',
	BNB: '0x8993ED705cdf5e84D0a3B754b5Ee0e1783fcdF16',
	BTC: '0x6135b13325bfC4B00278B4abC5e20bbce2D6580e',
	CHF: '0xed0616BeF04D374969f302a34AE4A63882490A8C',
	COMP: '0xECF93D14d25E02bA2C13698eeDca9aA98348EFb6',
	DAI: '0x777A68032a88E5A84678A77Af2CD65A7b3c0775a',
	ETH: '0x9326BFA02ADD2366b30bacB125260Af641031331',
	EUR: '0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13',
	GBP: '0x28b0061f44E6A9780224AA61BEc8C3Fcb0d37de9',
	JPY: '0xD627B1eF3AC23F1d3e576FA6206126F3c1Bd0942',
	KRW: '0x9e465c5499023675051517E9Ee5f4C334D91e369',
	LINK: '0x396c5E36DD0a0F5a5D33dae44368D4193f69a1F0',
	LTC: '0xCeE03CF92C7fFC1Bad8EAA572d69a4b61b6D4640',
	PHP: '0x84fdC8dD500F29902C99c928AF2A91970E7432b6',
	REP: '0x8f4e77806EFEC092A279AC6A49e129e560B4210E',
	SNX: '0x31f93DA9823d737b7E44bdee0DF389Fe62Fd1AcD',
	TRX: '0x9477f0E5bfABaf253eacEE3beE3ccF08b46cc79c',
	TSLA: '0xb31357d152638fd1ae0853d24b9Ea81dF29E3EF2',
	UNI: '0xDA5904BdBfB4EF12a3955aEcA103F51dc87c7C39',
	USDC: '0x9211c6b3BF41A10F78539810Cf5c64e1BB78Ec60',
	USDT: '0x2ca5A90D34cA333661083F89D831f757A9A50148',
	VELO: '0x6d393f929E213D2Ca67A7FA73108A42b884F5f74',
	XAG: '0x4594051c018Ac096222b5077C3351d523F93a963',
	XAU: '0xc8fb5684f2707C82f28595dEaC017Bfdf44EE9c5',
	XRP: '0x3eA2b7e3ed9EA9120c3d6699240d1ff2184AC8b3',
	XTZ: '0xC6F39246494F25BbCb0A8018796890037Cb5980C',
	ZRX: '0x24D6B177CF20166cd8F55CaaFe1c745B44F6c203',
	sCEX: '0xA85646318D20C684f6251097d24A6e74Fe1ED5eB',
	sDEFI: '0x70179FB2F3A0a5b7FfB36a235599De440B0922ea',
	'Fast Gas Gwei': '0x3D400312Bb3456f4dC06D528B55707F08dFFD664',
};

async function main() {
	let accounts = await ethers.getSigners();
	let owner = accounts[0];
	let networkObj = await ethers.provider.getNetwork();
	console.log(networkObj)
	let network = networkObj.name;
	if (network == 'homestead') {
		network = 'mainnet';
	}
	if(networkObj.chainId == 69) {
		networkObj.name = "optimisticKovan";
		network = 'optimisticKovan'
	}
	if(networkObj.chainId == 10) {
		networkObj.name = "optimistic";
		network = 'optimistic'		
	}

	console.log('Account is:' + owner.address);
	console.log('Network name:' + network);

	

	const addressResolverAddress = getTargetAddress('AddressResolver', network);
	const safeDecimalMathAddress = getTargetAddress('SafeDecimalMath', network);
	const proxysUSDAddress = getTargetAddress('ProxysUSD', network);
	
	const ZeroExAddress = getTargetAddress('ZeroEx', network);
	console.log('Found 0x at:' + ZeroExAddress);
	
	console.log(addressResolverAddress);
	console.log(safeDecimalMathAddress);

	const addressResolverContract = await ethers.getContractFactory('synthetix-2.50.4-ovm/contracts/AddressResolver.sol:AddressResolver');
	const safeDecimalMathContract = await ethers.getContractFactory('synthetix-2.50.4-ovm/contracts/SafeDecimalMath.sol:SafeDecimalMath');
	const proxysUSDContract = await ethers.getContractFactory('synthetix-2.50.4-ovm/contracts/ProxyERC20.sol:ProxyERC20');

	let addressResolver = await addressResolverContract.attach(addressResolverAddress);
	let safeDecimalMath = await safeDecimalMathContract.attach(safeDecimalMathAddress);
	let proxysUSD = await proxysUSDContract.attach(proxysUSDAddress);

	// const addressResolver = snx.getTarget({ useOvm: true, contract: 'AddressResolver' });
	console.log('Found address resolver at:' + addressResolver.address);

	// const safeDecimalMath = snx.getTarget({ useOvm: true, contract: 'SafeDecimalMath' });
	console.log('Found safeDecimalMath at:' + safeDecimalMath.address);
	console.log('Found proxysUSD at:' + proxysUSD.address);

	//Price feed deployment
	const priceFeed = await ethers.getContractFactory('PriceFeed');
	let PriceFeedDeployed; 

	if(network == 'ropsten') {
		const ropstenPriceFeed = await ethers.getContractFactory('MockPriceFeed');
		PriceFeedDeployed = await ropstenPriceFeed.deploy(owner.address);
		await PriceFeedDeployed.deployed();
		setTargetAddress('PriceFeed', network, PriceFeedDeployed.address);
		console.log('MockPriceFeed deployed to:', PriceFeedDeployed.address);
		await PriceFeedDeployed.setPricetoReturn(1000);
	}
	else {
		
		// PriceFeedDeployed = await priceFeed.deploy(owner.address);
		// await PriceFeedDeployed.deployed();
		// setTargetAddress('PriceFeed', network, PriceFeedDeployed.address);
		// console.log('PriceFeed deployed to:', PriceFeedDeployed.address);

		priceFeedAddress = getTargetAddress('PriceFeed', network);
		console.log('Found PriceFeed at:' + priceFeedAddress);
	}
	


	// We get the contract to deploy
	// 1. Deployment Position Mastercopy
	const PositionMastercopy = await ethers.getContractFactory('PositionMastercopy');
	const PositionMastercopyDeployed = await PositionMastercopy.deploy();
	await PositionMastercopyDeployed.deployed();

	setTargetAddress('PositionMastercopy', network, PositionMastercopyDeployed.address);

	console.log('PositionMastercopy deployed to:', PositionMastercopyDeployed.address);
	
	// 2. Deployment Position Market Mastercopy
	const PositionalMarketMastercopy = await ethers.getContractFactory(
		'PositionalMarketMastercopy'
	);
	const PositionalMarketMastercopyDeployed = await PositionalMarketMastercopy.deploy();
	await PositionalMarketMastercopyDeployed.deployed();
	
	setTargetAddress('PositionalMarketMastercopy', network, PositionalMarketMastercopyDeployed.address);
	console.log(
			'PositionalMarketMastercopy deployed to:',
			PositionalMarketMastercopyDeployed.address
			);

	// 3. Deployment Position Market Factory
	const PositionalMarketFactory = await ethers.getContractFactory('PositionalMarketFactory');
	const PositionalMarketFactoryDeployed = await PositionalMarketFactory.deploy(owner.address);
	await PositionalMarketFactoryDeployed.deployed();
	
	setTargetAddress('PositionalMarketFactory', network, PositionalMarketFactoryDeployed.address);
	console.log('PositionalMarketFactory deployed to:', PositionalMarketFactoryDeployed.address);

	// 4. Deployment Position Market Manager
	const day = 24 * 60 * 60;
	const maxOraclePriceAge = 120 * 60; // Price updates are accepted from up to two hours before maturity to allow for delayed chainlink heartbeats.
	const expiryDuration = 26 * 7 * day; // Six months to exercise options before the market is destructible.
	const maxTimeToMaturity = 730 * day; // Markets may not be deployed more than two years in the future.
	let creatorCapitalRequirement = w3utils.toWei('1'); // 1 sUSD is required to create a new market for testnet, 1000 for mainnet.
	if (network == 'mainnet') {
		creatorCapitalRequirement = w3utils.toWei('1000');
	}
	// const poolFee = w3utils.toWei('0.005'); // 0.5% of the market's value goes to the pool in the end.
	// const creatorFee = w3utils.toWei('0.005'); // 0.5% of the market's value goes to the creator.
	// const feeAddress = '0xfeefeefeefeefeefeefeefeefeefeefeefeefeef';

	// const PositionalMarketManager = await ethers.getContractFactory('PositionalMarketManager');
	
	const PositionalMarketManager = await ethers.getContractFactory('PositionalMarketManager');
	const PositionalMarketManagerDeployed = await PositionalMarketManager.deploy(
		owner.address,
		proxysUSD.address,
		priceFeedAddress,
		expiryDuration,
		maxTimeToMaturity,
		creatorCapitalRequirement
	);
	await PositionalMarketManagerDeployed.deployed();

	


	setTargetAddress('PositionalMarketManager', network, PositionalMarketManagerDeployed.address);
	console.log('PositionalMarketManager deployed to:', PositionalMarketManagerDeployed.address);

	
	
	
	console.log('Done setting Position Market Manager');
	const PositionalMarketData = await ethers.getContractFactory('PositionalMarketData');
	const positionalMarketData = await PositionalMarketData.deploy();
	await positionalMarketData.deployed();

	setTargetAddress('PositionalMarketData', network, positionalMarketData.address);
	console.log('PositionalMarketData deployed to:', positionalMarketData.address);

	await PositionalMarketFactoryDeployed.setPositionalMarketManager(
		PositionalMarketManagerDeployed.address
	);
	await PositionalMarketFactoryDeployed.setPositionalMarketMastercopy(
		PositionalMarketMastercopyDeployed.address
	);
	await PositionalMarketFactoryDeployed.setPositionMastercopy(
		PositionMastercopyDeployed.address
	);

	await PositionalMarketManagerDeployed.setPositionalMarketFactory(
		PositionalMarketFactoryDeployed.address
	);

	// tx = await PositionalMarketManagerDeployed.setZeroExAddress(ZeroExAddress);

	// await tx.wait().then(e => {
	// 	console.log('PositionalMarketFactory: setZeroExAddress');
	// });

	// const ThalesRoyale = await ethers.getContractFactory('ThalesRoyale');
	// const ThalesRoyaleDeployed = await ThalesRoyale.deploy(
	// 	owner.address,
	// 	toBytes32('ETH'),
	// 	PriceFeedDeployed.address,
	// 	w3utils.toWei('10000'),
	// 	PriceFeedDeployed.address,
	// 	7
	// );
	// await ThalesRoyaleDeployed.deployed();
	// update deployments.json file
	// setTargetAddress('ThalesRoyale', network, ThalesRoyaleDeployed.address);

	// console.log('ThalesRoyale deployed to:', ThalesRoyaleDeployed.address);

	console.log('Done with all deployments');

	await hre.run('verify:verify', {
		address: PositionalMarketFactoryDeployed.address,
		constructorArguments: [owner.address],
	});

	await hre.run('verify:verify', {
		address: PositionMastercopyDeployed.address,
		constructorArguments: [],
		contract: 'contracts/Positions/PositionMastercopy.sol:PositionMastercopy',
	});

	await hre.run('verify:verify', {
		address: PositionalMarketMastercopyDeployed.address,
		constructorArguments: [],
		contract:
			'contracts/Positions/PositionalMarketMastercopy.sol:PositionalMarketMastercopy',
	});

	await hre.run('verify:verify', {
		address: positionalMarketData.address,
		constructorArguments: [],
	});

	await hre.run('verify:verify', {
		address: PositionalMarketManagerDeployed.address,
		constructorArguments: [
			owner.address,
			proxysUSD.address,
			priceFeedAddress,
			expiryDuration,
			maxTimeToMaturity,
			creatorCapitalRequirement,
		],
	});
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});


function delay(time) {
	return new Promise(function (resolve) {
		setTimeout(resolve, time);
	});
}
