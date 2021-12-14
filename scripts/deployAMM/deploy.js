const { ethers } = require('hardhat');
const w3utils = require('web3-utils');
const snx = require('synthetix-2.50.4-ovm');
const { artifacts, contract, web3 } = require('hardhat');
const { getTargetAddress, setTargetAddress } = require('../helpers');
const { toBytes32 } = require('../../index');

async function main() {
	let accounts = await ethers.getSigners();
	let owner = accounts[0];
	let networkObj = await ethers.provider.getNetwork();
	let network = networkObj.name;
	let priceFeedAddress, ProxyERC20sUSDaddress;

	if (network == 'homestead') {
		network = 'mainnet';
	}

	if (networkObj.chainId == 69) {
		networkObj.name = 'optimisticKovan';
		network = 'optimisticKovan';
	}
	if (networkObj.chainId == 10) {
		networkObj.name = 'optimistic';
		network = 'optimistic';
	}

	if (networkObj.chainId == 10) {
		ProxyERC20sUSDaddress = getTargetAddress('ProxysUSD', network);
	} else if (networkObj.chainId == 69) {
		networkObj.name = 'optimisticKovan';
		ProxyERC20sUSDaddress = getTargetAddress('ProxysUSD', network);
	} else {
		const ProxyERC20sUSD = snx.getTarget({ network, contract: 'ProxyERC20sUSD' });
		ProxyERC20sUSDaddress = ProxyERC20sUSD.address;
	}

	console.log('Account is:' + owner.address);
	console.log('Network name:' + network);

	console.log('Found ProxyERC20sUSD at:' + ProxyERC20sUSDaddress);
	priceFeedAddress = getTargetAddress('PriceFeed', network);
	console.log('Found PriceFeed at:' + priceFeedAddress);

	// // We get the contract to deploy
	const DeciMath = await ethers.getContractFactory('DeciMath');
	const deciMath = await DeciMath.deploy();
	await deciMath.deployed();

	console.log('DeciMath deployed to:', deciMath.address);
	setTargetAddress('DeciMath', network, deciMath.address);

	// // We get the contract to deploy
	const ThalesAMM = await ethers.getContractFactory('ThalesAMM');
	const thalesAMM = await ThalesAMM.deploy(
		owner.address,
		priceFeedAddress,
		ProxyERC20sUSDaddress,
		w3utils.toWei('1000'),
		deciMath.address
	);
	await thalesAMM.deployed();

	console.log('ThalesAMM deployed to:', thalesAMM.address);
	setTargetAddress('ThalesAMM', network, thalesAMM.address);

	let managerAddress = getTargetAddress('BinaryOptionMarketManager', network);

	const BinaryOptionMarketFactory = await ethers.getContractFactory('BinaryOptionMarketFactory');
	let factoryAddress = getTargetAddress('BinaryOptionMarketFactory', network);
	const BinaryOptionMarketFactoryInstance = await BinaryOptionMarketFactory.attach(factoryAddress);

	let tx = await thalesAMM.setBinaryOptionsMarketManager(managerAddress);
	await tx.wait().then(e => {
		console.log('ThalesAMM: setBinaryOptionsMarketManager');
	});

	tx = await thalesAMM.setImpliedVolatilityPerAsset(toBytes32('ETH'), w3utils.toWei('120'));
	await tx.wait().then(e => {
		console.log('ThalesAMM: setImpliedVolatilityPerAsset(ETH, 120)');
	});

	tx = await thalesAMM.setImpliedVolatilityPerAsset(toBytes32('LINK'), w3utils.toWei('120'));
	await tx.wait().then(e => {
		console.log('ThalesAMM: setImpliedVolatilityPerAsset(LINK, 120)');
	});

	tx = await thalesAMM.setImpliedVolatilityPerAsset(toBytes32('LINK'), w3utils.toWei('120'));
	await tx.wait().then(e => {
		console.log('ThalesAMM: setImpliedVolatilityPerAsset(LINK, 120)');
	});

	tx = await BinaryOptionMarketFactoryInstance.setThalesAMM(thalesAMM.address);
	await tx.wait().then(e => {
		console.log('BinaryOptionMarketFactoryInstance: setThalesAMM');
	});

	await hre.run('verify:verify', {
		address: deciMath.address,
	});

	await hre.run('verify:verify', {
		address: thalesAMM.address,
		constructorArguments: [
			owner.address,
			priceFeedAddress,
			ProxyERC20sUSDaddress,
			w3utils.toWei('1000'),
			deciMath.address,
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
	return new Promise(function(resolve) {
		setTimeout(resolve, time);
	});
}