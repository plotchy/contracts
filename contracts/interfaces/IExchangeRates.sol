pragma solidity >=0.4.24;

// https://docs.synthetix.io/contracts/source/interfaces/iexchangerates
interface IExchangeRates {
    // Structs
    struct RateAndUpdatedTime {
        uint216 rate;
        uint40 time;
    }

    // Views
    function aggregators(bytes32 currencyKey) external view returns (address);

    function rateAndUpdatedTime(bytes32 currencyKey) external view returns (uint rate, uint time);

    function lastRateUpdateTimes(bytes32 currencyKey) external view returns (uint256);

    function rateForCurrency(bytes32 currencyKey) external view returns (uint);

    // Mutative functions
    function addAggregator(bytes32 currencyKey, address aggregatorAddress) external;

    function removeAggregator(bytes32 currencyKey) external;
}
