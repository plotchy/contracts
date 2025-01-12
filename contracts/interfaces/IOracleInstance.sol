// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPositionalMarket.sol";

interface IOracleInstance {
    /* ========== VIEWS / VARIABLES ========== */

    function getOutcome() external view returns (bool);

    function resolvable() external view returns (bool);

    // function targetName() external view returns (string memory);

    // function targetOutcome() external view returns (string memory);

    // function eventName() external view returns (string memory);

    /* ========== MUTATIVE FUNCTIONS ========== */
}
