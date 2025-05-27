'use client';

import React from "react";
import { sepolia } from "@starknet-react/chains";
import {
  StarknetConfig,
  jsonRpcProvider, // Import jsonRpcProvider
  argent,
  braavos,
  useInjectedConnectors,
} from "@starknet-react/core";
import { RpcProviderOptions } from "starknet"; // Import RpcProviderOptions for typing if needed, or define inline

// Define the chains supported
const chains = [sepolia];

import type { Chain } from "@starknet-react/chains"; // ⬅️ Add this line
// Define the RPC provider function

function rpc(chain: typeof sepolia): RpcProviderOptions {
  return {
    nodeUrl: `https://starknet-${chain.network}.public.blastapi.io/rpc/v0_7`,
  };
}

//function rpc(chain: (typeof chains)[number]): RpcProviderOptions {
//  return {
//    nodeUrl: `https://starknet-${chain.network}.public.blastapi.io/rpc/v0_7`,
//  };
//}

export function StarknetProviderComponent({ children }: { children: React.ReactNode }) {
  const { connectors } = useInjectedConnectors({
    recommended: [
      argent(),
      braavos(),
    ],
    includeRecommended: "always", 
    order: "random",
  });

  return (
    <StarknetConfig
      chains={chains}
      provider={jsonRpcProvider({ rpc })}
      connectors={connectors}
      autoConnect
    >
      {children}
    </StarknetConfig>
  );
}
