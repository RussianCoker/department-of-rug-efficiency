// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/DepartmentOfRugEfficiency.sol";

contract DepartmentOfRugEfficiencyTest is Test {
    DepartmentOfRugEfficiency internal rug;

    uint256 internal constant SUPPLY = 1_000_000_000 ether;

    function setUp() public {
        rug = new DepartmentOfRugEfficiency();
    }

    function test_NameAndSymbol() public view {
        assertEq(rug.name(), "Department of Rug Efficiency");
        assertEq(rug.symbol(), "RUG");
    }

    function test_FixedSupply() public view {
        assertEq(rug.totalSupply(), SUPPLY);
        assertEq(rug.balanceOf(address(this)), SUPPLY);
    }

    function test_TransferHasNoTax() public {
        address citizen = address(0xBEEF);

        rug.transfer(citizen, 1_000 ether);

        assertEq(rug.balanceOf(citizen), 1_000 ether);
        assertEq(rug.balanceOf(address(this)), SUPPLY - 1_000 ether);
    }

    function test_CannotMintMore() public view {
        assertFalse(rug.canMintMore());
    }

    function test_NoMintFunctionExists() public {
        (bool success,) = address(rug).call(
            abi.encodeWithSignature(
                "mint(address,uint256)",
                address(this),
                1 ether
            )
        );

        assertFalse(success);
    }

    function test_NoOwnerFunctionExists() public view {
        (bool success,) = address(rug).staticcall(
            abi.encodeWithSignature("owner()")
        );

        assertFalse(success);
    }

    function test_NoBlacklistAndNoAdmin() public view {
        assertFalse(rug.blacklistEnabled());
        assertFalse(rug.adminKeyExists());
    }

    function test_ZeroTaxAndZeroRugEfficiency() public view {
        assertEq(rug.taxRateBps(), 0);
        assertEq(rug.efficiencyRating(), 0);
    }

    function test_RugPullIsDenied() public {
        vm.expectRevert(
            DepartmentOfRugEfficiency.RugPullDenied.selector
        );

        rug.rugPull();
    }

    function test_DepartmentStatements() public view {
        assertEq(
            rug.rugStatus(),
            "RUG PULL DENIED BY DEPARTMENT POLICY"
        );

        assertEq(
            rug.motto(),
            "The only rug that cannot rug."
        );

        assertEq(
            rug.officialStatement(),
            "This rug has failed to rug."
        );
    }
}
