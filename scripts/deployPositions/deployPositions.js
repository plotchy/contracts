const { ethers, upgrades } = require('hardhat');
const w3utils = require('web3-utils');
const snx = require('synthetix-2.50.4-ovm');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const { getTargetAddress, setTargetAddress } = require('../helpers');

async function main() {
	let accounts = await ethers.getSigners();
	let owner = accounts[0];
	let networkObj = await ethers.provider.getNetwork();
	let network = networkObj.name;
	let priceFeedAddress, ProxyERC20sUSDaddress;

	if (network === 'unknown') {
		network = 'localhost';
	}

	if (network == 'homestead') {
		network = 'mainnet';
	}

	if (networkObj.chainId == 10) {
		ProxyERC20sUSDaddress = getTargetAddress('ProxysUSD', network);
		network = 'optimistic';
	} else if (networkObj.chainId == 69) {
		network = 'optimisticKovan';
		ProxyERC20sUSDaddress = getTargetAddress('ProxysUSD', network);
	} else {
		const ProxyERC20sUSD = snx.getTarget({ network, contract: 'ProxyERC20sUSD' });
		ProxyERC20sUSDaddress = ProxyERC20sUSD.address;
	}

	console.log('Account is:' + owner.address);
	console.log('Network name:' + network);

	console.log('Found ProxyERC20sUSD at:' + ProxyERC20sUSDaddress);

	if (network == 'ropsten') {
		const ropstenPriceFeed = await ethers.getContractFactory('MockPriceFeed');
		PriceFeedDeployed = await ropstenPriceFeed.deploy(owner.address);
		await PriceFeedDeployed.deployed();
		setTargetAddress('PriceFeed', network, PriceFeedDeployed.address);
		setTargetAddress('MockPriceFeed', network, PriceFeedDeployed.address);
		console.log('MockPriceFeed deployed to:', PriceFeedDeployed.address);
		await PriceFeedDeployed.setPricetoReturn(w3utils.toWei('1000'));
		priceFeedAddress = PriceFeedDeployed.address;
		console.log('Adding aggregator', snx.toBytes32('ETH'), owner.address);
		await PriceFeedDeployed.addAggregator(snx.toBytes32('ETH'), owner.address);
	} else {
		priceFeedAddress = getTargetAddress('PriceFeed', network);
		console.log('Found PriceFeed at:' + priceFeedAddress);
	}

	// // We get the contract to deploy
	const PositionMastercopy = await ethers.getContractFactory('PositionMastercopy');
	const PositionMastercopyDeployed = await PositionMastercopy.deploy();
	await PositionMastercopyDeployed.deployed();

	console.log('PositionMastercopy deployed to:', PositionMastercopyDeployed.address);
	setTargetAddress('PositionMastercopy', network, PositionMastercopyDeployed.address);

	const PositionalMarketMastercopy = await ethers.getContractFactory('PositionalMarketMastercopy');
	const PositionalMarketMastercopyDeployed = await PositionalMarketMastercopy.deploy();
	await PositionalMarketMastercopyDeployed.deployed();

	console.log(
		'PositionalMarketMastercopy deployed to:',
		PositionalMarketMastercopyDeployed.address
	);
	setTargetAddress(
		'PositionalMarketMastercopy',
		network,
		PositionalMarketMastercopyDeployed.address
	);

	const day = 24 * 60 * 60;
	const expiryDuration = 26 * 7 * day; // Six months to exercise options before the market is destructible.
	const maxTimeToMaturity = 730 * day; // Markets may not be deployed more than two years in the future.
	let creatorCapitalRequirement = w3utils.toWei('1'); // 1 sUSD is required to create a new market for testnet, 1000 for mainnet.
	if (network == 'mainnet') {
		creatorCapitalRequirement = w3utils.toWei('1000');
	}

	const PositionalMarketManager = await ethers.getContractFactory('PositionalMarketManager');
	const PositionalMarketManagerDeployed = await upgrades.deployProxy(PositionalMarketManager, [
		owner.address,
		ProxyERC20sUSDaddress,
		priceFeedAddress,
		expiryDuration,
		maxTimeToMaturity,
		creatorCapitalRequirement,
	]);
	await PositionalMarketManagerDeployed.deployed();

	console.log('PositionalMarketManager deployed to:', PositionalMarketManagerDeployed.address);
	setTargetAddress('PositionalMarketManager', network, PositionalMarketManagerDeployed.address);

	const PositionalMarketManagerImplementation = await getImplementationAddress(
		ethers.provider,
		PositionalMarketManagerDeployed.address
	);

	setTargetAddress(
		'PositionalMarketManagerImplementation',
		network,
		PositionalMarketManagerImplementation
	);

	// set whitelisted addresses for L2
	if (networkObj.chainId === 10 || networkObj.chainId === 69) {
		const whitelistedAddresses = [
			'0x9841484A4a6C0B61C4EEa71376D76453fd05eC9C',
			'0x461783A831E6dB52D68Ba2f3194F6fd1E0087E04',
			'0xb8D08D9537FC8E5624c298302137c5b5ce2F301D',
			'0x9f8e4ee788D9b00A3409584E18034aA7B736C396',
			'0xB27E08908D6Ecbe7F9555b9e048871532bE89302',
			'0x169379d950ceffa34f5d92e33e40B7F3787F0f71',
			'0xeBaCC96EA6449DB03732e11f807188e4E57CCa97',
			'0xFe0eBCACFcca78E2dab89210b70B6755Fe209419',
			'0xfE5F7Be0dB53D43829B5D22F7C4d1953400eA5CF',
			'0xa95c7e7d7b0c796f314cbb6f95593cbd67beb994',
			'0xe966C59c15566A994391F6226fee5bc0eF70F87A',
			'0x36688C92700618f1D676698220F1AF44492811FE',
			'0xAa32a69dCC7f0FB97312Ab9fC3a96326dDA124C4',
		];

		let transaction = await PositionalMarketManagerDeployed.setWhitelistedAddresses(
			whitelistedAddresses
		);
		await transaction.wait().then(e => {
			console.log('PositionalMarketManager: whitelistedAddresses set');
		});
	}

	const PositionalMarketFactory = await ethers.getContractFactory('PositionalMarketFactory');
	const PositionalMarketFactoryDeployed = await upgrades.deployProxy(PositionalMarketFactory, [
		owner.address,
	]);
	await PositionalMarketFactoryDeployed.deployed();

	console.log('PositionalMarketFactory deployed to:', PositionalMarketFactoryDeployed.address);
	setTargetAddress('PositionalMarketFactory', network, PositionalMarketFactoryDeployed.address);

	const PositionalMarketFactoryImplementation = await getImplementationAddress(
		ethers.provider,
		PositionalMarketFactoryDeployed.address
	);

	setTargetAddress(
		'PositionalMarketFactoryImplementation',
		network,
		PositionalMarketFactoryImplementation
	);

	const PositionalMarketData = await ethers.getContractFactory('PositionalMarketData');
	const positionalMarketData = await PositionalMarketData.deploy();

	console.log('PositionalMarketData deployed to:', positionalMarketData.address);
	setTargetAddress('PositionalMarketData', network, positionalMarketData.address);

	let LimitOrderProviderAddress = getTargetAddress('LimitOrderProvider', network);

	let tx = await PositionalMarketFactoryDeployed.setPositionalMarketManager(
		PositionalMarketManagerDeployed.address
	);
	await tx.wait().then(e => {
		console.log('PositionalMarketFactory: setPositionalMarketManager');
	});
	tx = await PositionalMarketManagerDeployed.setPositionalMarketFactory(
		PositionalMarketFactoryDeployed.address
	);
	await tx.wait().then(e => {
		console.log('PositionalMarketManager: setPositionalMarketFactory');
	});

	tx = await PositionalMarketFactoryDeployed.setPositionalMarketMastercopy(
		PositionalMarketMastercopyDeployed.address
	);
	await tx.wait().then(e => {
		console.log('PositionalMarketFactory: setPositionalMarketMastercopy');
	});
	tx = await PositionalMarketFactoryDeployed.setPositionMastercopy(
		PositionMastercopyDeployed.address
	);
	await tx.wait().then(e => {
		console.log('PositionalMarketFactory: setPositionMastercopy');
	});

	if (LimitOrderProviderAddress) {
		tx = await PositionalMarketFactoryDeployed.setLimitOrderProvider(LimitOrderProviderAddress);
		await tx.wait().then(e => {
			console.log('PositionalMarketFactory: setLimitOrderProvider');
		});
	}

	if (network == 'ropsten') {
		await hre.run('verify:verify', {
			address: PositionalMarketFactoryDeployed,
		});

		await hre.run('verify:verify', {
			address: PositionMastercopyDeployed.address,
			constructorArguments: [],
			contract: 'contracts/Positions/PositionMastercopy.sol:PositionMastercopy',
		});

		await hre.run('verify:verify', {
			address: PositionalMarketMastercopyDeployed.address,
			constructorArguments: [],
			contract: 'contracts/Positions/PositionalMarketMastercopy.sol:PositionalMarketMastercopy',
		});

		await hre.run('verify:verify', {
			address: positionalMarketData.address,
			constructorArguments: [],
		});

		await hre.run('verify:verify', {
			address: PositionalMarketManagerDeployed.address,
		});
	}

	await hre.run('verify:verify', {
		address: PositionalMarketFactoryDeployed.address,
	});

	await hre.run('verify:verify', {
		address: PositionalMarketFactoryImplementation,
	});

	await hre.run('verify:verify', {
		address: positionalMarketData.address,
		constructorArguments: [],
	});

	await hre.run('verify:verify', {
		address: PositionalMarketManagerDeployed.address,
	});

	await hre.run('verify:verify', {
		address: PositionalMarketManagerImplementation,
	});

	await hre.run('verify:verify', {
		address: PositionMastercopyDeployed.address,
		constructorArguments: [],
		contract: 'contracts/Positions/PositionMastercopy.sol:PositionMastercopy',
	});

	await hre.run('verify:verify', {
		address: PositionalMarketMastercopyDeployed.address,
		constructorArguments: [],
		contract: 'contracts/Positions/PositionalMarketMastercopy.sol:PositionalMarketMastercopy',
	});

	function delay(time) {
		return new Promise(function(resolve) {
			setTimeout(resolve, time);
		});
	}
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
