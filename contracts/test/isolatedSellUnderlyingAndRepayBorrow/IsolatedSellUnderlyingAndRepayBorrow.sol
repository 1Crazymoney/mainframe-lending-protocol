/* SPDX-License-Identifier: LGPL-3.0-or-later */
pragma solidity ^0.7.0;

import "./SafeErc20.sol";

import "./BatterseaScriptsV1Interface.sol";
import "./FyTokenInterface.sol";
import "./ExchangeProxyInterface.sol";

/**
 * @title IsolatedSellUnderlyingAndRepayBorrow
 * @author Mainframe
 * @notice Meant to be used for debugging `sellUnderlyingAndRepayBorrow`.
 */
contract IsolatedSellUnderlyingAndRepayBorrow is
    CarefulMath, /* no dependency */
    BatterseaScriptsV1Interface /* one dependency */
{
    using SafeErc20 for Erc20Interface;
    using SafeErc20 for FyTokenInterface;

    /**
     * @notice Market sells underlying and repays the borrows via the FyToken contract.
     *
     * @dev Requirements:
     * - The caller must have allowed the DSProxy to spend `underlyingAmount` tokens.
     *
     * @param fyToken The address of the FyToken contract.
     * @param underlyingAmount The amount of underlying to sell.
     * @param repayAmount The amount of fyTokens to repay.
     */
    function sellUnderlyingAndRepayBorrow(
        FyTokenInterface fyToken,
        uint256 underlyingAmount,
        uint256 repayAmount
    ) external {
        Erc20Interface underlying = fyToken.underlying();

        /* Transfer the underlying to the DSProxy. */
        underlying.safeTransferFrom(msg.sender, address(this), underlyingAmount);

        /* Prepare the parameters for calling Balancer. */
        TokenInterface tokenIn = TokenInterface(address(underlying));
        TokenInterface tokenOut = TokenInterface(address(fyToken));
        uint256 totalAmountOut = repayAmount;
        uint256 maxTotalAmountIn = underlyingAmount;
        uint256 nPools = 1;

        /* Recall that Balancer reverts when the swap is not successful. */
        uint256 totalAmountIn = ExchangeProxyInterface(EXCHANGE_PROXY_ADDRESS).smartSwapExactOut(
            tokenIn,
            tokenOut,
            totalAmountOut,
            maxTotalAmountIn,
            nPools
        );

        /* Use the recently bought fyTokens to repay the borrow. */
        fyToken.repayBorrow(totalAmountIn);

        /* When we get a better price than the worst that we assumed we would, not all underlying is sold. */
        MathError mathErr;
        uint256 underlyingDelta;
        (mathErr, underlyingDelta) = subUInt(underlyingAmount, totalAmountIn);
        require(mathErr == MathError.NO_ERROR, "ERR_SELL_UNDERLYING_AND_REPAY_BORROW_MATH_ERROR");

        /* If the underlying delta is non-zero, send it back to the user. */
        if (underlyingDelta > 0) {
            underlying.safeTransfer(msg.sender, underlyingDelta);
        }
    }
}
