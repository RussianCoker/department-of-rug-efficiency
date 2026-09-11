// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract DepartmentOfRugEfficiency is ERC20, ERC20Permit {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    error RugPullDenied();

    constructor()
        ERC20("Department of Rug Efficiency", "RUG")
        ERC20Permit("Department of Rug Efficiency")
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function rugPull() external pure {
        revert RugPullDenied();
    }

    function canMintMore() external pure returns (bool) {
        return false;
    }

    function taxRateBps() external pure returns (uint256) {
        return 0;
    }

    function blacklistEnabled() external pure returns (bool) {
        return false;
    }

    function adminKeyExists() external pure returns (bool) {
        return false;
    }

    function efficiencyRating() external pure returns (uint256) {
        return 0;
    }

    function rugStatus() external pure returns (string memory) {
        return "RUG PULL DENIED BY DEPARTMENT POLICY";
    }

    function motto() external pure returns (string memory) {
        return "The only rug that cannot rug.";
    }

    function officialStatement() external pure returns (string memory) {
        return "This rug has failed to rug.";
    }
}
