const { ethers, upgrades } = require('hardhat');
const { toBytes32 } = require('../../index');
const snx = require('synthetix');

async function main() {
	let accounts = await ethers.getSigners();
	let owner = accounts[0];
	let networkObj = await ethers.provider.getNetwork();
	let network = networkObj.name;
	if (network === 'unknown') {
		network = 'localhost';
	}

	if (network == 'homestead') {
		network = 'mainnet';
	}

	console.log('Account is: ' + owner.address);
	console.log('Network:' + network);

	const PriceFeed = await ethers.getContractFactory('PriceFeed');
	const priceFeed = await upgrades.deployProxy(PriceFeed, [owner.address]);
	await priceFeed.deployed();

	console.log('PriceFeed deployed to:', priceFeed.address);

	const aggregators = require(`./aggregators/${network}.json`);
	for (let [key, aggregator] of Object.entries(aggregators)) {
		let tx = await priceFeed.addAggregator(toBytes32(key), aggregator);
		await tx.wait().then(e => {
			console.log('PriceFeed: addAggregator for', key);
		});
	}
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});
